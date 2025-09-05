const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const WebSocket = require('ws');
const http = require('http');
const path = require('path');
require('dotenv').config();

const specRoutes = require('./routes/specs');
const dataRoutes = require('./routes/data');
const aiRoutes = require('./routes/ai');
const mockoonRoutes = require('./routes/mockoon');
const { broadcastUpdate } = require('./services/websocket');

const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws' });

// Store WebSocket connections
global.wsConnections = new Set();

wss.on('connection', (ws) => {
  global.wsConnections.add(ws);
  console.log('WebSocket client connected');
  
  ws.on('close', () => {
    global.wsConnections.delete(ws);
    console.log('WebSocket client disconnected');
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    global.wsConnections.delete(ws);
  });
});

// Middleware
app.use(helmet());
app.use(compression());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/specs', specRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/mockoon', mockoonRoutes);

// Mock API routing - handle /api/mock/* requests
app.use('/api/mock', require('./routes/mock'));

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// Serve frontend for all non-API routes
app.get('*', (req, res) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ 
      error: 'API route not found',
      path: req.originalUrl,
      method: req.method
    });
  }
  
  // Serve simple HTML frontend
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server without database initialization
const PORT = process.env.PORT || 3001;

function startServer() {
  try {
    server.listen(PORT, () => {
      console.log(`Smart API Sandbox server running on port ${PORT}`);
      console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
      console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`Using Mockoon for stateful API mocking`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
