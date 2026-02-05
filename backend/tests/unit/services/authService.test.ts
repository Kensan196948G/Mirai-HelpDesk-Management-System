import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRole } from '../../../src/types';

// モック設定（importより前に定義する必要がある）
const mockFindByEmail = jest.fn();
const mockVerifyPassword = jest.fn();
const mockUpdateLastLogin = jest.fn();
const mockFindById = jest.fn();
const mockCreateUser = jest.fn();

jest.mock('../../../src/models/user.model', () => ({
  UserModel: {
    findByEmail: mockFindByEmail,
    verifyPassword: mockVerifyPassword,
    updateLastLogin: mockUpdateLastLogin,
    findById: mockFindById,
    create: mockCreateUser,
  },
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  logAudit: jest.fn(),
}));

jest.mock('../../../src/websocket/socketServer', () => ({
  emitTicketCreated: jest.fn(),
  emitTicketUpdated: jest.fn(),
  emitTicketComment: jest.fn(),
}));

import { AuthController } from '../../../src/controllers/auth.controller';
import { AppError } from '../../../src/middleware/errorHandler';

const TEST_SECRET = 'test-jwt-secret-auth-service';

// asyncHandler が返す同期関数は内部でPromiseチェーンを使うため、
// await だけでは内部の .catch(next) が完了しない。
// flushPromises でマイクロタスクキューを全て処理する。
function flushPromises(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

function createMockReq(body: any = {}, overrides: Partial<Request> = {}): Request {
  return {
    body,
    headers: {},
    ip: '127.0.0.1',
    path: '/test',
    ...overrides,
  } as Request;
}

function createMockRes(): Response {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

describe('AuthController', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, JWT_SECRET: TEST_SECRET };
    jest.clearAllMocks();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('login', () => {
    const mockUser = {
      user_id: 'user-001',
      email: 'admin@example.com',
      display_name: 'Admin User',
      department: 'IT',
      role: UserRole.MANAGER,
      password_hash: '$2b$10$hashed',
    };

    it('正しい資格情報でログイン成功', async () => {
      mockFindByEmail.mockResolvedValue(mockUser);
      mockVerifyPassword.mockResolvedValue(true);
      mockUpdateLastLogin.mockResolvedValue(undefined);

      const req = createMockReq({ email: 'admin@example.com', password: 'Admin123!' });
      const res = createMockRes();
      const next = jest.fn();

      AuthController.login(req, res, next);
      await flushPromises();

      expect(mockFindByEmail).toHaveBeenCalledWith('admin@example.com');
      expect(mockVerifyPassword).toHaveBeenCalledWith('Admin123!', '$2b$10$hashed');
      expect(mockUpdateLastLogin).toHaveBeenCalledWith('user-001');

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            token: expect.any(String),
            refreshToken: expect.any(String),
            user: expect.objectContaining({
              user_id: 'user-001',
              email: 'admin@example.com',
              role: UserRole.MANAGER,
            }),
          }),
        })
      );
    });

    it('メールアドレスなしで400エラー', async () => {
      const req = createMockReq({ password: 'Admin123!' });
      const res = createMockRes();
      const next = jest.fn();

      AuthController.login(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('MISSING_CREDENTIALS');
    });

    it('パスワードなしで400エラー', async () => {
      const req = createMockReq({ email: 'admin@example.com' });
      const res = createMockRes();
      const next = jest.fn();

      AuthController.login(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(400);
    });

    it('存在しないメールアドレスで401エラー', async () => {
      mockFindByEmail.mockResolvedValue(null);

      const req = createMockReq({ email: 'unknown@example.com', password: 'pass' });
      const res = createMockRes();
      const next = jest.fn();

      AuthController.login(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_CREDENTIALS');
    });

    it('パスワード不一致で401エラー', async () => {
      mockFindByEmail.mockResolvedValue(mockUser);
      mockVerifyPassword.mockResolvedValue(false);

      const req = createMockReq({ email: 'admin@example.com', password: 'wrong' });
      const res = createMockRes();
      const next = jest.fn();

      AuthController.login(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_CREDENTIALS');
    });

    it('レスポンスにpassword_hashが含まれない', async () => {
      mockFindByEmail.mockResolvedValue(mockUser);
      mockVerifyPassword.mockResolvedValue(true);
      mockUpdateLastLogin.mockResolvedValue(undefined);

      const req = createMockReq({ email: 'admin@example.com', password: 'Admin123!' });
      const res = createMockRes();
      const next = jest.fn();

      AuthController.login(req, res, next);
      await flushPromises();

      const responseData = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseData.data.user).not.toHaveProperty('password_hash');
    });
  });

  describe('register', () => {
    it('新規ユーザー登録成功', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue({
        user_id: 'user-new',
        email: 'new@example.com',
        display_name: 'New User',
        department: 'IT',
        role: UserRole.REQUESTER,
        password_hash: '$2b$10$hashed',
      });

      const req = createMockReq({
        email: 'new@example.com',
        display_name: 'New User',
        department: 'IT',
        password: 'Pass123!',
      });
      const res = createMockRes();
      const next = jest.fn();

      AuthController.register(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.not.objectContaining({ password_hash: expect.any(String) }),
          }),
        })
      );
    });

    it('必須項目なしで400エラー', async () => {
      const req = createMockReq({ email: 'new@example.com' }); // display_name, password なし
      const res = createMockRes();
      const next = jest.fn();

      AuthController.register(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('MISSING_FIELDS');
    });

    it('メールアドレス重複で409エラー', async () => {
      mockFindByEmail.mockResolvedValue({ user_id: 'existing-user' });

      const req = createMockReq({
        email: 'existing@example.com',
        display_name: 'User',
        password: 'Pass123!',
      });
      const res = createMockRes();
      const next = jest.fn();

      AuthController.register(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(409);
      expect(error.code).toBe('EMAIL_EXISTS');
    });

    it('ロール未指定時はREQUESTERがデフォルト', async () => {
      mockFindByEmail.mockResolvedValue(null);
      mockCreateUser.mockResolvedValue({
        user_id: 'user-new',
        email: 'new@example.com',
        display_name: 'New User',
        role: UserRole.REQUESTER,
      });

      const req = createMockReq({
        email: 'new@example.com',
        display_name: 'New User',
        password: 'Pass123!',
        // role は指定しない
      });
      const res = createMockRes();
      const next = jest.fn();

      AuthController.register(req, res, next);
      await flushPromises();

      expect(mockCreateUser).toHaveBeenCalledWith(
        expect.objectContaining({
          role: UserRole.REQUESTER,
        })
      );
    });
  });

  describe('getCurrentUser', () => {
    it('認証済みユーザーの情報を返す', async () => {
      const mockUserData = {
        user_id: 'user-001',
        email: 'admin@example.com',
        display_name: 'Admin User',
        role: UserRole.MANAGER,
        password_hash: '$2b$10$hashed',
      };
      mockFindById.mockResolvedValue(mockUserData);

      const req = createMockReq();
      req.user = { user_id: 'user-001', email: 'admin@example.com', role: UserRole.MANAGER };
      const res = createMockRes();
      const next = jest.fn();

      AuthController.getCurrentUser(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            user: expect.not.objectContaining({ password_hash: expect.any(String) }),
          }),
        })
      );
    });

    it('未認証で401エラー', async () => {
      const req = createMockReq();
      // req.user を設定しない
      const res = createMockRes();
      const next = jest.fn();

      AuthController.getCurrentUser(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
    });

    it('ユーザーが見つからない場合は404エラー', async () => {
      mockFindById.mockResolvedValue(null);

      const req = createMockReq();
      req.user = { user_id: 'deleted-user', email: 'test@example.com', role: UserRole.REQUESTER };
      const res = createMockRes();
      const next = jest.fn();

      AuthController.getCurrentUser(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(404);
    });
  });

  describe('refreshToken', () => {
    it('有効なリフレッシュトークンで新しいトークンペアを返す', async () => {
      const refreshToken = jwt.sign(
        { user_id: 'user-001', type: 'refresh' },
        TEST_SECRET,
        { expiresIn: '7d' }
      );

      mockFindById.mockResolvedValue({
        user_id: 'user-001',
        email: 'admin@example.com',
        display_name: 'Admin User',
        department: 'IT',
        role: UserRole.MANAGER,
      });

      const req = createMockReq({ refreshToken });
      const res = createMockRes();
      const next = jest.fn();

      AuthController.refreshToken(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            token: expect.any(String),
            refreshToken: expect.any(String),
            user: expect.objectContaining({ user_id: 'user-001' }),
          }),
        })
      );
    });

    it('リフレッシュトークンなしで400エラー', async () => {
      const req = createMockReq({});
      const res = createMockRes();
      const next = jest.fn();

      AuthController.refreshToken(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('MISSING_REFRESH_TOKEN');
    });

    it('不正なトークンタイプ（accessトークン）で401エラー', async () => {
      // type='refresh'ではないトークン
      const accessToken = jwt.sign(
        { user_id: 'user-001', email: 'test@example.com', role: UserRole.AGENT },
        TEST_SECRET,
        { expiresIn: '24h' }
      );

      const req = createMockReq({ refreshToken: accessToken });
      const res = createMockRes();
      const next = jest.fn();

      AuthController.refreshToken(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(401);
      expect(error.code).toBe('INVALID_TOKEN_TYPE');
    });

    it('存在しないユーザーのリフレッシュトークンで404エラー', async () => {
      const refreshToken = jwt.sign(
        { user_id: 'deleted-user', type: 'refresh' },
        TEST_SECRET,
        { expiresIn: '7d' }
      );

      mockFindById.mockResolvedValue(null);

      const req = createMockReq({ refreshToken });
      const res = createMockRes();
      const next = jest.fn();

      AuthController.refreshToken(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(404);
    });
  });

  describe('logout', () => {
    it('認証済みユーザーのログアウト成功', async () => {
      const req = createMockReq();
      req.user = { user_id: 'user-001', email: 'test@example.com', role: UserRole.AGENT };
      const res = createMockRes();
      const next = jest.fn();

      AuthController.logout(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: 'Logged out successfully',
        })
      );
    });

    it('未認証でもログアウトは成功（エラーにならない）', async () => {
      const req = createMockReq();
      const res = createMockRes();
      const next = jest.fn();

      AuthController.logout(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });
});
