import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// シンプルなレート制限ミドルウェア（本番環境では Redis などを使用推奨）
export const rateLimit = (options: {
  windowMs: number;
  maxRequests: number;
}) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip || 'unknown';
    const now = Date.now();

    if (!store[key] || now > store[key].resetTime) {
      store[key] = {
        count: 1,
        resetTime: now + options.windowMs,
      };
      return next();
    }

    store[key].count++;

    if (store[key].count > options.maxRequests) {
      const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);
      throw new AppError(
        'Too many requests, please try again later',
        429,
        'RATE_LIMIT_EXCEEDED'
      );
    }

    next();
  };
};

// クリーンアップタスク（定期的に古いエントリを削除）
setInterval(() => {
  const now = Date.now();
  for (const key in store) {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  }
}, 60000); // 1分ごと
