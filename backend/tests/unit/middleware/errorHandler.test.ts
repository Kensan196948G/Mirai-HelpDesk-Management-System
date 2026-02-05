import { Request, Response, NextFunction } from 'express';
import { AppError, errorHandler, asyncHandler, notFoundHandler } from '../../../src/middleware/errorHandler';

// logger をモック化
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  logAudit: jest.fn(),
}));

function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    path: '/test',
    method: 'GET',
    ...overrides,
  } as Request;
}

function createMockRes(): Response & { _status?: number; _json?: any } {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('AppError', () => {
  it('正しいプロパティで生成される', () => {
    const error = new AppError('Test error', 400, 'TEST_CODE');
    expect(error.message).toBe('Test error');
    expect(error.statusCode).toBe(400);
    expect(error.code).toBe('TEST_CODE');
    expect(error.isOperational).toBe(true);
    expect(error).toBeInstanceOf(Error);
  });

  it('デフォルトのステータスコードは500', () => {
    const error = new AppError('Server error');
    expect(error.statusCode).toBe(500);
  });

  it('codeはオプショナル', () => {
    const error = new AppError('Error', 400);
    expect(error.code).toBeUndefined();
  });
});

describe('errorHandler', () => {
  it('AppErrorのステータスコードとメッセージを返す', () => {
    const error = new AppError('Not found', 404, 'NOT_FOUND');
    const req = createMockReq();
    const res = createMockRes();
    const next = jest.fn();

    errorHandler(error, req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'NOT_FOUND',
          message: 'Not found',
        }),
      })
    );
  });

  it('通常のErrorは500 Internal Server Errorとして扱う', () => {
    const error = new Error('Something broke');
    const req = createMockReq();
    const res = createMockRes();
    const next = jest.fn();

    errorHandler(error, req, res as any, next);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Internal server error',
        }),
      })
    );
  });

  it('本番環境ではスタックトレースを含めない', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const error = new AppError('Error', 500, 'ERROR');
    const req = createMockReq();
    const res = createMockRes();
    const next = jest.fn();

    errorHandler(error, req, res as any, next);

    const responseBody = (res.json as jest.Mock).mock.calls[0][0];
    expect(responseBody.error.stack).toBeUndefined();

    process.env.NODE_ENV = originalEnv;
  });

  it('開発環境ではスタックトレースを含む', () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const error = new AppError('Error', 500, 'ERROR');
    const req = createMockReq();
    const res = createMockRes();
    const next = jest.fn();

    errorHandler(error, req, res as any, next);

    const responseBody = (res.json as jest.Mock).mock.calls[0][0];
    expect(responseBody.error.stack).toBeDefined();

    process.env.NODE_ENV = originalEnv;
  });
});

describe('asyncHandler', () => {
  it('正常な非同期関数をラップする', async () => {
    const handler = asyncHandler(async (req, res, next) => {
      res.json({ success: true });
    });

    const req = createMockReq();
    const res = createMockRes();
    const next = jest.fn();

    await handler(req, res as any, next);

    expect(res.json).toHaveBeenCalledWith({ success: true });
    expect(next).not.toHaveBeenCalled();
  });

  it('非同期関数のエラーをnextに渡す', async () => {
    const error = new AppError('Async error', 400);
    const handler = asyncHandler(async (req, res, next) => {
      throw error;
    });

    const req = createMockReq();
    const res = createMockRes();
    const next = jest.fn();

    await handler(req, res as any, next);

    // Promiseが解決されるのを待つ
    await new Promise(resolve => setTimeout(resolve, 0));

    expect(next).toHaveBeenCalledWith(error);
  });
});

describe('notFoundHandler', () => {
  it('404 ROUTE_NOT_FOUND エラーをnextに渡す', () => {
    const req = createMockReq({ method: 'GET', path: '/nonexistent' });
    const res = createMockRes();
    const next = jest.fn();

    notFoundHandler(req, res as any, next);

    expect(next).toHaveBeenCalledWith(expect.any(AppError));
    const error = next.mock.calls[0][0] as AppError;
    expect(error.statusCode).toBe(404);
    expect(error.code).toBe('ROUTE_NOT_FOUND');
    expect(error.message).toContain('GET');
    expect(error.message).toContain('/nonexistent');
  });
});
