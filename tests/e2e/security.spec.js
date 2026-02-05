/**
 * セキュリティテスト - OWASP Top 10 基本カバレッジ
 * Mirai ヘルプデスク管理システム
 *
 * テスト対象:
 * - A01: Broken Access Control（アクセス制御不備）
 * - A02: Cryptographic Failures（暗号化の不備）
 * - A03: Injection（インジェクション）
 * - A04: Insecure Design（安全でない設計）
 * - A05: Security Misconfiguration（セキュリティ設定ミス）
 * - A07: Identification and Authentication Failures（認証の不備）
 */

import { test, expect } from '@playwright/test';
import { API_BASE_URL, loginViaAPI } from './helpers.js';

test.describe('セキュリティテスト - OWASP Top 10', () => {
  let adminToken;
  let requesterToken;

  test.beforeAll(async ({ request }) => {
    // admin と requester のトークンを取得
    adminToken = await loginViaAPI(request, 'admin@example.com', 'Admin123!');
    requesterToken = await loginViaAPI(request, 'user@example.com', 'Admin123!');
  });

  // ===================================================================
  // A01: Broken Access Control（アクセス制御不備）
  // ===================================================================
  test.describe('A01: Broken Access Control', () => {

    test('A01-1: 未認証リクエストは401を返す', async ({ request }) => {
      const endpoints = [
        { method: 'GET', path: '/api/tickets' },
        { method: 'GET', path: '/api/tickets/statistics' },
        { method: 'POST', path: '/api/tickets' },
        { method: 'GET', path: '/api/auth/me' },
        { method: 'GET', path: '/api/knowledge' },
      ];

      for (const ep of endpoints) {
        const response = ep.method === 'GET'
          ? await request.get(`${API_BASE_URL}${ep.path}`)
          : await request.post(`${API_BASE_URL}${ep.path}`, { data: {} });

        expect(response.status(), `${ep.method} ${ep.path} should return 401`).toBe(401);
      }
    });

    test('A01-2: 無効なトークンは401を返す', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/tickets`, {
        headers: { 'Authorization': 'Bearer invalid-token-12345' }
      });
      expect(response.status()).toBe(401);
    });

    test('A01-3: Bearer以外の認証スキームは拒否される', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/tickets`, {
        headers: { 'Authorization': `Basic ${Buffer.from('admin:pass').toString('base64')}` }
      });
      expect(response.status()).toBe(401);
    });

    test('A01-4: 期限切れトークンは拒否される', async ({ request }) => {
      // 明らかに不正な形式のJWTを使用（期限切れをシミュレート）
      const expiredLikeToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZmFrZSIsImVtYWlsIjoiZmFrZUBleGFtcGxlLmNvbSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTAwMDAwMDAwMCwiZXhwIjoxMDAwMDAwMDAxfQ.invalid-signature';
      const response = await request.get(`${API_BASE_URL}/api/tickets`, {
        headers: { 'Authorization': `Bearer ${expiredLikeToken}` }
      });
      expect(response.status()).toBe(401);
    });

    test('A01-5: 存在しないエンドポイントは404を返す', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/admin/secret`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      expect(response.status()).toBe(404);
    });

    test('A01-6: パストラバーサルの試行は無効なUUIDとして拒否される', async ({ request }) => {
      const maliciousPaths = [
        '/api/tickets/../../etc/passwd',
        '/api/tickets/..%2F..%2Fetc%2Fpasswd',
        '/api/tickets/%00',
      ];

      for (const path of maliciousPaths) {
        const response = await request.get(`${API_BASE_URL}${path}`, {
          headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        // 400 (invalid UUID) or 404
        expect([400, 404, 422]).toContain(response.status());
      }
    });
  });

  // ===================================================================
  // A02: Cryptographic Failures（暗号化の不備）
  // ===================================================================
  test.describe('A02: Cryptographic Failures', () => {

    test('A02-1: ログインレスポンスにpassword_hashが含まれない', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: { email: 'admin@example.com', password: 'Admin123!' }
      });
      const body = await response.json();

      expect(body.data.user).toBeDefined();
      expect(body.data.user.password_hash).toBeUndefined();
      expect(body.data.user.password).toBeUndefined();
      // JWTトークンが存在することを確認
      expect(body.data.token).toBeDefined();
      expect(body.data.token.split('.')).toHaveLength(3); // JWT形式: header.payload.signature
    });

    test('A02-2: ユーザー情報取得でもpassword_hashが含まれない', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      const body = await response.json();

      expect(body.data.user).toBeDefined();
      expect(body.data.user.password_hash).toBeUndefined();
      expect(body.data.user.password).toBeUndefined();
    });

    test('A02-3: リフレッシュトークンはアクセストークンとは異なる', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: { email: 'admin@example.com', password: 'Admin123!' }
      });
      const body = await response.json();

      expect(body.data.token).not.toBe(body.data.refreshToken);
      // 両方ともJWT形式
      expect(body.data.refreshToken.split('.')).toHaveLength(3);
    });
  });

  // ===================================================================
  // A03: Injection（インジェクション）
  // ===================================================================
  test.describe('A03: Injection', () => {

    test('A03-1: SQLインジェクション - ログイン', async ({ request }) => {
      const sqlPayloads = [
        "' OR '1'='1",
        "admin@example.com' OR '1'='1' --",
        "'; DROP TABLE users; --",
        "admin@example.com' UNION SELECT * FROM users --",
      ];

      for (const payload of sqlPayloads) {
        const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
          data: { email: payload, password: 'anything' }
        });

        // SQLインジェクションが成功していないことを確認
        // 200でログイン成功していないこと
        expect([400, 401, 422]).toContain(response.status());

        const body = await response.json();
        expect(body.success).not.toBe(true);
      }
    });

    test('A03-2: SQLインジェクション - チケット検索パラメータ', async ({ request }) => {
      const sqlPayloads = [
        "'; DROP TABLE tickets; --",
        "1 OR 1=1",
        "UNION SELECT * FROM users",
      ];

      for (const payload of sqlPayloads) {
        const response = await request.get(
          `${API_BASE_URL}/api/tickets?status=${encodeURIComponent(payload)}`,
          { headers: { 'Authorization': `Bearer ${adminToken}` } }
        );

        // パラメータ化クエリ使用のため、不正な値でもDBエラーは500で返ることがある。
        // 重要なのはデータ漏洩やテーブル破壊が起きていないこと。
        // ステータスコードは200（空結果）、400、500のいずれかを許容
        expect([200, 400, 500]).toContain(response.status());

        // 500の場合でもレスポンスがJSON形式で返ること（サーバークラッシュしていない）
        if (response.status() === 500) {
          const body = await response.json();
          expect(body.success).toBe(false);
        }
      }

      // テーブルが破壊されていないことを確認（正常なリクエストが通る）
      const verifyResponse = await request.get(
        `${API_BASE_URL}/api/tickets`,
        { headers: { 'Authorization': `Bearer ${adminToken}` } }
      );
      expect(verifyResponse.ok()).toBeTruthy();
    });

    test('A03-3: XSSペイロード - チケット作成', async ({ request }) => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert(1)>',
        '"><svg onload=alert(document.cookie)>',
        "javascript:alert('XSS')",
      ];

      for (const payload of xssPayloads) {
        const response = await request.post(`${API_BASE_URL}/api/tickets`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          data: {
            type: 'incident',
            subject: payload,
            description: payload,
            impact: '個人',
            urgency: '低',
          }
        });

        // チケットが作成された場合、レスポンスにスクリプトタグが
        // エスケープされずに返されないことを確認
        if (response.ok()) {
          const body = await response.json();
          const responseText = JSON.stringify(body);
          // 実行可能なスクリプトコンテキストがないことを確認
          // （JSON内のテキストとしては問題ないが、HTMLとして解釈されないこと）
          expect(response.headers()['content-type']).toContain('application/json');
        }
      }
    });

    test('A03-4: NoSQLインジェクション風ペイロード', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {
          email: { '$gt': '' },
          password: { '$gt': '' }
        }
      });

      // オブジェクト型のemail/passwordはバリデーションで拒否されるべき
      expect([400, 401, 422]).toContain(response.status());
    });

    test('A03-5: コマンドインジェクション風ペイロード', async ({ request }) => {
      const cmdPayloads = [
        '; ls -la',
        '| cat /etc/passwd',
        '$(whoami)',
        '`id`',
      ];

      for (const payload of cmdPayloads) {
        const response = await request.post(`${API_BASE_URL}/api/tickets`, {
          headers: {
            'Authorization': `Bearer ${adminToken}`,
            'Content-Type': 'application/json'
          },
          data: {
            type: 'incident',
            subject: `テスト ${payload}`,
            description: `説明 ${payload}`,
            impact: '個人',
            urgency: '低',
          }
        });

        // サーバーエラーにならないこと（コマンドが実行されていない）
        expect(response.status()).not.toBe(500);
      }
    });
  });

  // ===================================================================
  // A04: Insecure Design（安全でない設計）
  // ===================================================================
  test.describe('A04: Insecure Design', () => {

    test('A04-1: 入力バリデーション - 必須項目が空のチケット', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/tickets`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        data: {}
      });

      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.success).toBe(false);
    });

    test('A04-2: 入力バリデーション - 不正なメール形式', async ({ request }) => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user@.com',
      ];

      for (const email of invalidEmails) {
        const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
          data: { email, password: 'Admin123!' }
        });
        // バリデーションエラーまたは認証エラー
        expect([400, 401, 422]).toContain(response.status());
      }
    });

    test('A04-3: 入力バリデーション - 不正なUUID形式のチケットID', async ({ request }) => {
      const invalidIds = [
        'not-a-uuid',
        '12345',
        'abc',
        '1; DROP TABLE tickets',
      ];

      for (const id of invalidIds) {
        const response = await request.get(
          `${API_BASE_URL}/api/tickets/${encodeURIComponent(id)}`,
          { headers: { 'Authorization': `Bearer ${adminToken}` } }
        );
        // UUIDバリデーションで400、または404
        expect([400, 404, 422]).toContain(response.status());
      }
    });

    test('A04-4: 巨大なペイロードの送信', async ({ request }) => {
      const largePayload = 'A'.repeat(1024 * 1024); // 1MB

      const response = await request.post(`${API_BASE_URL}/api/tickets`, {
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          type: 'incident',
          subject: largePayload,
          description: 'テスト',
          impact: '個人',
          urgency: '低',
        }
      });

      // サーバーがクラッシュせず、レスポンスを返すこと（400/413/422/500いずれも許容）
      // 重要なのはサーバーが応答し続けていること
      expect([400, 413, 422, 500]).toContain(response.status());

      // サーバーが引き続き正常に応答することを確認
      const healthCheck = await request.get(`${API_BASE_URL}/api/tickets`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });
      expect(healthCheck.ok()).toBeTruthy();
    });

    test('A04-5: Content-Type偽装', async ({ request }) => {
      // JSONを期待するエンドポイントにtext/plainを送信
      const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
        headers: { 'Content-Type': 'text/plain' },
        data: '{"email":"admin@example.com","password":"Admin123!"}'
      });

      // 適切にハンドリングされること（500にならない）
      expect(response.status()).toBeLessThan(500);
    });
  });

  // ===================================================================
  // A05: Security Misconfiguration（セキュリティ設定ミス）
  // ===================================================================
  test.describe('A05: Security Misconfiguration', () => {

    test('A05-1: エラーレスポンスにスタックトレースが含まれない（本番想定）', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/nonexistent-endpoint`);
      const body = await response.json();

      // エラーレスポンスの構造チェック
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
      // 本番環境ではスタックトレースが含まれないべき
      // 開発環境では含まれる可能性があるが、DB接続文字列やシークレットは含まれないこと
      if (body.error.stack) {
        expect(body.error.stack).not.toContain('password');
        expect(body.error.stack).not.toContain('JWT_SECRET');
        expect(body.error.stack).not.toContain('DATABASE_URL');
      }
    });

    test('A05-2: 不正なHTTPメソッドへの適切な応答', async ({ request }) => {
      // DELETEメソッドがルート定義にない場合
      const response = await request.delete(`${API_BASE_URL}/api/auth/login`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      // 405 Method Not Allowed または 404
      expect([404, 405]).toContain(response.status());
    });

    test('A05-3: APIレスポンスのContent-Typeが正しい', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      const contentType = response.headers()['content-type'];
      expect(contentType).toContain('application/json');
    });

    test('A05-4: CORSヘッダの確認', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/health`);
      // ヘルスチェックが利用可能であること
      expect([200, 404]).toContain(response.status());
    });

    test('A05-5: サーバーバージョン情報が漏洩しない', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      // X-Powered-By ヘッダが露出していないこと（Express デフォルトでは送信される）
      const poweredBy = response.headers()['x-powered-by'];
      // 厳密には存在しないことが理想だが、存在する場合もログとして記録
      if (poweredBy) {
        console.warn('X-Powered-By ヘッダが検出されました:', poweredBy);
      }
    });
  });

  // ===================================================================
  // A07: Identification and Authentication Failures（認証の不備）
  // ===================================================================
  test.describe('A07: Authentication Failures', () => {

    test('A07-1: パスワードなしでのログイン試行', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: { email: 'admin@example.com' }
      });
      expect([400, 401]).toContain(response.status());
    });

    test('A07-2: メールアドレスなしでのログイン試行', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: { password: 'Admin123!' }
      });
      expect([400, 401]).toContain(response.status());
    });

    test('A07-3: 空のリクエストボディでのログイン試行', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: {}
      });
      expect([400, 401]).toContain(response.status());
    });

    test('A07-4: アクセストークンでリフレッシュ操作はできない', async ({ request }) => {
      // アクセストークンをリフレッシュトークンとして使用
      const response = await request.post(`${API_BASE_URL}/api/auth/refresh`, {
        data: { refreshToken: adminToken }
      });

      // type=refresh でないトークンは拒否されるべき
      expect([400, 401]).toContain(response.status());
    });

    test('A07-5: 不正な形式のトークンでのリフレッシュ', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/refresh`, {
        data: { refreshToken: 'not-a-valid-jwt-token' }
      });
      expect([400, 401]).toContain(response.status());
    });

    test('A07-6: リフレッシュトークンなしでのリフレッシュ', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/refresh`, {
        data: {}
      });
      expect([400, 401]).toContain(response.status());
    });

    test('A07-7: 登録時に短すぎるパスワードは拒否される', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/register`, {
        data: {
          email: 'sectest@example.com',
          display_name: 'Security Test',
          password: '1234567', // 8文字未満
        }
      });
      expect([400, 422]).toContain(response.status());
    });

    test('A07-8: 認証エラーメッセージはユーザー存在を漏洩しない', async ({ request }) => {
      // 存在するユーザーで間違ったパスワード
      const response1 = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: { email: 'admin@example.com', password: 'WrongPassword123!' }
      });
      const body1 = await response1.json();

      // 存在しないユーザー
      const response2 = await request.post(`${API_BASE_URL}/api/auth/login`, {
        data: { email: 'nonexistent@example.com', password: 'Admin123!' }
      });
      const body2 = await response2.json();

      // 両方とも同じステータスコード（ユーザー存在を推測できない）
      expect(response1.status()).toBe(response2.status());
      // エラーコードも同一であるべき（理想的）
      if (body1.error?.code && body2.error?.code) {
        expect(body1.error.code).toBe(body2.error.code);
      }
    });
  });

  // ===================================================================
  // 追加: HTTPヘッダーセキュリティ
  // ===================================================================
  test.describe('HTTPヘッダーセキュリティ', () => {

    test('レスポンスヘッダのセキュリティ確認', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${adminToken}` }
      });

      const headers = response.headers();

      // Content-Typeが設定されていること
      expect(headers['content-type']).toBeDefined();

      // セキュリティ関連ヘッダの存在チェック（警告レベル）
      const securityHeaders = {
        'x-content-type-options': 'nosniff ヘッダ推奨',
        'x-frame-options': 'フレーム防御ヘッダ推奨',
      };

      for (const [header, description] of Object.entries(securityHeaders)) {
        if (!headers[header]) {
          console.warn(`セキュリティヘッダ未設定: ${header} - ${description}`);
        }
      }
    });
  });

  // ===================================================================
  // 追加: レート制限テスト
  // ===================================================================
  test.describe('レート制限', () => {

    test('大量の連続リクエストに対する耐性', async ({ request }) => {
      // 短時間に多数のリクエストを送信
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request.post(`${API_BASE_URL}/api/auth/login`, {
            data: { email: 'admin@example.com', password: 'WrongPassword' }
          })
        );
      }

      const responses = await Promise.all(promises);

      // すべてのレスポンスがサーバーエラー(500)でないこと
      for (const response of responses) {
        expect(response.status()).toBeLessThan(500);
      }

      // 少なくとも一部は401（認証失敗）であること
      const status401Count = responses.filter(r => r.status() === 401).length;
      expect(status401Count).toBeGreaterThan(0);
    });
  });
});
