interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
}

export function broadcastUpdate(type: string, data: any): void {
  if (!(global as any).wsConnections) {
    return;
  }

  const message: WebSocketMessage = {
    type,
    data,
    timestamp: new Date().toISOString()
  };

  const messageString = JSON.stringify(message);

  (global as any).wsConnections.forEach((ws: any) => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      try {
        ws.send(messageString);
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        (global as any).wsConnections.delete(ws);
      }
    }
  });
}
