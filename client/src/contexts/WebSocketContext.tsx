import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import toast from 'react-hot-toast';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: WebSocketMessage | null;
  sendMessage: (message: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);

  useEffect(() => {
    const connectWebSocket = () => {
      const websocket = new WebSocket('ws://localhost:3001/ws');

      websocket.onopen = () => {
        setIsConnected(true);
        console.log('WebSocket connected');
        toast.success('Real-time updates connected');
      };

      websocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          setLastMessage(message);
          
          // Handle different message types
          switch (message.type) {
            case 'spec_imported':
              toast.success(`API spec "${message.data.name}" imported successfully`);
              break;
            case 'api_call':
              toast(`API Call: ${message.data.endpoint} (${message.data.statusCode})`, {
                icon: message.data.statusCode >= 400 ? '❌' : '✅',
                duration: 2000,
              });
              break;
            case 'data_created':
              toast.success(`Data created: ${message.data.resourceId}`);
              break;
            case 'data_updated':
              toast.success(`Data updated: ${message.data.resourceId}`);
              break;
            case 'data_deleted':
              toast.success(`Data deleted: ${message.data.resourceId}`);
              break;
            default:
              console.log('Unknown message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      websocket.onclose = () => {
        setIsConnected(false);
        console.log('WebSocket disconnected');
        
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      setWs(websocket);
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, []);

  const sendMessage = (message: any) => {
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket is not connected');
    }
  };

  return (
    <WebSocketContext.Provider value={{ isConnected, lastMessage, sendMessage }}>
      {children}
    </WebSocketContext.Provider>
  );
};
