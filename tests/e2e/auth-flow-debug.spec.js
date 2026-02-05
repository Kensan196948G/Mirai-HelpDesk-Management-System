/**
 * 認証フローの詳細デバッグ
 */

import { test, expect } from '@playwright/test';

test.describe('認証フロー完全デバッグ', () => {
  test('ログインからダッシュボードまでの完全フロー', async ({ page, context }) => {
    console.log('\n🔐 認証フロー完全デバッグ開始\n');

    // === ステップ1: ログイン ===
    console.log('【ステップ1】ログインページアクセス');
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    console.log('  現在のURL:', page.url());
    console.log('  ページタイトル:', await page.title());

    // ログイン実行
    console.log('\n【ステップ2】ログイン処理実行');
    await page.fill('input[placeholder="メールアドレス"]', 'admin@example.com');
    await page.fill('input[placeholder="パスワード"]', 'Admin123!');

    // ナビゲーションを待機
    const [response] = await Promise.all([
      page.waitForResponse(response => response.url().includes('/api/auth/login') && response.status() === 200),
      page.click('button:has-text("ログイン")')
    ]);

    console.log('  ✅ ログインAPIレスポンス:', response.status());

    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('  ログイン後のURL:', page.url());

    // LocalStorage確認
    const storage = await page.evaluate(() => {
      const authStorage = localStorage.getItem('auth-storage');
      return authStorage ? JSON.parse(authStorage) : null;
    });

    console.log('  LocalStorage認証情報:', storage ? '✅ 存在' : '❌ なし');
    if (storage?.state?.user) {
      console.log('  ユーザー情報:', storage.state.user.display_name, `(${storage.state.user.role})`);
    }

    await page.screenshot({ path: 'test-results/auth-step1-after-login.png', fullPage: true });

    // === ステップ2: ダッシュボードアクセス ===
    console.log('\n【ステップ3】ダッシュボードアクセス');

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('  現在のURL:', page.url());
    console.log('  ページタイトル:', await page.title());

    // ダッシュボード要素の確認
    const mainContent = await page.locator('main, [role="main"], .dashboard').count();
    const cards = await page.locator('[class*="ant-card"]').count();
    const statistics = await page.locator('[class*="ant-statistic"]').count();

    console.log('  メインコンテンツ:', mainContent > 0 ? '✅' : '❌');
    console.log('  カード数:', cards);
    console.log('  統計数:', statistics);

    await page.screenshot({ path: 'test-results/auth-step2-dashboard.png', fullPage: true });

    // === ステップ3: AIページアクセス ===
    console.log('\n【ステップ4】AIチャットページアクセス');

    await page.goto('/ai/chat');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    console.log('  現在のURL:', page.url());

    // チャット要素の確認
    const textareas = await page.locator('textarea').count();
    const chatCards = await page.locator('[class*="ant-card"]').count();
    const avatars = await page.locator('[class*="ant-avatar"]').count();

    console.log('  テキストエリア:', textareas);
    console.log('  カード:', chatCards);
    console.log('  アバター:', avatars);

    await page.screenshot({ path: 'test-results/auth-step3-ai-chat.png', fullPage: true });

    // === ステップ4: AI分析ページ ===
    console.log('\n【ステップ5】AI分析ページアクセス');

    await page.goto('/ai/analyze');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    const analyzeStats = await page.locator('[class*="ant-statistic"]').count();
    const analyzeTables = await page.locator('table').count();

    console.log('  統計カード:', analyzeStats);
    console.log('  テーブル:', analyzeTables);

    await page.screenshot({ path: 'test-results/auth-step4-ai-analyze.png', fullPage: true });

    // === ステップ5: Cookie確認 ===
    console.log('\n【ステップ6】Cookie確認');

    const cookies = await context.cookies();
    console.log('  Cookie数:', cookies.length);

    if (cookies.length > 0) {
      cookies.forEach(cookie => {
        console.log(`    - ${cookie.name}: ${cookie.value.substring(0, 20)}...`);
      });
    }

    console.log('\n✅ 認証フローデバッグ完了');
  });

  test('React Router の動作確認', async ({ page }) => {
    console.log('\n🔀 React Router 動作確認\n');

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // ログイン
    await page.fill('input[placeholder="メールアドレス"]', 'admin@example.com');
    await page.fill('input[placeholder="パスワード"]', 'Admin123!');
    await page.click('button:has-text("ログイン")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    console.log('ログイン後のURL:', page.url());

    // ナビゲーションメニューのリンクをクリック
    const navLinks = await page.locator('nav a, [class*="menu"] a').all();

    console.log(`\n📋 ナビゲーションリンク数: ${navLinks.length}`);

    for (let i = 0; i < Math.min(navLinks.length, 5); i++) {
      const link = navLinks[i];
      const text = await link.textContent();
      const href = await link.getAttribute('href');

      console.log(`  ${i + 1}. ${text}: ${href}`);
    }

    // AIチャットリンクをクリック
    const aiChatLink = page.locator('text=/AI.*チャット|AI対話/i').first();

    if (await aiChatLink.count() > 0) {
      console.log('\n  AIチャットリンクをクリック...');
      await aiChatLink.click();
      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(2000);

      console.log('  移動後のURL:', page.url());

      await page.screenshot({ path: 'test-results/nav-to-ai-chat.png', fullPage: true });
    }
  });
});
