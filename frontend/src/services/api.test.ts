import { describe, it, expect, beforeEach, vi } from 'vitest';
import { apiRequest, apiClient } from './api';
import { useAuthStore } from '@store/authStore';

describe('api', () => {
  beforeEach(() => {
    // ストアをリセット
    useAuthStore.setState({ token: null, user: null, refreshToken: null });
  });

  describe('apiRequest', () => {
    it('GET リクエストが成功する', async () => {
      const result = await apiRequest({
        method: 'GET',
        url: '/tickets',
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('POST リクエストが成功する', async () => {
      const result = await apiRequest({
        method: 'POST',
        url: '/tickets',
        data: {
          type: 'インシデント',
          subject: 'テスト',
          description: 'テスト説明',
          impact: '個人',
          urgency: '中',
        },
      });

      expect(result.success).toBe(true);
    });

    it('PATCH リクエストが成功する', async () => {
      const result = await apiRequest({
        method: 'PATCH',
        url: '/tickets/1',
        data: {
          status: 'In Progress',
        },
      });

      expect(result.success).toBe(true);
    });

    it('クエリパラメータが正しく送信される', async () => {
      const result = await apiRequest({
        method: 'GET',
        url: '/tickets',
        params: {
          status: 'New',
          priority: 'P2',
        },
      });

      expect(result.success).toBe(true);
    });

    it('エラーレスポンスを正しく処理する', async () => {
      const result = await apiRequest({
        method: 'GET',
        url: '/nonexistent',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('apiClient interceptors', () => {
    it('認証トークンがヘッダーに追加される', async () => {
      useAuthStore.setState({ token: 'test-token' });

      const requestSpy = vi.spyOn(apiClient, 'request');

      await apiRequest({
        method: 'GET',
        url: '/tickets',
      });

      const lastCall = requestSpy.mock.calls[requestSpy.mock.calls.length - 1];
      expect(lastCall[0].headers?.Authorization).toBe('Bearer test-token');

      requestSpy.mockRestore();
    });

    it('トークンがない場合はヘッダーに追加されない', async () => {
      useAuthStore.setState({ token: null });

      const requestSpy = vi.spyOn(apiClient, 'request');

      await apiRequest({
        method: 'GET',
        url: '/tickets',
      });

      const lastCall = requestSpy.mock.calls[requestSpy.mock.calls.length - 1];
      expect(lastCall[0].headers?.Authorization).toBeUndefined();

      requestSpy.mockRestore();
    });
  });

  describe('ApiResponse structure', () => {
    it('成功レスポンスに success フィールドが含まれる', async () => {
      const result = await apiRequest({
        method: 'GET',
        url: '/tickets',
      });

      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });

    it('成功レスポンスに data フィールドが含まれる', async () => {
      const result = await apiRequest({
        method: 'GET',
        url: '/tickets',
      });

      if (result.success) {
        expect(result).toHaveProperty('data');
      }
    });

    it('エラーレスポンスに error フィールドが含まれる', async () => {
      const result = await apiRequest({
        method: 'POST',
        url: '/auth/login',
        data: {
          email: 'invalid@example.com',
          password: 'wrong',
        },
      });

      if (!result.success) {
        expect(result).toHaveProperty('error');
        expect(result.error).toHaveProperty('message');
      }
    });
  });
});
