/**
 * Rate Limit Middleware (Redis-based)
 *
 * DDoS攻撃対策、API使用量制限
 * テスト環境では緩和設定を使用
 */

import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../config/redis.config';
import { logger } from '../utils/logger';

// テスト環境かどうか
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.CI === 'true';

/**
 * 汎用APIレート制限
 * 100リクエスト/15分
 */
export const apiLimiter = rateLimit({
  store: new RedisStore({
    // @ts-ignore - rate-limit-redis型定義の互換性問題
    sendCommand: async (...args: Parameters<typeof redisClient.call>) => {
      return await redisClient.call(...args);
    },
    prefix: 'rl:api:',
  }),
  windowMs: 15 * 60 * 1000, // 15分
  max: isTestEnv ? 10000 : 100, // テスト環境では緩和
  message: {
    success: false,
    message: 'リクエスト数が上限を超えました。15分後に再試行してください。',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true, // RateLimit-* ヘッダー
  legacyHeaders: false, // X-RateLimit-* ヘッダー無効化
  handler: (req: Request, res: Response) => {
    logger.warn(`レート制限超過: ${req.ip} - ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'リクエスト数が上限を超えました。15分後に再試行してください。',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

/**
 * ログインレート制限
 * 5リクエスト/15分（ブルートフォース攻撃対策）
 */
export const loginLimiter = rateLimit({
  store: new RedisStore({
    // @ts-ignore - rate-limit-redis型定義の互換性問題
    sendCommand: async (...args: Parameters<typeof redisClient.call>) => {
      return await redisClient.call(...args);
    },
    prefix: 'rl:login:',
  }),
  windowMs: 15 * 60 * 1000, // 15分
  max: isTestEnv ? 1000 : 5, // テスト環境では緩和
  skipSuccessfulRequests: true, // 成功時はカウントしない
  message: {
    success: false,
    message: 'ログイン試行回数が上限を超えました。15分後に再試行してください。',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED',
  },
  handler: (req, res) => {
    logger.warn(`ログインレート制限超過: ${req.ip} - ${req.body.email}`);
    res.status(429).json({
      success: false,
      message: 'ログイン試行回数が上限を超えました。15分後に再試行してください。',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
    });
  },
});

/**
 * AI APIレート制限
 * 20リクエスト/時間（コスト管理）
 */
export const aiLimiter = rateLimit({
  store: new RedisStore({
    // @ts-ignore - rate-limit-redis型定義の互換性問題
    sendCommand: async (...args: Parameters<typeof redisClient.call>) => {
      return await redisClient.call(...args);
    },
    prefix: 'rl:ai:',
  }),
  windowMs: 60 * 60 * 1000, // 1時間
  max: isTestEnv ? 1000 : 20, // テスト環境では緩和
  message: {
    success: false,
    message: 'AI API使用回数が上限を超えました。1時間後に再試行してください。',
    code: 'AI_RATE_LIMIT_EXCEEDED',
  },
  handler: (req, res) => {
    logger.warn(`AI APIレート制限超過: ${req.ip} - ${req.path}`);
    res.status(429).json({
      success: false,
      message: 'AI API使用回数が上限を超えました。1時間後に再試行してください。',
      code: 'AI_RATE_LIMIT_EXCEEDED',
    });
  },
});

/**
 * ファイルアップロードレート制限
 * 10リクエスト/時間
 */
export const uploadLimiter = rateLimit({
  store: new RedisStore({
    // @ts-ignore - rate-limit-redis型定義の互換性問題
    sendCommand: async (...args: Parameters<typeof redisClient.call>) => {
      return await redisClient.call(...args);
    },
    prefix: 'rl:upload:',
  }),
  windowMs: 60 * 60 * 1000, // 1時間
  max: 10,
  message: {
    success: false,
    message: 'ファイルアップロード回数が上限を超えました。1時間後に再試行してください。',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED',
  },
});
