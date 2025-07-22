import { WebSocketServer as WSServer } from 'ws';
import { Server } from 'http';
import { EventEmitter } from 'events';

export interface NotificationData {
  type: 'notification';
  title: string;
  message: string;
  duration?: number;
  sender?: string;
  source?: string;
  app?: string;
  is_slack?: boolean;
}

export class WebSocketServer extends EventEmitter {
  private wss: WSServer;
  private clients: Map<string, any> = new Map();
  
  constructor(server: Server, port: number = 8080) {
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
    // Slack通知の場合は特別な処理
    if (data.is_slack || data.app?.toLowerCase().includes('slack')) {
      console.log(`[WebSocket] Slack通知を検出: ${data.title}`);
      // Slack通知用の特別なフォーマット
      data.title = `💬 ${data.title}`;
    }
    
    const message = JSON.stringify(data);
    
    this.clients.forEach((ws, clientId) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(message);
        console.log(`[WebSocket] 通知送信 to ${clientId}`);
      }
    });
  }
  
  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  private broadcastDismiss(dismissedBy: string, excludeClientId: string): void {
    const message = JSON.stringify({
      type: 'dismiss_notification',
      dismissed_by: dismissedBy
    });
    
    console.log(`[WebSocket] broadcastDismiss開始: dismissedBy=${dismissedBy}, excludeClientId=${excludeClientId}`);
    let sentCount = 0;
    
    this.clients.forEach((ws, clientId) => {
      console.log(`[WebSocket] クライアント確認: ${clientId}, readyState=${ws.readyState}, excluded=${clientId === excludeClientId}`);
      if (clientId !== excludeClientId && ws.readyState === ws.OPEN) {
        ws.send(message);
        sentCount++;
        console.log(`[WebSocket] 消去通知送信 to ${clientId}`);
      }
    });
    
    console.log(`[WebSocket] broadcastDismiss完了: ${sentCount}件送信`);
  }
}