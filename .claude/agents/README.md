---
name: SubAgent Documentation
description: SubAgent並列開発システムのドキュメント
type: documentation
---

# 🤖 SubAgent並列開発システム

このディレクトリには、7つのSubAgentの設定と並列開発管理機能が含まれています。

## 📁 ディレクトリ構造

```
.claude/agents/
├── README.md                          # このファイル
├── master-config.json                 # マスター設定
├── agent-1-backend-api.json          # Backend API Agent
├── agent-2-backend-models.json       # Backend Models Agent
├── agent-3-frontend-pages.json       # Frontend Pages Agent
├── agent-4-frontend-components.json  # Frontend Components Agent
├── agent-5-frontend-services.json    # Frontend Services Agent
├── agent-6-database.json             # Database Agent
├── agent-7-docs.json                 # Documentation Agent
├── messages/                          # エージェント間メッセージ
├── locks/                             # ファイルロック管理
└── logs/                              # エージェント実行ログ
```

## 🔧 7つのSubAgent

### 優先度順序

1. **agent-6-database** (Priority: 1) - Database Schema/Migration
2. **agent-2-backend-models** (Priority: 1) - Models/Services
3. **agent-1-backend-api** (Priority: 2) - Controllers/Routes
4. **agent-4-frontend-components** (Priority: 2) - UI Components
5. **agent-5-frontend-services** (Priority: 2) - API Client/State
6. **agent-3-frontend-pages** (Priority: 3) - Page Components
7. **agent-7-docs** (Priority: 4) - Documentation

### 依存関係グラフ

```
agent-6-database
    ↓
agent-2-backend-models ─────┐
    ↓                       ↓
agent-1-backend-api    agent-3-frontend-pages
    ↓                       ↑
agent-5-frontend-services ──┘
    ↑
agent-4-frontend-components

agent-7-docs (全てのエージェントに依存)
```

## 🚀 使用方法

### エージェントの起動

```javascript
// Claude Codeのプロンプト例
「agent-1とagent-2を並列起動して、Backend APIとModelsを実装してください」
```

### タスク分散

```javascript
// 自動タスク分散
「チケット管理機能を実装」
→ agent-6: チケットテーブル作成
→ agent-2: Ticketモデル実装
→ agent-1: Ticket API実装
→ agent-5: Ticket API Client実装
→ agent-3: チケット一覧ページ実装
→ agent-7: API仕様ドキュメント作成
```

## 🔒 コンフリクト防止

### ファイルロック

- 同一ファイルの同時編集を防止
- ロックタイムアウト: 30秒
- 再試行: 3回まで

### セマンティックマージ

- 異なる関数の変更は自動マージ
- インポート文の衝突は自動解決
- スキーマ変更は手動解決

## 📊 モニタリング

### メトリクス

- タスク完了数
- タスク失敗数
- コンフリクト検出数
- コンフリクト解決数
- 平均タスク実行時間
- エージェント使用率

### ログ

- ログレベル: info
- 出力先: `.claude/agents/logs/`
- フォーマット: JSON
- ローテーション: 日次

## 🔧 設定カスタマイズ

### エージェント設定の変更

各エージェントの設定ファイル（`agent-N-*.json`）を編集：

```json
{
  "priority": 2,
  "max_concurrent_tasks": 3,
  "tools": {
    "allowed": ["Read", "Write", "Edit"],
    "restricted": ["Write(other/agent/files)"]
  }
}
```

### マスター設定の変更

`master-config.json`を編集：

```json
{
  "task_distribution": {
    "max_concurrent_agents": 7,
    "strategy": "priority_based"
  }
}
```

## 🚨 トラブルシューティング

### エージェント起動失敗

```bash
# ログを確認
cat .claude/agents/logs/YYYY-MM-DD.log

# ロックファイルをクリーンアップ
rm -rf .claude/agents/locks/*
```

### コンフリクト発生

```bash
# コンフリクトログを確認
grep "conflict" .claude/agents/logs/*.log

# 手動解決が必要な場合は、関連ファイルを確認
```

## 📚 関連ドキュメント

- `.claude/ADVANCED_FEATURES.md` - SubAgentとHooksの詳細
- `.claude/hooks/parallel-development.json` - 並列開発Hook設定
- `CLAUDE.md` - プロジェクト全体の設計指針

---

**作成日**: 2026-01-24
**最終更新**: 2026-01-24
