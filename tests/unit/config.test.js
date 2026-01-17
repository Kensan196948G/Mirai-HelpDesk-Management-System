/**
 * Configuration Module Tests
 */

import { jest } from '@jest/globals';

describe('Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('should load default configuration', async () => {
    process.env.NODE_ENV = 'test';
    const { config } = await import('../../src/config/index.js');

    expect(config.nodeEnv).toBe('test');
    expect(config.port).toBe(3000);
    expect(config.host).toBe('localhost');
  });

  test('should have SLA defaults', async () => {
    const { config } = await import('../../src/config/index.js');

    expect(config.sla.p1.response).toBe(15);
    expect(config.sla.p1.resolution).toBe(120);
    expect(config.sla.p2.response).toBe(60);
  });
});
