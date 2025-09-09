import express, { Request, Response as ExpressResponse, NextFunction } from 'express';
type Response = ExpressResponse & {
  status: (code: number) => Response;
  send: (body: any) => Response;
  json: (body: any) => Response;
  sendFile: (path: string, options?: any, callback?: (err: any) => void) => Response;
  headersSent: boolean;
};
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import path from 'path';
import http from 'http';

// Import routes
import specsRoutes from './routes/specs';
import aiRoutes from './routes/ai';
import mockRoutes from './routes/mock';
import adminRoutes from './routes/admin';

// Import services
import config from './services/config';

// __dirname is available in CommonJS by default

const app = express();
const server = http.createServer(app);

// Initialize database
async function initializeApp() {
  try {
    startServer();
  } catch (error) {
    console.error('Failed to initialize application:', error);
    process.exit(1);
  }
}

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      scriptSrcAttr: ["'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));
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
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req: express.Request, res: express.Response) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/specs', specsRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

// Mock API routing - handle /api/mock/* requests
app.use('/api/mock', mockRoutes);

// Serve static files from the public directory
const publicPath = path.join(process.cwd(), 'dist/public');
app.use(express.static(publicPath, {
  setHeaders: (res: express.Response, filePath: string) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (filePath.endsWith('.html')) {
      res.setHeader('Content-Type', 'text/html');
    }
  },
  fallthrough: true
}));

// Admin route
app.get('/admin', (req: express.Request, res: express.Response) => {
  res.sendFile(path.join(process.cwd(), 'public/admin.html'));
});

// Serve frontend for all non-API routes
app.get('*', (req: Request, res: ExpressResponse) => {
  // Skip API routes
  if (req.path.startsWith('/api/')) {
    return (res as unknown as Response).status(404).json({ error: 'API route not found' });
  }
  
  // Serve index.html from dist/public for all other routes to support client-side routing
  const indexPath = path.join(process.cwd(), 'dist/public/index.html');
  
  // Use type assertion to avoid TypeScript errors with sendFile
  (res as unknown as Response).sendFile(indexPath, (err: any) => {
    if (err) {
      console.error('Error serving index.html:', err);
      if (!(res as unknown as Response).headersSent) {
        (res as unknown as Response).status(500).send('Internal Server Error');
      }
    }
  });
});

// Error handling middleware
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong',
  });
});

// Start server
function startServer() {
  const PORT = process.env.PORT || 3000;
  server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`API Documentation: http://localhost:${PORT}/api-docs`);
    console.log(`Mock API Base URL: http://localhost:${PORT}/api/mock`);
  });
}

// Start the application
initializeApp();

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  
  // Close HTTP server
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  
  // Force close server after 10 seconds
  setTimeout(() => {
    console.error('Forcing server shutdown');
    process.exit(1);
  }, 10000);
});
