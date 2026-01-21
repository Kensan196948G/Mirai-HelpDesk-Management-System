# Mirai HelpDesk Management System - 開発計画書

**作成日**: 2026-01-19  
**バージョン**: 2.0  
**対象環境**: Windows 11 / Ubuntu Linux (共有フォルダ)

---

## 1. 環境構成

### 1.1 ネットワーク設定

| 項目 | 開発環境 | 本番環境 |
|------|----------|----------|
| **IPアドレス** | 192.168.0.187 | 192.168.0.187 |
| **バックエンドポート** | 8000 | 8443 |
| **フロントエンドポート** | 8080 | 443 |
| **プロトコル** | HTTP | HTTPS (自己署名証明書) |
| **ブックマーク表示** | [開発] Mirai HelpDesk | [本番] Mirai HelpDesk |

### 1.2 ディレクトリ構造

```
Mirai-HelpDesk-Management-System/
├── backend/                      # Python FastAPI バックエンド
│   ├── app/                      # アプリケーションコード
│   ├── .venv-win/               # Windows用仮想環境
│   ├── .venv-linux/             # Linux用仮想環境
│   ├── requirements.txt
│   ├── .env.development         # 開発環境設定
│   └── .env.production          # 本番環境設定
│
├── frontend/                     # フロントエンド
│   ├── dist/                    # 本番ビルド出力
│   ├── src/                     # ソースコード
│   └── public/                  # 静的ファイル
│
├── certificates/                 # SSL証明書
│   ├── server.crt               # 自己署名証明書
│   └── server.key               # 秘密鍵
│
├── data/
│   ├── development/             # 開発用データベース
│   │   └── helpdesk.db
│   └── production/              # 本番用データベース
│       └── helpdesk.db
│
├── logs/
│   ├── development/             # 開発ログ
│   └── production/              # 本番ログ
│
├── scripts/
│   ├── windows/                 # Windows用スクリプト (PowerShell)
│   │   ├── start-dev.ps1
│   │   ├── start-prod.ps1
│   │   ├── stop-all.ps1
│   │   ├── install-service.ps1
│   │   └── setup-env.ps1
│   └── linux/                   # Linux用スクリプト (Bash)
│       ├── start-dev.sh
│       ├── start-prod.sh
│       ├── stop-all.sh
│       ├── install-service.sh
│       └── setup-env.sh
│
├── node_modules-win/            # Windows用Nodeモジュール
├── node_modules-linux/          # Linux用Nodeモジュール
│
├── WebUI-Sample/                # UIプロトタイプ（参照用・変更禁止）
├── WebUI-Sample2/               # UIプロトタイプ2
└── WebUI-Sample3/               # UIプロトタイプ3
```

---

## 2. 開発フェーズ

### Phase 1: 環境基盤構築 (現在)

| ステップ | 内容 | 状態 |
|---------|------|------|
| 1.1 | ディレクトリ構造の整備 | 🔄 進行中 |
| 1.2 | 環境変数ファイル作成 (.env.development, .env.production) | 📋 予定 |
| 1.3 | SSL証明書生成（自己署名） | 📋 予定 |
| 1.4 | Windows用スクリプト作成 (PowerShell) | 📋 予定 |
| 1.5 | Linux用スクリプト作成 (Bash) | 📋 予定 |
| 1.6 | サービス自動起動設定 | 📋 予定 |

### Phase 2: バックエンド開発

| ステップ | 内容 | 状態 |
|---------|------|------|
| 2.1 | FastAPI アプリケーション基盤 | ✅ 完了 |
| 2.2 | データモデル定義 | ✅ 完了 |
| 2.3 | 認証・認可 (JWT + RBAC) | ✅ 完了 |
| 2.4 | チケット API | ✅ 完了 |
| 2.5 | ナレッジ API | ✅ 完了 |
| 2.6 | M365 API | ✅ 完了 |
| 2.7 | レポート API | ✅ 完了 |
| 2.8 | HTTPS対応 | 📋 予定 |
| 2.9 | 開発/本番環境分離 | 📋 予定 |

### Phase 3: フロントエンド開発

| ステップ | 内容 | 状態 |
|---------|------|------|
| 3.1 | SPA基盤構築 | ✅ 完了 |
| 3.2 | 認証UI | ✅ 完了 |
| 3.3 | ダッシュボード | ✅ 完了 |
| 3.4 | チケット管理UI | ✅ 完了 |
| 3.5 | ナレッジ管理UI | ✅ 完了 |
| 3.6 | M365タスクUI | 📋 予定 |
| 3.7 | レポートUI | 📋 予定 |
| 3.8 | 本番ビルド設定 | 📋 予定 |

### Phase 4: 統合・テスト

| ステップ | 内容 | 状態 |
|---------|------|------|
| 4.1 | API統合テスト | 📋 予定 |
| 4.2 | E2Eテスト (Playwright) | 📋 予定 |
| 4.3 | パフォーマンステスト | 📋 予定 |
| 4.4 | セキュリティ検証 | 📋 予定 |

### Phase 5: 運用準備

| ステップ | 内容 | 状態 |
|---------|------|------|
| 5.1 | 運用ドキュメント作成 | 📋 予定 |
| 5.2 | バックアップ設定 | 📋 予定 |
| 5.3 | 監視設定 | 📋 予定 |
| 5.4 | 本番データ移行 | 📋 予定 |

---

## 3. 環境別設定

### 3.1 開発環境

```env
# .env.development
NODE_ENV=development
ENVIRONMENT=development

# Server
HOST=192.168.0.187
BACKEND_PORT=8000
FRONTEND_PORT=8080
USE_HTTPS=false

# Database
DATABASE_URL=sqlite+aiosqlite:///./data/development/helpdesk.db

# Debug
DEBUG=true
LOG_LEVEL=debug

# CORS
CORS_ORIGINS=["http://192.168.0.187:8080", "http://localhost:8080"]

# Sample Data
INCLUDE_SAMPLE_DATA=true
```

### 3.2 本番環境

```env
# .env.production
NODE_ENV=production
ENVIRONMENT=production

# Server
HOST=192.168.0.187
BACKEND_PORT=8443
FRONTEND_PORT=443
USE_HTTPS=true
SSL_CERT_PATH=./certificates/server.crt
SSL_KEY_PATH=./certificates/server.key

# Database
DATABASE_URL=sqlite+aiosqlite:///./data/production/helpdesk.db

# Debug
DEBUG=false
LOG_LEVEL=warning

# CORS
CORS_ORIGINS=["https://192.168.0.187"]

# Sample Data
INCLUDE_SAMPLE_DATA=false
```

---

## 4. アクセスURL

### 開発環境

| サービス | URL | ブックマーク名 |
|---------|-----|---------------|
| フロントエンド | http://192.168.0.187:8080 | [開発] Mirai HelpDesk |
| API | http://192.168.0.187:8000/api | [開発] Mirai API |
| API Docs | http://192.168.0.187:8000/api/docs | [開発] Mirai API Docs |

### 本番環境

| サービス | URL | ブックマーク名 |
|---------|-----|---------------|
| フロントエンド | https://192.168.0.187 | [本番] Mirai HelpDesk |
| API | https://192.168.0.187:8443/api | [本番] Mirai API |

---

## 5. 次の開発ステップ

### 即時実行タスク (Phase 1.1〜1.6)

1. **ディレクトリ構造整備**
   - certificates/, data/development/, data/production/, logs/ 作成
   - scripts/windows/, scripts/linux/ 作成

2. **環境変数ファイル作成**
   - backend/.env.development
   - backend/.env.production

3. **SSL証明書生成**
   - 自己署名証明書を certificates/ に生成

4. **起動スクリプト作成**
   - Windows用: PowerShell (.ps1)
   - Linux用: Bash (.sh)

5. **サービス自動起動設定**
   - Windows: タスクスケジューラ
   - Linux: systemd サービス

---

## 6. ポート番号一覧（変更禁止）

| サービス | 開発ポート | 本番ポート | 備考 |
|---------|-----------|-----------|------|
| バックエンドAPI | 8000 | 8443 | HTTPS (本番) |
| フロントエンドWebUI | 8080 | 443 | HTTPS (本番) |
| SQLite Database | - | - | ファイルベース |

**⚠️ 警告**: これらのポート番号は開発途中で変更しないでください。

---

## 7. テストアカウント

### 開発環境（サンプルデータあり）

| メール | パスワード | 役割 |
|--------|-----------|------|
| admin@example.com | admin123 | 管理者 (MANAGER) |
| agent@example.com | agent123 | エージェント (AGENT) |
| operator@example.com | operator123 | M365オペレータ |
| approver@example.com | approver123 | 承認者 |
| user@example.com | user123 | 一般ユーザー |
| auditor@example.com | auditor123 | 監査担当者 |

### 本番環境

初期アカウントは管理者が手動で作成してください。  
サンプルデータは含まれません。「データなし」と表示されます。

---

*Last Updated: 2026-01-19*
