/**
 * Redis Integration Tests
 *
 * Redis接続、キャッシュ、レート制限の統合テスト
 */

import redisClient, { RedisCache, redisPubClient, redisSubClient } from '../../../src/config/redis.config';

describe('Redis Integration Tests', () => {
  beforeAll(async () => {
    // Redis接続待機
    await new Promise((resolve) => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Redis接続クローズ
    await redisClient.quit();
    await redisPubClient.quit();
    await redisSubClient.quit();
  });

  describe('Redis接続', () => {
    it('should connect to Redis', async () => {
      const pong = await redisClient.ping();
      expect(pong).toBe('PONG');
    });

    it('should have Pub/Sub clients ready', async () => {
      const pubPong = await redisPubClient.ping();
      const subPong = await redisSubClient.ping();
      expect(pubPong).toBe('PONG');
      expect(subPong).toBe('PONG');
    });
  });

  describe('RedisCache', () => {
    const testKey = 'test:cache:key';
    const testValue = { id: 1, name: 'Test User', email: 'test@example.com' };

    afterEach(async () => {
      // テスト後にキーを削除
      await RedisCache.del(testKey);
    });

    it('should set and get cache', async () => {
      const setResult = await RedisCache.set(testKey, testValue, 60);
      expect(setResult).toBe(true);

      const cachedValue = await RedisCache.get<typeof testValue>(testKey);
      expect(cachedValue).toEqual(testValue);
    });

    it('should return null for non-existent key', async () => {
      const cachedValue = await RedisCache.get('non:existent:key');
      expect(cachedValue).toBeNull();
    });

    it('should expire after TTL', async () => {
      await RedisCache.set(testKey, testValue, 1); // 1秒でexpire

      // 即座に取得（存在するはず）
      let cachedValue = await RedisCache.get<typeof testValue>(testKey);
      expect(cachedValue).toEqual(testValue);

      // 2秒待機
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // もう一度取得（expireしているはず）
      cachedValue = await RedisCache.get<typeof testValue>(testKey);
      expect(cachedValue).toBeNull();
    }, 10000); // タイムアウト10秒

    it('should delete cache', async () => {
      await RedisCache.set(testKey, testValue, 60);

      const deleteResult = await RedisCache.del(testKey);
      expect(deleteResult).toBe(true);

      const cachedValue = await RedisCache.get(testKey);
      expect(cachedValue).toBeNull();
    });

    it('should delete cache by pattern', async () => {
      // 複数のキーを作成
      await RedisCache.set('test:pattern:1', { id: 1 }, 60);
      await RedisCache.set('test:pattern:2', { id: 2 }, 60);
      await RedisCache.set('test:pattern:3', { id: 3 }, 60);

      // パターンマッチで削除
      const deletedCount = await RedisCache.delPattern('test:pattern:*');
      expect(deletedCount).toBe(3);

      // 削除確認
      const value1 = await RedisCache.get('test:pattern:1');
      const value2 = await RedisCache.get('test:pattern:2');
      const value3 = await RedisCache.get('test:pattern:3');
      expect(value1).toBeNull();
      expect(value2).toBeNull();
      expect(value3).toBeNull();
    });
  });

  describe('基本的なRedis操作', () => {
    it('should set and get string', async () => {
      await redisClient.set('test:string', 'Hello Redis', 'EX', 60);
      const value = await redisClient.get('test:string');
      expect(value).toBe('Hello Redis');
      await redisClient.del('test:string');
    });

    it('should increment counter', async () => {
      const key = 'test:counter';
      await redisClient.set(key, 0);

      await redisClient.incr(key);
      await redisClient.incr(key);
      await redisClient.incr(key);

      const value = await redisClient.get(key);
      expect(value).toBe('3');

      await redisClient.del(key);
    });

    it('should work with hash', async () => {
      const key = 'test:hash';
      await redisClient.hset(key, 'field1', 'value1');
      await redisClient.hset(key, 'field2', 'value2');

      const value1 = await redisClient.hget(key, 'field1');
      const value2 = await redisClient.hget(key, 'field2');

      expect(value1).toBe('value1');
      expect(value2).toBe('value2');

      await redisClient.del(key);
    });
  });
});
