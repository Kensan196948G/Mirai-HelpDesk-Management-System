/**
 * Authentication E2E Tests
 * Mirai HelpDesk Management System
 *
 * 認証機能のE2Eテスト
 */

import { test, expect } from '@playwright/test';
import {
  login,
  logout,
  loginViaAPI,
  setAuthToken,
  expectToast,
  TEST_CONFIG
} from './helpers.js';

test.describe('認証機能のテスト', () => {
  test.describe('ログイン', () => {
    test('正常なログイン（管理者アカウント）', async ({ page }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // ログイン処理
      const token = await login(page, email, password);

      // トークンが取得できていることを確認
      expect(token).toBeTruthy();
      expect(token.length).toBeGreaterThan(0);

      // URLがルートページになっていることを確認
      await page.waitForURL('/');

      // ログインモーダルが非表示になっていることを確認
      await expect(page.locator('#login-modal')).not.toBeVisible();

      // ユーザー情報が表示されていることを確認
      await expect(page.locator('#user-info')).toBeVisible();

      // ナビゲーションメニューが表示されていることを確認
      await expect(page.locator('#nav-menu')).toBeVisible();
    });

    test('ログイン失敗 - 無効なメールアドレス', async ({ page }) => {
      await page.goto('/');

      // ログインモーダルが表示されるまで待機
      await page.waitForSelector('#login-modal', { state: 'visible' });

      // 無効なメールアドレスで入力
      await page.fill('#login-email', 'invalid@example.com');
      await page.fill('#login-password', 'wrongpassword');

      // ログインボタンをクリック
      await page.click('#login-form button[type="submit"]');

      // エラーメッセージが表示されることを確認
      await page.waitForSelector('#login-error', { state: 'visible' });
      const errorText = await page.textContent('#login-error');
      expect(errorText.length).toBeGreaterThan(0);

      // ログインモーダルが表示されたままであることを確認
      await expect(page.locator('#login-modal')).toBeVisible();

      // トークンがlocalStorageに保存されていないことを確認
      const token = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(token).toBeFalsy();
    });

    test('ログイン失敗 - 無効なパスワード', async ({ page }) => {
      const { email } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      await page.goto('/');

      // ログインモーダルが表示されるまで待機
      await page.waitForSelector('#login-modal', { state: 'visible' });

      // 正しいメールアドレスと間違ったパスワードで入力
      await page.fill('#login-email', email);
      await page.fill('#login-password', 'wrongpassword123');

      // ログインボタンをクリック
      await page.click('#login-form button[type="submit"]');

      // エラーメッセージが表示されることを確認
      await page.waitForSelector('#login-error', { state: 'visible' });
      const errorText = await page.textContent('#login-error');
      expect(errorText.length).toBeGreaterThan(0);

      // トークンがlocalStorageに保存されていないことを確認
      const token = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(token).toBeFalsy();
    });

    test('ログイン失敗 - 空のフィールド', async ({ page }) => {
      await page.goto('/');

      // ログインモーダルが表示されるまで待機
      await page.waitForSelector('#login-modal', { state: 'visible' });

      // 空のまま送信
      await page.click('#login-form button[type="submit"]');

      // HTML5バリデーションが働くことを確認
      const emailInput = page.locator('#login-email');
      const isEmailInvalid = await emailInput.evaluate((el) => !el.validity.valid);
      expect(isEmailInvalid).toBeTruthy();
    });
  });

  test.describe('ログアウト', () => {
    test('正常なログアウト', async ({ page }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // ログイン
      await login(page, email, password);

      // ログアウトボタンが表示されていることを確認
      await expect(page.locator('#logout-btn')).toBeVisible();

      // ログアウト処理
      await logout(page);

      // ログインモーダルが再表示されることを確認
      await expect(page.locator('#login-modal')).toBeVisible();

      // トークンがlocalStorageから削除されていることを確認
      const token = await page.evaluate(() => localStorage.getItem('auth_token'));
      expect(token).toBeFalsy();
    });
  });

  test.describe('認証トークンの検証', () => {
    test('有効なトークンでページアクセス', async ({ page, request }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // API経由でトークンを取得
      const token = await loginViaAPI(request, email, password);

      // トークンをlocalStorageに設定
      await setAuthToken(page, token);

      // ページをリロード
      await page.reload();

      // ログインモーダルが表示されないことを確認
      await page.waitForTimeout(1000); // モーダル表示のチェックのため少し待機
      await expect(page.locator('#login-modal')).not.toBeVisible();

      // メインコンテンツが表示されることを確認
      await expect(page.locator('#page-content')).toBeVisible();
    });

    test('無効なトークンでページアクセス', async ({ page }) => {
      // 無効なトークンを設定
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.setItem('auth_token', 'invalid-token-12345');
      });

      // ページをリロード
      await page.reload();

      // ログインモーダルが表示されることを確認
      await expect(page.locator('#login-modal')).toBeVisible();
    });

    test('トークンなしでページアクセス', async ({ page }) => {
      // localStorageをクリア
      await page.goto('/');
      await page.evaluate(() => {
        localStorage.clear();
      });

      // ページをリロード
      await page.reload();

      // ログインモーダルが表示されることを確認
      await expect(page.locator('#login-modal')).toBeVisible();
    });
  });

  test.describe('セッション管理', () => {
    test('ログイン後のトークン有効期限確認', async ({ page, request }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // ログイン
      const token = await loginViaAPI(request, email, password);

      // トークンのペイロードをデコード（JWTの場合）
      const tokenParts = token.split('.');
      expect(tokenParts.length).toBe(3);

      // Base64デコード（簡易的な確認）
      const payload = JSON.parse(
        Buffer.from(tokenParts[1], 'base64').toString('utf-8')
      );

      // トークンに有効期限が含まれていることを確認
      expect(payload.exp).toBeDefined();
      expect(typeof payload.exp).toBe('number');

      // トークンの有効期限が未来であることを確認
      const now = Math.floor(Date.now() / 1000);
      expect(payload.exp).toBeGreaterThan(now);
    });

    test('複数タブでのログイン状態共有', async ({ context }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // タブ1でログイン
      const page1 = await context.newPage();
      await login(page1, email, password);

      // タブ2を開く
      const page2 = await context.newPage();
      await page2.goto('/');

      // タブ2でもログイン状態が共有されていることを確認
      await page2.waitForTimeout(1000);
      await expect(page2.locator('#login-modal')).not.toBeVisible();
      await expect(page2.locator('#page-content')).toBeVisible();

      // 両方のタブでトークンが同じであることを確認
      const token1 = await page1.evaluate(() => localStorage.getItem('auth_token'));
      const token2 = await page2.evaluate(() => localStorage.getItem('auth_token'));
      expect(token1).toBe(token2);

      await page1.close();
      await page2.close();
    });
  });

  test.describe('API認証エンドポイントのテスト', () => {
    test('POST /api/auth/login - 成功', async ({ request }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      const response = await request.post(`${TEST_CONFIG.API_BASE_URL}/api/auth/login`, {
        data: { email, password }
      });

      expect(response.ok()).toBeTruthy();
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body.token).toBeDefined();
      expect(body.user).toBeDefined();
      expect(body.user.email).toBe(email);
    });

    test('POST /api/auth/login - 失敗（無効な認証情報）', async ({ request }) => {
      const response = await request.post(`${TEST_CONFIG.API_BASE_URL}/api/auth/login`, {
        data: {
          email: 'invalid@example.com',
          password: 'wrongpassword'
        }
      });

      expect(response.status()).toBe(401);

      const body = await response.json();
      expect(body.detail || body.message).toBeDefined();
    });

    test('GET /api/auth/me - 認証済みユーザー情報取得', async ({ request }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;

      // ログインしてトークン取得
      const token = await loginViaAPI(request, email, password);

      // ユーザー情報取得
      const response = await request.get(`${TEST_CONFIG.API_BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      expect(response.ok()).toBeTruthy();

      const body = await response.json();
      expect(body.email).toBe(email);
      expect(body.user_id).toBeDefined();
    });

    test('GET /api/auth/me - 認証なし（401エラー）', async ({ request }) => {
      const response = await request.get(`${TEST_CONFIG.API_BASE_URL}/api/auth/me`);

      expect(response.status()).toBe(401);
    });
  });

  test.describe('権限レベル別のアクセス', () => {
    test('Requesterアカウントでログイン', async ({ page }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.requester;

      // ログイン処理
      await login(page, email, password);

      // ナビゲーションメニューが表示されることを確認
      await expect(page.locator('#nav-menu')).toBeVisible();

      // Requester用のメニュー項目が表示されることを確認（例：チケット一覧）
      const navLinks = await page.$$eval('#nav-menu a', (links) =>
        links.map(link => link.textContent.trim())
      );

      // 最低限のメニューが存在することを確認
      expect(navLinks.length).toBeGreaterThan(0);
    });

    test('Agentアカウントでログイン', async ({ page }) => {
      const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.agent;

      // ログイン処理
      await login(page, email, password);

      // ナビゲーションメニューが表示されることを確認
      await expect(page.locator('#nav-menu')).toBeVisible();

      // Agent用のメニュー項目が表示されることを確認
      const navLinks = await page.$$eval('#nav-menu a', (links) =>
        links.map(link => link.textContent.trim())
      );

      // Agentは管理機能にアクセスできるため、メニューが多いはず
      expect(navLinks.length).toBeGreaterThan(0);
    });
  });
});
