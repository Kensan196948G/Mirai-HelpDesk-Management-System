import express, { Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import { testConnection } from './config/database';
import { logger } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { rateLimit } from './middleware/rateLimit';

// ルートのインポート
import authRoutes from './routes/auth.routes';
import ticketRoutes from './routes/ticket.routes';
import userRoutes from './routes/user.routes';
import categoryRoutes from './routes/category.routes';
import knowledgeRoutes from './routes/knowledge.routes';
import approvalRoutes from './routes/approval.routes';
import m365Routes from './routes/m365.routes';

// 環境変数の読み込み
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const API_PREFIX = process.env.API_PREFIX || '/api';

// ミドルウェアの設定
app.use(helmet()); // セキュリティヘッダー
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:3001',
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

// レート制限
const rateLimitWindowMs = parseInt(
  process.env.RATE_LIMIT_WINDOW_MS || '900000'
); // 15分
const rateLimitMaxRequests = parseInt(
  process.env.RATE_LIMIT_MAX_REQUESTS || '100'
);

app.use(
  rateLimit({
    windowMs: rateLimitWindowMs,
    maxRequests: rateLimitMaxRequests,
  })
);

// ヘルスチェックエンドポイント
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// APIルートの登録
app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/tickets`, ticketRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/categories`, categoryRoutes);
app.use(`${API_PREFIX}/knowledge`, knowledgeRoutes);
app.use(`${API_PREFIX}/approvals`, approvalRoutes);
app.use(`${API_PREFIX}/m365`, m365Routes);

// 404ハンドラー
app.use(notFoundHandler);

// エラーハンドラー
app.use(errorHandler);

// サーバー起動
const startServer = async () => {
  try {
    // データベース接続確認
    const dbConnected = await testConnection();
    if (!dbConnected) {
      logger.warn('Database connection failed. Server will start but DB operations may fail.');
      // データベースがない場合でも起動を続行（開発用）
    }

    app.listen(PORT, () => {
      logger.info(`Server is running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
      logger.info(`API endpoint: http://localhost:${PORT}${API_PREFIX}`);
      logger.info(`Microsoft 365 integration: ${process.env.AZURE_TENANT_ID ? 'Configured' : 'Not configured'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// グレースフルシャットダウン
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
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
