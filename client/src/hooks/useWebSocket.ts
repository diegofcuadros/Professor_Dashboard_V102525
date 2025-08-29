import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';

interface WebSocketMessage {
  type: string;
  data?: any;
  timestamp?: string;
  updateType?: string;
}

interface NotificationData {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export function useWebSocket() {
  const { user } = useAuth();
  const { toast } = useToast();
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    if (!user || wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setConnectionAttempts(0);
        
        // Authenticate with the server
        ws.send(JSON.stringify({
          type: 'authenticate',
          userId: user.id,
          role: user.role,
          token: 'dummy-token' // In real implementation, use actual auth token
        }));

        // Subscribe to notifications
        ws.send(JSON.stringify({
          type: 'subscribe',
          channels: ['general', 'projects', 'schedules']
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          handleMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect if under max attempts
        if (connectionAttempts < maxReconnectAttempts) {
          setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
            connect();
          }, Math.pow(2, connectionAttempts) * 1000); // Exponential backoff
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  }, [user, connectionAttempts]);

  const handleMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'authenticated':
        console.log('WebSocket authenticated successfully');
        break;
        
      case 'notification':
        if (message.data) {
          const notification = message.data as NotificationData;
          setNotifications(prev => [notification, ...prev.slice(0, 49)]); // Keep last 50
          
          // Show toast notification
          toast({
            title: notification.title,
            description: notification.message,
            variant: notification.type === 'error' ? 'destructive' : 'default',
          });
        }
        break;
        
      case 'update':
        console.log('Real-time update received:', message.updateType, message.data);
        // Handle real-time updates (project changes, schedule updates, etc.)
        break;
        
      case 'pong':
        // Heartbeat response
        break;
        
      default:
        console.log('Unknown message type:', message.type);
    }
  }, [toast]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  const markNotificationAsRead = useCallback((notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId 
          ? { ...notif, read: true } 
          : notif
      )
    );
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  useEffect(() => {
    if (user) {
      connect();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [user, connect]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      sendMessage({ type: 'ping' });
    }, 30000); // Ping every 30 seconds

    return () => clearInterval(interval);
  }, [isConnected, sendMessage]);

  return {
    isConnected,
    notifications,
    sendMessage,
    markNotificationAsRead,
    clearNotifications,
    unreadCount: notifications.filter(n => !n.read).length,
  };
}