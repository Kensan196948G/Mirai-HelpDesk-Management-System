# 🔌 MCPサーバー セットアップガイド

このガイドでは、7つのMCPサーバーのセットアップ方法を説明します。

---

## ✅ セットアップ完了済み

このプロジェクトでは、すでに以下の設定が完了しています：

- ✅ `.mcp.json` - 実際のAPIキー設定済み（ローカルのみ、Gitにはコミットされません）
- ✅ `.env.mcp` - APIキー管理ファイル（Gitignore済み）
- ✅ `.claude/settings.json` - 7つのMCPサーバーを有効化済み
- ✅ `.gitignore` - APIキー保護済み

---

## 🔐 セキュリティ

### 保護されているファイル

以下のファイルは `.gitignore` に追加されており、**Gitにコミットされません**：

- `.mcp.json` - MCPサーバー設定（APIキー含む）
- `.env.mcp` - APIキー管理ファイル

### Gitに含まれるファイル（安全）

- `.mcp.json.example` - テンプレート（APIキーはプレースホルダー）
- `.env.mcp.example` - テンプレート（APIキーはプレースホルダー）

---

## 📊 設定済みMCPサーバー（7個）

| # | サーバー | 認証 | 状態 |
|:-:|---------|------|------|
| 1 | 💾 **memory** | 不要 | ✅ 設定済み |
| 2 | 🐙 **github** | ✅ Token設定済み | ✅ 設定済み |
| 3 | 🔍 **brave-search** | ✅ APIキー設定済み | ✅ 設定済み |
| 4 | 📦 **context7** | ✅ APIキー設定済み | ✅ 設定済み |
| 5 | 🧠 **sequential-thinking** | 不要 | ✅ 設定済み |
| 6 | 🗄️ **sqlite** | 不要 | ✅ 設定済み |
| 7 | 🧠 **claude-mem** | 不要 | ✅ 設定済み |

---

## 🚀 使い方

### Claude Code再起動後の確認

1. Claude Codeを再起動
2. `/mcp` コマンドを実行
3. 7つのMCPサーバーの接続状況を確認

**期待される結果**:
```
✅ memory · connected
✅ github · connected
✅ brave-search · connected
✅ context7 · connected (or failed - see troubleshooting)
✅ sequential-thinking · connected (or failed - see troubleshooting)
✅ sqlite · connected (or failed - see troubleshooting)
✅ claude-mem · connected (or failed - see troubleshooting)
```

---

## 💡 各MCPサーバーの使用例

### 1. 💾 Memory Server
```
以下の情報をmemoryに保存してください：
- 現在のPhase: Phase 1.5
- 次のタスク: SLA自動計算エンジン実装
```

### 2. 🐙 GitHub Server
```
GitHubのリポジトリ情報を取得してください
新しいIssueを作成: タイトル「SLA自動計算機能」
```

### 3. 🔍 Brave Search Server
```
Brave Searchで「Node.js SLA計算 ライブラリ」を検索してください
```

### 4. 📦 Context7 Server
```
Context7にプロジェクトのアーキテクチャ情報を保存してください
```

### 5. 🧠 Sequential Thinking Server
```
Sequential Thinkingで、SLA計算の実装手順を整理してください
```

### 6. 🗄️ SQLite Server
```
テスト用のSQLiteデータベースを作成してください
```

### 7. 🧠 Claude-Mem Server
```
Claude-Memにプロジェクト知識を保存してください
```

---

## 🆘 トラブルシューティング

### MCPサーバーが接続できない場合

#### 問題1: パッケージが見つからない

**症状**: `@modelcontextprotocol/server-xxx not found`

**解決策**:
```bash
# 手動でパッケージをインストール
npx @modelcontextprotocol/server-github@latest
npx @modelcontextprotocol/server-brave-search@latest
npx @modelcontextprotocol/server-sequential-thinking@latest
npx @modelcontextprotocol/server-sqlite@latest
```

#### 問題2: HTTPエンドポイントにアクセスできない

**症状**: `context7` が `✘ failed`

**解決策**:
- APIキーを確認
- URLを確認
- ネットワーク接続を確認
- 必要に応じて、このサーバーを無効化

#### 問題3: 認証エラー

**症状**: `Authentication failed`

**解決策**:
1. `.env.mcp` のAPIキーを確認
2. `.mcp.json` の環境変数を確認
3. APIキーの有効期限を確認

---

## 📝 他の開発者向けセットアップ手順

他の開発者がこのプロジェクトをセットアップする場合：

### ステップ1: テンプレートをコピー

```bash
cp .mcp.json.example .mcp.json
cp .env.mcp.example .env.mcp
```

### ステップ2: APIキーを設定

`.env.mcp` を編集して、実際のAPIキーを設定：

```bash
GITHUB_TOKEN=your_github_token_here
BRAVE_SEARCH_API_KEY=your_brave_api_key_here
CONTEXT7_API_KEY=your_context7_api_key_here
```

### ステップ3: .mcp.jsonを更新

`.mcp.json` の `YOUR_*_HERE` を実際のAPIキーに置換

### ステップ4: Claude Codeを再起動

```bash
/exit
claude
```

### ステップ5: 接続確認

```bash
/mcp
```

---

## 🎯 動作しないMCPサーバーについて

一部のMCPサーバーは、パッケージが存在しない、またはアクセスできない可能性があります：

### 無効化が必要な場合

`.claude/settings.json` から該当サーバーを削除：

```json
{
  "enabledMcpjsonServers": [
    "memory",
    "github",
    "brave-search"
    // 動作しないサーバーは削除
  ]
}
```

---

## 📊 現在の設定状況

- **設定ファイル**: ✅ 完成
- **APIキー**: ✅ 設定済み（ローカル）
- **セキュリティ**: ✅ Gitignore済み
- **ドキュメント**: ✅ 完備

---

**次のステップ**: Claude Codeを再起動して、MCPサーバーの接続を確認してください。

```bash
/exit
# 再起動後
claude
/mcp
```

---

**作成日**: 2024-01-20
**最終更新**: 2024-01-20
