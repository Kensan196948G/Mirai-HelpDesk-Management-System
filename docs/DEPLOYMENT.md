# デプロイメントガイド

本番環境へのデプロイ手順を説明します。

## 前提条件

### 必要な環境
- Node.js 18以上
- PostgreSQL 14以上
- Nginx または Apache（リバースプロキシ用）
- SSL証明書（Let's Encrypt推奨）

### 必要な情報
- Azure ADテナントID、クライアントID、シークレット
- データベース接続情報
- SMTPサーバー情報（通知用）

## 1. サーバー準備

### Ubuntu 22.04 LTSの場合

```bash
# システム更新
sudo apt update && sudo apt upgrade -y

# Node.js 18インストール
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL 14インストール
sudo apt install -y postgresql-14 postgresql-contrib

# Nginxインストール
sudo apt install -y nginx

# PM2インストール（プロセス管理）
sudo npm install -g pm2
```

## 2. データベースセットアップ

```bash
# PostgreSQLユーザー作成
sudo -u postgres createuser --interactive --pwprompt mirai_user

# データベース作成
sudo -u postgres createdb -O mirai_user mirai_helpdesk

# データベースに接続
sudo -u postgres psql -d mirai_helpdesk

# UUID拡張機能を有効化
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
\q

# マイグレーション実行
cd /var/www/mirai-helpdesk/database
psql -U mirai_user -d mirai_helpdesk -f migrate_all.sql
```

## 3. アプリケーションデプロイ

### ディレクトリ構成

```
/var/www/mirai-helpdesk/
├── backend/          # バックエンドAPI
├── frontend/dist/    # フロントエンドビルド済みファイル
└── database/         # マイグレーションファイル
```

### バックエンドデプロイ

```bash
# プロジェクトをサーバーにコピー
cd /var/www/mirai-helpdesk/backend

# 依存関係インストール
npm ci --production

# ビルド
npm run build

# 環境変数設定
cat > .env <<EOF
NODE_ENV=production
PORT=3000
API_PREFIX=/api

DB_HOST=localhost
DB_PORT=5432
DB_NAME=mirai_helpdesk
DB_USER=mirai_user
DB_PASSWORD=<強力なパスワード>
DB_SSL=true

JWT_SECRET=<ランダムな64文字以上の文字列>
JWT_EXPIRES_IN=24h

AZURE_TENANT_ID=<実際のテナントID>
AZURE_CLIENT_ID=<実際のクライアントID>
AZURE_CLIENT_SECRET=<実際のシークレット>

SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_USER=helpdesk@yourcompany.com
SMTP_PASSWORD=<SMTPパスワード>

CORS_ORIGIN=https://helpdesk.yourcompany.com

LOG_LEVEL=info
LOG_FILE_PATH=/var/log/mirai-helpdesk
EOF

# ログディレクトリ作成
sudo mkdir -p /var/log/mirai-helpdesk
sudo chown -R $USER:$USER /var/log/mirai-helpdesk

# PM2で起動
pm2 start dist/index.js --name mirai-helpdesk-api

# 自動起動設定
pm2 startup
pm2 save
```

### フロントエンドデプロイ

```bash
cd /var/www/mirai-helpdesk/frontend

# 本番環境変数設定
cat > .env.production <<EOF
VITE_API_BASE_URL=https://helpdesk.yourcompany.com/api
VITE_API_TIMEOUT=30000
VITE_APP_NAME=Mirai ヘルプデスク
VITE_ENABLE_M365_INTEGRATION=true
EOF

# 依存関係インストール
npm ci

# ビルド
npm run build

# ビルド済みファイルを配置
sudo mkdir -p /var/www/html/helpdesk
sudo cp -r dist/* /var/www/html/helpdesk/
```

## 4. Nginx設定

### SSL証明書取得（Let's Encrypt）

```bash
# Certbotインストール
sudo apt install -y certbot python3-certbot-nginx

# SSL証明書取得
sudo certbot --nginx -d helpdesk.yourcompany.com
```

### Nginx設定ファイル

```bash
sudo nano /etc/nginx/sites-available/mirai-helpdesk
```

```nginx
# HTTPからHTTPSへリダイレクト
server {
    listen 80;
    server_name helpdesk.yourcompany.com;
    return 301 https://$host$request_uri;
}

# HTTPS設定
server {
    listen 443 ssl http2;
    server_name helpdesk.yourcompany.com;

    # SSL証明書
    ssl_certificate /etc/letsencrypt/live/helpdesk.yourcompany.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/helpdesk.yourcompany.com/privkey.pem;

    # セキュリティヘッダー
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # フロントエンド
    root /var/www/html/helpdesk;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # バックエンドAPI
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # ファイルアップロードサイズ制限
    client_max_body_size 10M;

    # ログ
    access_log /var/log/nginx/mirai-helpdesk-access.log;
    error_log /var/log/nginx/mirai-helpdesk-error.log;
}
```

```bash
# 設定を有効化
sudo ln -s /etc/nginx/sites-available/mirai-helpdesk /etc/nginx/sites-enabled/

# 設定テスト
sudo nginx -t

# Nginx再起動
sudo systemctl restart nginx
```

## 5. ファイアウォール設定

```bash
# UFWを使用する場合
sudo ufw allow 22/tcp  # SSH
sudo ufw allow 80/tcp  # HTTP
sudo ufw allow 443/tcp # HTTPS
sudo ufw enable
```

## 6. バックアップ設定

### データベースバックアップ

```bash
# バックアップスクリプト作成
sudo nano /usr/local/bin/backup-mirai-helpdesk.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/mirai-helpdesk"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# データベースバックアップ
pg_dump -U mirai_user -d mirai_helpdesk | gzip > $BACKUP_DIR/db_$DATE.sql.gz

# 7日以上古いバックアップを削除
find $BACKUP_DIR -name "db_*.sql.gz" -mtime +7 -delete

echo "Backup completed: $DATE"
```

```bash
# 実行権限付与
sudo chmod +x /usr/local/bin/backup-mirai-helpdesk.sh

# Cronで毎日3時に実行
sudo crontab -e
0 3 * * * /usr/local/bin/backup-mirai-helpdesk.sh >> /var/log/mirai-helpdesk-backup.log 2>&1
```

## 7. 監視設定

### PM2モニタリング

```bash
# PM2の状態確認
pm2 status

# ログ確認
pm2 logs mirai-helpdesk-api

# リソース使用状況
pm2 monit
```

### ログローテーション

```bash
# Logrotate設定
sudo nano /etc/logrotate.d/mirai-helpdesk
```

```
/var/log/mirai-helpdesk/*.log {
    daily
    rotate 30
    compress
    delaycompress
    notifempty
    create 0640 www-data www-data
    sharedscripts
    postrotate
        pm2 reloadLogs
    endscript
}
```

## 8. セキュリティチェックリスト

- [ ] 強力なデータベースパスワードを設定
- [ ] JWT_SECRETを64文字以上のランダム文字列に変更
- [ ] SSL証明書を設定
- [ ] ファイアウォールを有効化
- [ ] 不要なポートを閉じる
- [ ] PostgreSQLのリモートアクセスを制限
- [ ] 定期的なバックアップを設定
- [ ] ログ監視を設定
- [ ] OSとパッケージを最新に保つ

## 9. 更新手順

```bash
# バックエンド更新
cd /var/www/mirai-helpdesk/backend
git pull
npm ci --production
npm run build
pm2 restart mirai-helpdesk-api

# フロントエンド更新
cd /var/www/mirai-helpdesk/frontend
git pull
npm ci
npm run build
sudo rm -rf /var/www/html/helpdesk/*
sudo cp -r dist/* /var/www/html/helpdesk/
```

## 10. トラブルシューティング

### アプリケーションが起動しない

```bash
# PM2ログ確認
pm2 logs mirai-helpdesk-api --lines 100

# データベース接続確認
psql -U mirai_user -d mirai_helpdesk -c "SELECT NOW();"
```

### Nginx エラー

```bash
# Nginxエラーログ確認
sudo tail -f /var/log/nginx/mirai-helpdesk-error.log

# 設定テスト
sudo nginx -t
```

### データベースパフォーマンス

```bash
# 実行中のクエリ確認
psql -U mirai_user -d mirai_helpdesk -c "SELECT * FROM pg_stat_activity;"

# データベースサイズ確認
psql -U mirai_user -d mirai_helpdesk -c "SELECT pg_size_pretty(pg_database_size('mirai_helpdesk'));"
```

## サポート

問題が発生した場合は、以下を確認してください：
- `/var/log/mirai-helpdesk/` - アプリケーションログ
- `pm2 logs` - PM2ログ
- `/var/log/nginx/` - Nginxログ
- `/var/log/postgresql/` - PostgreSQLログ
