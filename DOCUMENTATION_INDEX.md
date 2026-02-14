# 📚 Mirai HelpDesk ドキュメントインデックス

**最終更新日**: 2026年2月14日

このドキュメントは、Mirai HelpDesk Management Systemの全ドキュメントへのクイックアクセスガイドです。

---

## 🚀 はじめに

| ドキュメント | 目的 | 対象者 |
|------------|------|-------|
| **[README.md](README.md)** | プロジェクト概要と基本情報 | すべてのユーザー |
| **[QUICKSTART.md](QUICKSTART.md)** | クイックスタートガイド | 開発者 |
| **[CLAUDE.md](CLAUDE.md)** | Claude Code開発ガイドライン | AI開発者 |

---

## 📊 レビューレポート（最新）

### 包括的レビュー（2026年2月14日実施）

| レポート | 内容 | 文字数 |
|---------|------|-------|
| **[FINAL_REVIEW_SUMMARY.md](FINAL_REVIEW_SUMMARY.md)** | 最終統合サマリー（必読） | 15,000字 |
| **[COMPREHENSIVE_REVIEW_REPORT.md](COMPREHENSIVE_REVIEW_REPORT.md)** | 包括的レビュー詳細 | 45,000字 |
| **[SECURITY_COMPLIANCE_REVIEW.md](SECURITY_COMPLIANCE_REVIEW.md)** | セキュリティ監査レポート | 18,000字 |
| **[NPM_VULNERABILITIES_REPORT.md](NPM_VULNERABILITIES_REPORT.md)** | npm脆弱性分析 | 5,000字 |

### レビュー結果サマリー

- **総合評価**: A- (88/100)
- **コード品質**: A- (85/100)
- **セキュリティ**: B+ → A- (88/100)
- **テストカバレッジ**: A+ (97.1%)
- **本番投入準備度**: A- (88/100)

---

## 📝 開発計画

| ドキュメント | 目的 | 対象者 |
|------------|------|-------|
| **[DEVELOPMENT_NEXT_STEPS.md](DEVELOPMENT_NEXT_STEPS.md)** | 次回以降のタスク一覧（フェーズ別） | 開発者、PM |
| **[DEVELOPMENT_ROADMAP.md](DEVELOPMENT_ROADMAP.md)** | 長期ロードマップ | PM、経営層 |

### 次回着手優先タスク（上位5件）

1. 🔴 .envのGit履歴削除（CRITICAL）
2. 🔴 全シークレットのローテーション（CRITICAL）
3. 🟠 データベースセットアップ（HIGH）
4. 🟠 サーバー起動とログインテスト（HIGH）
5. 🟠 npm脆弱性修正（HIGH）

---

## 🏗️ アーキテクチャドキュメント

### システム設計

| ドキュメント | 内容 |
|------------|------|
| **[docs/02_アーキテクチャ設計/01_システムアーキテクチャ.md](docs/02_アーキテクチャ設計/01_システムアーキテクチャ.md)** | システム全体のアーキテクチャ |
| **[docs/02_アーキテクチャ設計/02_データベース設計.md](docs/02_アーキテクチャ設計/02_データベース設計.md)** | データベーススキーマ設計 |
| **[docs/02_アーキテクチャ設計/03_API設計.md](docs/02_アーキテクチャ設計/03_API設計.md)** | REST API仕様 |
| **[docs/02_アーキテクチャ設計/04_セキュリティ設計.md](docs/02_アーキテクチャ設計/04_セキュリティ設計.md)** | セキュリティアーキテクチャ |

### データベース

| ドキュメント | 内容 |
|------------|------|
| **[database/README.md](database/README.md)** | データベース設計とマイグレーション |
| **[database/setup-all.sh](database/setup-all.sh)** | 自動セットアップスクリプト |

---

## 🎯 機能仕様

| ドキュメント | 内容 |
|------------|------|
| **[docs/03_機能仕様/01_チケット管理.md](docs/03_機能仕様/01_チケット管理.md)** | チケット管理機能 |
| **[docs/03_機能仕様/02_M365連携.md](docs/03_機能仕様/02_M365連携.md)** | Microsoft 365連携 |
| **[docs/03_機能仕様/03_承認ワークフロー.md](docs/03_機能仕様/03_承認ワークフロー.md)** | 承認ワークフロー |
| **[docs/03_機能仕様/04_SLA管理.md](docs/03_機能仕様/04_SLA管理.md)** | SLA管理 |
| **[docs/03_機能仕様/05_ナレッジベース.md](docs/03_機能仕様/05_ナレッジベース.md)** | ナレッジベース |
| **[docs/03_機能仕様/06_AI機能.md](docs/03_機能仕様/06_AI機能.md)** | AI機能（分類、検索、生成） |

---

## 🔐 セキュリティドキュメント

| ドキュメント | 内容 | 重要度 |
|------------|------|-------|
| **[SECURITY_COMPLIANCE_REVIEW.md](SECURITY_COMPLIANCE_REVIEW.md)** | OWASP Top 10監査結果 | 🔴 必読 |
| **[NPM_VULNERABILITIES_REPORT.md](NPM_VULNERABILITIES_REPORT.md)** | npm脆弱性とアクションプラン | 🟠 重要 |
| **[docs/02_アーキテクチャ設計/04_セキュリティ設計.md](docs/02_アーキテクチャ設計/04_セキュリティ設計.md)** | セキュリティアーキテクチャ | 🟠 重要 |

### セキュリティ改善完了項目（2026年2月14日）

✅ JWT_SECRET強化（43文字ランダム値）
✅ bcryptラウンド数 10→12
✅ CSRF保護ミドルウェア実装
✅ ファイルアップロードのマジックバイト検証
✅ SODトリガーバグ修正
✅ データベースログのパラメータサニタイズ
✅ エラーハンドリング改善（本番環境で詳細隠蔽）

---

## 🧪 テストドキュメント

| ドキュメント | 内容 |
|------------|------|
| **[tests/README.md](tests/README.md)** | テスト戦略とガイド |
| **[playwright.config.js](playwright.config.js)** | E2Eテスト設定 |
| **[jest.config.js](jest.config.js)** | ユニットテスト設定 |

### テスト結果（最新）

- **E2Eテスト**: 95.3% (223/234)
- **ユニットテスト**: 100% (141/141)
- **総合**: 97.1% (364/375)

---

## 🚀 運用ドキュメント

| ドキュメント | 内容 |
|------------|------|
| **[docs/04_運用・保守/01_デプロイメント手順.md](docs/04_運用・保守/01_デプロイメント手順.md)** | デプロイ手順 |
| **[docs/04_運用・保守/02_運用監視.md](docs/04_運用・保守/02_運用監視.md)** | 監視とアラート |
| **[docs/04_運用・保守/03_バックアップ・リカバリ.md](docs/04_運用・保守/03_バックアップ・リカバリ.md)** | バックアップとリストア |

---

## 📦 パッケージ管理

| ファイル | 目的 |
|---------|------|
| **[package.json](package.json)** | ルートパッケージ設定 |
| **[backend/package.json](backend/package.json)** | バックエンド依存関係 |
| **[frontend/package.json](frontend/package.json)** | フロントエンド依存関係 |

---

## 🎨 UI/UXドキュメント

| ドキュメント | 内容 |
|------------|------|
| **[docs/05_UI_UX/01_デザインシステム.md](docs/05_UI_UX/01_デザインシステム.md)** | デザインシステム |
| **[docs/05_UI_UX/02_画面一覧.md](docs/05_UI_UX/02_画面一覧.md)** | 全画面一覧 |

---

## 🤖 AIドキュメント

| ドキュメント | 内容 |
|------------|------|
| **[CLAUDE.md](CLAUDE.md)** | Claude Code開発ガイドライン |
| **[GEMINI.md](GEMINI.md)** | Gemini API統合ガイド |
| **[docs/03_機能仕様/06_AI機能.md](docs/03_機能仕様/06_AI機能.md)** | AI機能仕様 |

---

## 📐 補足資料

### Excelテンプレート

| ファイル | 目的 |
|---------|------|
| **[docs/excel-templates/ヘルプデスク.xlsx](docs/excel-templates/ヘルプデスク.xlsx)** | ヘルプデスクテンプレート |
| **[docs/excel-templates/ヘルプデスク【Microsoft365】.xlsx](docs/excel-templates/ヘルプデスク【Microsoft365】.xlsx)** | M365専用テンプレート |

### アーカイブ

| ディレクトリ | 内容 |
|------------|------|
| **[archive/temp-files/](archive/temp-files/)** | 一時ファイル |
| **[archive/old-pids/](archive/old-pids/)** | 古いPIDファイルとログ |

---

## 🔍 ドキュメント検索ガイド

### 目的別ドキュメント

| 目的 | 推奨ドキュメント |
|------|---------------|
| **プロジェクトを理解したい** | README.md → FINAL_REVIEW_SUMMARY.md |
| **開発を始めたい** | QUICKSTART.md → CLAUDE.md |
| **セキュリティを確認したい** | SECURITY_COMPLIANCE_REVIEW.md |
| **次のタスクを知りたい** | DEVELOPMENT_NEXT_STEPS.md |
| **APIを使いたい** | docs/02_アーキテクチャ設計/03_API設計.md |
| **データベースを理解したい** | database/README.md |
| **テストを実行したい** | tests/README.md |

---

## 📊 ドキュメント統計

- **総ドキュメント数**: 30+
- **総文字数**: 100,000+字
- **最終更新日**: 2026年2月14日
- **レビュー実施**: Claude Sonnet 4.5による包括的レビュー完了

---

## 🔄 更新履歴

| 日付 | 更新内容 | 担当 |
|------|---------|------|
| 2026-02-14 | 包括的レビュー実施、セキュリティ修正完了 | Claude Sonnet 4.5 |
| 2026-02-14 | ドキュメントインデックス作成 | Claude Sonnet 4.5 |
| 2026-02-14 | DEVELOPMENT_NEXT_STEPS.md作成 | Claude Sonnet 4.5 |

---

**次回レビュー推奨日**: 2026年2月21日（1週間後）
