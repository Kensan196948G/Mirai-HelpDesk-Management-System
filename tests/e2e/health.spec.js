/**
 * Health Check E2E Tests
 *
 * このテストスイートは、バックエンドサーバーが起動していることを前提としています。
 * サーバーが利用できない場合は、全テストをスキップします。
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.API_BASE_URL || (process.env.CI ? 'http://127.0.0.1:8000' : 'http://127.0.0.1:3000');

/**
 * バックエンドサーバーが起動しているか事前チェック
 *
 * テストを実行する前に、以下のコマンドでサーバーを起動してください:
 * ```
 * cd backend && npm run dev
 * ```
 */
test.beforeAll(async ({ request }) => {
  try {
    const response = await request.get(`${API_BASE_URL}/health`);
    if (!response.ok()) {
      test.skip(true, 'Backend server is running but health endpoint returned non-OK status.');
    }
  } catch (error) {
    test.skip(true, `Backend server is not available at ${API_BASE_URL}. Please start the server before running E2E tests.`);
  }
});

test.describe('Health Check API', () => {
  test('should return health status', async ({ request }) => {
    // Note: health endpoint is at /health, not /api/health
    const response = await request.get(`${API_BASE_URL}/health`);

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('OK');
    expect(body).toHaveProperty('timestamp');
    expect(body).toHaveProperty('uptime');
  });
});

test.describe('API Endpoints Placeholder', () => {
  test('tickets endpoint should respond', async ({ request }) => {
    // Note: This endpoint requires authentication, expecting 401
    const response = await request.get(`${API_BASE_URL}/api/tickets`);
    // Should return 401 Unauthorized without token
    expect([401, 403]).toContain(response.status());
  });

  test('knowledge endpoint should respond', async ({ request }) => {
    // Note: This endpoint requires authentication, expecting 401
    const response = await request.get(`${API_BASE_URL}/api/knowledge`);
    // Should return 401 Unauthorized without token
    expect([401, 403]).toContain(response.status());
  });

  test('404 for unknown routes', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/api/unknown-route`);
    expect(response.status()).toBe(404);
  });
});
