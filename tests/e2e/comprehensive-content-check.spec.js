/**
 * 包括的コンテンツチェック
 *
 * 全ページのエラー、未実装、コンテンツの完全性を確認
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

test.describe('全ページの包括的確認', () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test('ダッシュボードの完全性チェック', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);

    console.log('\n📊 ダッシュボード分析:');

    // 統計カードの数
    const statsCards = await page.locator('[class*="ant-statistic"]').count();
    console.log(`  - 統計カード数: ${statsCards}`);

    // チャートの数
    const charts = await page.locator('canvas, svg[class*="chart"]').count();
    console.log(`  - グラフ数: ${charts}`);

    // テーブルの数
    const tables = await page.locator('table').count();
    console.log(`  - テーブル数: ${tables}`);

    // "未実装" や "Coming Soon" テキスト
    const unimplementedText = await page.locator('text=/未実装|coming soon|工事中|準備中/i').count();
    console.log(`  - 未実装表示: ${unimplementedText}個`);

    // エラー表示
    const errorAlerts = await page.locator('[class*="ant-alert-error"]').count();
    console.log(`  - エラーアラート: ${errorAlerts}個`);

    // ページエラー
    console.log(`  - JavaScriptエラー: ${errors.length}個`);

    // スクリーンショット
    await page.screenshot({ path: 'test-results/dashboard-full-check.png', fullPage: true });

    // アサーション
    expect(errors.length).toBe(0);
    expect(statsCards).toBeGreaterThan(0);
  });

  test('チケット一覧ページの確認', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');

    console.log('\n🎫 チケット一覧分析:');

    // テーブル
    const tables = await page.locator('table').count();
    console.log(`  - テーブル: ${tables}個`);

    // ボタン
    const buttons = await page.locator('button').count();
    console.log(`  - ボタン: ${buttons}個`);

    // 検索フィルタ
    const filters = await page.locator('input, select').count();
    console.log(`  - フィルタ要素: ${filters}個`);

    // エラー
    console.log(`  - JavaScriptエラー: ${errors.length}個`);

    await page.screenshot({ path: 'test-results/tickets-list-full-check.png', fullPage: true });

    expect(errors.length).toBe(0);
  });

  test('チケット作成ページの確認', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto('/tickets/create');
    await page.waitForLoadState('networkidle');

    console.log('\n➕ チケット作成ページ分析:');

    // フォーム要素
    const inputs = await page.locator('input, textarea').count();
    const selects = await page.locator('select, [class*="ant-select"]').count();
    const buttons = await page.locator('button').count();

    console.log(`  - 入力欄: ${inputs}個`);
    console.log(`  - セレクト: ${selects}個`);
    console.log(`  - ボタン: ${buttons}個`);

    // AI分類ウィジェット
    const aiWidgets = await page.locator('text=/AI分類/i').count();
    console.log(`  - AI分類ウィジェット: ${aiWidgets}個`);

    console.log(`  - JavaScriptエラー: ${errors.length}個`);

    await page.screenshot({ path: 'test-results/ticket-create-full-check.png', fullPage: true });

    expect(errors.length).toBe(0);
  });

  test('ナレッジ一覧ページの確認', async ({ page }) => {
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));

    await page.goto('/knowledge');
    await page.waitForLoadState('networkidle');

    console.log('\n📚 ナレッジ一覧分析:');

    // カードまたはリスト
    const cards = await page.locator('[class*="ant-card"], [class*="ant-list-item"]').count();
    console.log(`  - カード/リスト項目: ${cards}個`);

    // 検索機能
    const searchInputs = await page.locator('input[type="search"], input[placeholder*="検索"]').count();
    console.log(`  - 検索機能: ${searchInputs > 0 ? '✅' : '❌'}`);

    console.log(`  - JavaScriptエラー: ${errors.length}個`);

    await page.screenshot({ path: 'test-results/knowledge-list-full-check.png', fullPage: true });

    expect(errors.length).toBe(0);
  });

  test('全AIページの詳細確認', async ({ page }) => {
    const aiPages = [
      { path: '/ai/search', name: 'AI検索', expectedElements: ['input', 'button'] },
      { path: '/ai/chat', name: 'AIチャット', expectedElements: ['textarea', 'button'] },
      { path: '/ai/analyze', name: 'AI分析', expectedElements: ['table', '[class*="ant-statistic"]'] },
      { path: '/ai/recommend', name: 'AI推奨', expectedElements: ['[class*="ant-list"]', 'button'] }
    ];

    console.log('\n🤖 全AIページ詳細確認:');

    for (const aiPage of aiPages) {
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));

      await page.goto(aiPage.path);
      await page.waitForLoadState('networkidle');

      console.log(`\n  ${aiPage.name}:`);

      // 期待する要素の確認
      for (const selector of aiPage.expectedElements) {
        const count = await page.locator(selector).count();
        console.log(`    - ${selector}: ${count}個`);
      }

      // 未実装テキストの確認
      const unimplemented = await page.locator('text=/未実装|coming soon|工事中|準備中|開発中/i').count();
      console.log(`    - 未実装表示: ${unimplemented}個`);

      // エラーの確認
      console.log(`    - JavaScriptエラー: ${errors.length}個`);

      // アサーション
      expect(errors.length).toBe(0);
    }
  });

  test('空のコンテンツや壊れた要素を検出', async ({ page }) => {
    const pagesToCheck = [
      '/dashboard',
      '/tickets',
      '/knowledge',
      '/ai/search',
      '/ai/chat',
      '/ai/analyze',
      '/ai/recommend'
    ];

    console.log('\n🔍 コンテンツ完全性チェック:');

    for (const pagePath of pagesToCheck) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');

      // 空のカードを検出
      const emptyCards = await page.locator('[class*="ant-card"]:has-text("")').count();

      // 壊れた画像を検出
      const brokenImages = await page.evaluate(() => {
        const images = Array.from(document.querySelectorAll('img'));
        return images.filter(img => !img.complete || img.naturalHeight === 0).length;
      });

      // テキストのないボタンを検出
      const emptyButtons = await page.locator('button:not(:has-text(""))').count();

      console.log(`\n  ${pagePath}:`);
      console.log(`    - 空のカード: ${emptyCards}個`);
      console.log(`    - 壊れた画像: ${brokenImages}個`);
      console.log(`    - テキストなしボタン: ${emptyButtons}個`);
    }
  });

  test('ネットワークリクエストとAPIエラーの検出', async ({ page }) => {
    const apiErrors = [];

    page.on('response', response => {
      if (response.url().includes('/api/') && response.status() >= 400) {
        apiErrors.push({
          url: response.url(),
          status: response.status()
        });
      }
    });

    // 主要ページを巡回
    const pages = ['/dashboard', '/tickets', '/knowledge', '/ai/search'];

    console.log('\n🌐 API エラー検出:');

    for (const pagePath of pages) {
      await page.goto(pagePath);
      await page.waitForLoadState('networkidle');
    }

    console.log(`  - 検出されたAPIエラー: ${apiErrors.length}個`);

    if (apiErrors.length > 0) {
      console.log('\n  ❌ APIエラー詳細:');
      apiErrors.forEach(err => {
        console.log(`    - ${err.status} ${err.url}`);
      });
    }

    expect(apiErrors.length).toBe(0);
  });
});
