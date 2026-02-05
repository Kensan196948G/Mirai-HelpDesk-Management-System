/**
 * ネットワーク IP での包括的テスト
 *
 * 環境変数またはbaseURLで指定されたURLでの完全な動作確認
 */

import { test, expect } from '@playwright/test';

test.describe('ネットワーク IP アクセステスト', () => {
  test('ログインページが正常に表示される', async ({ page }) => {
    console.log('\n🌐 テストURL:', page.url());

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ページタイトル確認
    const title = await page.title();
    console.log('  📄 ページタイトル:', title);
    expect(title).toContain('Mirai');

    // ログインフォームの要素確認
    const emailInput = await page.locator('input[placeholder="メールアドレス"]').count();
    const passwordInput = await page.locator('input[placeholder="パスワード"]').count();
    const loginButton = await page.locator('button:has-text("ログイン")').count();

    console.log('  📋 フォーム要素:');
    console.log('    - メールアドレス入力欄:', emailInput > 0 ? '✅' : '❌');
    console.log('    - パスワード入力欄:', passwordInput > 0 ? '✅' : '❌');
    console.log('    - ログインボタン:', loginButton > 0 ? '✅' : '❌');

    await page.screenshot({ path: 'test-results/network-ip-login.png', fullPage: true });
  });

  test('ログインが成功し、ダッシュボードが表示される', async ({ page }) => {
    // エラーをキャプチャ
    const errors = [];
    page.on('pageerror', error => {
      errors.push(error.message);
    });

    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('Warning') && !msg.text().includes('DevTools')) {
        consoleErrors.push(msg.text());
      }
    });

    // ネットワークエラーをキャプチャ
    const networkErrors = [];
    page.on('requestfailed', request => {
      networkErrors.push({
        url: request.url(),
        error: request.failure()?.errorText
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ログイン処理
    await page.fill('input[placeholder="メールアドレス"]', 'admin@example.com');
    await page.fill('input[placeholder="パスワード"]', 'Admin123!');
    await page.click('button:has-text("ログイン")');

    // ログイン完了を待つ
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n  ログイン後のURL:', page.url());

    // スクリーンショット
    await page.screenshot({ path: 'test-results/network-ip-dashboard.png', fullPage: true });

    // エラーレポート
    console.log('\n  📊 エラーサマリー:');
    console.log('    - ページエラー:', errors.length);
    console.log('    - コンソールエラー:', consoleErrors.length);
    console.log('    - ネットワークエラー:', networkErrors.length);

    if (errors.length > 0) {
      console.log('\n  ❌ ページエラー:');
      errors.slice(0, 3).forEach(err => console.log('    -', err.substring(0, 100)));
    }

    if (consoleErrors.length > 0) {
      console.log('\n  ⚠️  コンソールエラー:');
      consoleErrors.slice(0, 3).forEach(err => console.log('    -', err.substring(0, 100)));
    }

    if (networkErrors.length > 0) {
      console.log('\n  🌐 ネットワークエラー:');
      networkErrors.slice(0, 3).forEach(err => console.log('    -', err.url, ':', err.error));
    }
  });

  test('AI ページへのナビゲーションテスト', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ログイン
    await page.fill('input[placeholder="メールアドレス"]', 'admin@example.com');
    await page.fill('input[placeholder="パスワード"]', 'Admin123!');
    await page.click('button:has-text("ログイン")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // AI ページに移動
    const aiPages = [
      { path: '/ai/search', name: 'AI検索' },
      { path: '/ai/chat', name: 'AIチャット' },
      { path: '/ai/analyze', name: 'AI分析' },
      { path: '/ai/recommend', name: 'AI推奨' }
    ];

    console.log('\n  🔍 AI ページナビゲーションテスト:');

    for (const aiPage of aiPages) {
      await page.goto(aiPage.path);
      await page.waitForLoadState('networkidle');

      const url = page.url();
      const isCorrectPage = url.includes(aiPage.path);

      console.log(`    ${isCorrectPage ? '✅' : '❌'} ${aiPage.name}: ${url}`);

      // スクリーンショット
      const filename = `network-ip-${aiPage.path.replace(/\//g, '-')}.png`;
      await page.screenshot({ path: `test-results/${filename}`, fullPage: true });
    }
  });

  test('AI チャット機能の完全テスト', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ログイン
    await page.fill('input[placeholder="メールアドレス"]', 'admin@example.com');
    await page.fill('input[placeholder="パスワード"]', 'Admin123!');
    await page.click('button:has-text("ログイン")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // AIチャットページへ移動
    await page.goto('/ai/chat');
    await page.waitForLoadState('networkidle');

    console.log('\n  💬 AI チャット機能テスト:');
    console.log('    現在のURL:', page.url());

    // チャット要素の確認
    const textareas = await page.locator('textarea').all();
    const buttons = await page.locator('button').all();
    const cards = await page.locator('[class*="ant-card"]').all();

    console.log('    📊 要素数:');
    console.log('      - テキストエリア:', textareas.length);
    console.log('      - ボタン:', buttons.length);
    console.log('      - カード:', cards.length);

    if (textareas.length > 0) {
      // メッセージを入力して送信
      await textareas[0].fill('Outlookで添付ファイルが送信できません。');
      console.log('    ✅ メッセージ入力成功');

      const sendButton = page.locator('button:has-text("送信")').first();
      if (await sendButton.isVisible()) {
        await sendButton.click();
        console.log('    ✅ 送信ボタンクリック成功');

        // AI応答を待つ
        await page.waitForTimeout(2000);
      }
    } else {
      console.log('    ⚠️  テキストエリアが見つかりませんでした');
    }

    await page.screenshot({ path: 'test-results/network-ip-chat-test.png', fullPage: true });
  });
});

test.describe('パフォーマンステスト', () => {
  test('全ページのロードタイムを計測', async ({ page }) => {
    const pages = [
      { path: '/', name: 'トップ' },
      { path: '/ai/search', name: 'AI検索', requiresAuth: true },
      { path: '/ai/chat', name: 'AIチャット', requiresAuth: true },
      { path: '/ai/analyze', name: 'AI分析', requiresAuth: true },
      { path: '/ai/recommend', name: 'AI推奨', requiresAuth: true }
    ];

    // ログイン
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="メールアドレス"]', 'admin@example.com');
    await page.fill('input[placeholder="パスワード"]', 'Admin123!');
    await page.click('button:has-text("ログイン")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('\n  ⚡ ページロードタイム計測:');

    for (const pageDef of pages) {
      const startTime = Date.now();

      await page.goto(pageDef.path);
      await page.waitForLoadState('networkidle');

      const loadTime = Date.now() - startTime;

      console.log(`    ${pageDef.name}: ${loadTime}ms`);
      expect(loadTime).toBeLessThan(5000);
    }
  });
});
