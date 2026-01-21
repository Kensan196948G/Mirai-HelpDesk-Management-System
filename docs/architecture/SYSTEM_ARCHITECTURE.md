# Mirai HelpDesk Management System - システムアーキテクチャ

## 1. システム概要

**Mirai HelpDesk Management System** は、社内IT部門向けの統合ヘルプデスク管理システムです。

### 主要コンポーネント

```
┌─────────────────────────────────────────────────────────────────┐
│                    Mirai HelpDesk System                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   WebUI     │  │   REST API  │  │   Background Services   │ │
│  │ (Vanilla JS)│  │  (FastAPI)  │  │   (Celery/Scheduler)    │ │
│  └──────┬──────┘  └──────┬──────┘  └───────────┬─────────────┘ │
│         │                │                      │               │
│         └────────────────┼──────────────────────┘               │
│                          │                                      │
│                   ┌──────▼──────┐                               │
│                   │   Services  │                               │
│                   │    Layer    │                               │
│                   └──────┬──────┘                               │
│                          │                                      │
│  ┌───────────────────────┼───────────────────────────────────┐ │
│  │                       ▼                                    │ │
│  │  ┌─────────┐  ┌─────────────┐  ┌─────────┐  ┌──────────┐ │ │
│  │  │ Tickets │  │  Knowledge  │  │  M365   │  │  Audit   │ │ │
│  │  │ Service │  │   Service   │  │ Service │  │  Logger  │ │ │
│  │  └────┬────┘  └──────┬──────┘  └────┬────┘  └────┬─────┘ │ │
│  │       │              │              │            │        │ │
│  └───────┼──────────────┼──────────────┼────────────┼────────┘ │
│          │              │              │            │          │
│          └──────────────┴──────────────┴────────────┘          │
│                          │                                      │
│                   ┌──────▼──────┐                               │
│                   │   SQLite    │                               │
│                   │  Database   │                               │
│                   └─────────────┘                               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 2. ディレクトリ構造

```
Mirai-HelpDesk-Management-System/
├── backend/                    # Python FastAPI バックエンド
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py            # FastAPI アプリケーション
│   │   ├── config.py          # 設定管理
│   │   ├── database.py        # DB接続・セッション
│   │   │
│   │   ├── api/               # APIルート
│   │   │   ├── __init__.py
│   │   │   ├── routes/
│   │   │   │   ├── tickets.py
│   │   │   │   ├── knowledge.py
│   │   │   │   ├── m365.py
│   │   │   │   ├── users.py
│   │   │   │   ├── auth.py
│   │   │   │   └── reports.py
│   │   │   └── deps.py        # 依存性注入
│   │   │
│   │   ├── models/            # SQLAlchemy モデル
│   │   │   ├── __init__.py
│   │   │   ├── ticket.py
│   │   │   ├── user.py
│   │   │   ├── knowledge.py
│   │   │   ├── m365_task.py
│   │   │   ├── approval.py
│   │   │   └── audit_log.py
│   │   │
│   │   ├── schemas/           # Pydantic スキーマ
│   │   │   ├── __init__.py
│   │   │   ├── ticket.py
│   │   │   ├── user.py
│   │   │   └── ...
│   │   │
│   │   ├── services/          # ビジネスロジック
│   │   │   ├── __init__.py
│   │   │   ├── ticket_service.py
│   │   │   ├── knowledge_service.py
│   │   │   ├── m365_service.py
│   │   │   ├── approval_service.py
│   │   │   ├── sla_service.py
│   │   │   └── audit_service.py
│   │   │
│   │   ├── core/              # コア機能
│   │   │   ├── __init__.py
│   │   │   ├── security.py    # JWT認証
│   │   │   ├── rbac.py        # ロールベースアクセス制御
│   │   │   └── exceptions.py  # カスタム例外
│   │   │
│   │   └── integrations/      # 外部連携
│   │       ├── __init__.py
│   │       └── msgraph.py     # Microsoft Graph API
│   │
│   ├── migrations/            # Alembic マイグレーション
│   ├── tests/                 # テスト
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/                   # Vanilla JS フロントエンド
│   ├── index.html             # メインHTML
│   ├── css/
│   │   ├── common.css         # 共通スタイル
│   │   ├── components.css     # コンポーネント
│   │   └── themes.css         # テーマ
│   ├── js/
│   │   ├── app.js             # メインアプリ
│   │   ├── api.js             # APIクライアント
│   │   ├── auth.js            # 認証
│   │   ├── router.js          # SPA ルーター
│   │   ├── components/        # UIコンポーネント
│   │   │   ├── sidebar.js
│   │   │   ├── header.js
│   │   │   ├── modal.js
│   │   │   └── ...
│   │   └── pages/             # ページ
│   │       ├── dashboard.js
│   │       ├── tickets.js
│   │       ├── knowledge.js
│   │       ├── m365.js
│   │       └── reports.js
│   └── assets/
│       └── icons/
│
├── data/                       # データディレクトリ
│   ├── helpdesk.db            # SQLite データベース
│   └── uploads/               # アップロードファイル
│
├── docs/                       # ドキュメント
│   ├── architecture/
│   ├── api/
│   └── deployment/
│
├── scripts/                    # ユーティリティスクリプト
│   ├── init_db.py
│   ├── seed_data.py
│   └── run_dev.py
│
├── WebUI-Sample/              # UIプロトタイプ（参照用・変更禁止）
│
├── .env.example
├── .gitignore
├── README.md
├── GEMINI.md
└── requirements.txt
```

## 3. 技術スタック

### バックエンド
- **言語**: Python 3.11+
- **フレームワーク**: FastAPI
- **ORM**: SQLAlchemy 2.0
- **データベース**: SQLite（開発）/ PostgreSQL（本番）
- **認証**: JWT + RBAC
- **マイグレーション**: Alembic
- **テスト**: pytest

### フロントエンド
- **言語**: HTML5, CSS3, JavaScript (ES6+)
- **アーキテクチャ**: Vanilla JS SPA
- **スタイル**: カスタムCSS（グラスモーフィズム）
- **アイコン**: Lucide Icons

### 外部連携
- **Microsoft Graph API**: M365操作
- **SMTP**: メール通知

## 4. データモデル

### 主要エンティティ

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│    users     │     │   tickets    │     │  knowledge   │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │◄────┤ requester_id │     │ id           │
│ email        │     │ assignee_id  │     │ title        │
│ name         │     │ subject      │     │ content      │
│ role         │     │ status       │     │ category     │
│ department   │     │ priority     │     │ visibility   │
│ ...          │     │ category     │     │ ...          │
└──────────────┘     │ ...          │     └──────────────┘
                     └──────────────┘
                           │
           ┌───────────────┼───────────────┐
           ▼               ▼               ▼
    ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
    │  comments   │ │  approvals  │ │ m365_tasks  │
    ├─────────────┤ ├─────────────┤ ├─────────────┤
    │ id          │ │ id          │ │ id          │
    │ ticket_id   │ │ ticket_id   │ │ ticket_id   │
    │ author_id   │ │ approver_id │ │ task_type   │
    │ content     │ │ status      │ │ operator_id │
    │ visibility  │ │ ...         │ │ result      │
    └─────────────┘ └─────────────┘ │ evidence    │
                                    └─────────────┘
```

## 5. ユーザー役割（RBAC）

| Role | 権限 |
|------|------|
| `REQUESTER` | チケット作成・自分のチケット閲覧・ナレッジ閲覧 |
| `AGENT` | チケット対応・分類・コメント・エスカレーション |
| `M365_OPERATOR` | M365タスク実行（承認済みのみ）・実施ログ登録 |
| `APPROVER` | 承認・却下 |
| `MANAGER` | 全チケット閲覧・KPI・マスタ管理・監査ログ |
| `AUDITOR` | 監査ログ閲覧専用 |

## 6. API設計

### 認証
- `POST /api/auth/login` - ログイン
- `POST /api/auth/logout` - ログアウト
- `GET /api/auth/me` - 現在のユーザー情報

### チケット
- `GET /api/tickets` - 一覧取得
- `POST /api/tickets` - 作成
- `GET /api/tickets/{id}` - 詳細取得
- `PATCH /api/tickets/{id}` - 更新
- `POST /api/tickets/{id}/comments` - コメント追加
- `POST /api/tickets/{id}/attachments` - 添付追加

### 承認
- `POST /api/tickets/{id}/approval/request` - 承認依頼
- `POST /api/approvals/{id}/approve` - 承認
- `POST /api/approvals/{id}/reject` - 却下

### M365タスク
- `POST /api/tickets/{id}/m365-tasks` - タスク作成
- `POST /api/m365-tasks/{id}/execute` - 実行ログ登録

### ナレッジ
- `GET /api/knowledge` - 一覧取得
- `POST /api/knowledge` - 作成
- `GET /api/knowledge/{id}` - 詳細取得

### レポート
- `GET /api/reports/dashboard` - ダッシュボード統計
- `GET /api/reports/sla` - SLA達成率

## 7. セキュリティ設計

### 認証
- JWT (JSON Web Token) ベースの認証
- アクセストークン有効期限: 1時間
- リフレッシュトークン有効期限: 7日

### 認可
- ロールベースアクセス制御 (RBAC)
- エンドポイント単位での権限チェック

### 監査
- 全操作を `audit_logs` テーブルに記録
- 追記専用（削除不可）
- 「誰が・いつ・何を・なぜ」を記録

### SOD（職務分離）
- 同一チケットで承認者 ≠ 実施者
- M365操作は必ず承認後のみ実行可能
