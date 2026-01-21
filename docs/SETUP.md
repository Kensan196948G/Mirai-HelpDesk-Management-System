# セットアップガイド

このガイドでは、Mirai ヘルプデスク管理システムの開発環境をセットアップする手順を説明します。

## 前提条件

以下のソフトウェアがインストールされていることを確認してください：

- **Node.js** 18以上
- **PostgreSQL** 14以上
- **npm** または **yarn**
- **Git**

## 1. リポジトリのクローン

```bash
git clone <repository-url>
cd Mirai-HelpDesk-Management-System
```

## 2. データベースのセットアップ

### PostgreSQLのインストールと起動

```bash
# Windowsの場合
# PostgreSQLをインストールしてサービスを起動

# Linuxの場合
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### データベースの作成

```bash
# PostgreSQLに接続
psql -U postgres

# データベース作成
CREATE DATABASE mirai_helpdesk;

# ユーザー作成（オプション）
CREATE USER mirai_user WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE mirai_helpdesk TO mirai_user;

# 接続
\c mirai_helpdesk

# 拡張機能の有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
```

### マイグレーション実行

```bash
cd database

# 統合マイグレーションスクリプトを実行
psql -U postgres -d mirai_helpdesk -f migrate_all.sql

# または個別に実行
psql -U postgres -d mirai_helpdesk -f migrations/001_create_users.sql
psql -U postgres -d mirai_helpdesk -f migrations/002_create_categories_and_sla.sql
# ... (以下同様)
```

## 3. バックエンドのセットアップ

### 依存関係のインストール

```bash
cd backend
npm install
```

### 環境変数の設定

`.env.example` をコピーして `.env` を作成：

```bash
cp .env.example .env
```

`.env` ファイルを編集：

```env
# Server Configuration
NODE_ENV=development
PORT=3000
API_PREFIX=/api

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=mirai_helpdesk
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_SSL=false

# JWT Configuration
JWT_SECRET=your_jwt_secret_change_this_in_production
JWT_EXPIRES_IN=24h

# Microsoft 365 Configuration
# Azure Portal (https://portal.azure.com) でアプリ登録を作成
AZURE_TENANT_ID=your_tenant_id
AZURE_CLIENT_ID=your_client_id
AZURE_CLIENT_SECRET=your_client_secret

# Email Configuration (通知用)
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=helpdesk@yourcompany.com
SMTP_PASSWORD=your_smtp_password
```

### ログディレクトリの作成

```bash
mkdir logs
```

### 開発サーバーの起動

```bash
npm run dev
```

サーバーは `http://localhost:3000` で起動します。

### 動作確認

```bash
# ヘルスチェック
curl http://localhost:3000/health

# 期待される応答
{
  "status": "OK",
  "timestamp": "2024-01-20T12:00:00.000Z",
  "uptime": 10.5
}
```

## 4. フロントエンドのセットアップ

### 依存関係のインストール

```bash
cd frontend
npm install
```

### 環境変数の設定

`.env.example` をコピーして `.env` を作成：

```bash
cp .env.example .env
```

`.env` ファイルを編集：

```env
VITE_API_BASE_URL=http://localhost:3000/api
VITE_API_TIMEOUT=30000
VITE_APP_NAME=Mirai ヘルプデスク
VITE_ENABLE_M365_INTEGRATION=true
```

### 開発サーバーの起動

```bash
npm run dev
```

フロントエンドは `http://localhost:3001` で起動します。

## 5. Microsoft 365 連携の設定

### Azure ADアプリケーションの登録

1. [Azure Portal](https://portal.azure.com) にアクセス
2. **Azure Active Directory** → **アプリの登録** → **新規登録**
3. アプリケーション名: `Mirai Helpdesk API`
4. サポートされるアカウントの種類: **この組織ディレクトリのみのアカウント**
5. リダイレクトURIは不要（非対話型認証）

### API のアクセス許可

1. 登録したアプリの **API のアクセス許可** を開く
2. **Microsoft Graph** → **アプリケーションの許可** を追加：
   - `User.Read.All` - ユーザー情報の読み取り
   - `User.ReadWrite.All` - ユーザーの管理
   - `Directory.Read.All` - ディレクトリの読み取り
   - `Group.ReadWrite.All` - グループの管理
   - `Mail.ReadWrite` - メールの読み書き
   - `Team.ReadWrite.All` - Teamsの管理
3. **管理者の同意を与える** をクリック

### クライアントシークレットの作成

1. **証明書とシークレット** を開く
2. **新しいクライアントシークレット** を作成
3. 説明: `Production Secret`
4. 有効期限: 24ヶ月（推奨）
5. シークレットの値をコピーして `.env` の `AZURE_CLIENT_SECRET` に設定

### テナントIDとクライアントIDの取得

1. **概要** ページを開く
2. **アプリケーション (クライアント) ID** をコピーして `.env` の `AZURE_CLIENT_ID` に設定
3. **ディレクトリ (テナント) ID** をコピーして `.env` の `AZURE_TENANT_ID` に設定

## 6. 初期データの設定

### デフォルトユーザーでログイン

マイグレーションスクリプトで以下のユーザーが作成されています：

| Email | Password | Role |
|-------|----------|------|
| admin@example.com | Admin123! | Manager |
| agent@example.com | Admin123! | Agent |
| operator@example.com | Admin123! | M365 Operator |
| approver@example.com | Admin123! | Approver |
| user@example.com | Admin123! | Requester |

### ログインテスト

```bash
# ログインAPI
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "Admin123!"
  }'

# レスポンス例
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "user": {
      "user_id": "...",
      "email": "admin@example.com",
      "display_name": "管理者",
      "department": "IT部門",
      "role": "manager"
    }
  }
}
```

## 7. トラブルシューティング

### データベース接続エラー

```
Error: database connection failed
```

**解決策:**
1. PostgreSQLが起動しているか確認
2. `.env` のデータベース接続情報を確認
3. データベースユーザーの権限を確認

### Microsoft 365 接続エラー

```
Error: M365_AUTH_ERROR
```

**解決策:**
1. Azure ADアプリの設定を確認
2. クライアントシークレットの有効期限を確認
3. APIのアクセス許可に管理者の同意が与えられているか確認

### ポート競合エラー

```
Error: Port 3000 is already in use
```

**解決策:**
1. `.env` で別のポートを指定
2. または使用中のプロセスを終了

```bash
# Windowsの場合
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linuxの場合
lsof -i :3000
kill -9 <PID>
```

## 8. 本番環境へのデプロイ

### 環境変数の設定

本番環境では以下の設定を変更してください：

```env
NODE_ENV=production
JWT_SECRET=<強力なランダム文字列>
DB_SSL=true
CORS_ORIGIN=https://your-domain.com
```

### ビルド

```bash
# バックエンド
cd backend
npm run build

# フロントエンド
cd frontend
npm run build
```

### デプロイ推奨環境

- **バックエンド**: Azure App Service, AWS EC2, Docker
- **フロントエンド**: Azure Static Web Apps, Netlify, Vercel
- **データベース**: Azure Database for PostgreSQL, AWS RDS

## 次のステップ

- [API仕様書](./API.md) を確認
- [開発ガイド](../CLAUDE.md) を確認
- [データベース設計](../database/README.md) を確認
