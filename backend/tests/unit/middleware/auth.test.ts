import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, authorize, generateToken, generateRefreshToken } from '../../../src/middleware/auth';
import { AppError } from '../../../src/middleware/errorHandler';
import { UserRole } from '../../../src/types';

// logger をモック化（コンソール出力抑制）
jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  logAudit: jest.fn(),
}));

// Express の Request/Response/NextFunction モックファクトリ
function createMockReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    path: '/test',
    ...overrides,
  } as Request;
}

function createMockRes(): Response {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res as Response;
}

const TEST_SECRET = 'test-jwt-secret-for-unit-tests';

describe('Auth Middleware', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, JWT_SECRET: TEST_SECRET };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('authenticate', () => {
    it('有効なBearerトークンでreq.userを設定する', () => {
      const payload = {
        user_id: 'user-001',
        email: 'test@example.com',
        role: UserRole.AGENT,
      };
      const token = jwt.sign(payload, TEST_SECRET, { expiresIn: '1h' });

      const req = createMockReq({
        headers: { authorization: `Bearer ${token}` } as any,
      });
      const res = createMockRes();
      const next = jest.fn();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(req.user).toBeDefined();
      expect(req.user!.user_id).toBe('user-001');
      expect(req.user!.email).toBe('test@example.com');
      expect(req.user!.role).toBe(UserRole.AGENT);
    });

    it('Authorizationヘッダなしでnextにエラーを渡す', () => {
      const req = createMockReq({ headers: {} as any });
      const res = createMockRes();
      const next = jest.fn();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('UNAUTHORIZED');
    });

    it('Bearer 以外のスキームでエラー', () => {
      const req = createMockReq({
        headers: { authorization: 'Basic abc123' } as any,
      });
      const res = createMockRes();
      const next = jest.fn();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
    });

    it('不正なトークンでINVALID_TOKENエラー', () => {
      const req = createMockReq({
        headers: { authorization: 'Bearer invalid.token.here' } as any,
      });
      const res = createMockRes();
      const next = jest.fn();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_TOKEN');
    });

    it('期限切れトークンでTOKEN_EXPIREDエラー', () => {
      const token = jwt.sign(
        { user_id: 'user-001', email: 'test@example.com', role: UserRole.AGENT },
        TEST_SECRET,
        { expiresIn: '0s' } // 即座に期限切れ
      );

      // 少し待ってからテスト
      const req = createMockReq({
        headers: { authorization: `Bearer ${token}` } as any,
      });
      const res = createMockRes();
      const next = jest.fn();

      // トークンが期限切れになるまで少し待つ
      setTimeout(() => {
        authenticate(req, res, next);
        expect(next).toHaveBeenCalledWith(expect.any(AppError));
        const error = next.mock.calls[0][0] as AppError;
        expect(error.statusCode).toBe(401);
        expect(error.code).toBe('TOKEN_EXPIRED');
      }, 1100);
    });

    it('JWT_SECRET未設定でCONFIG_ERRORエラー', () => {
      delete process.env.JWT_SECRET;
      const token = jwt.sign(
        { user_id: 'user-001', email: 'test@example.com', role: UserRole.AGENT },
        TEST_SECRET,
        { expiresIn: '1h' }
      );

      const req = createMockReq({
        headers: { authorization: `Bearer ${token}` } as any,
      });
      const res = createMockRes();
      const next = jest.fn();

      authenticate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(500);
      expect(error.code).toBe('CONFIG_ERROR');
    });
  });

  describe('authorize', () => {
    it('許可されたロールでnextを呼ぶ', () => {
      const req = createMockReq();
      req.user = { user_id: 'user-001', email: 'test@example.com', role: UserRole.AGENT };
      const res = createMockRes();
      const next = jest.fn();

      const middleware = authorize(UserRole.AGENT, UserRole.MANAGER);
      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('許可されていないロールでFORBIDDENエラー', () => {
      const req = createMockReq();
      req.user = { user_id: 'user-001', email: 'test@example.com', role: UserRole.REQUESTER };
      const res = createMockRes();
      const next = jest.fn();

      const middleware = authorize(UserRole.AGENT, UserRole.MANAGER);

      expect(() => middleware(req, res, next)).toThrow(AppError);
      expect(() => middleware(req, res, next)).toThrow('You do not have permission');
    });

    it('未認証ユーザー（req.userなし）でUNAUTHORIZEDエラー', () => {
      const req = createMockReq();
      // req.user を設定しない
      const res = createMockRes();
      const next = jest.fn();

      const middleware = authorize(UserRole.AGENT);

      expect(() => middleware(req, res, next)).toThrow(AppError);
      expect(() => middleware(req, res, next)).toThrow('User not authenticated');
    });

    it('全ロールに対して正しく判定（6ロール全テスト）', () => {
      const allRoles = Object.values(UserRole);

      allRoles.forEach((role) => {
        const req = createMockReq();
        req.user = { user_id: 'user-001', email: 'test@example.com', role };
        const res = createMockRes();
        const next = jest.fn();

        // 自分のロールだけ許可
        const middleware = authorize(role);
        middleware(req, res, next);
        expect(next).toHaveBeenCalledWith();
      });
    });
  });

  describe('generateToken', () => {
    it('有効なJWTトークンを生成する', () => {
      const user = {
        user_id: 'user-001',
        email: 'test@example.com',
        role: UserRole.AGENT,
      };

      const token = generateToken(user);
      expect(typeof token).toBe('string');

      // デコードして内容を確認
      const decoded = jwt.verify(token, TEST_SECRET) as any;
      expect(decoded.user_id).toBe('user-001');
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBe(UserRole.AGENT);
    });

    it('JWT_SECRET未設定でエラーをスロー', () => {
      delete process.env.JWT_SECRET;

      const user = {
        user_id: 'user-001',
        email: 'test@example.com',
        role: UserRole.AGENT,
      };

      expect(() => generateToken(user)).toThrow(AppError);
      expect(() => generateToken(user)).toThrow('JWT secret not configured');
    });

    it('デフォルトの有効期限は24h', () => {
      delete process.env.JWT_EXPIRES_IN;
      process.env.JWT_SECRET = TEST_SECRET;

      const user = {
        user_id: 'user-001',
        email: 'test@example.com',
        role: UserRole.AGENT,
      };

      const token = generateToken(user);
      const decoded = jwt.decode(token) as any;

      // exp - iat が約24時間（86400秒）であることを確認
      const diff = decoded.exp - decoded.iat;
      expect(diff).toBe(86400);
    });
  });

  describe('generateRefreshToken', () => {
    it('リフレッシュトークンにtype=refreshが含まれる', () => {
      const token = generateRefreshToken('user-001');
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, TEST_SECRET) as any;
      expect(decoded.user_id).toBe('user-001');
      expect(decoded.type).toBe('refresh');
    });

    it('デフォルトの有効期限は7日', () => {
      delete process.env.JWT_REFRESH_EXPIRES_IN;
      process.env.JWT_SECRET = TEST_SECRET;

      const token = generateRefreshToken('user-001');
      const decoded = jwt.decode(token) as any;

      // exp - iat が約7日（604800秒）であることを確認
      const diff = decoded.exp - decoded.iat;
      expect(diff).toBe(604800);
    });

    it('JWT_SECRET未設定でエラーをスロー', () => {
      delete process.env.JWT_SECRET;

      expect(() => generateRefreshToken('user-001')).toThrow(AppError);
    });
  });
});
