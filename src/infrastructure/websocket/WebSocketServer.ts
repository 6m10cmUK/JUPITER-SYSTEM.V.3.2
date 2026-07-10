import { WebSocket, WebSocketServer as WSServer } from 'ws';
import { Server } from 'http';
import { EventEmitter } from 'events';
import { logSystem } from '../../shared/utils/UsageLogger';

export interface NotificationData {
  type: 'notification';
  title: string;
  message: string;
  duration?: number;
  sender?: string;
  source?: string;
  app?: string;
  is_slack?: boolean;
  notification_type?: 'MENTION' | 'DM' | 'THREAD' | 'MESSAGE';
  timestamp?: string;
}

export class WebSocketServer extends EventEmitter {
  private wss: WSServer;
  private clients: Map<string, WebSocket> = new Map();
  
  constructor(server: Server) {
    super();
    this.wss = new WSServer({ server });
    this.setupWebSocket();
  }
  
  private setupWebSocket(): void {
    this.wss.on('connection', (ws, req) => {
      const clientId = this.generateClientId();
      
      console.log(`[WebSocket] クライアント接続: ${clientId}`);
      this.clients.set(clientId, ws);
      
      ws.on('message', (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log(`[WebSocket] メッセージ受信:`, message);
          
          if (message.type === 'register') {
            ws.send(JSON.stringify({ type: 'registered', clientId }));
            console.log(`[WebSocket] クライアント登録完了: ${clientId} (${message.client_type})`);
          } else if (message.type === 'dismiss_notification') {
            // 通知消去メッセージを他の全クライアントに転送
            console.log(`[WebSocket] 通知消去受信: ${message.client_type} from ${clientId}`);
            console.log(`[WebSocket] 現在の接続クライアント数: ${this.clients.size}`);
            this.broadcastDismiss(message.client_type, clientId);
          } else if (message.type === 'notification' && message.source === 'windows_notification_listener') {
            // Windows通知リスナーからの通知を処理
            console.log(`[WebSocket] Windows通知リスナーから通知受信:`, {
              app: message.app,
              notification_type: message.notification_type,
              title: message.title
            });
            
            // 全クライアントに通知を転送
            const notificationData: NotificationData = {
              type: 'notification',
              title: message.title,
              message: message.message,
              app: message.app,
              notification_type: message.notification_type,
              timestamp: message.timestamp,
              source: 'windows_notification_listener',
              is_slack: message.app?.toLowerCase() === 'slack'
            };
            
            this.sendNotification(notificationData);
          }
        } catch (error) {
          console.error('[WebSocket] メッセージパースエラー:', error);
        }
      });
      
      ws.on('close', () => {
        console.log(`[WebSocket] クライアント切断: ${clientId}`);
        this.clients.delete(clientId);
      });
      
      ws.on('error', (error) => {
        console.error(`[WebSocket] エラー (${clientId}):`, error);
      });
    });
  }
  
  public sendNotification(data: NotificationData): void {
    try {
      // Slack通知の場合は特別な処理
      if (data.is_slack || data.app?.toLowerCase().includes('slack')) {
        console.log(`[WebSocket] Slack通知を検出: ${data.title}`);
        
        // notification_typeに応じたプレフィックスを追加
        let prefix = '💬';
        if (data.notification_type) {
          switch (data.notification_type) {
            case 'MENTION':
              prefix = '📢';
              break;
            case 'DM':
              prefix = '✉️';
              break;
            case 'THREAD':
              prefix = '🧵';
              break;
            case 'MESSAGE':
              prefix = '💬';
              break;
          }
        }
        
        data.title = `${prefix} ${data.title}`;
      }
      
      // Discord通知の場合の処理
      if (data.app?.toLowerCase().includes('discord')) {
        data.title = `🎮 ${data.title}`;
      }
      
      const message = JSON.stringify(data);
      
      this.clients.forEach((ws, clientId) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          console.log(`[WebSocket] 通知送信 to ${clientId}: ${data.app} - ${data.notification_type || 'N/A'}`);
        }
      });
    } catch (error) {
      logSystem('websocket', `通知送信失敗: title=${data.title} app=${data.app ?? 'N/A'} type=${data.notification_type ?? 'N/A'} ${formatErrorMessage(error)}`);
      console.error('[WebSocket] 通知送信失敗:', getErrorStack(error) ?? error);
    }
  }
  
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private broadcastDismiss(dismissedBy: string, excludeClientId: string): void {
    try {
      const message = JSON.stringify({
        type: 'dismiss_notification',
        dismissed_by: dismissedBy
      });
      
      console.log(`[WebSocket] broadcastDismiss開始: dismissedBy=${dismissedBy}, excludeClientId=${excludeClientId}`);
      let sentCount = 0;
      
      this.clients.forEach((ws, clientId) => {
        console.log(`[WebSocket] クライアント確認: ${clientId}, readyState=${ws.readyState}, excluded=${clientId === excludeClientId}`);
        if (clientId !== excludeClientId && ws.readyState === WebSocket.OPEN) {
          ws.send(message);
          sentCount++;
          console.log(`[WebSocket] 消去通知送信 to ${clientId}`);
        }
      });
      
      console.log(`[WebSocket] broadcastDismiss完了: ${sentCount}件送信`);
    } catch (error) {
      logSystem('websocket', `通知消去ブロードキャスト失敗: dismissedBy=${dismissedBy} excludeClientId=${excludeClientId} ${formatErrorMessage(error)}`);
      console.error('[WebSocket] 通知消去ブロードキャスト失敗:', getErrorStack(error) ?? error);
    }
  }
}

function formatErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  try {
    return String(error);
  } catch {
    return 'Unknown error';
  }
}

function getErrorStack(error: unknown): string | undefined {
  return error instanceof Error ? error.stack : undefined;
}
