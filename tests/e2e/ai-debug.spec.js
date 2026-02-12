/**
 * AI機能のデバッグテスト
 * 白い画面の原因を特定する
 */

import { test, expect } from '@playwright/test';
import { login, TEST_CONFIG } from './helpers.js';

const FRONTEND_URL = TEST_CONFIG.FRONTEND_URL;

test.describe('AI機能デバッグ', () => {
  test('AI検索ページの詳細デバッグ', async ({ page }) => {
    // コンソールログを収集
    const consoleMessages = [];
    const consoleErrors = [];

    page.on('console', msg => {
      const text = msg.text();
      consoleMessages.push({ type: msg.type(), text });

      if (msg.type() === 'error') {
        consoleErrors.push(text);
      }
    });

    // ページエラーを収集
    const pageErrors = [];
    page.on('pageerror', error => {
      pageErrors.push(error.message);
    });

    // リクエスト失敗を収集
    const failedRequests = [];
    page.on('requestfailed', request => {
      failedRequests.push({
        url: request.url(),
        failure: request.failure()
      });
    });

    console.log('===== AI検索ページデバッグ開始 =====');

    // 1. ログイン
    console.log('\n1. ログイン実行中...');
    await login(page, TEST_CONFIG.TEST_ACCOUNTS.admin.email, TEST_CONFIG.TEST_ACCOUNTS.admin.password);
    console.log('✅ ログイン完了');

    // 2. AI検索ページに移動
    console.log('\n2. AI検索ページに移動中...');
    await page.goto(`${FRONTEND_URL}/ai/search`);

    // 少し待機
    await page.waitForTimeout(2000);

    console.log('✅ ページ移動完了');

    // 3. HTML全体を取得
    console.log('\n3. HTMLコンテンツ取得中...');
    const htmlContent = await page.content();
    console.log('HTML長さ:', htmlContent.length);
    console.log('HTML先頭500文字:', htmlContent.substring(0, 500));

    // #rootの存在確認
    const rootExists = htmlContent.includes('id="root"');
    console.log('#root存在:', rootExists);

    // #ai-search-pageの存在確認
    const searchPageExists = htmlContent.includes('id="ai-search-page"');
    console.log('#ai-search-page存在:', searchPageExists);

    // 4. 各要素の存在確認
    console.log('\n4. 要素の存在確認...');

    // #rootの確認
    const root = page.locator('#root');
    const rootVisible = await root.isVisible().catch(() => false);
    console.log('#root 表示:', rootVisible);

    if (rootVisible) {
      const rootText = await root.textContent();
      console.log('#root テキスト長:', rootText?.length || 0);
      console.log('#root テキスト先頭200文字:', rootText?.substring(0, 200) || '');
    }

    // #ai-search-pageの確認
    const searchPage = page.locator('#ai-search-page');
    const searchPageVisible = await searchPage.isVisible().catch(() => false);
    console.log('#ai-search-page 表示:', searchPageVisible);

    // #page-contentの確認
    const pageContent = page.locator('#page-content');
    const pageContentVisible = await pageContent.isVisible().catch(() => false);
    console.log('#page-content 表示:', pageContentVisible);

    if (pageContentVisible) {
      const contentText = await pageContent.textContent();
      console.log('#page-content テキスト長:', contentText?.length || 0);
      console.log('#page-content テキスト先頭200文字:', contentText?.substring(0, 200) || '');
    }

    // 5. コンソールログとエラーを表示
    console.log('\n5. コンソールログ:');
    console.log('総メッセージ数:', consoleMessages.length);
    consoleMessages.forEach((msg, i) => {
      if (i < 20) { // 最初の20件のみ表示
        console.log(`  [${msg.type}] ${msg.text}`);
      }
    });

    console.log('\n6. コンソールエラー:');
    console.log('エラー数:', consoleErrors.length);
    consoleErrors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });

    console.log('\n7. ページエラー:');
    console.log('エラー数:', pageErrors.length);
    pageErrors.forEach((err, i) => {
      console.log(`  ${i + 1}. ${err}`);
    });

    console.log('\n8. 失敗したリクエスト:');
    console.log('失敗数:', failedRequests.length);
    failedRequests.forEach((req, i) => {
      console.log(`  ${i + 1}. ${req.url}`);
      console.log(`     理由: ${req.failure?.errorText || 'unknown'}`);
    });

    // 9. LocalStorageの確認
    console.log('\n9. LocalStorage確認:');
    const localStorage = await page.evaluate(() => {
      const storage = {};
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key) {
          storage[key] = window.localStorage.getItem(key);
        }
      }
      return storage;
    });
    console.log('LocalStorage:', JSON.stringify(localStorage, null, 2));

    // 10. aiStoreの状態確認
    console.log('\n10. aiStore状態確認:');
    const aiStoreState = await page.evaluate(() => {
      // @ts-ignore
      return window.__AI_STORE_STATE__ || 'aiStore not exposed';
    });
    console.log('aiStore:', aiStoreState);

    // スクリーンショット保存
    await page.screenshot({
      path: 'test-results/ai-search-debug.png',
      fullPage: true
    });

    console.log('\n===== デバッグ完了 =====');
  });

  test('AI分析ページのデバッグ', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('\n===== AI分析ページデバッグ開始 =====');

    await login(page, TEST_CONFIG.TEST_ACCOUNTS.admin.email, TEST_CONFIG.TEST_ACCOUNTS.admin.password);
    await page.goto(`${FRONTEND_URL}/ai/analyze`);
    await page.waitForTimeout(2000);

    const htmlContent = await page.content();
    console.log('HTML長さ:', htmlContent.length);
    console.log('#ai-analyze-page存在:', htmlContent.includes('id="ai-analyze-page"'));

    const analyzePage = page.locator('#ai-analyze-page');
    const visible = await analyzePage.isVisible().catch(() => false);
    console.log('#ai-analyze-page 表示:', visible);

    console.log('コンソールエラー数:', consoleErrors.length);
    consoleErrors.forEach(err => console.log('  -', err));

    await page.screenshot({
      path: 'test-results/ai-analyze-debug.png',
      fullPage: true
    });

    console.log('===== デバッグ完了 =====\n');
  });

  test('AI推奨ページのデバッグ', async ({ page }) => {
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    console.log('\n===== AI推奨ページデバッグ開始 =====');

    await login(page, TEST_CONFIG.TEST_ACCOUNTS.admin.email, TEST_CONFIG.TEST_ACCOUNTS.admin.password);
    await page.goto(`${FRONTEND_URL}/ai/recommend`);
    await page.waitForTimeout(2000);

    const htmlContent = await page.content();
    console.log('HTML長さ:', htmlContent.length);
    console.log('#ai-recommend-page存在:', htmlContent.includes('id="ai-recommend-page"'));

    const recommendPage = page.locator('#ai-recommend-page');
    const visible = await recommendPage.isVisible().catch(() => false);
    console.log('#ai-recommend-page 表示:', visible);

    console.log('コンソールエラー数:', consoleErrors.length);
    consoleErrors.forEach(err => console.log('  -', err));

    await page.screenshot({
      path: 'test-results/ai-recommend-debug.png',
      fullPage: true
    });

    console.log('===== デバッグ完了 =====\n');
  });
});
