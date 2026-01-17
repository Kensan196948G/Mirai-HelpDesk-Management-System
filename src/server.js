/**
 * Mirai HelpDesk Management System
 * Main Server Entry Point
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/index.js';

const app = express();

// ===========================================
// Middleware Setup
// ===========================================

// Security headers
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: config.corsOrigin,
  credentials: true,
}));

// Request logging
app.use(morgan('dev'));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ===========================================
// Health Check Endpoint
// ===========================================

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    environment: config.nodeEnv,
  });
});

// ===========================================
// API Routes (Phase 1 - to be implemented)
// ===========================================

// Placeholder routes - will be implemented
app.get('/api/tickets', (req, res) => {
  res.json({ message: 'Tickets API - Coming soon', data: [] });
});

app.get('/api/knowledge', (req, res) => {
  res.json({ message: 'Knowledge API - Coming soon', data: [] });
});

app.get('/api/users', (req, res) => {
  res.json({ message: 'Users API - Coming soon', data: [] });
});

// ===========================================
// Error Handling
// ===========================================

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('Server Error:', err);
  res.status(err.status || 500).json({
    error: err.name || 'Internal Server Error',
    message: config.nodeEnv === 'development' ? err.message : 'An error occurred',
  });
});

// ===========================================
// Server Start
// ===========================================

const PORT = config.port;
const HOST = config.host;

app.listen(PORT, HOST, () => {
  console.info(`
╔═══════════════════════════════════════════════════════╗
║   Mirai HelpDesk Management System                    ║
║   Version: 0.1.0                                      ║
╠═══════════════════════════════════════════════════════╣
║   Server running at: http://${HOST}:${PORT}              ║
║   Environment: ${config.nodeEnv.padEnd(10)}                        ║
║   Health check: http://${HOST}:${PORT}/api/health        ║
╚═══════════════════════════════════════════════════════╝
  `);
});

export default app;
