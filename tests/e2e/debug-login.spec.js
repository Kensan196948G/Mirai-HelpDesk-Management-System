/**
 * Debug Login Test
 *
 * ログイン機能の詳細デバッグテスト
 */

import { test, expect } from '@playwright/test';

test.describe('ログイン機能デバッグ', () => {
  test('詳細なログイン動作確認', async ({ page }) => {
    // コンソールログをキャプチャ
    const consoleMessages = [];
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // ネットワークリクエストをキャプチャ
    const networkRequests = [];
    page.on('request', request => {
      networkRequests.push({
        method: request.method(),
        url: request.url(),
      });
    });

    // ネットワークレスポンスをキャプチャ
    const networkResponses = [];
    page.on('response', response => {
      networkResponses.push({
        url: response.url(),
        status: response.status(),
      });
    });

    console.log('\n========== ステップ1: ページアクセス ==========');
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    console.log('現在のURL:', page.url());
    console.log('ページタイトル:', await page.title());

    console.log('\n========== ステップ2: ログインフォーム入力 ==========');

    // メールアドレス入力
    await page.fill('input[placeholder="メールアドレス"]', 'admin@example.com');
    console.log('✅ メールアドレス入力完了');

    // パスワード入力
    await page.fill('input[placeholder="パスワード"]', 'Admin123!');
    console.log('✅ パスワード入力完了');

    // スクリーンショット（ログイン前）
    await page.screenshot({ path: 'test-results/debug-before-login.png', fullPage: true });

    console.log('\n========== ステップ3: ログインボタンクリック ==========');

    // ログインボタンをクリック
    await page.click('button:has-text("ログイン")');
    console.log('✅ ログインボタンクリック完了');

    // 少し待機（レスポンスを待つ）
    await page.waitForTimeout(3000);

    // スクリーンショット（ログイン後）
    await page.screenshot({ path: 'test-results/debug-after-login.png', fullPage: true });

    console.log('ログイン後のURL:', page.url());

    console.log('\n========== ステップ4: ネットワークリクエスト確認 ==========');

    // ログイン関連のリクエストを抽出
    const loginRequests = networkRequests.filter(r => r.url.includes('/api/auth/login'));
    console.log('ログインリクエスト:', JSON.stringify(loginRequests, null, 2));

    const loginResponses = networkResponses.filter(r => r.url.includes('/api/auth/login'));
    console.log('ログインレスポンス:', JSON.stringify(loginResponses, null, 2));

    console.log('\n========== ステップ5: LocalStorage確認 ==========');

    // ナビゲーション後に新しいコンテキストで確認
    try {
      const storageData = await page.evaluate(() => {
        const keys = Object.keys(localStorage);
        const data = {};
        keys.forEach(key => {
          data[key] = localStorage.getItem(key);
        });
        return data;
      });

      console.log('LocalStorage データ:', JSON.stringify(storageData, null, 2));
    } catch (error) {
      console.log('LocalStorage確認エラー:', error.message);
    }

    console.log('\n========== ステップ6: コンソールログ ==========');
    console.log('コンソールメッセージ（最新10件）:');
    consoleMessages.slice(-10).forEach(msg => console.log('  ', msg));

    console.log('\n========== ステップ7: APIレスポンス詳細 ==========');

    // 最後のログインレスポンスを詳しく確認
    if (loginResponses.length > 0) {
      const lastResponse = loginResponses[loginResponses.length - 1];
      console.log('最後のログインレスポンス:', lastResponse);

      // レスポンスボディを取得（リプレイ）
      await page.goto('/');
      const apiResponse = await page.request.post('http://localhost:3000/api/auth/login', {
        data: {
          email: 'admin@example.com',
          password: 'Admin123!',
        },
      });

      console.log('APIレスポンスステータス:', apiResponse.status());

      const responseBody = await apiResponse.json();
      console.log('APIレスポンスボディ:', JSON.stringify(responseBody, null, 2));
    }
  });
});
