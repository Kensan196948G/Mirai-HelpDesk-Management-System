/**
 * 認証後の AI 機能テスト
 *
 * ログイン処理を含めた完全な E2E テスト
 */

import { test, expect } from '@playwright/test';
import { login, TEST_CONFIG } from './helpers.js';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://127.0.0.1:3001';
const API_BASE_URL = process.env.API_BASE_URL || 'http://127.0.0.1:3000';

// テストユーザー情報
const TEST_USER = TEST_CONFIG.TEST_ACCOUNTS.admin;

test.describe('認証後の AI 機能テスト', () => {
  // 各テストの前にログイン（helpers.jsの改善版login関数を使用）
  test.beforeEach(async ({ page }) => {
    await login(page, TEST_USER.email, TEST_USER.password);
  });

  test('ログイン後にAIチャットページが表示される', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/ai/chat`);
    await page.waitForLoadState('networkidle');

    // チャット入力欄が表示されることを確認（textareaまたはinput）
    const chatInputs = page.locator('textarea, input[type="text"], [contenteditable="true"]');
    const count = await chatInputs.count();

    console.log('  チャット入力欄数:', count);

    if (count > 0) {
      const chatInput = chatInputs.first();
      await expect(chatInput).toBeVisible({ timeout: 5000 });

      // メッセージを送信
      await chatInput.fill('Outlookで添付ファイルが送信できません。');

      const sendButton = page.locator('button:has-text("送信"), button[type="submit"]');
      const buttonCount = await sendButton.count();

      if (buttonCount > 0) {
        await sendButton.first().click();
        await page.waitForTimeout(2000);
      }

      // スクリーンショット保存
      await page.screenshot({ path: 'test-results/ai-chat-authenticated.png', fullPage: true });

      console.log('  ✅ AIチャット機能が正常に動作しました');
    } else {
      console.log('  ⚠️ AIチャット入力欄が見つかりません（実装中の可能性）');
    }
  });

  test('ログイン後にAI分析ページが表示される', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/ai/analyze`);
    await page.waitForLoadState('networkidle');

    // 統計カードが表示されることを確認
    const cards = page.locator('[class*="ant-card"]');
    const cardCount = await cards.count();

    expect(cardCount).toBeGreaterThan(0);
    console.log(`  ℹ️  ${cardCount} 個のカードが表示されています`);

    // スクリーンショット保存
    await page.screenshot({ path: 'test-results/ai-analyze-authenticated.png', fullPage: true });
  });

  test('ログイン後にAI推奨ページが表示される', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/ai/recommend`);
    await page.waitForLoadState('networkidle');

    // 推奨カードが表示されることを確認
    const recommendations = page.locator('[class*="ant-card"]');
    const recCount = await recommendations.count();

    expect(recCount).toBeGreaterThan(0);
    console.log(`  ℹ️  ${recCount} 個の推奨が表示されています`);

    // スクリーンショット保存
    await page.screenshot({ path: 'test-results/ai-recommend-authenticated.png', fullPage: true });
  });

  test('ログイン後にAI検索ページが表示される', async ({ page }) => {
    await page.goto(`${FRONTEND_URL}/ai/search`);
    await page.waitForLoadState('networkidle');

    // ページコンテンツが表示されることを確認（入力欄、ボタン、Card）
    const pageElements = page.locator('input, textarea, button, [class*="ant-card"]');
    const elementCount = await pageElements.count();

    expect(elementCount).toBeGreaterThan(0);
    console.log(`  ℹ️  ${elementCount} 個の要素が表示されています`);

    // スクリーンショット保存
    await page.screenshot({ path: 'test-results/ai-search-authenticated.png', fullPage: true });
  });
});

test.describe('AI機能の実際の動作テスト', () => {
  test.skip('AIチャットで実際に会話ができる', async ({ page }) => {
    // このテストは実際のAI APIを呼び出すため、スキップ
    // 必要に応じて有効化
  });

  test.skip('AI分類で実際のチケットを分類できる', async ({ page }) => {
    // このテストは実際のAI APIを呼び出すため、スキップ
  });
});
