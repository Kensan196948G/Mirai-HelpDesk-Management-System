# 監査ログシステム - クイックスタート

## 概要

Mirai HelpDesk Management System では、すべてのAPI操作とM365操作をJSON Lines形式で自動記録する監査ログシステムを実装しています。

## 主要機能

- **自動ログ記録**: すべてのAPI操作を自動的に記録
- **M365操作記録**: Microsoft 365操作の実施ログ
- **認証ログ**: ログイン/ログアウトの記録
- **承認ログ**: 承認/却下の判断記録
- **ログローテーション**: Linux (logrotate) / Windows (PowerShell) 対応

## ログファイル

すべてのログは `backend/logs/` ディレクトリに JSON Lines 形式で保存されます:

```
backend/logs/
├── api_operations.jsonl    # API操作ログ (自動)
├── m365_operations.jsonl   # M365操作ログ (手動)
├── authentication.jsonl    # 認証ログ (手動)
└── approvals.jsonl         # 承認ログ (手動)
```

## 設定

### 環境変数 (.env)

```bash
# ログディレクトリ
LOG_DIR=logs

# 監査ログの有効化
AUDIT_LOG_ENABLED=True

# ログ保持期間（日数）
AUDIT_LOG_RETENTION_DAYS=90
```

### 設定ファイル (backend/app/config.py)

```python
class Settings(BaseSettings):
    LOG_DIR: str = "logs"
    AUDIT_LOG_ENABLED: bool = True
    AUDIT_LOG_RETENTION_DAYS: int = 90
```

## 使用方法

### 1. API操作ログ（自動）

FastAPIミドルウェアが自動的に記録します。設定は不要です。

```python
# 何もする必要なし - 自動的に記録されます
```

### 2. M365操作ログ（手動）

M365操作を実施した際は、必ずログを記録してください:

```python
from utils.audit_log import log_m365_operation

# M365操作の実施後
log_m365_operation(
    operator_id=current_user.id,
    operator_email=current_user.email,
    task_type="ADD_LICENSE",
    target_upn="user@contoso.onmicrosoft.com",
    method="GRAPH_API",
    result="SUCCESS",
    ticket_id=ticket.id,
    command="POST /users/{id}/assignLicense",
    details={"license_sku": "ENTERPRISEPACK"}
)
```

### 3. 認証ログ（手動）

ログイン/ログアウト時に記録:

```python
from utils.audit_log import log_authentication

# ログイン成功
log_authentication(
    user_id=user.id,
    user_email=user.email,
    action="LOGIN",
    ip_address=client_ip,
    user_agent=user_agent,
    success=True
)
```

### 4. 承認ログ（手動）

承認/却下の判断時に記録:

```python
from utils.audit_log import log_approval

# 承認時
log_approval(
    approval_id=approval.id,
    approver_id=current_user.id,
    approver_email=current_user.email,
    ticket_id=ticket.id,
    action="APPROVE",
    decision="APPROVED",
    reason="業務上必要な権限であることを確認"
)
```

## ログローテーション

### Linux (logrotate)

```bash
# インストール
sudo cp scripts/linux/mirai-audit.logrotate /etc/logrotate.d/mirai-audit
sudo chmod 644 /etc/logrotate.d/mirai-audit

# 手動実行（テスト）
sudo logrotate -f /etc/logrotate.d/mirai-audit
```

### Windows (タスクスケジューラ)

1. タスクスケジューラを開く
2. 「基本タスクの作成」
3. 名前: `Mirai Audit Log Rotation`
4. トリガー: 毎日 午前2:00
5. 操作: プログラムの開始
   - プログラム: `powershell.exe`
   - 引数: `-ExecutionPolicy Bypass -File "Z:\Mirai-HelpDesk-Management-System\scripts\windows\rotate-logs.ps1"`

**手動実行:**
```powershell
powershell.exe -ExecutionPolicy Bypass -File "scripts\windows\rotate-logs.ps1"
```

## テスト

監査ログシステムが正しく動作することを確認:

```bash
cd backend
python test_audit_logging.py
```

**期待される出力:**
```
============================================================
Mirai HelpDesk - Audit Logging System Test
============================================================

Log directory: Z:\Mirai-HelpDesk-Management-System\backend\logs

Testing API operation logging...
✓ API operation log created
Testing M365 operation logging...
✓ M365 operation log created
Testing authentication logging...
✓ Authentication logs created
Testing approval logging...
✓ Approval log created

Verifying log files...
✓ api_operations.jsonl exists (size: 846 bytes)
✓ m365_operations.jsonl exists (size: 465 bytes)
✓ authentication.jsonl exists (size: 656 bytes)
✓ approvals.jsonl exists (size: 391 bytes)

All tests completed successfully! ✓
============================================================
```

## ログ分析

### jq を使用した検索

```bash
# 特定ユーザーの操作を検索
cat logs/api_operations.jsonl | jq 'select(.user_email == "user@example.com")'

# 特定期間の操作を検索
cat logs/api_operations.jsonl | jq 'select(.timestamp >= "2025-01-20T00:00:00")'

# M365操作の失敗を検索
cat logs/m365_operations.jsonl | jq 'select(.result == "FAILED")'

# 操作回数の集計
cat logs/api_operations.jsonl | jq -r '.action' | sort | uniq -c | sort -rn
```

### PowerShell を使用した検索

```powershell
# 最新10件のAPI操作を表示
Get-Content logs\api_operations.jsonl -Tail 10 | ForEach-Object { $_ | ConvertFrom-Json }

# 特定ユーザーの操作を検索
Get-Content logs\api_operations.jsonl | ForEach-Object {
    $record = $_ | ConvertFrom-Json
    if ($record.user_email -eq "user@example.com") {
        $record
    }
}
```

## ファイル構成

```
backend/
├── utils/
│   └── audit_log.py              # 監査ログユーティリティ
├── app/
│   ├── middleware/
│   │   ├── __init__.py
│   │   └── audit.py              # 監査ログミドルウェア
│   ├── config.py                 # 設定（LOG_DIR等）
│   └── main.py                   # ミドルウェア登録
├── logs/                         # ログ出力ディレクトリ
│   ├── api_operations.jsonl
│   ├── m365_operations.jsonl
│   ├── authentication.jsonl
│   └── approvals.jsonl
└── test_audit_logging.py         # テストスクリプト

scripts/
├── linux/
│   └── mirai-audit.logrotate     # Linux用ログローテーション
└── windows/
    └── rotate-logs.ps1           # Windows用ログローテーション

docs/
└── AUDIT_LOGGING.md              # 詳細ドキュメント
```

## トラブルシューティング

### ログファイルが作成されない

1. ログディレクトリの存在確認:
   ```bash
   ls -la backend/logs/
   ```

2. 環境変数の確認:
   ```bash
   grep AUDIT_LOG_ENABLED backend/.env
   ```

3. テストスクリプトを実行:
   ```bash
   cd backend && python test_audit_logging.py
   ```

### ログローテーションが動作しない

**Linux:**
```bash
# 設定の検証
sudo logrotate -d /etc/logrotate.d/mirai-audit
```

**Windows:**
```powershell
# タスクの状態確認
Get-ScheduledTask -TaskName "Mirai Audit Log Rotation" | Get-ScheduledTaskInfo
```

## 詳細ドキュメント

より詳細な情報は以下を参照してください:

- **完全なドキュメント**: `docs/AUDIT_LOGGING.md`
- **設定ファイル**: `backend/app/config.py`
- **ユーティリティ**: `backend/utils/audit_log.py`
- **ミドルウェア**: `backend/app/middleware/audit.py`

## まとめ

監査ログシステムは以下の特徴を持ちます:

- ✓ **自動化**: API操作は自動的に記録
- ✓ **包括性**: すべての重要な操作を記録
- ✓ **JSON Lines形式**: 機械可読性が高い
- ✓ **ログローテーション**: 自動圧縮、保持期間管理
- ✓ **監査証跡**: 誰が/いつ/何を/なぜを完全に記録

これにより、コンプライアンス要件を満たし、セキュリティインシデント発生時の調査を容易にします。
