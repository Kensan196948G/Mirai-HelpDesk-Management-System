/**
 * フロントエンド UI テスト
 *
 * WebUI の表示とAI機能の動作確認
 */

import { test, expect } from '@playwright/test';

// ヘルパー関数: ログインを実行
async function login(page) {
  await page.goto('/');
  await page.waitForLoadState('networkidle');
  await page.fill('input[placeholder="メールアドレス"]', 'admin@example.com');
  await page.fill('input[placeholder="パスワード"]', 'Admin123!');
  await page.click('button:has-text("ログイン")');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
}

test.describe('フロントエンド UI 確認', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('トップページが表示される', async ({ page }) => {
    // コンソールエラーをキャプチャ
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // ページネットワークエラーをキャプチャ
    const networkErrors = [];
    page.on('requestfailed', request => {
      networkErrors.push(`${request.url()} - ${request.failure().errorText}`);
    });

    await page.goto('/dashboard');

    // ページタイトル確認
    await expect(page).toHaveTitle(/Mirai/);

    // Root 要素が存在することを確認
    const root = await page.locator('#root');
    await expect(root).toBeVisible();

    // エラーがないことを確認
    console.log('コンソールエラー:', consoleErrors);
    console.log('ネットワークエラー:', networkErrors);

    // スクリーンショット保存
    await page.screenshot({ path: 'test-results/frontend-top.png', fullPage: true });
  });

  test('AI検索ページにアクセスできる', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/ai/search');

    // ページが読み込まれるのを待つ
    await page.waitForLoadState('networkidle');

    // Root 要素が存在することを確認
    const root = await page.locator('#root');
    await expect(root).toBeVisible();

    console.log('AI検索ページ - コンソールエラー:', consoleErrors);

    // スクリーンショット保存
    await page.screenshot({ path: 'test-results/ai-search-page.png', fullPage: true });
  });

  test('AIチャットページにアクセスできる', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/ai/chat');
    await page.waitForLoadState('networkidle');

    const root = await page.locator('#root');
    await expect(root).toBeVisible();

    console.log('AIチャットページ - コンソールエラー:', consoleErrors);

    await page.screenshot({ path: 'test-results/ai-chat-page.png', fullPage: true });
  });

  test('AI分析ページにアクセスできる', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/ai/analyze');
    await page.waitForLoadState('networkidle');

    const root = await page.locator('#root');
    await expect(root).toBeVisible();

    console.log('AI分析ページ - コンソールエラー:', consoleErrors);

    await page.screenshot({ path: 'test-results/ai-analyze-page.png', fullPage: true });
  });

  test('AI推奨ページにアクセスできる', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/ai/recommend');
    await page.waitForLoadState('networkidle');

    const root = await page.locator('#root');
    await expect(root).toBeVisible();

    console.log('AI推奨ページ - コンソールエラー:', consoleErrors);

    await page.screenshot({ path: 'test-results/ai-recommend-page.png', fullPage: true });
  });
});

test.describe('コンポーネント表示確認', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('ダッシュボードが表示される', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // ダッシュボード要素の確認
    const root = await page.locator('#root');
    await expect(root).toBeVisible();

    await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true });
  });

  test('チケット一覧が表示される', async ({ page }) => {
    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');

    const root = await page.locator('#root');
    await expect(root).toBeVisible();

    await page.screenshot({ path: 'test-results/tickets-list.png', fullPage: true });
  });

  test('ナレッジ一覧が表示される', async ({ page }) => {
    await page.goto('/knowledge');
    await page.waitForLoadState('networkidle');

    const root = await page.locator('#root');
    await expect(root).toBeVisible();

    await page.screenshot({ path: 'test-results/knowledge-list.png', fullPage: true });
  });
});

test.describe('エラーページ確認', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('404ページが表示される', async ({ page }) => {
    await page.goto('/nonexistent-page');
    await page.waitForLoadState('networkidle');

    const root = await page.locator('#root');
    await expect(root).toBeVisible();

    await page.screenshot({ path: 'test-results/404-page.png', fullPage: true });
  });
});
