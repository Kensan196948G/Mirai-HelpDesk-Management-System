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
  API_BASE_URL: process.env.API_BASE_URL || 'http://127.0.0.1:8000',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://127.0.0.1:8080',

  // テストアカウント
  TEST_ACCOUNTS: {
    admin: {
      email: 'admin@example.com',
      password: 'admin123',
      role: 'admin'
    },
    agent: {
      email: 'agent@example.com',
      password: 'agent123',
      role: 'agent'
    },
    requester: {
      email: 'user@example.com',
      password: 'user123',
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

/**
 * ログイン処理（UI経由）
 * @param {import('@playwright/test').Page} page - Playwrightページオブジェクト
 * @param {string} email - メールアドレス
 * @param {string} password - パスワード
 */
export async function login(page, email, password) {
  await page.goto('/');

  // ログインモーダルが表示されるまで待機
  await page.waitForSelector('#login-modal', { state: 'visible' });

  // ログインフォームに入力
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);

  // ログインボタンをクリック
  await page.click('#login-form button[type="submit"]');

  // ログインモーダルが非表示になるまで待機
  await page.waitForSelector('#login-modal', { state: 'hidden', timeout: TEST_CONFIG.TIMEOUTS.medium });

  // ダッシュボードまたはメインコンテンツの表示を確認
  await page.waitForSelector('#page-content', { state: 'visible' });

  // トークンがlocalStorageに保存されていることを確認
  const token = await page.evaluate(() => localStorage.getItem('auth_token'));
  expect(token).toBeTruthy();

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
  expect(body.token).toBeTruthy();

  return body.token;
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
