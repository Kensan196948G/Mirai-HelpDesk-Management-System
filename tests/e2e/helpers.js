/**
 * E2E Test Helper Functions
 * Mirai HelpDesk Management System
 *
 * 共通のヘルパー関数とユーティリティ
 */

import { expect } from '@playwright/test';

/**
 * テスト用の設定
 */
export const TEST_CONFIG = {
  // API エンドポイント
  API_BASE_URL: process.env.API_BASE_URL || 'http://127.0.0.1:3000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://192.168.0.185:3005',

  // テストアカウント
  TEST_ACCOUNTS: {
    admin: {
      email: 'admin@example.com',
      password: 'Admin123!',
      role: 'admin'
    },
    agent: {
      email: 'agent@example.com',
      password: 'Admin123!',
      role: 'agent'
    },
    requester: {
      email: 'user@example.com',
      password: 'Admin123!',
      role: 'requester'
    }
  },

  // タイムアウト設定
  TIMEOUTS: {
    short: 5000,
    medium: 10000,
    long: 30000
  }
};

// API_BASE_URL を直接エクスポート（便利のため）
export const API_BASE_URL = TEST_CONFIG.API_BASE_URL;

/**
 * auth-storageにトークンが保存されるまで待機（リトライ付き）
 * @param {import('@playwright/test').Page} page - Playwrightページオブジェクト
 * @param {number} maxRetries - 最大リトライ回数
 * @param {number} retryDelay - リトライ間隔（ミリ秒）
 * @returns {Promise<string|null>} - JWTトークンまたはnull
 */
async function waitForAuthToken(page, maxRetries = 10, retryDelay = 500) {
  for (let i = 0; i < maxRetries; i++) {
    const token = await page.evaluate(() => {
      // zustand persistで保存されているauth-storageを確認
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        try {
          const parsed = JSON.parse(authStorage);
          return parsed.state?.token || null;
        } catch (e) {
          console.error('auth-storage parse error:', e);
          return null;
        }
      }
      // フォールバック：従来のキーも確認
      return localStorage.getItem('token') ||
             localStorage.getItem('auth_token') ||
             localStorage.getItem('authToken');
    });

    if (token) {
      return token;
    }

    // リトライ前に少し待機
    await page.waitForTimeout(retryDelay);
  }

  return null;
}

/**
 * ログイン処理（UI経由）- リトライ機能付き改善版
 * @param {import('@playwright/test').Page} page - Playwrightページオブジェクト
 * @param {string} email - メールアドレス
 * @param {string} password - パスワード
 */
export async function login(page, email, password) {
  // ルートにアクセス（未認証の場合は自動的にログインページにリダイレクト）
  await page.goto('/');

  // ログインページかログインフォームが表示されるまで待機
  await page.waitForLoadState('networkidle');

  // ログインフォームが表示されるまで待機（複数のセレクタを試行）
  const emailInput = await page.locator('input[placeholder="メールアドレス"], input[type="text"], input[type="email"], input[autocomplete="username"]').first();
  const passwordInput = await page.locator('input[placeholder="パスワード"], input[type="password"], input[autocomplete="current-password"]').first();
  const loginButton = await page.locator('button:has-text("ログイン")');

  // 要素が表示されるまで待機
  await emailInput.waitFor({ state: 'visible', timeout: 15000 });
  await passwordInput.waitFor({ state: 'visible', timeout: 15000 });
  await loginButton.waitFor({ state: 'visible', timeout: 15000 });

  // メールアドレスとパスワードを入力
  await emailInput.fill(email);
  await passwordInput.fill(password);

  // ログインボタンをクリック
  await loginButton.click();

  // ログイン処理の完了を待機
  // ページが安定するまで待機（networkidleまたは一定時間）
  await Promise.race([
    page.waitForLoadState('networkidle'),
    page.waitForTimeout(3000)
  ]);

  // トークンがlocalStorageに保存されるまでリトライ（最大5秒）
  const token = await waitForAuthToken(page, 10, 500);

  if (!token) {
    // デバッグ情報を出力
    const currentUrl = page.url();
    const localStorageKeys = await page.evaluate(() => Object.keys(localStorage));
    console.error('ログイン失敗のデバッグ情報:');
    console.error('  現在のURL:', currentUrl);
    console.error('  LocalStorageキー:', localStorageKeys);

    throw new Error('ログイン後にトークンがlocalStorageに保存されていません');
  }

  return token;
}

/**
 * ログイン処理（API経由、高速）
 * @param {import('@playwright/test').APIRequestContext} request - API requestコンテキスト
 * @param {string} email - メールアドレス
 * @param {string} password - パスワード
 * @returns {Promise<string>} - JWTトークン
 */
export async function loginViaAPI(request, email, password) {
  const response = await request.post(`${TEST_CONFIG.API_BASE_URL}/api/auth/login`, {
    data: {
      email,
      password
    }
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.success).toBeTruthy();
  expect(body.data.token).toBeTruthy();

  return body.data.token;
}

/**
 * ログアウト処理
 * @param {import('@playwright/test').Page} page - Playwrightページオブジェクト
 */
export async function logout(page) {
  // ログアウトボタンをクリック
  await page.click('#logout-btn');

  // ログインモーダルが表示されるまで待機
  await page.waitForSelector('#login-modal', { state: 'visible', timeout: TEST_CONFIG.TIMEOUTS.medium });

  // トークンがlocalStorageから削除されていることを確認
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  expect(token).toBeFalsy();
}

/**
 * 認証トークンをページのlocalStorageに設定
 * @param {import('@playwright/test').Page} page - Playwrightページオブジェクト
 * @param {string} token - JWTトークン
 */
export async function setAuthToken(page, token) {
  await page.goto('/');
  await page.evaluate((token) => {
    localStorage.setItem('auth_token', token);
  }, token);
}

/**
 * チケット作成（API経由）
 * @param {import('@playwright/test').APIRequestContext} request - API requestコンテキスト
 * @param {string} token - 認証トークン
 * @param {Object} ticketData - チケットデータ
 * @returns {Promise<Object>} - 作成されたチケット
 */
export async function createTicket(request, token, ticketData = {}) {
  const defaultData = {
    type: 'incident',
    subject: `テストチケット ${Date.now()}`,
    description: 'これはE2Eテスト用のチケットです',
    priority: 'medium',
    impact: 'individual',
    urgency: 'medium',
    category_id: 1,
    ...ticketData
  };

  const response = await request.post(`${TEST_CONFIG.API_BASE_URL}/api/tickets`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    data: defaultData
  });

  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.ticket_id).toBeTruthy();

  return body;
}

/**
 * チケット削除（クリーンアップ用）
 * @param {import('@playwright/test').APIRequestContext} request - API requestコンテキスト
 * @param {string} token - 認証トークン
 * @param {number} ticketId - チケットID
 */
export async function deleteTicket(request, token, ticketId) {
  try {
    await request.delete(`${TEST_CONFIG.API_BASE_URL}/api/tickets/${ticketId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  } catch (error) {
    // クリーンアップなので失敗しても無視
    console.warn(`Failed to delete ticket ${ticketId}:`, error.message);
  }
}

/**
 * テストデータのクリーンアップ
 * @param {import('@playwright/test').APIRequestContext} request - API requestコンテキスト
 * @param {string} token - 認証トークン
 * @param {Array<number>} ticketIds - 削除するチケットIDの配列
 */
export async function cleanup(request, token, ticketIds = []) {
  for (const ticketId of ticketIds) {
    await deleteTicket(request, token, ticketId);
  }
}

/**
 * 要素が表示されるまで待機
 * @param {import('@playwright/test').Page} page - Playwrightページオブジェクト
 * @param {string} selector - セレクタ
 * @param {number} timeout - タイムアウト（ミリ秒）
 */
export async function waitForElement(page, selector, timeout = TEST_CONFIG.TIMEOUTS.medium) {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * トースト通知の表示を確認
 * @param {import('@playwright/test').Page} page - Playwrightページオブジェクト
 * @param {string} expectedText - 期待されるテキスト（部分一致）
 * @param {string} type - トーストのタイプ（success, error, info, warning）
 */
export async function expectToast(page, expectedText, type = 'success') {
  const toastSelector = `#toast-container .toast.toast-${type}`;
  await page.waitForSelector(toastSelector, {
    state: 'visible',
    timeout: TEST_CONFIG.TIMEOUTS.short
  });

  const toastText = await page.textContent(toastSelector);
  expect(toastText).toContain(expectedText);
}

/**
 * ページタイトルの確認
 * @param {import('@playwright/test').Page} page - Playwrightページオブジェクト
 * @param {string} expectedTitle - 期待されるタイトル
 */
export async function expectPageTitle(page, expectedTitle) {
  await page.waitForSelector('#page-title', { state: 'visible' });
  const title = await page.textContent('#page-title');
  expect(title).toBe(expectedTitle);
}

/**
 * テーブルの行数を取得
 * @param {import('@playwright/test').Page} page - Playwrightページオブジェクト
 * @param {string} tableSelector - テーブルのセレクタ
 * @returns {Promise<number>} - 行数
 */
export async function getTableRowCount(page, tableSelector = 'table tbody tr') {
  await page.waitForSelector(tableSelector, { timeout: TEST_CONFIG.TIMEOUTS.medium });
  const rows = await page.$$(tableSelector);
  return rows.length;
}

/**
 * ランダムな文字列を生成
 * @param {number} length - 文字列の長さ
 * @returns {string} - ランダムな文字列
 */
export function randomString(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

/**
 * 日付をフォーマット（YYYY-MM-DD形式）
 * @param {Date} date - 日付オブジェクト
 * @returns {string} - フォーマットされた日付文字列
 */
export function formatDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * スクリーンショットを撮影（デバッグ用）
 * @param {import('@playwright/test').Page} page - Playwrightページオブジェクト
 * @param {string} name - ファイル名
 */
export async function takeScreenshot(page, name) {
  await page.screenshot({
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true
  });
}

/**
 * API レスポンスの共通検証
 * @param {import('@playwright/test').APIResponse} response - APIレスポンス
 * @param {number} expectedStatus - 期待されるステータスコード
 */
export async function expectApiResponse(response, expectedStatus = 200) {
  expect(response.status()).toBe(expectedStatus);

  const contentType = response.headers()['content-type'];
  if (contentType && contentType.includes('application/json')) {
    const body = await response.json();
    return body;
  }

  return null;
}

/**
 * ページのロード完了を待機
 * @param {import('@playwright/test').Page} page - Playwrightページオブジェクト
 */
export async function waitForPageLoad(page) {
  await page.waitForLoadState('networkidle');
  await page.waitForSelector('.loading-spinner', { state: 'hidden', timeout: TEST_CONFIG.TIMEOUTS.long });
}
