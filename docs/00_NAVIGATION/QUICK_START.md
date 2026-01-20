# Mirai HelpDesk Management System - クイックスタートガイド

**所要時間**: 5分
**対象**: 初めて使う方
**更新日**: 2026-01-20

---

## 🚀 5分で始める

### Step 1: 環境の確認（30秒）

**Windowsの場合:**
```powershell
# PowerShell 7.5以上を確認
$PSVersionTable.PSVersion

# Python 3.11以上を確認
python --version
```

**Linuxの場合:**
```bash
# Python 3.11以上を確認
python3 --version

# Node.js 18以上を確認（オプション）
node --version
```

### Step 2: データベース初期化（1分）

```bash
cd Z:\Mirai-HelpDesk-Management-System

# 開発環境データベースを初期化
python scripts/init_db.py development
```

✅ 成功すると以下のメッセージが表示されます:
```
✅ 初期化完了!
📋 テストアカウント:
  - admin@example.com / admin123 (Manager)
  - agent@example.com / agent123 (Agent)
  - user@example.com / user123 (Requester)
```

### Step 3: 開発環境を起動（2分）

**Windowsの場合:**
```powershell
.\scripts\windows\start-dev.ps1
```

**Linuxの場合:**
```bash
./scripts/linux/start-dev.sh
```

✅ 成功すると以下のメッセージが表示されます:
```
✅ 開発環境が起動しました！
📌 アクセスURL:
   [開発] フロントエンド: http://192.168.0.187:8080
   [開発] API: http://192.168.0.187:8000/api
   [開発] API Docs: http://192.168.0.187:8000/api/docs
```

### Step 4: ブラウザでアクセス（1分）

1. ブラウザを開く
2. **http://192.168.0.187:8080** にアクセス
3. 以下のアカウントでログイン:
   - **メール**: `admin@example.com`
   - **パスワード**: `admin123`

### Step 5: チケットを作成してみる（1分）

1. ログイン後、「チケット作成」をクリック
2. 以下を入力:
   - **件名**: テストチケット
   - **説明**: 動作確認用のテストです
   - **種別**: インシデント
   - **カテゴリ**: その他
3. 「作成」をクリック

✅ チケット一覧にテストチケットが表示されれば成功です！

---

## 🎯 次のステップ

### エンドユーザーの方
👉 [チケット起票ガイド](../01_エンドユーザー向け/チケット起票ガイド.md) を読む

### Agent・管理者の方
👉 [トリアージガイド](../02_Agent・管理者向け/トリアージガイド.md) を読む

### 開発者の方
👉 [開発環境セットアップ](../03_開発者向け/開発環境セットアップ.md) を読む

---

## 🆘 トラブルシューティング

### ポート8000/8080が既に使用されている
```bash
# Windowsで使用中のプロセスを確認
netstat -ano | findstr :8000

# タスクマネージャーでプロセスを終了
```

### ログインできない
- アカウント: `admin@example.com`
- パスワード: `admin123`
- データベース初期化を再実行してください

### API Docsにアクセスできない
- URL: http://192.168.0.187:8000/api/docs
- バックエンドが起動しているか確認してください

### 詳細なトラブルシューティング
👉 [トラブルシューティング](../04_運用・保守/トラブルシューティング.md)

---

**🎉 おめでとうございます！Mirai HelpDeskが起動しました。**

**更新履歴**
- 2026-01-20: 初版作成
