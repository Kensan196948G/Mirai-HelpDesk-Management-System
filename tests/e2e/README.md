# Playwright E2E Tests

Mirai HelpDesk Management System の End-to-End テストスイート

## 概要

このディレクトリには、Playwright を使用した E2E テストが含まれています。フロントエンドの UI 操作とバックエンド API の統合テストを実施します。

## テストファイル構成

```
tests/e2e/
├── README.md           # このファイル
├── helpers.js          # 共通ヘルパー関数
├── auth.spec.js        # 認証機能のテスト
├── tickets.spec.js     # チケット管理のテスト
├── sla.spec.js         # SLAポリシーのテスト
└── health.spec.js      # ヘルスチェックのテスト
```

## 前提条件

### 必要な環境

- Node.js 18以上
- Python 3.11以上
- npm または yarn

### 依存関係のインストール

```bash
# ルートディレクトリで実行
npm install

# Playwright ブラウザのインストール
npx playwright install
```

## テストの実行

### 1. サーバーの起動

テストを実行する前に、バックエンドとフロントエンドのサーバーを起動する必要があります。

#### バックエンドサーバー

```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### フロントエンドサーバー

```bash
cd frontend
python -m http.server 8080
```

### 2. テストの実行

別のターミナルで以下のコマンドを実行します。

#### すべてのテストを実行

```bash
npm run test:e2e
# または
npx playwright test
```

#### 特定のテストファイルを実行

```bash
npx playwright test auth.spec.js
npx playwright test tickets.spec.js
npx playwright test sla.spec.js
```

#### UIモードで実行（デバッグに便利）

```bash
npx playwright test --ui
```

#### ヘッドフルモードで実行（ブラウザを表示）

```bash
npx playwright test --headed
```

#### 特定のブラウザで実行

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

### 3. テストレポートの表示

```bash
npx playwright show-report
```

## テストアカウント

テストでは以下のアカウントを使用します（`helpers.js` に定義）。

```javascript
// 管理者アカウント
email: admin@example.com
password: admin123

// エージェントアカウント
email: agent@example.com
password: agent123

// 一般ユーザーアカウント
email: user@example.com
password: user123
```

## テストの種類

### 1. 認証機能テスト (`auth.spec.js`)

- ログイン成功/失敗
- ログアウト
- 認証トークンの検証
- セッション管理
- 権限レベル別のアクセス

### 2. チケット管理テスト (`tickets.spec.js`)

- チケット一覧表示
- チケット作成（インシデント、サービス要求）
- チケット詳細表示
- コメント追加（公開、内部メモ）
- ステータス変更
- API直接テスト

### 3. SLAポリシーテスト (`sla.spec.js`)

- SLAポリシー一覧表示
- 優先度別SLA期限計算（P1-P4）
- チケット作成時の自動期限設定
- SLA違反の検知
- UIでのSLA情報表示

## ヘルパー関数

`helpers.js` には以下の共通関数が含まれています。

### 認証関連

- `login(page, email, password)` - UI経由でログイン
- `loginViaAPI(request, email, password)` - API経由でログイン（高速）
- `logout(page)` - ログアウト
- `setAuthToken(page, token)` - トークンを手動設定

### チケット操作

- `createTicket(request, token, ticketData)` - チケット作成
- `deleteTicket(request, token, ticketId)` - チケット削除
- `cleanup(request, token, ticketIds)` - テストデータのクリーンアップ

### UI操作

- `waitForElement(page, selector)` - 要素の表示を待機
- `expectToast(page, expectedText, type)` - トースト通知の確認
- `expectPageTitle(page, expectedTitle)` - ページタイトルの確認
- `getTableRowCount(page, tableSelector)` - テーブルの行数を取得

### ユーティリティ

- `randomString(length)` - ランダムな文字列生成
- `formatDate(date)` - 日付フォーマット
- `takeScreenshot(page, name)` - スクリーンショット撮影

## 環境変数

テスト実行時に以下の環境変数を設定できます。

```bash
API_BASE_URL=http://127.0.0.1:8000  # バックエンドAPI URL
FRONTEND_URL=http://127.0.0.1:8080  # フロントエンド URL
CI=true                              # CI環境フラグ
```

## CI/CD統合

GitHub Actions を使用した自動テストが設定されています。

`.github/workflows/e2e.yml` により、以下のタイミングでテストが実行されます。

- `master`, `main`, `develop` ブランチへのプッシュ時
- プルリクエスト作成時
- 手動トリガー（workflow_dispatch）

### CI環境での実行

```yaml
# .github/workflows/e2e.yml
# - バックエンド・フロントエンドの起動
# - データベース初期化
# - Playwrightテスト実行
# - テスト結果のアーティファクト保存
```

## デバッグ

### テストの失敗をデバッグする

1. **UIモードで実行**

```bash
npx playwright test --ui
```

2. **スクリーンショットを確認**

失敗したテストのスクリーンショットは `test-results/` に保存されます。

3. **トレースビューアを使用**

```bash
npx playwright show-trace test-results/path-to-trace.zip
```

4. **ヘッドフルモードで実行**

```bash
npx playwright test --headed --debug
```

### よくある問題と解決方法

#### サーバーが起動していない

```
Error: connect ECONNREFUSED 127.0.0.1:8000
```

**解決方法**: バックエンドとフロントエンドのサーバーが起動していることを確認してください。

#### 認証トークンが無効

```
Error: 401 Unauthorized
```

**解決方法**: テストアカウントが正しく作成されているか、データベースが初期化されているか確認してください。

#### 要素が見つからない

```
Error: Timeout waiting for selector
```

**解決方法**: セレクタが正しいか確認し、ページの読み込みが完了しているか確認してください。

## ベストプラクティス

### 1. テストの独立性

各テストは独立して実行可能であるべきです。テスト間で状態を共有しないようにします。

### 2. クリーンアップ

テスト後は必ずテストデータをクリーンアップします（`afterAll` フックを使用）。

### 3. 適切な待機

要素の表示を待つ際は、固定の `waitForTimeout` ではなく `waitForSelector` を使用します。

### 4. エラーハンドリング

テストの失敗時にスクリーンショットが自動的に保存されるように設定されています。

### 5. API vs UI

可能な限り、セットアップには API を使用し、実際にテストしたい操作のみ UI で行います。

## パフォーマンス最適化

- **並列実行**: `fullyParallel: true` により複数のテストを同時実行
- **API経由のログイン**: UI操作よりも高速な API 経由でログイン
- **クリーンアップの最適化**: 不要なテストデータは速やかに削除

## 追加リソース

- [Playwright 公式ドキュメント](https://playwright.dev/)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [プロジェクト README](../../README.md)

## トラブルシューティング

問題が発生した場合は、以下を確認してください。

1. サーバーが正しく起動しているか
2. データベースが初期化されているか
3. テストアカウントが存在するか
4. ネットワーク接続が正常か
5. Playwright ブラウザが正しくインストールされているか

```bash
# ブラウザの再インストール
npx playwright install --force
```

## ライセンス

このプロジェクトのライセンスに従います。
