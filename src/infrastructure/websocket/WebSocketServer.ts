import { WebSocketServer as WSServer } from 'ws';
import { Server } from 'http';
import { EventEmitter } from 'events';
import Bonjour from 'bonjour-service';

export interface NotificationData {
  type: 'notification';
  title: string;
  message: string;
  duration?: number;
  sender?: string;
}

export class WebSocketServer extends EventEmitter {
  private wss: WSServer;
  private clients: Map<string, any> = new Map();
  private bonjour: any;
  
  constructor(server: Server, port: number = 8080) {
    super();
    this.wss = new WSServer({ server });
    this.setupWebSocket();
    this.setupMDNS(port);
  }
  
  private setupMDNS(port: number): void {
    this.bonjour = new Bonjour.Bonjour();
    this.bonjour.publish({
      name: 'Jupiter Notifier',
      type: 'http',
      port: port,
      txt: {
        service: 'jupiter-notifier',
        version: '1.0.0'
      }
    });
    console.log(`[mDNS] サービスを公開しました: Jupiter Notifier (port ${port})`);
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
}