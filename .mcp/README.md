# 🔌 MCP (Model Context Protocol) サーバー設定

このプロジェクトで使用するMCPサーバーの設定と説明です。

---

## ✅ 有効なMCPサーバー（2つ）

### 1. 💾 Memory Server

**説明**: セッション間の情報保持

**タイプ**: stdio
**パッケージ**: `@modelcontextprotocol/server-memory@latest`

**機能**:
- セッション間でのデータ永続化
- キー・バリュー形式でのデータ保存
- 開発中の状態管理

**使用例**:
```
前回のセッションで保存したチケットIDを取得
```

---

### 2. 🎭 Playwright Server

**説明**: ブラウザ自動化・E2Eテスト

**タイプ**: stdio
**パッケージ**: `@playwright/mcp@latest`

**機能**:
- ブラウザ自動化
- E2Eテスト実行
- スクリーンショット取得
- Webスクレイピング

**使用例**:
```
ログイン画面のE2Eテストを実行
フロントエンドのスクリーンショットを取得
```

---

## ❌ 無効化したMCPサーバー（理由付き）

### chrome-devtools
**理由**: パッケージが存在しないか、アクセスできない
**代替**: Playwrightで同様の機能を実現可能

### claude-mem
**理由**: パッケージが存在しないか、正しいパッケージ名が不明
**代替**: 標準のmemoryサーバーを使用

### context7
**理由**: HTTPエンドポイントにアクセスできない
**代替**: Claude Codeの標準コンテキスト管理を使用

### github
**理由**: HTTPエンドポイントにアクセスできない、または認証が必要
**代替**: GitHub CLIまたはGitコマンドを直接使用

### sequential-thinking
**理由**: HTTPエンドポイントにアクセスできない
**代替**: プロンプトエンジニアリングで段階的思考を実現

### sqlite
**理由**: パッケージが存在しないか、アクセスできない
**代替**: PostgreSQLを直接使用、または開発用にローカルSQLiteを手動管理

---

## 🔧 設定ファイル

### `.mcp.json`
```json
{
  "mcpServers": {
    "memory": {
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@modelcontextprotocol/server-memory@latest"],
      "env": {},
      "description": "メモリサーバー - セッション間の情報保持"
    },
    "playwright": {
      "type": "stdio",
      "command": "cmd",
      "args": ["/c", "npx", "-y", "@playwright/mcp@latest"],
      "env": {},
      "description": "ブラウザ自動化 - E2Eテスト、スクレイピング"
    }
  }
}
```

### `.claude/settings.json`
```json
{
  "enableAllProjectMcpServers": true,
  "enabledMcpjsonServers": [
    "memory",
    "playwright"
  ]
}
```

---

## 📊 接続ステータス

| サーバー | ステータス | タイプ | 用途 |
|---------|----------|--------|------|
| **memory** | ✅ 接続成功 | stdio | セッション管理 |
| **playwright** | ✅ 接続成功 | stdio | E2Eテスト |
| chrome-devtools | ❌ 無効 | stdio | デバッグ（代替あり） |
| claude-mem | ❌ 無効 | stdio | 記憶管理（代替あり） |
| context7 | ❌ 無効 | http | コンテキスト（代替あり） |
| github | ❌ 無効 | http | Git操作（代替あり） |
| sequential-thinking | ❌ 無効 | http | 思考（代替あり） |
| sqlite | ❌ 無効 | stdio | DB（代替あり） |

---

## 🚀 MCPサーバーの使用方法

### Memory Server

**データの保存**:
```
以下の情報をmemoryに保存してください：
- チケットID: TKT-12345
- 実装状態: Phase 1完了
```

**データの取得**:
```
memoryに保存されているチケットIDを取得してください
```

### Playwright Server

**E2Eテストの実行**:
```
Playwrightを使用して、以下のE2Eテストを実行してください：
1. ログイン画面にアクセス
2. admin@example.comでログイン
3. ダッシュボードが表示されることを確認
```

**スクリーンショット取得**:
```
Playwrightを使用して、ダッシュボードのスクリーンショットを取得してください
```

---

## 🔮 将来の拡張

以下のMCPサーバーを追加検討中：

1. **filesystem** - ファイルシステム操作
2. **postgres** - PostgreSQL直接操作
3. **fetch** - HTTP APIコール

---

## 📚 参考リンク

- [Model Context Protocol Documentation](https://modelcontextprotocol.io/)
- [Claude Code MCP Guide](https://code.claude.com/docs/en/mcp)
- [MCP Server Registry](https://github.com/modelcontextprotocol/servers)

---

**最終更新**: 2024-01-20
**動作確認バージョン**: Claude Code 2.1.12
