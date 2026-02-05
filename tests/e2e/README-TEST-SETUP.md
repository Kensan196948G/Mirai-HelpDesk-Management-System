# E2Eテスト実行ガイド

## 前提条件

E2Eテストを正常に実行するには、以下のサーバーが起動している必要があります:

### 1. バックエンドサーバー (必須)
```bash
cd backend
npm run dev
```
- **デフォルトURL**: `http://127.0.0.1:8000`
- **環境変数**: `API_BASE_URL` で変更可能
- **確認方法**: `curl http://127.0.0.1:8000/health`

### 2. フロントエンドサーバー (必須)
```bash
cd frontend
npm run dev
```
- **デフォルトURL**: `http://127.0.0.1:3002`
- **環境変数**: `FRONTEND_URL` で変更可能
- **確認方法**: ブラウザで `http://127.0.0.1:3002` にアクセス

## 簡単起動スクリプト

プロジェクトルートに用意された起動スクリプトを使用できます:

```bash
# 両方のサーバーを起動
./start-dev.sh

# テストを実行
npm run test:e2e

# サーバーを停止
./stop-dev.sh
```

## テストファイル別の要件

### AI機能テスト (`ai-features.spec.js`)
- **必要サーバー**: フロントエンド
- **テスト内容**: AI分類、検索、チャット、分析ページの動作確認
- **スキップ条件**: フロントエンドサーバーが起動していない場合

### 詳細確認テスト (`detailed-inspection.spec.js`)
- **必要サーバー**: フロントエンド
- **テスト内容**: DOM構造、ネットワーク、パフォーマンスの詳細確認
- **スキップ条件**: フロントエンドサーバーが起動していない場合

### ヘルスチェックテスト (`health.spec.js`)
- **必要サーバー**: バックエンド
- **テスト内容**: APIヘルスチェック、エンドポイント応答確認
- **スキップ条件**: バックエンドサーバーが起動していない場合

## テスト実行コマンド

### すべてのE2Eテストを実行
```bash
npx playwright test
```

### 特定のテストファイルのみ実行
```bash
npx playwright test tests/e2e/ai-features.spec.js
npx playwright test tests/e2e/detailed-inspection.spec.js
npx playwright test tests/e2e/health.spec.js
```

### UIモードで実行（デバッグに便利）
```bash
npx playwright test --ui
```

### ヘッドレスモードを無効化（ブラウザを表示）
```bash
npx playwright test --headed
```

## トラブルシューティング

### テストがすべてスキップされる場合

**症状**: テスト結果が `X skipped` と表示される

**原因**: 必要なサーバーが起動していない

**解決方法**:
1. バックエンドサーバーを起動: `cd backend && npm run dev`
2. フロントエンドサーバーを起動: `cd frontend && npm run dev`
3. サーバーが正常に起動していることを確認
4. テストを再実行

### ポートが既に使用されている場合

**エラー**: `EADDRINUSE: address already in use`

**解決方法**:
```bash
# ポート8000を使用しているプロセスを確認
lsof -i :8000

# プロセスを停止
kill <PID>

# またはポート番号を変更
export API_BASE_URL=http://127.0.0.1:8001
export FRONTEND_URL=http://127.0.0.1:3003
```

### AI APIキーが設定されていない場合

**注意**: 現在のテストはAI APIキーがなくてもスキップされません。AI機能のテストを実行するには、以下の環境変数が必要です:

```bash
CLAUDE_API_KEY=sk-ant-api03-...
GEMINI_API_KEY=...
PERPLEXITY_API_KEY=...
```

これらは `backend/.env` ファイルに設定してください。

## CI/CD環境での実行

GitHub ActionsやCI/CD環境では、以下の設定が推奨されます:

```yaml
- name: Start Backend Server
  run: |
    cd backend
    npm run dev &
    sleep 5

- name: Start Frontend Server
  run: |
    cd frontend
    npm run dev &
    sleep 5

- name: Run E2E Tests
  run: npx playwright test

- name: Upload Test Results
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

## ベストプラクティス

1. **テスト前にサーバーを起動**: E2Eテストは統合テストなので、実際のサーバーが必要です
2. **テスト後にサーバーを停止**: リソースを節約するため、テスト完了後はサーバーを停止してください
3. **並列実行に注意**: デフォルトでは複数のワーカーで並列実行されます。必要に応じて `--workers=1` で直列実行に変更できます
4. **スクリーンショットの確認**: テスト失敗時は `test-results/` ディレクトリのスクリーンショットを確認してください

## 参考リンク

- [Playwright公式ドキュメント](https://playwright.dev/)
- [プロジェクトのテスト戦略](/docs/testing-strategy.md)
- [CI/CD設定](/.github/workflows/)
