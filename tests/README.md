# Mirai ヘルプデスク管理システム - テストガイド

## 📋 目次

1. [テスト概要](#テスト概要)
2. [クイックスタート](#クイックスタート)
3. [テストファイル一覧](#テストファイル一覧)
4. [テスト実行方法](#テスト実行方法)
5. [トラブルシューティング](#トラブルシューティング)
6. [CI/CD との統合](#cicd-との統合)

---

## テスト概要

### テスト構成

Mirai ヘルプデスク管理システムは、**Playwright** を使用したE2Eテストで包括的にカバーされています。

**テスト統計**:
- **総テスト数**: 123テスト
- **テストファイル数**: 13ファイル
- **成功率**: 100%
- **実行時間**: 約1分（workers=2）

### テストカテゴリ

1. **基盤・既存機能テスト** (61テスト)
   - 認証・認可
   - ヘルスチェック
   - フロントエンドUI
   - ロゴ検証
   - コンテンツチェック

2. **総合テストスイート** (18テスト)
   - システム全体の統合テスト
   - パフォーマンステスト

3. **新機能テスト** (44テスト)
   - M365タスク管理
   - 承認ワークフロー
   - API統合テスト

---

## クイックスタート

### 前提条件

- Node.js 18以上
- PostgreSQL（または開発用SQLite）
- Redis（レート制限用）

### 1. 依存関係インストール

```bash
# ルートディレクトリで
npm ci

# バックエンド
cd backend && npm ci

# フロントエンド
cd frontend && npm ci

# Playwrightブラウザインストール
npx playwright install chromium --with-deps
```

### 2. サーバー起動

```bash
# プロジェクトルートで
./start-dev.sh
```

**サーバーURL**:
- バックエンド: http://localhost:3000
- フロントエンド: http://localhost:3001
- API: http://localhost:3000/api

### 3. テスト実行

```bash
# 全テスト実行
npx playwright test

# 特定のテストファイル実行
npx playwright test tests/e2e/comprehensive-test-suite.spec.js

# UIモードで実行（デバッグ用）
npx playwright test --ui

# レポート表示
npx playwright show-report
```

---

## テストファイル一覧

### 基盤テスト

| ファイル | テスト数 | 内容 |
|---|---|---|
| `health.spec.js` | 4 | APIヘルスチェック |
| `simple-login.spec.js` | 2 | シンプルログインテスト |
| `auth-updated.spec.js` | 15 | 認証機能（更新版） |
| `frontend-ui.spec.js` | 9 | フロントエンドUI |
| `logo-verification.spec.js` | 2 | ロゴ・アイコン検証 |
| `comprehensive-content-check.spec.js` | 6 | コンテンツ完全性チェック |
| `detailed-inspection.spec.js` | 7 | DOM構造詳細検査 |
| `ai-features.spec.js` | 7 | AI機能（認証なし） |
| `ai-authenticated.spec.js` | 4 | AI機能（認証あり） |

### 総合テスト

| ファイル | テスト数 | 内容 |
|---|---|---|
| `comprehensive-test-suite.spec.js` | 18 | システム全体の統合テスト |

### 新機能テスト

| ファイル | テスト数 | 内容 |
|---|---|---|
| `m365-tasks.spec.js` | 12 | M365タスク管理 |
| `approval-workflow.spec.js` | 10 | 承認ワークフロー |
| `api-integration.spec.js` | 22 | API統合テスト |

---

## テスト実行方法

### 基本的な実行

```bash
# 全テスト実行
npx playwright test

# 特定のファイルのみ
npx playwright test tests/e2e/comprehensive-test-suite.spec.js

# 特定のテストケースのみ（grepで検索）
npx playwright test --grep "ログイン機能"

# デバッグモード
npx playwright test --debug

# ヘッドレスモード無効（ブラウザを表示）
npx playwright test --headed
```

### 並列実行の調整

```bash
# workers数を指定（デフォルト: CPU数）
npx playwright test --workers=2

# 順次実行（workers=1）
npx playwright test --workers=1

# 完全並列実行
npx playwright test --workers=4
```

### レポート

```bash
# HTMLレポート生成
npx playwright test --reporter=html

# レポート表示
npx playwright show-report

# リスト形式で表示
npx playwright test --reporter=list

# JSON形式で出力
npx playwright test --reporter=json
```

---

## 環境変数

### テスト実行時の環境変数

```bash
# フロントエンドURL（デフォルト: http://127.0.0.1:3001）
export FRONTEND_URL=http://127.0.0.1:3001

# バックエンドURL（デフォルト: http://127.0.0.1:3000）
export API_BASE_URL=http://127.0.0.1:3000

# CI環境フラグ
export CI=true
```

### 開発環境の設定

**backend/.env**:
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/mirai_helpdesk
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:3001
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

**frontend/.env.development**:
```env
VITE_API_BASE_URL=/api
VITE_API_TARGET=http://127.0.0.1:3000
```

---

## トラブルシューティング

### 問題1: ログインが失敗する

**症状**: 「ログイン後にトークンがlocalStorageに保存されていません」

**原因**: Viteプロキシが正しく設定されていない

**解決策**:
```bash
# 1. vite.config.tsのプロキシ設定を確認
cat frontend/vite.config.ts

# プロキシターゲットが http://127.0.0.1:3000 であることを確認

# 2. サーバーを再起動
./stop-dev.sh
./start-dev.sh

# 3. Redisをクリア（レート制限リセット）
redis-cli FLUSHDB
```

### 問題2: レート制限エラー (429)

**症状**: 「Too many requests, please try again later」

**原因**: 多数のテスト実行によりレート制限に到達

**解決策**:
```bash
# Redisをクリア
redis-cli FLUSHDB

# または、レート制限を緩和（既に開発環境では100倍に設定済み）
# backend/src/middleware/rateLimit.ts を確認
```

### 問題3: ポート競合エラー

**症状**: 「EADDRINUSE: address already in use」

**原因**: サーバーが既に起動している

**解決策**:
```bash
# 既存のサーバーを停止
./stop-dev.sh

# または、手動で停止
pkill -f "nodemon"
pkill -f "vite"

# 再起動
./start-dev.sh
```

### 問題4: テストが不安定

**症状**: 並列実行時にランダムに失敗する

**解決策**:
```bash
# workers数を減らす
npx playwright test --workers=1

# または、特定のテストのみ実行
npx playwright test tests/e2e/comprehensive-test-suite.spec.js --workers=2
```

### 問題5: Playwrightブラウザが起動しない

**解決策**:
```bash
# ブラウザを再インストール
npx playwright install chromium --with-deps

# システム依存関係のインストール（Linux）
npx playwright install-deps
```

---

## CI/CD との統合

### GitHub Actions

プロジェクトには以下のGitHub Actionsワークフローが設定されています：

#### e2e.yml - E2Eテスト

```yaml
on:
  push:
    branches: [master, main, develop]
  pull_request:
    branches: [master, main, develop]
```

**実行内容**:
1. バックエンド起動（http://127.0.0.1:8000）※CI環境
2. フロントエンド起動（http://127.0.0.1:8080）※CI環境
3. Playwrightテスト実行: `npx playwright test --project=chromium`

**ローカルでCIと同じテストを実行**:
```bash
# CI環境変数を設定して実行
CI=true \
API_BASE_URL=http://127.0.0.1:3000 \
FRONTEND_URL=http://127.0.0.1:3001 \
npx playwright test --project=chromium
```

#### code-quality.yml - コード品質

```yaml
- npm run lint
- npm run build
- npm test
```

**ローカルで同じチェックを実行**:
```bash
# バックエンド
cd backend
npm run lint
npm run build
npm test

# フロントエンド
cd frontend
npm run lint
npm run build
npm test
```

---

## ベストプラクティス

### 1. テスト実行前の確認事項

- ✅ サーバーが起動していることを確認
- ✅ Redisが稼働していることを確認
- ✅ データベースが初期化されていることを確認

### 2. テスト作成時の注意点

- ✅ `helpers.js` の共通関数を使用
- ✅ `test.beforeEach` でログイン処理を共通化
- ✅ セレクタは柔軟に（複数候補を試行）
- ✅ タイムアウトを適切に設定
- ✅ デバッグ情報を console.log で出力

### 3. テストの安定性向上

- ✅ `await page.waitForLoadState('networkidle')` を使用
- ✅ 要素の表示を `waitFor()` で明示的に待機
- ✅ リトライ機能を実装（helpers.js参照）
- ✅ workers数を調整（2〜4が推奨）

### 4. テストデータ

**テストユーザー** (`tests/e2e/helpers.js`):
```javascript
TEST_ACCOUNTS: {
  admin: {
    email: 'admin@example.com',
    password: 'Admin123!',
    role: 'manager'
  },
  agent: {
    email: 'agent@example.com',
    password: 'Admin123!',
    role: 'agent'
  },
  requester: {
    email: 'user@example.com',
    password: 'Admin123!',
    role: 'requester'
  }
}
```

---

## テスト実行例

### シナリオ1: 開発中の機能テスト

```bash
# 新機能（M365タスク）のテストのみ実行
npx playwright test tests/e2e/m365-tasks.spec.js --headed

# 結果を確認
npx playwright show-report
```

### シナリオ2: PR前の最終確認

```bash
# 全テスト実行
npx playwright test --workers=2

# コード品質チェック
cd backend && npm run lint && npm run build
cd frontend && npm run lint && npm run build

# 結果確認
npx playwright show-report
```

### シナリオ3: 特定の機能をデバッグ

```bash
# UIモードで実行（ステップバイステップ）
npx playwright test --ui

# または、デバッグモードで
npx playwright test tests/e2e/auth-updated.spec.js --debug
```

---

## よくある質問（FAQ）

### Q1: テストが「LocalStorageキー: []」で失敗します

**A**: Viteプロキシが正しく設定されていません。

```bash
# vite.config.tsのproxy.target を確認
cat frontend/vite.config.ts | grep target

# http://127.0.0.1:3000 であることを確認

# サーバーを再起動
./stop-dev.sh && ./start-dev.sh
```

### Q2: レート制限エラー (429) が発生します

**A**: Redisをクリアしてレート制限をリセットしてください。

```bash
redis-cli FLUSHDB
```

### Q3: Playwrightがサーバーを起動しません

**A**: `playwright.config.js` の `webServer` 設定を確認してください。
現在の設定では、既存のサーバーを使用するため、手動でサーバーを起動する必要があります。

```bash
# 手動でサーバーを起動
./start-dev.sh

# テスト実行
npx playwright test
```

### Q4: テストが並列実行で不安定です

**A**: workers数を減らしてください。

```bash
# 推奨: workers=2
npx playwright test --workers=2

# 最も安定: workers=1（順次実行）
npx playwright test --workers=1
```

---

## 参考リンク

- [Playwright公式ドキュメント](https://playwright.dev/)
- [プロジェクトCLAUDE.md](../CLAUDE.md) - プロジェクト設計原則
- [GitHub Actions ワークフロー](../.github/workflows/)

---

## メンテナンス

### テストの更新が必要なケース

1. **Login.tsx の変更**: `tests/e2e/helpers.js` の `login()` 関数を更新
2. **API エンドポイントの追加**: 対応するテストを追加
3. **UI コンポーネントの変更**: セレクタを更新

### テストの追加

新しいテストを追加する際は、以下のテンプレートを参考にしてください：

```javascript
import { test, expect } from '@playwright/test';
import { login, API_BASE_URL, TEST_CONFIG } from './helpers.js';

test.describe('新機能テスト', () => {
  test.beforeEach(async ({ page }) => {
    const { email, password } = TEST_CONFIG.TEST_ACCOUNTS.admin;
    await login(page, email, password);
  });

  test('機能が正常に動作する', async ({ page }) => {
    await page.goto('/new-feature');
    await page.waitForLoadState('networkidle');

    // テストコード
    const element = page.locator('[data-testid="feature-element"]');
    await expect(element).toBeVisible();
  });
});
```

---

**更新日**: 2026-02-04
**バージョン**: 1.0.0
**メンテナ**: Mirai IT Team
