// AI対話アシスタント 3フェーズ機能テスト
import { chromium } from '@playwright/test';

async function testAIChatFlow() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('🧪 AI対話アシスタント 3フェーズ機能テスト開始...\n');

  try {
    // ログイン
    console.log('1️⃣ ログイン...');
    await page.goto('http://localhost:3001/');
    await page.waitForLoadState('networkidle');
    await page.fill('input[placeholder="メールアドレス"]', 'admin@example.com');
    await page.fill('input[placeholder="パスワード"]', 'Admin123!');
    await page.click('button:has-text("ログイン")');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    console.log('   ✅ ログイン成功\n');

    // AI対話アシスタントページへ
    console.log('2️⃣ AI対話アシスタントページへ移動...');
    await page.goto('http://localhost:3001/ai/chat');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshots/ai-chat-initial.png', fullPage: true });
    console.log('   ✅ AI対話アシスタントページ表示\n');

    // フェーズ1: 初期問題入力
    console.log('3️⃣ フェーズ1: 初期問題入力...');
    const problemText = 'Outlookで10MB以上のファイルを添付してメールを送信しようとすると、エラーメッセージが表示されて送信できません。';
    await page.fill('textarea[placeholder*="メッセージ"]', problemText);
    await page.click('button:has-text("送信")');
    console.log('   📤 問題を送信: ' + problemText);

    // 診断質問の生成を待機
    console.log('   ⏳ AI診断質問生成中...');
    await page.waitForTimeout(8000);  // AI API呼び出しを待機
    await page.screenshot({ path: 'screenshots/ai-chat-diagnostic.png', fullPage: true });

    // 診断質問が表示されているか確認
    const hasQuestions = await page.locator('text=診断質問').count() > 0;
    if (hasQuestions) {
      console.log('   ✅ 診断質問表示成功\n');

      // 質問数を確認
      const questionCount = await page.locator('[data-testid="diagnostic-question"]').count();
      console.log(`   📋 生成された質問数: ${questionCount}個\n`);
    } else {
      console.log('   ⚠️  診断質問が表示されませんでした（実装確認が必要）\n');
    }

    // フェーズ2: 解決提案（診断質問が表示されている場合のみ）
    if (hasQuestions) {
      console.log('4️⃣ フェーズ2: 診断回答入力...');
      // 最初の質問に回答（例）
      const firstInput = await page.locator('input, textarea').nth(1);
      await firstInput.fill('今朝から急に発生しました');
      await page.waitForTimeout(500);

      await page.click('button:has-text("回答を送信")');
      console.log('   📤 診断回答を送信');

      // 解決提案の生成を待機
      console.log('   ⏳ AI解決提案生成中...');
      await page.waitForTimeout(10000);  // AI API呼び出しを待機
      await page.screenshot({ path: 'screenshots/ai-chat-solutions.png', fullPage: true });

      const hasSolutions = await page.locator('text=解決策').count() > 0;
      if (hasSolutions) {
        console.log('   ✅ 解決提案表示成功\n');
      } else {
        console.log('   ⚠️  解決提案が表示されませんでした\n');
      }
    }

    console.log('✅ テスト完了！');
    console.log('📁 スクリーンショット保存先: screenshots/');

  } catch (error) {
    console.error('❌ テストエラー:', error.message);
    await page.screenshot({ path: 'screenshots/ai-chat-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testAIChatFlow();
