import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import { login, logout, getCurrentUser } from './authService';

const API_BASE = 'http://localhost:3000/api';

// MSW サーバーセットアップ
const handlers = [
  http.post(`${API_BASE}/auth/login`, async ({ request }) => {
    const body = await request.json() as { email: string; password: string };

    if (body.email === 'test@example.com' && body.password === 'password123') {
      return HttpResponse.json({
        success: true,
        data: {
          token: 'mock-token',
          refreshToken: 'mock-refresh-token',
          user: {
            user_id: '1',
            email: 'test@example.com',
            display_name: 'Test User',
            role: 'Agent',
          },
        },
      });
    }

    return HttpResponse.json(
      { success: false, error: { message: '認証に失敗しました' } },
      { status: 401 }
    );
  }),

  http.get(`${API_BASE}/auth/me`, ({ request }) => {
    const authHeader = request.headers.get('Authorization');

    if (authHeader === 'Bearer mock-token') {
      return HttpResponse.json({
        success: true,
        data: {
          user: {
            user_id: '1',
            email: 'test@example.com',
            display_name: 'Test User',
            department: 'IT',
            role: 'Agent',
            status: 'active',
            created_at: '2026-01-01T00:00:00Z',
            updated_at: '2026-01-01T00:00:00Z',
          },
        },
      });
    }

    return HttpResponse.json(
      { success: false, error: { message: '認証が必要です' } },
      { status: 401 }
    );
  }),

  http.post(`${API_BASE}/auth/logout`, () => {
    return HttpResponse.json({
      success: true,
      data: { message: 'ログアウトしました' },
    });
  }),
];

const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterAll(() => server.close());
afterEach(() => server.resetHandlers());

describe('authService', () => {
  describe('login', () => {
    it('正しい認証情報でログイン成功', async () => {
      const result = await login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.success).toBe(true);
      expect(result.data?.token).toBe('mock-token');
      expect(result.data?.user.email).toBe('test@example.com');
    });

    it('誤った認証情報でログイン失敗', async () => {
      const result = await login({
        email: 'test@example.com',
        password: 'wrong-password',
      });

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('認証に失敗しました');
    });

    it('トークンとリフレッシュトークンが返される', async () => {
      const result = await login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.data?.token).toBeDefined();
      expect(result.data?.refreshToken).toBeDefined();
    });

    it('ユーザー情報が正しく返される', async () => {
      const result = await login({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.data?.user).toEqual({
        user_id: '1',
        email: 'test@example.com',
        display_name: 'Test User',
        role: 'Agent',
      });
    });
  });

  describe('getCurrentUser', () => {
    it('認証済みユーザー情報取得成功', async () => {
      // トークンをlocalStorageに設定
      localStorage.setItem('authToken', 'mock-token');

      const result = await getCurrentUser();

      expect(result.success).toBe(true);
      expect(result.data?.user.email).toBe('test@example.com');

      localStorage.removeItem('authToken');
    });

    it('ユーザー情報にすべてのフィールドが含まれる', async () => {
      localStorage.setItem('authToken', 'mock-token');

      const result = await getCurrentUser();

      expect(result.data?.user).toHaveProperty('user_id');
      expect(result.data?.user).toHaveProperty('email');
      expect(result.data?.user).toHaveProperty('display_name');
      expect(result.data?.user).toHaveProperty('department');
      expect(result.data?.user).toHaveProperty('role');
      expect(result.data?.user).toHaveProperty('status');
      expect(result.data?.user).toHaveProperty('created_at');
      expect(result.data?.user).toHaveProperty('updated_at');

      localStorage.removeItem('authToken');
    });

    it('未認証時に401エラー', async () => {
      const result = await getCurrentUser();

      expect(result.success).toBe(false);
      expect(result.error?.message).toBe('認証が必要です');
    });
  });

  describe('logout', () => {
    it('ログアウト成功', async () => {
      const result = await logout();

      expect(result.success).toBe(true);
      expect(result.data?.message).toBe('ログアウトしました');
    });
  });
});
