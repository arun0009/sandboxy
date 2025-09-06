import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import WebSocket from 'ws';
import http from 'http';
import path from 'path';

import specsRoutes from './routes/specs.js';
import dataRoutes from './routes/data.js';
import aiRoutes from './routes/ai.js';
import mockoonRoutes from './routes/mockoon.js';
import mockRoutes from './routes/mock.js';

const app = express();
const server = http.createServer(app);

// Initialize WebSocket server
const wss = new WebSocket.Server({ server, path: '/ws' });

// Store WebSocket connections
declare global {
  var wsConnections: Set<WebSocket>;
}

global.wsConnections = new Set();

wss.on('connection', (ws: WebSocket) => {
  global.wsConnections.add(ws);
  console.log('WebSocket client connected');
  
  ws.on('close', () => {
    global.wsConnections.delete(ws);
    console.log('WebSocket client disconnected');
  });
  
  ws.on('error', (error: Error) => {
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
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'),
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// CORS configuration
const corsOptions: cors.CorsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/specs', specsRoutes);
app.use('/api/data', dataRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/mockoon', mockoonRoutes);

// Mock API routing - handle /api/mock/* requests
app.use('/api/mock', mockRoutes);

// Serve static files from public directory with proper MIME types
// First serve from public/public (compiled frontend files)
app.use(express.static(path.join(__dirname, '../public/public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Then serve from public root (for server types and other files)
app.use(express.static(path.join(__dirname, '../public'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    }
  }
}));

// Serve frontend for all non-API routes
app.get('*', (req: Request, res: Response): void => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    res.status(404).json({ 
      error: 'API route not found',
      path: req.originalUrl,
      method: req.method
    });
    return;
  }
  
  // Skip static files (js, css, map files, etc.)
  if (req.path.match(/\.(js|css|map|ico|png|jpg|jpeg|gif|svg)$/)) {
    res.status(404).json({
      error: 'Static file not found',
      path: req.originalUrl
    });
    return;
  }
  
  // Serve simple HTML frontend
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Global error handler
app.use((error: Error & { status?: number }, req: Request, res: Response, next: NextFunction) => {
  console.error('Global error handler:', error);
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Start server without database initialization
const PORT = process.env.PORT || 3001;

function startServer(): void {
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
