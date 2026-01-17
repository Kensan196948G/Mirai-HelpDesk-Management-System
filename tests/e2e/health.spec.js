/**
 * Health Check E2E Tests
 */

import { test, expect } from '@playwright/test';

test.describe('Health Check API', () => {
  test('should return health status', async ({ request }) => {
    const response = await request.get('/api/health');

    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(body.status).toBe('ok');
    expect(body.version).toBe('0.1.0');
    expect(body).toHaveProperty('timestamp');
  });
});

test.describe('API Endpoints Placeholder', () => {
  test('tickets endpoint should respond', async ({ request }) => {
    const response = await request.get('/api/tickets');
    expect(response.ok()).toBeTruthy();
  });

  test('knowledge endpoint should respond', async ({ request }) => {
    const response = await request.get('/api/knowledge');
    expect(response.ok()).toBeTruthy();
  });

  test('404 for unknown routes', async ({ request }) => {
    const response = await request.get('/api/unknown-route');
    expect(response.status()).toBe(404);
  });
});
