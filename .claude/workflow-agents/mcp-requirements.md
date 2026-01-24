# 🔌 MCP要件 - 工程管理SubAgentに必要なMCP

**更新日**: 2026-01-24

---

## ✅ 必須MCP（工程管理SubAgent用）

工程管理SubAgentが正しく動作するために、以下のMCPが**必須**です。

### 1. 🔍 Brave-Search

**用途**:
- spec-planner: 最新のITSM/ISO規格情報取得
- arch-reviewer: アーキテクチャベストプラクティス検索
- code-implementer: 技術情報・ライブラリ仕様検索

**状態**: ✅ 設定済み（User MCP）

**設定場所**: `C:\Users\kensan\.claude.json`

---

### 2. 🧪 ChromeDevTools

**用途**:
- test-designer: E2Eテスト設計時のブラウザ動作確認
- ci-specialist: WebUI動作検証、コンソールエラー検出

**状態**: ✅ connected

**重要度**: **Phase 3で必須**（WebUI検証）

---

### 3. 📚 Context7

**用途**:
- code-implementer: フレームワーク・ライブラリの最新API仕様参照
- test-designer: テストライブラリ仕様参照

**状態**: ✅ connected

---

### 4. 🐙 GitHub

**用途**:
- ci-specialist: PR作成、リリース管理、Issue追跡
- spec-planner: 既存Issue/PRからの要件抽出

**状態**: ✅ connected

---

### 5. 💾 Memory

**用途**:
- spec-planner: プロジェクト文脈・過去の意思決定を記憶
- arch-reviewer: アーキテクチャ決定の履歴保持
- code-reviewer: レビュー基準の学習

**状態**: ✅ connected

**重要**: セッション間の文脈保持に必須

---

### 6. 🎭 Playwright

**用途**:
- test-designer: E2Eテスト実装
- ci-specialist: 自動E2Eテスト実行

**状態**: ✅ connected

**重要度**: **Phase 3で必須**（E2Eテスト）

---

### 7. 🧠 Plugin: claude-mem

**用途**:
- 全エージェント: プロジェクト知識の永続記憶
- spec-planner: 要件の文脈記憶
- code-reviewer: レビュー観点の記憶

**状態**: ✅ 有効化済み（`enabledPlugins.claude-mem@thedotmack`）

---

### 8. 🤔 Sequential-Thinking

**用途**:
- spec-planner: 複雑な要件分析
- arch-reviewer: 設計の段階的検証
- code-reviewer: 複雑なコードパスの解析

**状態**: ✅ 設定済み

---

## 📊 MCP接続状況サマリー

| # | MCP | 状態 | 重要度 | Phase |
|:-:|-----|------|--------|-------|
| 1 | **memory** | ✔ connected | 必須 | 全Phase |
| 2 | **playwright** | ✔ connected | 必須 | Phase 3 |
| 3 | **github** | ✔ connected | 推奨 | Phase 2-4 |
| 4 | **brave-search** | ✅ User MCP | 推奨 | Phase 2 |
| 5 | **context7** | ✔ connected | 推奨 | Phase 2-3 |
| 6 | **sequential-thinking** | ✔ connected | 推奨 | 全Phase |
| 7 | **chrome-devtools** | ✔ connected | 必須 | Phase 3 |
| 8 | **claude-mem** | ✅ Plugin | 必須 | 全Phase |

**総合評価**: ✅ 全てのMCPが利用可能

---

## 🎯 Phase別MCP利用計画

### Phase 2: Backend API実装

**使用MCP**:
- **memory**: 実装方針の記憶
- **context7**: Express.js / SQLite API仕様参照
- **sequential-thinking**: 複雑なビジネスロジック設計
- **github**: Issue管理

**重要度**: High

---

### Phase 3: Frontend実装

**使用MCP**:
- **chrome-devtools**: WebUI動作検証、エラー検出★
- **playwright**: E2Eテスト実装★
- **context7**: React / Ant Design API仕様参照
- **memory**: UI設計決定の記憶

**重要度**: Critical（chrome-devtools, playwright）

---

### Phase 4: 自動起動とデプロイ

**使用MCP**:
- **github**: リリース管理
- **sequential-thinking**: デプロイ手順の設計

**重要度**: Medium

---

## 🔧 追加設定（必要な場合）

### Brave-Search APIキー

User MCPで既に接続されているため、追加設定不要。

Project MCPでも使用したい場合：

1. `.env.mcp` を編集:
   ```bash
   BRAVE_API_KEY=your_api_key_here
   ```

2. `.mcp.json` は既に設定済み

---

## ✅ 結論

**全ての必須MCPが接続済み**

工程管理SubAgentは、現在のMCP構成で正常に動作します。

追加設定は不要です。

---

**作成日**: 2026-01-24
**確認者**: Claude Sonnet 4.5 (1M context)
