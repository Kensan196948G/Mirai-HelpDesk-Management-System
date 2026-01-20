# 🤖 Claude Code 設定ガイド

このディレクトリには、Claude Codeの高度な設定が含まれています。

## 📁 ファイル構成

```
.claude/
├── settings.json           # プロジェクト設定（チーム共有）
├── settings.local.json     # ローカル設定（個人用、Git除外）
├── skills/                 # カスタムスラッシュコマンド
│   ├── commit-push.json
│   ├── commit-push-pr.json
│   └── commit-push-pr-merge.json
├── hooks/                  # 開発フック設定
│   └── parallel-development.json
└── README.md              # このファイル
```

## 🎯 スラッシュコマンド

### 使用可能なコマンド

| コマンド | 説明 | 実行内容 |
|---------|------|---------|
| `/commit-push` | コミット&プッシュ | 変更をコミットしてGitHubにプッシュ |
| `/commit-push-pr` | コミット&プッシュ&PR | 変更をコミット、プッシュ、PR作成 |
| `/commit-push-pr-merge` | 完全自動化 | コミット、プッシュ、PR作成、マージまで実行 |

### 使い方

```bash
# Claude Codeで以下を入力
/commit-push

# または
/commit-push-pr

# または
/commit-push-pr-merge
```

## 🤖 SubAgent機能（7体）

### 有効化されているエージェント

1. **backend-specialist** 🟢
   - 担当: バックエンドAPI
   - 技術: Node.js/Express/TypeScript/PostgreSQL

2. **frontend-specialist** 🔵
   - 担当: フロントエンドUI
   - 技術: React/TypeScript/Ant Design

3. **database-specialist** 🗄️
   - 担当: データベース設計
   - 技術: PostgreSQL/マイグレーション

4. **m365-specialist** ☁️
   - 担当: Microsoft 365連携
   - 技術: Graph API/認証

5. **security-specialist** 🔐
   - 担当: セキュリティ
   - 技術: JWT/RBAC/監査

6. **test-specialist** 🧪
   - 担当: テスト
   - 技術: Jest/Playwright/E2E

7. **docs-specialist** 📚
   - 担当: ドキュメント
   - 技術: Markdown/API仕様書

### 並列実行機能

- ✅ **最大7エージェント同時実行**
- ✅ **コンフリクト自動検出**
- ✅ **セマンティックマージ**
- ✅ **ファイルロック機能**
- ✅ **メッセージパッシング通信**

## 🔄 Hooks機能

### 並列実行フック

```json
{
  "parallelExecution": {
    "enabled": true,
    "maxConcurrency": 7,
    "conflictDetection": true,
    "conflictResolution": "auto-merge"
  }
}
```

### コミット前フック

```bash
# Lintチェックを自動実行
beforeCommit: npm run lint
```

### プッシュ後フック

```bash
# ツール実行後の確認
afterToolUse: echo '✅ Tool executed successfully'
```

## 🔌 MCP（Model Context Protocol）サーバー

### 有効化されているMCPサーバー

1. **github** 🐙
   - リポジトリ管理、Issue、PR

2. **context7** 📚
   - 拡張コンテキスト管理

3. **sequential-thinking** 🧠
   - 順序立った思考

4. **memory** 💾
   - セッション間の情報保持

5. **playwright** 🎭
   - E2Eテスト自動化

6. **chrome-devtools** 🔧
   - ブラウザデバッグ

7. **sqlite** 🗄️
   - 開発用データベース

8. **claude-mem** 🧠
   - Claude長期記憶管理

### MCPサーバーの確認

```bash
# Claude Code内で
/mcp

# またはコマンドラインで
claude mcp list
```

## ⚙️ 設定のカスタマイズ

### SubAgentの追加

`settings.json` の `subAgents.agents` に追加：

```json
{
  "name": "new-agent",
  "type": "general-purpose",
  "description": "新しいエージェント",
  "tools": ["all"],
  "context": "path/**/*"
}
```

### Hooksの追加

`hooks/` ディレクトリに新しいJSONファイルを作成。

### MCPサーバーの追加

`.mcp.json` に新しいサーバーを追加。

## 🎓 ベストプラクティス

1. ✅ **並列開発** - 複数のエージェントで効率的に開発
2. ✅ **コンフリクト防止** - ファイルロックとセマンティックマージ
3. ✅ **自動化** - Hooksで品質チェックを自動化
4. ✅ **MCPサーバー** - 外部ツールとの統合

## 📞 トラブルシューティング

### SubAgentが動作しない

**確認事項:**
- `settings.json` の `subAgents.enabled` が `true`
- `.claude/settings.local.json` が正しく設定されている

### MCPサーバーに接続できない

**確認事項:**
- `.mcp.json` の設定が正しい
- MCPサーバーがインストールされている（`npx` で自動インストール）

### Hooksが実行されない

**確認事項:**
- `hooks/` ディレクトリのJSONファイルが正しい
- `enabled: true` が設定されている

---

**🚀 高度な開発環境が整いました！**
