function broadcastUpdate(type, data) {
  if (!global.wsConnections) {
    return;
  }

  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString()
  });

  global.wsConnections.forEach(ws => {
    if (ws.readyState === 1) { // WebSocket.OPEN
      try {
        ws.send(message);
      } catch (error) {
        console.error('Error sending WebSocket message:', error);
        global.wsConnections.delete(ws);
      }
    }
  });
}

module.exports = {
  broadcastUpdate
};
