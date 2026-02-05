/**
 * Simple Login Test
 *
 * シンプルなログイン動作確認テスト
 */

import { test, expect } from '@playwright/test';

test.describe('シンプルログインテスト', () => {
  test('ログインページが表示される', async ({ page }) => {
    await page.goto('/');

    // ページタイトルを確認
    await expect(page).toHaveTitle(/Mirai/);

    // スクリーンショット撮影
    await page.screenshot({ path: 'test-results/login-page.png', fullPage: true });

    console.log('現在のURL:', page.url());

    // ログインフォームの要素を探す（複数のセレクタを試行）
    const selectors = [
      'input[placeholder="メールアドレス"]',
      'input[type="email"]',
      'input[autocomplete="username"]',
      'form',
      'button:has-text("ログイン")',
    ];

    for (const selector of selectors) {
      const element = await page.$(selector);
      if (element) {
        console.log(`✅ 見つかった: ${selector}`);
      } else {
        console.log(`❌ 見つからない: ${selector}`);
      }
    }
  });

  test('実際にログインを試行', async ({ page }) => {
    await page.goto('/');

    // ページが完全に読み込まれるまで待機
    await page.waitForLoadState('networkidle');

    // メールアドレス入力欄を待機
    const emailInput = await page.waitForSelector('input[placeholder="メールアドレス"]', {
      state: 'visible',
      timeout: 15000
    });

    // パスワード入力欄を待機
    const passwordInput = await page.waitForSelector('input[placeholder="パスワード"]', {
      state: 'visible',
      timeout: 15000
    });

    // 入力
    await emailInput.fill('admin@example.com');
    await passwordInput.fill('Admin123!');

    // ログインボタンをクリック
    await page.click('button:has-text("ログイン")');

    // 遷移を待機
    await page.waitForLoadState('networkidle');

    // スクリーンショット撮影（ログイン後）
    await page.screenshot({ path: 'test-results/after-login.png', fullPage: true });

    console.log('ログイン後のURL:', page.url());

    // localStorage のトークンを確認
    const token = await page.evaluate(() => {
      return {
        token: localStorage.getItem('token'),
        auth_token: localStorage.getItem('auth_token'),
        authToken: localStorage.getItem('authToken'),
        all_keys: Object.keys(localStorage),
      };
    });

    console.log('LocalStorage:', JSON.stringify(token, null, 2));
  });
});
