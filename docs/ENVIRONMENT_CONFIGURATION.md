# Mirai HelpDesk Management System - 環境構成ガイド

**更新日**: 2026-01-20
**対象環境**: Windows/Linux 両対応
**プロトコル**: 開発(HTTP) / 本番(HTTPS)

---

## 1. 環境概要

### 環境分離の原則
- **開発環境**: サンプルデータ豊富、HTTPで軽量動作、頻繁な変更
- **本番環境**: サンプルデータなし、HTTPSでセキュア、安定稼働

### クロスプラットフォーム対応
- **Windows**: PowerShellスクリプト、`.venv-win`
- **Linux**: Bashスクリプト、`.venv-linux`、systemd
- **共有フォルダ**: Linuxマウント(`Z:\` = `/mnt/LinuxHDD/Mirai-HelpDesk-Management-System`)

---

## 2. ポート割り当て（固定・変更禁止）

| 環境 | サービス | ポート | プロトコル | URL |
|------|---------|--------|-----------|-----|
| 開発 | Backend API | 8000 | HTTP | http://192.168.0.187:8000 |
| 開発 | Frontend | 8080 | HTTP | http://192.168.0.187:8080 |
| 本番 | Backend API | 8443 | HTTPS | https://192.168.0.187:8443 |
| 本番 | Frontend | 443 | HTTPS | https://192.168.0.187 |

### ブックマーク表記
```
[開発] Mirai HelpDesk: http://192.168.0.187:8080
[本番] Mirai HelpDesk: https://192.168.0.187
```

---

## 3. ディレクトリ構造

```
Mirai-HelpDesk-Management-System/
├── backend/
│   ├── .venv-win/              # Windows用Python仮想環境
│   ├── .venv-linux/            # Linux用Python仮想環境
│   ├── .env                    # 現在の環境設定（Git無視）
│   ├── .env.development        # 開発環境設定
│   ├── .env.production         # 本番環境設定
│   ├── data/
│   │   ├── development/        # 開発DB・アップロード
│   │   └── production/         # 本番DB・アップロード
│   └── logs/
│       ├── development/        # 開発ログ
│       └── production/         # 本番ログ
├── frontend/
│   ├── node_modules.windows/   # Windows用Nodeモジュール（オプション）
│   ├── node_modules.linux/     # Linux用Nodeモジュール（オプション）
│   └── node_modules/           # 現在の環境（シンボリックリンク）
├── certificates/
│   ├── server.crt              # SSL証明書（自己署名）
│   └── server.key              # 秘密鍵
├── scripts/
│   ├── windows/
│   │   ├── start-dev.ps1       # 開発環境起動
│   │   ├── start-prod.ps1      # 本番環境起動
│   │   ├── stop-all.ps1        # 全停止
│   │   ├── install-autostart.ps1  # 自動起動設定
│   │   └── generate-ssl.ps1    # SSL証明書生成
│   └── linux/
│       ├── start-dev.sh        # 開発環境起動
│       ├── start-prod.sh       # 本番環境起動
│       ├── stop-all.sh         # 全停止
│       ├── generate-ssl.sh     # SSL証明書生成
│       ├── https_server.py     # HTTPS簡易サーバー
│       └── services/
│           ├── mirai-dev-backend.service
│           ├── mirai-prod-backend.service
│           ├── mirai-prod-frontend.service
│           └── install-services.sh
└── logs/
    ├── api_operations.jsonl    # API操作監査ログ
    └── m365_operations.jsonl   # M365操作監査ログ
```

---

## 4. 環境設定ファイル

### backend/.env.development
```ini
# 開発環境設定
ENVIRONMENT=development
DEBUG=true

# Server
HOST=192.168.0.187
BACKEND_PORT=8000
FRONTEND_PORT=8080
USE_HTTPS=false

# Database
DATABASE_URL=sqlite+aiosqlite:///./data/development/helpdesk.db

# Authentication
SECRET_KEY=dev-secret-key-mirai-helpdesk-2026-development-only
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ORIGINS=["http://192.168.0.187:8080", "http://localhost:8080"]

# Logging
LOG_LEVEL=debug
LOG_FILE=./logs/development/app.log

# File Upload
UPLOAD_DIR=./data/development/uploads

# SLA Defaults (hours)
SLA_P1_RESPONSE=0.25
SLA_P1_RESOLUTION=24
SLA_P2_RESPONSE=1
SLA_P2_RESOLUTION=8
SLA_P3_RESPONSE=4
SLA_P3_RESOLUTION=24
SLA_P4_RESPONSE=8
SLA_P4_RESOLUTION=40

# Development Options
INCLUDE_SAMPLE_DATA=true
ENABLE_API_DOCS=true
```

### backend/.env.production
```ini
# 本番環境設定
ENVIRONMENT=production
DEBUG=false

# Server
HOST=192.168.0.187
BACKEND_PORT=8443
FRONTEND_PORT=443
USE_HTTPS=true

# SSL Certificates
SSL_CERT_PATH=./certificates/server.crt
SSL_KEY_PATH=./certificates/server.key

# Database
DATABASE_URL=sqlite+aiosqlite:///./data/production/helpdesk.db

# Authentication
SECRET_KEY=CHANGE-THIS-TO-A-STRONG-SECRET-KEY-IN-PRODUCTION
ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=1

# CORS
CORS_ORIGINS=["https://192.168.0.187"]

# Logging
LOG_LEVEL=warning
LOG_FILE=./logs/production/app.log

# File Upload
UPLOAD_DIR=./data/production/uploads

# SLA Defaults (hours)
SLA_P1_RESPONSE=0.25
SLA_P1_RESOLUTION=24
SLA_P2_RESPONSE=1
SLA_P2_RESOLUTION=8
SLA_P3_RESPONSE=4
SLA_P3_RESOLUTION=24
SLA_P4_RESPONSE=8
SLA_P4_RESOLUTION=40

# Production Options
INCLUDE_SAMPLE_DATA=false
ENABLE_API_DOCS=false
```

---

## 5. 起動スクリプト

### Windows開発環境起動
```powershell
# scripts/windows/start-dev.ps1
.\scripts\windows\start-dev.ps1
```

### Windows本番環境起動
```powershell
# scripts/windows/start-prod.ps1
.\scripts\windows\start-prod.ps1
```

### Linux開発環境起動
```bash
# scripts/linux/start-dev.sh
./scripts/linux/start-dev.sh
```

### Linux本番環境起動
```bash
# scripts/linux/start-prod.sh
./scripts/linux/start-prod.sh
```

---

## 6. 自動起動設定

### Windows（タスクスケジューラ）

#### 開発環境
```powershell
.\scripts\windows\install-autostart.ps1 -Environment development
```

#### 本番環境
```powershell
.\scripts\windows\install-autostart.ps1 -Environment production
```

#### 削除
```powershell
.\scripts\windows\install-autostart.ps1 -Environment development -Remove
.\scripts\windows\install-autostart.ps1 -Environment production -Remove
```

### Linux（systemd）

#### サービスインストール
```bash
sudo ./scripts/linux/services/install-services.sh
```

#### 開発環境自動起動
```bash
sudo systemctl enable mirai-dev-backend
sudo systemctl start mirai-dev-backend
```

#### 本番環境自動起動
```bash
sudo systemctl enable mirai-prod-backend
sudo systemctl enable mirai-prod-frontend
sudo systemctl start mirai-prod-backend
sudo systemctl start mirai-prod-frontend
```

#### 状態確認
```bash
sudo systemctl status mirai-dev-backend
sudo systemctl status mirai-prod-backend
sudo systemctl status mirai-prod-frontend
```

---

## 7. SSL証明書

### 生成方法

#### Windows
```powershell
.\scripts\windows\generate-ssl.ps1
```

#### Linux
```bash
./scripts/linux/generate-ssl.sh
```

### 証明書の配置
```
certificates/
├── server.crt  # SSL証明書
└── server.key  # 秘密鍵
```

### 注意事項
- **自己署名証明書**: ブラウザで警告が表示されます
- **本番運用**: 正式なSSL証明書の使用を推奨（Let's Encrypt等）
- **権限**: 秘密鍵は適切なアクセス権限で保護（chmod 600等）

---

## 8. データベース初期化

### 開発環境（サンプルデータあり）
```bash
cd backend
python scripts/init_db.py development
```

### 本番環境（サンプルデータなし）
```bash
cd backend
python scripts/init_db.py production
```

---

## 9. トラブルシューティング

### ポート競合
```bash
# Windowsでポート使用状況確認
netstat -ano | findstr :8000

# Linuxでポート使用状況確認
sudo lsof -i :8000
```

### SSL証明書エラー
```
症状: ブラウザで「接続が安全ではない」警告
対策:
1. 証明書を再生成
2. ブラウザで「詳細設定」→「安全でないサイトに進む」
3. 本番運用では正式な証明書を使用
```

### 仮想環境エラー
```bash
# Windows
backend\.venv-win\Scripts\Activate.ps1

# Linux
source backend/.venv-linux/bin/activate
```

### データベース接続エラー
```
症状: unable to open database file
対策:
1. data/development/ または data/production/ ディレクトリが存在するか確認
2. データベースファイルへの書き込み権限を確認
3. バックエンドサーバーを停止してからDBを削除・再初期化
```

---

## 10. チェックリスト

### 初回セットアップ
- [ ] Python仮想環境作成（Windows/Linux）
- [ ] 依存関係インストール（backend/requirements.txt）
- [ ] Node.js依存関係インストール（npm install）
- [ ] SSL証明書生成
- [ ] 開発環境データベース初期化
- [ ] 本番環境データベース初期化
- [ ] 環境変数ファイル確認（.env.development, .env.production）
- [ ] ファイアウォール設定（ポート8000, 8080, 8443, 443を開放）

### 開発環境起動確認
- [ ] バックエンドAPI起動: http://192.168.0.187:8000/health
- [ ] Swagger UI: http://192.168.0.187:8000/api/docs
- [ ] フロントエンド起動: http://192.168.0.187:8080
- [ ] ログイン成功: admin@example.com / admin123

### 本番環境起動確認
- [ ] バックエンドAPI起動: https://192.168.0.187:8443/health
- [ ] フロントエンド起動: https://192.168.0.187
- [ ] SSL証明書が正しく読み込まれている
- [ ] サンプルデータが存在しない
- [ ] 自動起動設定完了

---

**更新履歴**
- 2026-01-20: 初版作成（環境分離・クロスプラットフォーム対応）
- 2026-01-19: SSL証明書生成、PowerShell変数名修正、Unicode対応
