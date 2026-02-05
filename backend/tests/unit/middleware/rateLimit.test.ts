import { Request, Response, NextFunction } from 'express';

// rateLimit モジュールを動的にインポートするため、各テストでNODE_ENVを設定してから require する
function createMockReq(ip: string = '127.0.0.1'): Request {
  return {
    ip,
    headers: {},
    path: '/test',
    method: 'GET',
  } as Request;
}

function createMockRes(): Response {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('rateLimit', () => {
  const originalEnv = process.env.NODE_ENV;

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    // モジュールキャッシュをクリア（rateLimit内のstoreをリセット）
    jest.resetModules();
  });

  it('制限内のリクエストは通過させる', () => {
    process.env.NODE_ENV = 'production';
    // resetModules後に再importが必要
    const { rateLimit } = require('../../../src/middleware/rateLimit');

    const middleware = rateLimit({ windowMs: 60000, maxRequests: 5 });
    const req = createMockReq('10.0.0.1');
    const res = createMockRes();
    const next = jest.fn();

    middleware(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it('制限超過でRATE_LIMIT_EXCEEDEDエラーをスロー', () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { rateLimit } = require('../../../src/middleware/rateLimit');

    const middleware = rateLimit({ windowMs: 60000, maxRequests: 2 });
    const ip = '10.0.0.2';

    // 2回は通過
    for (let i = 0; i < 2; i++) {
      const req = createMockReq(ip);
      const res = createMockRes();
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    }

    // 3回目でブロック
    const req = createMockReq(ip);
    const res = createMockRes();
    const next = jest.fn();

    // jest.resetModules()によりrateLimit内部のAppErrorはテスト冒頭importとは
    // 別インスタンスになるため、メッセージ文字列でマッチさせる
    expect(() => middleware(req, res, next)).toThrow('Too many requests');

    // ステータスコード429を確認
    try {
      middleware(createMockReq(ip), createMockRes(), jest.fn());
    } catch (e: any) {
      expect(e.statusCode).toBe(429);
      expect(e.code).toBe('RATE_LIMIT_EXCEEDED');
    }
  });

  it('異なるIPは別カウント', () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { rateLimit } = require('../../../src/middleware/rateLimit');

    const middleware = rateLimit({ windowMs: 60000, maxRequests: 1 });

    // IP-A: 1回目通過
    const req1 = createMockReq('10.0.0.10');
    const res1 = createMockRes();
    const next1 = jest.fn();
    middleware(req1, res1, next1);
    expect(next1).toHaveBeenCalled();

    // IP-B: 1回目通過（別カウント）
    const req2 = createMockReq('10.0.0.11');
    const res2 = createMockRes();
    const next2 = jest.fn();
    middleware(req2, res2, next2);
    expect(next2).toHaveBeenCalled();
  });

  it('開発環境ではmaxRequestsが100倍に緩和される', () => {
    process.env.NODE_ENV = 'development';
    jest.resetModules();
    const { rateLimit } = require('../../../src/middleware/rateLimit');

    const middleware = rateLimit({ windowMs: 60000, maxRequests: 1 });

    // 本番なら1回で制限だが、開発環境では100回まで許可
    const ip = '10.0.0.20';
    for (let i = 0; i < 50; i++) {
      const req = createMockReq(ip);
      const res = createMockRes();
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it('テスト環境でもmaxRequestsが100倍に緩和される', () => {
    process.env.NODE_ENV = 'test';
    jest.resetModules();
    const { rateLimit } = require('../../../src/middleware/rateLimit');

    const middleware = rateLimit({ windowMs: 60000, maxRequests: 1 });

    const ip = '10.0.0.30';
    for (let i = 0; i < 50; i++) {
      const req = createMockReq(ip);
      const res = createMockRes();
      const next = jest.fn();
      middleware(req, res, next);
      expect(next).toHaveBeenCalled();
    }
  });

  it('Retry-Afterヘッダが設定される', () => {
    process.env.NODE_ENV = 'production';
    jest.resetModules();
    const { rateLimit } = require('../../../src/middleware/rateLimit');

    const middleware = rateLimit({ windowMs: 60000, maxRequests: 1 });
    const ip = '10.0.0.40';

    // 1回目通過
    middleware(createMockReq(ip), createMockRes(), jest.fn());

    // 2回目でブロック
    const res = createMockRes();
    try {
      middleware(createMockReq(ip), res, jest.fn());
    } catch (e) {
      // Retry-Afterヘッダが設定されているか確認
      expect(res.setHeader).toHaveBeenCalledWith('Retry-After', expect.any(Number));
    }
  });
});
