// WebUI スクリーンショット撮影スクリプト
import { chromium } from '@playwright/test';

async function captureUI() {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('📸 スクリーンショット撮影開始...');

  try {
    // 1. ログインページ
    console.log('1️⃣ ログインページ...');
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: 'screenshots/01-login-page.png', fullPage: true });

    // 2. ログイン実行
    console.log('2️⃣ ログイン実行...');
    await page.fill('input[placeholder="メールアドレス"]', 'admin@example.com');
    await page.fill('input[placeholder="パスワード"]', 'Admin123!');
    await page.click('button:has-text("ログイン")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    await page.screenshot({ path: 'screenshots/02-dashboard.png', fullPage: true });

    // 3. チケット一覧
    console.log('3️⃣ チケット一覧...');
    await page.goto('http://localhost:3001/tickets');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/03-ticket-list.png', fullPage: true });

    // 4. チケット作成ページ
    console.log('4️⃣ チケット作成ページ...');
    await page.goto('http://localhost:3001/tickets/new');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/04-ticket-create.png', fullPage: true });

    // 5. AI検索ページ
    console.log('5️⃣ AI検索ページ...');
    await page.goto('http://localhost:3001/ai/search');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/05-ai-search.png', fullPage: true });

    // 6. AIチャットページ
    console.log('6️⃣ AIチャットページ...');
    await page.goto('http://localhost:3001/ai/chat');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/06-ai-chat.png', fullPage: true });

    console.log('✅ 全スクリーンショット撮影完了！');
    console.log('📁 保存先: screenshots/');

  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await browser.close();
  }
}

captureUI();
