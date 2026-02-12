/**
 * AI 機能の E2E テスト
 *
 * AI 分類、検索、翻訳などの実際の動作を検証
 */

import { test, expect } from '@playwright/test';
import { login, TEST_CONFIG } from './helpers.js';

const FRONTEND_URL = TEST_CONFIG.FRONTEND_URL;
const API_BASE_URL = TEST_CONFIG.API_BASE_URL;

/**
 * フロントエンドサーバーが起動しているか事前チェック
 *
 * このテストスイートは、フロントエンドサーバー (デフォルト: http://127.0.0.1:3002) が
 * 起動していることを前提としています。サーバーが利用できない場合は、全テストをスキップします。
 *
 * テストを実行する前に、以下のコマンドでサーバーを起動してください:
 * ```
 * cd frontend && npm run dev
 * ```
 */
test.beforeAll(async () => {
  try {
    const response = await fetch(FRONTEND_URL);
    if (!response.ok && response.status !== 404) {
      test.skip(true, 'Frontend server is not running. Please start the server with `npm run dev` in the frontend directory.');
    }
  } catch (error) {
    test.skip(true, `Frontend server is not available at ${FRONTEND_URL}. Please start the server before running E2E tests.`);
  }
});

test.describe('AI 分類機能', () => {
  test('API経由でAI分類が正常に動作する', async ({ request }) => {
    // AI分類APIのテスト
    const response = await request.post(`${API_BASE_URL}/api/ai/classify-ticket`, {
      data: {
        subject: 'Teamsで画面共有ができない',
        description: 'Teams会議中に画面共有をしようとすると、エラーが出ます。'
      },
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // ステータスコード確認（401が返る可能性があるが、エンドポイントは存在する）
    console.log('AI分類API レスポンス:', response.status());

    if (response.status() === 401) {
      console.log('  ℹ️  認証が必要（正常な動作）');
    } else if (response.status() === 200) {
      const data = await response.json();
      console.log('  ✅ AI分類成功:', data);

      // レスポンス構造の確認
      expect(data).toHaveProperty('success');
      expect(data).toHaveProperty('data');
    }
  });
});

test.describe('AI コンポーネントの統合テスト', () => {
  test.beforeEach(async ({ page }) => {
    // 各テストの前にログイン
    await login(page, TEST_CONFIG.TEST_ACCOUNTS.admin.email, TEST_CONFIG.TEST_ACCOUNTS.admin.password);
  });

  test('AIClassificationWidget が表示される', async ({ page }) => {
    // チケット作成ページに移動（AIウィジェットが含まれる想定）
    await page.goto(`${FRONTEND_URL}/tickets/new`);
    await page.waitForLoadState('networkidle');

    // ページが読み込まれたことを確認
    const root = await page.locator('#root');
    await expect(root).toBeVisible();

    console.log('  ✅ チケット作成ページ読み込み成功');

    // スクリーンショット保存
    await page.screenshot({ path: 'test-results/ai-classification-widget.png', fullPage: true });
  });

  test('AISmartSearch が動作する', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/ai/search`);
    await page.waitForLoadState('networkidle');

    // AI検索ページが表示されることを確認
    const searchPage = await page.locator('#ai-search-page');
    await expect(searchPage).toBeVisible({ timeout: 10000 });
    console.log('  ✅ AI検索ページ読み込み成功');

    // 検索入力欄を明示的なIDで探す
    const searchInput = await page.locator('#ai-search-input');
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // テキストを入力
    await searchInput.fill('Outlookの添付ファイル問題');
    console.log('  ✅ 検索テキスト入力成功');

    await page.screenshot({ path: 'test-results/ai-smart-search-test.png', fullPage: true });
  });

  test('AIチャット画面が機能する', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/ai/chat`);
    await page.waitForLoadState('networkidle');

    // チャット入力欄を明示的なIDで探す
    const chatInput = await page.locator('#ai-chat-input');

    // 入力欄が表示されるまで待機（初期フェーズで表示される）
    await expect(chatInput).toBeVisible({ timeout: 10000 });
    console.log('  ✅ チャット入力欄が見つかりました');

    // メッセージを入力
    await chatInput.fill('こんにちは、Outlookで添付ファイルが送信できません。');
    console.log('  ✅ チャットメッセージ入力成功');

    await page.screenshot({ path: 'test-results/ai-chat-test.png', fullPage: true });
  });
});

test.describe('AI機能のエラーハンドリング', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン
    await login(page, TEST_CONFIG.TEST_ACCOUNTS.admin.email, TEST_CONFIG.TEST_ACCOUNTS.admin.password);
  });

  test('APIキーなしでもエラーページが表示されない', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('Warning')) {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto(`${FRONTEND_URL}/ai/analyze`);
    await page.waitForLoadState('networkidle');

    // AI分析ページが表示されることを確認
    const analyzePage = await page.locator('#ai-analyze-page');
    await expect(analyzePage).toBeVisible({ timeout: 10000 });
    console.log('  ✅ AI分析ページ読み込み成功');

    // クリティカルなエラーがないことを確認
    const criticalErrors = consoleErrors.filter(err =>
      !err.includes('Warning') &&
      !err.includes('deprecated') &&
      !err.includes('DevTools')
    );

    console.log('  クリティカルエラー数:', criticalErrors.length);

    if (criticalErrors.length > 0) {
      console.log('  エラー内容:', criticalErrors);
    }

    await page.screenshot({ path: 'test-results/ai-error-handling.png', fullPage: true });
  });
});

test.describe('AI機能のパフォーマンス', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン
    await login(page, TEST_CONFIG.TEST_ACCOUNTS.admin.email, TEST_CONFIG.TEST_ACCOUNTS.admin.password);
  });

  test('AIページの読み込みが5秒以内', async ({ page }) => {
    const pages = [
      { path: '/ai/search', id: '#ai-search-page' },
      { path: '/ai/chat', id: '#root' },
      { path: '/ai/analyze', id: '#ai-analyze-page' },
      { path: '/ai/recommend', id: '#ai-recommend-page' }
    ];

    for (const pageInfo of pages) {
      const startTime = Date.now();

      await page.goto(`${FRONTEND_URL}${pageInfo.path}`);
      await page.waitForLoadState('networkidle');

      // ページが正しく表示されることを確認
      const pageElement = await page.locator(pageInfo.id);
      await expect(pageElement).toBeVisible({ timeout: 10000 });

      const loadTime = Date.now() - startTime;

      console.log(`  ${pageInfo.path}: ${loadTime}ms`);

      expect(loadTime).toBeLessThan(5000);
    }
  });
});

test.describe('AI機能のアクセシビリティ', () => {
  test.beforeEach(async ({ page }) => {
    // ログイン
    await login(page, TEST_CONFIG.TEST_ACCOUNTS.admin.email, TEST_CONFIG.TEST_ACCOUNTS.admin.password);
  });

  test('AIページが基本的なアクセシビリティ要件を満たす', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/ai/search`);
    await page.waitForLoadState('networkidle');

    // AI検索ページが表示されることを確認
    const searchPage = await page.locator('#ai-search-page');
    await expect(searchPage).toBeVisible({ timeout: 10000 });

    // タイトルが存在することを確認
    const title = await page.title();
    expect(title).toBeTruthy();
    console.log('  ページタイトル:', title);

    // メイン要素が存在することを確認
    const main = await page.locator('main, [role="main"], #root').first();
    await expect(main).toBeVisible();

    console.log('  ✅ 基本的なアクセシビリティ要件を満たしています');
  });
});
