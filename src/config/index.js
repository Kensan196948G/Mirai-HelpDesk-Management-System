/**
 * Application Configuration
 * Loads environment variables and provides typed configuration
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '../../.env') });

export const config = {
  // Server
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || 'localhost',

  // Database
  databasePath: process.env.DATABASE_PATH || './data/helpdesk.db',

  // JWT
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',

  // File Upload
  uploadMaxSize: parseInt(process.env.UPLOAD_MAX_SIZE || '10485760', 10),
  uploadAllowedTypes: (process.env.UPLOAD_ALLOWED_TYPES || '.pdf,.doc,.docx,.png,.jpg').split(','),

  // Logging
  logLevel: process.env.LOG_LEVEL || 'debug',
  logFilePath: process.env.LOG_FILE_PATH || './logs/app.log',

  // SLA Defaults (in minutes)
  sla: {
    p1: { response: 15, resolution: 120 },
    p2: { response: 60, resolution: 480 },
    p3: { response: 240, resolution: 4320 },
    p4: { response: 1440, resolution: 7200 },
  },
};

// Validate required configuration in production
if (config.nodeEnv === 'production') {
  const required = ['JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

export default config;
