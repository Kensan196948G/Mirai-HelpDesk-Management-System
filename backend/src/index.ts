import express, { Application } from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { rateLimit } from './middleware/rateLimit';
import { apiLimiter, loginLimiter, aiLimiter, uploadLimiter } from './middleware/rate-limit.middleware';
import { initializeSocketServer } from './websocket/socketServer';
import { startSLAChecker, stopSLAChecker } from './jobs/sla-checker';

// ルートのインポート
import authRoutes from './routes/auth.routes';
import ticketRoutes from './routes/ticket.routes';
import userRoutes from './routes/user.routes';
import categoryRoutes from './routes/category.routes';
import knowledgeRoutes from './routes/knowledge.routes';
import approvalRoutes from './routes/approval.routes';
import m365Routes from './routes/m365.routes';
import aiRoutes from './routes/ai.routes';
import slaRoutes from './routes/sla.routes';
import reportRoutes from './routes/report.routes';

// 環境変数の読み込み
dotenv.config();

const app: Application = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const API_PREFIX = process.env.API_PREFIX || '/api';

// ミドルウェアの設定
// セキュリティヘッダー（XSS/CSRF対策）
// 開発環境ではCSPを緩和（Vite HMRとの互換性）
const isProduction = process.env.NODE_ENV === 'production';

app.use(
  helmet({
    contentSecurityPolicy: isProduction
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"], // Ant Design用
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'", 'ws:', 'wss:'], // WebSocket用
            fontSrc: ["'self'", 'data:'],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        }
      : false, // 開発・テスト環境ではCSP無効化（Vite HMR対応）
    crossOriginEmbedderPolicy: false, // 開発環境での互換性
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);

// CORS設定（カンマ区切りの文字列を配列に変換）
const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3001')
  .split(',')
  .map((origin) => origin.trim());

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// HTTPリクエストロギング
if (process.env.NODE_ENV !== 'test') {
  app.use(
    morgan('combined', {
      stream: {
        write: (message: string) => logger.info(message.trim()),
      },
    })
  );
}

// レート制限（Redis-based）
app.use(apiLimiter);

// ヘルスチェックエンドポイント
app.get('/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// APIルートの登録
app.use(`${API_PREFIX}/auth`, authRoutes); // loginLimiterはauth.routes.tsで個別適用
app.use(`${API_PREFIX}/tickets`, ticketRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/knowledge`, knowledgeRoutes);
app.use(`${API_PREFIX}/approvals`, approvalRoutes);
app.use(`${API_PREFIX}/m365`, m365Routes);
app.use(`${API_PREFIX}/ai`, aiLimiter, aiRoutes); // AI APIは厳格なレート制限
app.use(`${API_PREFIX}/sla`, slaRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);

// 404ハンドラー
app.use(notFoundHandler);

// エラーハンドラー
app.use(errorHandler);

// HTTPサーバー作成（socket.io統合用）
const httpServer = createServer(app);

// WebSocket (socket.io) の初期化
initializeSocketServer(httpServer);

// サーバー起動
const startServer = async () => {
  try {
    // データベース接続確認
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.warn('Database connection failed. Server will start but DB operations may fail.');
      // データベースがない場合でも起動を続行（開発用）
    }

    httpServer.listen(PORT, '0.0.0.0', () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Listening on: 0.0.0.0:${PORT} (all interfaces)`);
      logger.info(`WebSocket: enabled`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API endpoint: http://localhost:${PORT}${API_PREFIX}`);
      logger.info(`Microsoft 365 integration: ${process.env.AZURE_TENANT_ID ? 'Configured' : 'Not configured'}`);

      // SLA通知cronジョブの開始（テスト環境では無効化）
      if (process.env.NODE_ENV !== 'test') {
        startSLAChecker();
      }
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  stopSLAChecker();
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  stopSLAChecker();
  process.exit(0);
});

// 未処理の例外・拒否のキャッチ
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

startServer();

export default app;
