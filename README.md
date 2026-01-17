# 🎫 Mirai HelpDesk Management System

社内IT部門向けヘルプデスク管理システム

## 📋 概要

**Mirai HelpDesk Management System** は、社内IT部門がインシデント、サービス要求、Microsoft 365 運用を一元管理するためのシステムです。

### 主要機能

- 🎫 **チケット管理** - インシデント・サービス要求の起票・追跡・解決
- 📚 **ナレッジ管理** - FAQ、手順書、既知の問題の管理
- ☁️ **M365運用** - Microsoft 365の特権操作管理（承認ワークフロー付き）
- 📊 **監査証跡** - 全操作の「誰が/いつ/何を/なぜ」を記録
- 🔐 **RBAC** - 役割ベースのアクセス制御

### 設計原則

1. **監査証跡必須** - すべての操作で証跡を記録
2. **SOD（職務分離）** - 承認者 ≠ 実施者
3. **承認なしのM365操作禁止** - 承認フロー必須
4. **ステータスフロー強制** - Resolved → Closed には確認必須

## 🚀 クイックスタート

### 必要環境

- Node.js 18.x 以上
- npm または yarn

### インストール

```bash
# リポジトリをクローン
git clone <repository-url>
cd Mirai-HelpDesk-Management-System

# 依存関係をインストール
npm install

# 環境変数を設定
cp .env.example .env
# .envファイルを編集して必要な値を設定

# 開発サーバーを起動
npm run dev
```

### 利用可能なスクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動（ホットリロード） |
| `npm start` | 本番サーバー起動 |
| `npm test` | テスト実行 |
| `npm run test:e2e` | E2Eテスト実行 |
| `npm run lint` | ESLint実行 |
| `npm run lint:fix` | ESLint自動修正 |
| `npm run format` | Prettier実行 |
| `npm run db:migrate` | DBマイグレーション |
| `npm run db:seed` | テストデータ投入 |

## 📁 プロジェクト構造

```
Mirai-HelpDesk-Management-System/
├── src/
│   ├── api/
│   │   ├── routes/       # APIルート定義
│   │   ├── controllers/  # コントローラー
│   │   └── middleware/   # ミドルウェア
│   ├── services/         # ビジネスロジック
│   ├── models/           # データモデル
│   ├── utils/            # ユーティリティ
│   ├── config/           # 設定
│   └── server.js         # エントリーポイント
├── data/                 # SQLiteデータベース
├── uploads/              # アップロードファイル
├── tests/
│   ├── unit/             # ユニットテスト
│   └── e2e/              # E2Eテスト
├── scripts/              # 管理スクリプト
├── docs/                 # ドキュメント
├── WebUI-Sample/         # UIプロトタイプ1
├── WebUI-Sample2/        # UIプロトタイプ2
└── package.json
```

## 👥 ユーザー役割（RBAC）

| 役割 | 説明 |
|------|------|
| **Requester** | 一般社員 - チケット登録、状況確認 |
| **Agent** | 一次対応 - 受付、分類、回答、エスカレーション |
| **M365 Operator** | 特権作業者 - M365操作実施（実施ログ必須） |
| **Approver** | 承認者 - 権限付与・ライセンス変更等の承認 |
| **Manager** | 運用管理者 - SLA/KPI、テンプレート、監査閲覧 |
| **Auditor** | 監査閲覧 - 閲覧専用アクセス |

## 🔧 技術スタック

### バックエンド
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Database**: SQLite (開発) / PostgreSQL (本番)
- **Authentication**: JWT + RBAC

### フロントエンド（UIプロトタイプ）
- **言語**: HTML5 + CSS3 + JavaScript (ES6+)
- **フレームワーク**: Vanilla JS (SPA)

### 開発ツール
- **Linting**: ESLint
- **Formatting**: Prettier
- **Testing**: Jest + Playwright

## 📊 API エンドポイント

### チケット
- `GET /api/tickets` - チケット一覧
- `POST /api/tickets` - チケット作成
- `GET /api/tickets/:id` - チケット詳細
- `PATCH /api/tickets/:id` - チケット更新
- `POST /api/tickets/:id/comments` - コメント追加

### 承認
- `POST /api/tickets/:id/approvals/request` - 承認依頼
- `POST /api/approvals/:id/approve` - 承認
- `POST /api/approvals/:id/reject` - 却下

### ナレッジ
- `GET /api/knowledge` - ナレッジ一覧
- `GET /api/knowledge/:id` - ナレッジ詳細

## 📝 開発フェーズ

### Phase 1: MVP（現在）
- [x] UIプロトタイプ
- [ ] REST API基盤
- [ ] チケットCRUD
- [ ] 監査ログ（追記専用）
- [ ] 基本SLA管理

### Phase 2: M365連携
- [ ] Microsoft Graph API統合
- [ ] ユーザー/ライセンス情報取得
- [ ] 自動ログ収集

### Phase 3: 自動化
- [ ] 承認済み作業の自動実行
- [ ] Runbook化

## 📄 ライセンス

UNLICENSED - Private Project

## 🤝 コントリビューション

社内プロジェクトのため、外部コントリビューションは受け付けておりません。
