/**
 * 詳細確認テスト
 *
 * Playwright のトレース機能を使って詳細な動作を記録・確認
 */

import { test, expect } from '@playwright/test';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:3002';

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

test.describe('詳細な DOM 構造確認', () => {
  test('AIページのコンポーネント構造を解析', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/ai/search`);
    await page.waitForLoadState('networkidle');

    // React コンポーネントの検出
    const reactRoot = await page.locator('#root').innerHTML();

    console.log('\n📊 ページ統計:');
    console.log(`  - HTMLサイズ: ${reactRoot.length} 文字`);

    // 主要な要素の数をカウント
    const buttons = await page.locator('button').count();
    const inputs = await page.locator('input, textarea').count();
    const cards = await page.locator('[class*="card"]').count();

    console.log(`  - ボタン数: ${buttons}`);
    console.log(`  - 入力欄数: ${inputs}`);
    console.log(`  - カード数: ${cards}`);

    // Ant Design コンポーネントの検出
    const antdComponents = await page.locator('[class*="ant-"]').count();
    console.log(`  - Ant Designコンポーネント数: ${antdComponents}`);
  });

  test('ネットワークリクエストを監視', async ({ page }) => {
    const requests = [];
    const responses = [];

    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
    });

    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()['content-type']
      });
    });

    await page.goto(`${FRONTEND_URL}/ai/chat`);
    await page.waitForLoadState('networkidle');

    console.log('\n🌐 ネットワーク統計:');
    console.log(`  - リクエスト数: ${requests.length}`);
    console.log(`  - レスポンス数: ${responses.length}`);

    // APIリクエストを抽出
    const apiRequests = requests.filter(r => r.url.includes('/api/'));
    console.log(`  - APIリクエスト数: ${apiRequests.length}`);

    if (apiRequests.length > 0) {
      console.log('\n  📡 APIリクエスト一覧:');
      apiRequests.slice(0, 5).forEach(req => {
        console.log(`    - ${req.method} ${req.url}`);
      });
    }

    // エラーレスポンスを抽出
    const errorResponses = responses.filter(r => r.status >= 400);
    console.log(`\n  ⚠️  エラーレスポンス数: ${errorResponses.length}`);

    if (errorResponses.length > 0) {
      errorResponses.slice(0, 3).forEach(res => {
        console.log(`    - ${res.status} ${res.url}`);
      });
    }
  });

  test('パフォーマンスメトリクスを取得', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    // Performance API を使ってメトリクスを取得
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');

      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0
      };
    });

    console.log('\n⚡ パフォーマンスメトリクス:');
    console.log(`  - DOMContentLoaded: ${metrics.domContentLoaded.toFixed(2)}ms`);
    console.log(`  - Load Complete: ${metrics.loadComplete.toFixed(2)}ms`);
    console.log(`  - First Paint: ${metrics.firstPaint.toFixed(2)}ms`);
    console.log(`  - First Contentful Paint: ${metrics.firstContentfulPaint.toFixed(2)}ms`);
  });

  test('JavaScriptエラーとコンソールログを詳細に記録', async ({ page }) => {
    const logs = {
      errors: [],
      warnings: [],
      info: [],
      debug: []
    };

    page.on('console', msg => {
      const text = msg.text();
      const type = msg.type();

      if (type === 'error') {
        logs.errors.push(text);
      } else if (type === 'warning') {
        logs.warnings.push(text);
      } else if (type === 'info') {
        logs.info.push(text);
      } else if (type === 'debug' || type === 'log') {
        logs.debug.push(text);
      }
    });

    page.on('pageerror', error => {
      logs.errors.push(`Page Error: ${error.message}`);
    });

    await page.goto(`${FRONTEND_URL}/ai/analyze`);
    await page.waitForLoadState('networkidle');

    console.log('\n📝 コンソールログ統計:');
    console.log(`  - エラー: ${logs.errors.length}`);
    console.log(`  - 警告: ${logs.warnings.length}`);
    console.log(`  - 情報: ${logs.info.length}`);
    console.log(`  - デバッグ: ${logs.debug.length}`);

    if (logs.errors.length > 0) {
      console.log('\n  ❌ エラー内容:');
      logs.errors.slice(0, 5).forEach(err => {
        console.log(`    - ${err.substring(0, 100)}`);
      });
    }

    if (logs.warnings.length > 0) {
      console.log('\n  ⚠️  警告内容:');
      logs.warnings.slice(0, 3).forEach(warn => {
        console.log(`    - ${warn.substring(0, 100)}`);
      });
    }
  });

  test('ローカルストレージとセッションストレージを確認', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/dashboard`);
    await page.waitForLoadState('networkidle');

    const storageData = await page.evaluate(() => {
      return {
        localStorage: Object.keys(localStorage).map(key => ({
          key,
          value: localStorage.getItem(key)?.substring(0, 100) + '...'
        })),
        sessionStorage: Object.keys(sessionStorage).map(key => ({
          key,
          value: sessionStorage.getItem(key)?.substring(0, 100) + '...'
        }))
      };
    });

    console.log('\n💾 ストレージ情報:');
    console.log(`  - LocalStorage項目数: ${storageData.localStorage.length}`);
    console.log(`  - SessionStorage項目数: ${storageData.sessionStorage.length}`);

    if (storageData.localStorage.length > 0) {
      console.log('\n  LocalStorage内容:');
      storageData.localStorage.forEach(item => {
        console.log(`    - ${item.key}: ${item.value}`);
      });
    }
  });
});

test.describe('未実装機能の検出', () => {
  test('AIページで未実装のコンポーネントを検出', async ({ page }) => {
    const pages = [
      { path: '/ai/search', name: 'AI検索' },
      { path: '/ai/chat', name: 'AIチャット' },
      { path: '/ai/analyze', name: 'AI分析' },
      { path: '/ai/recommend', name: 'AI推奨' }
    ];

    console.log('\n🔍 未実装機能の検出:');

    for (const pageDef of pages) {
      await page.goto(`${FRONTEND_URL}${pageDef.path}`);
      await page.waitForLoadState('networkidle');

      // "Coming Soon" や "未実装" などのテキストを探す
      const comingSoonText = await page.locator('text=/coming soon|工事中|未実装|準備中/i').count();

      // ダミーコンポーネント（Card のみ）を検出
      const cards = await page.locator('[class*="card"]').count();
      const buttons = await page.locator('button').count();
      const inputs = await page.locator('input, textarea').count();

      const isImplemented = (buttons > 0 || inputs > 0) && comingSoonText === 0;

      console.log(`\n  ${pageDef.name}:`);
      console.log(`    - 実装状況: ${isImplemented ? '✅ 実装済み' : '⚠️  未実装またはプレースホルダー'}`);
      console.log(`    - ボタン数: ${buttons}`);
      console.log(`    - 入力欄数: ${inputs}`);
      console.log(`    - カード数: ${cards}`);
      console.log(`    - "Coming Soon"テキスト: ${comingSoonText}`);
    }
  });
});
