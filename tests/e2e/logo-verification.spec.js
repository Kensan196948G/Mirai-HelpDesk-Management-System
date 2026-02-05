/**
 * ロゴアイコン表示確認テスト
 */

import { test, expect } from '@playwright/test';

test.describe('ロゴアイコン確認', () => {
  test('左上ヘッダーのロゴとアイコンを確認', async ({ page }) => {
    // ログイン
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="メールアドレス"]', 'admin@example.com');
    await page.fill('input[placeholder="パスワード"]', 'Admin123!');
    await page.click('button:has-text("ログイン")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000);

    // ダッシュボードに移動
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    console.log('\n🎨 ロゴアイコン確認:\n');

    // ロゴ要素を確認
    const logo = page.locator('.logo');
    const logoVisible = await logo.isVisible();

    console.log('  ロゴ要素:', logoVisible ? '✅ 表示' : '❌ 非表示');

    if (logoVisible) {
      // ロゴのHTML内容を取得
      const logoHTML = await logo.innerHTML();
      console.log('  ロゴHTML:', logoHTML.substring(0, 200));

      // CustomerServiceOutlined アイコンの存在確認
      const hasIcon = logoHTML.includes('anticon-customer-service') || logoHTML.includes('CustomerService');
      console.log('  ヘッドセットアイコン:', hasIcon ? '✅ 存在' : '❌ なし');

      // テキストの存在確認
      const logoText = await logo.textContent();
      console.log('  ロゴテキスト:', logoText);
    }

    // スクリーンショット（全画面、スクロールなし）
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.screenshot({ path: 'test-results/logo-full-screen.png', fullPage: false });

    // サイドバーのスクリーンショット
    const sidebar = page.locator('[class*="ant-layout-sider"]').first();
    if (await sidebar.isVisible()) {
      await sidebar.screenshot({ path: 'test-results/sidebar-with-logo.png' });
      console.log('  サイドバースクリーンショット保存: ✅');
    }
  });

  test('ロゴのDOM構造を詳細確認', async ({ page }) => {
    await page.goto('/');
    await page.fill('input[placeholder="メールアドレス"]', 'admin@example.com');
    await page.fill('input[placeholder="パスワード"]', 'Admin123!');
    await page.click('button:has-text("ログイン")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);

    // DOMを解析
    const logoInfo = await page.evaluate(() => {
      const logo = document.querySelector('.logo');
      if (!logo) return null;

      return {
        exists: true,
        innerHTML: logo.innerHTML,
        outerHTML: logo.outerHTML,
        textContent: logo.textContent,
        hasIcon: logo.querySelector('[class*="anticon"]') !== null,
        iconClass: logo.querySelector('[class*="anticon"]')?.className || null
      };
    });

    console.log('\n🔍 ロゴDOM詳細:\n');
    console.log(JSON.stringify(logoInfo, null, 2));
  });
});
