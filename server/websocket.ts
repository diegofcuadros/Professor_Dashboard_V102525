import { WebSocket, WebSocketServer } from 'ws';
import { Server } from 'http';

interface WebSocketClient {
  ws: WebSocket;
  userId: string;
  role: string;
}

export class NotificationService {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocketClient> = new Map();

  constructor(server: Server) {
    this.wss = new WebSocketServer({ 
      server,
      path: '/ws'
    });

    this.wss.on('connection', this.handleConnection.bind(this));
  }

  private handleConnection(ws: WebSocket, request?: any) {
    console.log('WebSocket connection established');

    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        this.handleMessage(ws, data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      // Remove client from active connections
      for (const [clientId, client] of this.clients.entries()) {
        if (client.ws === ws) {
          this.clients.delete(clientId);
          console.log(`Client ${clientId} disconnected`);
          break;
        }
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }

  private handleMessage(ws: WebSocket, data: any): void {
    switch (data.type) {
      case 'authenticate':
        this.authenticateClient(ws, data);
        break;
      case 'subscribe':
        this.subscribeToNotifications(ws, data);
        break;
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
      default:
        console.log('Unknown message type:', data.type);
    }
  }

  private authenticateClient(ws: WebSocket, data: any): void {
    const { userId, role, token } = data;
    
    // In a real implementation, verify the token
    // For now, we'll accept any authentication
    const clientId = `${userId}-${Date.now()}`;
    
    this.clients.set(clientId, {
      ws,
      userId,
      role
    });

    ws.send(JSON.stringify({
      type: 'authenticated',
      clientId,
      status: 'success'
    }));

    console.log(`Client authenticated: ${clientId} (${role})`);
  }

  private subscribeToNotifications(ws: WebSocket, data: any): void {
    ws.send(JSON.stringify({
      type: 'subscribed',
      channels: data.channels || ['general'],
      status: 'success'
    }));
  }

  // Public methods for sending notifications
  public notifyUser(userId: string, notification: any) {
    for (const [clientId, client] of this.clients.entries()) {
      if (client.userId === userId) {
        client.ws.send(JSON.stringify({
          type: 'notification',
          data: notification,
          timestamp: new Date().toISOString()
        }));
      }
    }
  }

  public notifyRole(role: string, notification: any) {
    for (const [clientId, client] of this.clients.entries()) {
      if (client.role === role || role === 'all') {
        client.ws.send(JSON.stringify({
          type: 'notification',
          data: notification,
          timestamp: new Date().toISOString()
        }));
      }
    }
  }

  public notifyAll(notification: any) {
    for (const [clientId, client] of this.clients.entries()) {
      client.ws.send(JSON.stringify({
        type: 'notification',
        data: notification,
        timestamp: new Date().toISOString()
      }));
    }
  }

  public broadcastUpdate(updateType: string, data: any) {
    const message = {
      type: 'update',
      updateType,
      data,
      timestamp: new Date().toISOString()
    };

    for (const [clientId, client] of this.clients.entries()) {
      client.ws.send(JSON.stringify(message));
    }
  }

  public getConnectedClients(): number {
    return this.clients.size;
  }

  public getClientsByRole(): Record<string, number> {
    const roleCount: Record<string, number> = {};
    
    for (const client of this.clients.values()) {
      roleCount[client.role] = (roleCount[client.role] || 0) + 1;
    }
    
    return roleCount;
  }
}

export class WebSocketService {
  private static instance: WebSocketService | null = null;
  private notificationService: NotificationService | null = null;

  static getInstance(): WebSocketService {
    if (!WebSocketService.instance) {
      WebSocketService.instance = new WebSocketService();
    }
    return WebSocketService.instance;
  }

  setNotificationService(service: NotificationService) {
    this.notificationService = service;
  }

  broadcastToRole(roles: string[], eventType: string, data: any) {
    if (!this.notificationService) return;

    for (const role of roles) {
      this.notificationService.notifyRole(role, {
        eventType,
        data
      });
    }
  }

  broadcastUpdate(updateType: string, data: any) {
    if (!this.notificationService) return;
    this.notificationService.broadcastUpdate(updateType, data);
  }
}

export let notificationService: NotificationService;

export function initializeWebSocket(server: Server) {
  notificationService = new NotificationService(server);
  WebSocketService.getInstance().setNotificationService(notificationService);
  console.log('WebSocket server initialized');
  return notificationService;
}