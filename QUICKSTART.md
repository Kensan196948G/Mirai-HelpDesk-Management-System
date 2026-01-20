# 🚀 クイックスタートガイド

最速でシステムを起動する手順です。

## 📋 前提条件

- ✅ Node.js 18以上がインストール済み
- ✅ PostgreSQL 14以上がインストール済み

## ⚡ 5ステップで起動

### 1️⃣ データベースの作成

**Windowsの場合（PowerShell または コマンドプロンプト）:**

```bash
# PostgreSQLのbinディレクトリに移動（例）
cd "C:\Program Files\PostgreSQL\14\bin"

# データベース作成
createdb -U postgres mirai_helpdesk

# マイグレーション実行
cd D:\Mirai-HelpDesk-Management-System\database
psql -U postgres -d mirai_helpdesk -f migrate_all.sql
```

**PostgreSQLがインストールされていない場合:**

https://www.postgresql.org/download/windows/ からダウンロードしてインストール

代替案として、**SQLite**を使用することも可能です（開発環境のみ推奨）。

---

### 2️⃣ バックエンド起動

```bash
cd backend

# 依存関係は既にインストール済み
# npm install は実行済み

# サーバー起動
npm run dev
```

**起動確認:**
- ログに `Server is running on port 3000` が表示される
- ログに `Microsoft 365 integration: Configured` が表示される

---

### 3️⃣ フロントエンド起動（別のターミナル）

```bash
cd frontend

# 依存関係は既にインストール済み
# npm install は実行済み

# 開発サーバー起動
npm run dev
```

**起動確認:**
- ブラウザが自動で開く、または http://localhost:5173 にアクセス

---

### 4️⃣ ログイン

**デフォルトユーザー（パスワード: Admin123!）:**

| 役割 | Email | 主な機能 |
|------|-------|----------|
| 管理者 | admin@example.com | すべての機能 |
| エージェント | agent@example.com | チケット管理 |
| M365オペレーター | operator@example.com | M365作業実施 |
| 承認者 | approver@example.com | 承認・却下 |
| 一般ユーザー | user@example.com | チケット作成・閲覧 |

---

### 5️⃣ Microsoft 365 連携テスト（オプション）

**管理者でログイン後:**

```bash
# M365接続テスト（APIテスト）
curl -X GET http://localhost:3000/api/m365/test-connection \
  -H "Authorization: Bearer <管理者のトークン>"
```

**期待される応答:**
```json
{
  "success": true,
  "message": "Microsoft 365 connection successful"
}
```

---

## 🎯 動作確認チェックリスト

### バックエンド
- [ ] `npm run dev` でサーバーが起動する
- [ ] http://localhost:3000/health にアクセスすると `{"status":"OK"}` が表示される
- [ ] ログに `Microsoft 365 integration: Configured` が表示される

### フロントエンド
- [ ] `npm run dev` で開発サーバーが起動する
- [ ] ブラウザで http://localhost:5173 が開く
- [ ] ログイン画面が表示される

### データベース
- [ ] `psql -U postgres -d mirai_helpdesk -c "SELECT COUNT(*) FROM users;"` で 5 が返る

### 機能
- [ ] ログインできる
- [ ] ダッシュボードが表示される
- [ ] チケットを作成できる
- [ ] M365接続テストが成功する（管理者のみ）

---

## ⚠️ トラブルシューティング

### PostgreSQLが見つからない

**エラー:** `'psql' is not recognized`

**解決策:**
1. PostgreSQL をインストール
2. または、環境変数 PATH に PostgreSQL の bin ディレクトリを追加

### ポートが既に使用されている

**エラー:** `Port 3000 is already in use`

**解決策:**
- 別のプロセスを停止
- または `.env` でポートを変更（例: `PORT=3001`）

### データベース接続エラー

**エラー:** `database connection failed`

**解決策:**
1. PostgreSQL が起動しているか確認
2. `backend/.env` のデータベースパスワードを確認
3. デフォルトパスワードは `postgres` または空白

---

## 🎊 起動成功！

すべてが正常に動作している場合：

1. **ブラウザで** http://localhost:5173 にアクセス
2. **ログイン**: `admin@example.com` / `Admin123!`
3. **ダッシュボード**が表示される
4. **チケット作成**してみる
5. **M365連携**をテスト（管理者画面で）

---

## 📖 詳細情報

- **完全なセットアップガイド**: `docs/SETUP.md`
- **API仕様**: `docs/API.md`
- **データベース設計**: `database/README.md`
- **デプロイメント**: `docs/DEPLOYMENT.md`

**Happy Coding! 🚀**
