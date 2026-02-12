/**
 * Redis Configuration
 *
 * WebSocketセッション共有、レート制限、キャッシュ用のRedis設定
 */

import Redis from 'ioredis';
import { logger } from '../utils/logger';

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  db: parseInt(process.env.REDIS_DB || '0'),
  retryStrategy: (times: number) => {
    const delay = Math.min(times * 50, 2000);
    logger.warn(`Redis接続リトライ（${times}回目）、${delay}ms後に再試行`);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  lazyConnect: false,
};

// メインRedisクライアント
export const redisClient = new Redis(redisConfig);

redisClient.on('connect', () => {
  logger.info('✅ Redis接続開始');
});

redisClient.on('ready', () => {
  logger.info('✅ Redis準備完了');
});

redisClient.on('error', (err) => {
  logger.error('❌ Redisエラー:', err);
});

redisClient.on('close', () => {
  logger.warn('⚠️ Redis接続クローズ');
});

redisClient.on('reconnecting', () => {
  logger.info('🔄 Redis再接続中...');
});

// Pub/Sub用クライアント（Socket.IO用）
export const redisPubClient = redisClient.duplicate();
export const redisSubClient = redisClient.duplicate();

// キャッシュヘルパー関数
export class RedisCache {
  /**
   * キャッシュ取得
   */
  static async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redisClient.get(key);
      if (!value) return null;
      return JSON.parse(value) as T;
    } catch (error) {
      logger.error(`Redisキャッシュ取得エラー（key: ${key}）:`, error);
      return null;
    }
  }

  /**
   * キャッシュ設定
   */
  static async set(key: string, value: any, ttlSeconds: number = 3600): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      await redisClient.setex(key, ttlSeconds, serialized);
      return true;
    } catch (error) {
      logger.error(`Redisキャッシュ設定エラー（key: ${key}）:`, error);
      return false;
    }
  }

  /**
   * キャッシュ削除
   */
  static async del(key: string): Promise<boolean> {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      logger.error(`Redisキャッシュ削除エラー（key: ${key}）:`, error);
      return false;
    }
  }

  /**
   * パターンマッチでキャッシュ削除
   */
  static async delPattern(pattern: string): Promise<number> {
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length === 0) return 0;
      await redisClient.del(...keys);
      return keys.length;
    } catch (error) {
      logger.error(`Redisパターン削除エラー（pattern: ${pattern}）:`, error);
      return 0;
    }
  }
}

export default redisClient;
