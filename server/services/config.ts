import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Default configuration
const defaultConfig = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mockDelay: parseInt(process.env.MOCK_DELAY || '100', 10),
  mockMode: process.env.MOCK_MODE || 'advanced',
  enableMockMetadata: process.env.ENABLE_MOCK_METADATA !== 'false',
  dataDir: path.join(process.cwd(), 'data'),
};

// Validate configuration
function validateConfig(config: typeof defaultConfig) {
  if (isNaN(config.mockDelay) || config.mockDelay < 0) {
    throw new Error('MOCK_DELAY must be a non-negative number');
  }
  
  if (!['basic', 'advanced', 'ai'].includes(config.mockMode)) {
    throw new Error('MOCK_MODE must be one of: basic, advanced, ai');
  }
}

// Initialize and validate configuration
const config = { ...defaultConfig };
validateConfig(config);

export default config;
