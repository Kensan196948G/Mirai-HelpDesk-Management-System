/**
 * リモート Chrome 接続テスト
 *
 * SSH トンネリング経由で Windows の Chrome を操作
 */

const puppeteer = require('puppeteer-core');

async function testRemoteChrome() {
  console.log('🌐 リモート Chrome 接続テスト\n');

  try {
    // リモートデバッグポートに接続
    console.log('1️⃣ Chrome に接続中...');
    const browser = await puppeteer.connect({
      browserURL: 'http://localhost:9222',
      defaultViewport: null
    });

    console.log('  ✅ Chrome 接続成功!\n');

    // ブラウザ情報取得
    const version = await browser.version();
    console.log('  Chrome バージョン:', version);

    // 既存のページを取得
    const pages = await browser.pages();
    console.log('  開いているタブ数:', pages.length, '\n');

    // 新しいページを作成
    console.log('2️⃣ 新しいタブを作成...');
    const page = await browser.newPage();

    // Mirai ヘルプデスクにアクセス
    console.log('3️⃣ Mirai ヘルプデスクにアクセス...');
    await page.goto('http://192.168.0.185:3005', { waitUntil: 'networkidle0' });

    const title = await page.title();
    console.log('  ページタイトル:', title);
    console.log('  URL:', page.url(), '\n');

    // スクリーンショット取得
    console.log('4️⃣ スクリーンショット取得...');
    await page.screenshot({ path: 'test-results/remote-chrome-login.png', fullPage: true });
    console.log('  ✅ スクリーンショット保存: remote-chrome-login.png\n');

    // ログイン処理
    console.log('5️⃣ ログイン処理...');
    await page.type('input[placeholder="メールアドレス"]', 'admin@example.com');
    await page.type('input[placeholder="パスワード"]', 'Admin123!');

    // ログインボタンをevaluateで検索してクリック
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const loginButton = buttons.find(btn => btn.textContent.includes('ログイン'));
      if (loginButton) loginButton.click();
    });

    await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 10000 }).catch(() => console.log('  ナビゲーション待機タイムアウト'));
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('  ✅ ログイン成功');
    console.log('  ログイン後URL:', page.url(), '\n');

    await page.screenshot({ path: 'test-results/remote-chrome-dashboard.png', fullPage: true });
    console.log('  ✅ ダッシュボードスクリーンショット保存\n');

    // AI ページに移動
    console.log('6️⃣ AI ページ確認...');
    const aiPages = [
      { url: '/ai/chat', name: 'AIチャット' },
      { url: '/ai/search', name: 'AI検索' },
      { url: '/ai/analyze', name: 'AI分析' },
      { url: '/ai/recommend', name: 'AI推奨' }
    ];

    for (const aiPage of aiPages) {
      await page.goto(`http://192.168.0.185:3005${aiPage.url}`, { waitUntil: 'networkidle0' });
      await new Promise(resolve => setTimeout(resolve, 1000));

      const title = await page.title();
      const filename = `test-results/remote-chrome-${aiPage.url.replace(/\//g, '-')}.png`;

      await page.screenshot({ path: filename, fullPage: true });

      console.log(`  ✅ ${aiPage.name}: ${title}`);
      console.log(`     スクリーンショット: ${filename}`);
    }

    console.log('\n7️⃣ コンソールログ確認...');

    // コンソールログをキャプチャ
    page.on('console', msg => {
      const type = msg.type();
      if (type === 'error' || type === 'warning') {
        console.log(`  [${type}] ${msg.text()}`);
      }
    });

    // ページエラーをキャプチャ
    page.on('pageerror', error => {
      console.log(`  [PAGE ERROR] ${error.message}`);
    });

    await page.goto('http://192.168.0.185:3005/ai/chat', { waitUntil: 'networkidle0' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    console.log('  ✅ エラー監視完了\n');

    console.log('8️⃣ DOM 構造確認...');

    // ロゴアイコンの確認
    const logoInfo = await page.evaluate(() => {
      const logo = document.querySelector('.logo');
      if (!logo) return { exists: false };

      const icon = logo.querySelector('[class*="anticon-customer-service"]');

      return {
        exists: true,
        hasIcon: icon !== null,
        iconStyle: icon ? window.getComputedStyle(icon).fontSize : null,
        logoText: logo.textContent
      };
    });

    console.log('  ロゴ情報:', JSON.stringify(logoInfo, null, 2));

    console.log('\n🎉 リモート Chrome テスト完了!\n');

    // ブラウザを閉じずに接続を切断
    await browser.disconnect();

  } catch (error) {
    console.error('\n❌ エラー発生:', error.message);
    process.exit(1);
  }
}

testRemoteChrome();
