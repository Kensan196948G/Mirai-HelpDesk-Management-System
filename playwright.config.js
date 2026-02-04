import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration
 * Mirai HelpDesk Management System
 */
export default defineConfig({
  // テストディレクトリ
  testDir: './tests/e2e',

  // テストファイルのマッチングパターン
  testMatch: '**/*.spec.js',

  // 並列実行の設定
  fullyParallel: true,

  // CI環境では.only()の使用を禁止
  forbidOnly: !!process.env.CI,

  // リトライ設定（CI環境では2回まで）
  retries: process.env.CI ? 2 : 0,

  // ワーカー数（CI環境では1つ、ローカルではCPU数に基づく）
  workers: process.env.CI ? 1 : undefined,

  // レポート出力形式
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results/results.json' }]
  ],

  // グローバル設定
  use: {
    // フロントエンドのベースURL（環境変数で上書き可能）
    baseURL: process.env.FRONTEND_URL || 'http://127.0.0.1:3001',

    // API エンドポイント（環境変数で上書き可能）
    extraHTTPHeaders: {
      'Accept': 'application/json',
    },

    // トレース設定（失敗時に自動記録）
    trace: 'on-first-retry',

    // スクリーンショット（失敗時のみ）
    screenshot: 'only-on-failure',

    // ビデオ録画（失敗時のみ）
    video: 'retain-on-failure',

    // タイムアウト設定
    actionTimeout: 10 * 1000, // 10秒
    navigationTimeout: 30 * 1000, // 30秒
  },

  // テストタイムアウト（1テスト30秒）
  timeout: 30 * 1000,

  // プロジェクト設定（複数ブラウザ対応）
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 必要に応じて他のブラウザを追加
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  // ローカル開発サーバーの起動設定
  // ⚠️ webServer設定をコメントアウト: 手動で起動したサーバーを使用
  // CI環境では別途サーバー起動が必要
  // webServer: [
  //   // TypeScript Express Backend
  //   {
  //     command: 'cd backend && npm run dev',
  //     url: 'http://127.0.0.1:3000/health',
  //     reuseExistingServer: true,  // 既存サーバーを常に再利用
  //     timeout: 120 * 1000,
  //     stdout: 'pipe',
  //     stderr: 'pipe',
  //   },
  //   // React Frontend (Vite Dev Server)
  //   {
  //     command: 'cd frontend && VITE_API_TARGET=http://127.0.0.1:3000 npm run dev',
  //     url: 'http://127.0.0.1:3001',
  //     reuseExistingServer: true,  // 既存サーバーを常に再利用
  //     timeout: 120 * 1000,
  //     stdout: 'pipe',
  //     stderr: 'pipe',
  //   },
  // ],
});
