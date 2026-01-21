# Mirai HelpDesk Management System - 監査ログシステム

## 概要

Mirai HelpDesk Management System では、すべてのAPI操作とM365操作をJSON Lines形式で記録する包括的な監査ログシステムを実装しています。これにより、「誰が/いつ/何を/なぜ」の完全な追跡が可能になります。

## 監査要件

1. **追記専用**: すべてのログは追記専用で、削除や変更は不可
2. **完全性**: すべての重要な操作を記録
3. **保持期間**: 最低90日間（推奨: 2年 = 730日）
4. **可読性**: JSON Lines形式で機械可読性を確保
5. **証跡性**: 各操作に一意のIDを付与

## アーキテクチャ

### コンポーネント

```
backend/
├── utils/
│   └── audit_log.py           # 監査ログユーティリティ
├── app/
│   └── middleware/
│       └── audit.py            # 自動ログ記録ミドルウェア
└── logs/                       # ログ出力ディレクトリ
    ├── api_operations.jsonl    # API操作ログ
    ├── m365_operations.jsonl   # M365操作ログ
    ├── authentication.jsonl    # 認証ログ
    └── approvals.jsonl         # 承認ログ

scripts/
├── linux/
│   └── mirai-audit.logrotate  # Linux用ログローテーション設定
└── windows/
    └── rotate-logs.ps1         # Windows用ログローテーションスクリプト
```

### ログファイルの種類

| ファイル名 | 内容 | 記録タイミング |
|-----------|------|--------------|
| `api_operations.jsonl` | すべてのAPI操作 | 自動（ミドルウェア） |
| `m365_operations.jsonl` | M365操作の実施 | 手動（操作時） |
| `authentication.jsonl` | ログイン/ログアウト | 認証処理時 |
| `approvals.jsonl` | 承認/却下の判断 | 承認操作時 |

## 使用方法

### 1. 自動ログ記録（API操作）

FastAPIのミドルウェアがすべてのAPI操作を自動的に記録します。

```python
# 設定不要 - ミドルウェアが自動的に記録
# 認証済みユーザーのすべてのAPIリクエストが記録されます
```

**記録内容:**
- リクエストID（UUID）
- ユーザーID、メールアドレス
- HTTPメソッドとパス
- レスポンスステータスコード
- IPアドレス、User-Agent
- 処理時間

**ログ例:**
```json
{
  "timestamp": "2025-01-20T10:30:45.123456+00:00",
  "request_id": "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6",
  "log_type": "api_operation",
  "user_id": 123,
  "user_email": "user@example.com",
  "action": "CREATE",
  "resource_type": "tickets",
  "resource_id": 456,
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "details": {
    "method": "POST",
    "path": "/api/tickets",
    "status_code": 201,
    "process_time_seconds": 0.123
  }
}
```

### 2. M365操作ログ

M365操作を実施した際は、明示的にログを記録する必要があります。

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
    details={
        "license_sku": "ENTERPRISEPACK",
        "before": [],
        "after": ["ENTERPRISEPACK"]
    }
)
```

**ログ例:**
```json
{
  "timestamp": "2025-01-20T10:35:12.456789+00:00",
  "operation_id": "p6o5n4m3l2k1j0i9h8g7f6e5d4c3b2a1",
  "log_type": "m365_operation",
  "operator_id": 123,
  "operator_email": "operator@example.com",
  "task_type": "ADD_LICENSE",
  "target_upn": "user@contoso.onmicrosoft.com",
  "method": "GRAPH_API",
  "result": "SUCCESS",
  "ticket_id": 456,
  "command": "POST /users/{id}/assignLicense",
  "details": {
    "license_sku": "ENTERPRISEPACK",
    "before": [],
    "after": ["ENTERPRISEPACK"]
  }
}
```

### 3. 認証ログ

ログイン/ログアウトを記録します。

```python
from utils.audit_log import log_authentication

# ログイン成功時
log_authentication(
    user_id=user.id,
    user_email=user.email,
    action="LOGIN",
    ip_address=client_ip,
    user_agent=user_agent,
    success=True,
    details={"auth_method": "PASSWORD"}
)

# ログイン失敗時
log_authentication(
    user_id=None,
    user_email=attempted_email,
    action="LOGIN_FAILED",
    ip_address=client_ip,
    user_agent=user_agent,
    success=False,
    details={"reason": "INVALID_PASSWORD"}
)
```

### 4. 承認ログ

承認/却下の判断を記録します。

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
    reason="業務上必要な権限であることを確認",
    details={"requested_permission": "SharePoint Site Admin"}
)
```

## ログローテーション

### Linux (logrotate)

**インストール:**
```bash
# logrotate設定をコピー
sudo cp scripts/linux/mirai-audit.logrotate /etc/logrotate.d/mirai-audit
sudo chmod 644 /etc/logrotate.d/mirai-audit

# 設定の検証
sudo logrotate -d /etc/logrotate.d/mirai-audit

# 手動実行（テスト）
sudo logrotate -f /etc/logrotate.d/mirai-audit
```

**設定内容:**
- 日次ローテーション
- 10MBを超えたら即座にローテーション
- 90日間保持
- gzip圧縮
- copytruncateでアプリケーション再起動不要

### Windows (PowerShell + タスクスケジューラ)

**インストール:**

1. タスクスケジューラを開く（`taskschd.msc`）
2. 「基本タスクの作成」を選択
3. タスク名: `Mirai Audit Log Rotation`
4. トリガー: 毎日 午前2:00
5. 操作: プログラムの開始
   - プログラム: `powershell.exe`
   - 引数: `-ExecutionPolicy Bypass -File "Z:\Mirai-HelpDesk-Management-System\scripts\windows\rotate-logs.ps1"`
6. 完了

**手動実行（テスト）:**
```powershell
powershell.exe -ExecutionPolicy Bypass -File "Z:\Mirai-HelpDesk-Management-System\scripts\windows\rotate-logs.ps1"
```

**動作内容:**
- 10MBを超えたファイルをローテーション
- 24時間更新されていないファイルをローテーション
- ZIP圧縮
- 90日以上経過したファイルを削除

## 設定

### 環境変数

```bash
# ログディレクトリ（デフォルト: logs）
LOG_DIR=logs

# 監査ログの有効/無効（デフォルト: True）
AUDIT_LOG_ENABLED=True

# ログ保持期間（日数、デフォルト: 90）
AUDIT_LOG_RETENTION_DAYS=730  # 2年間
```

### backend/app/config.py

```python
class Settings(BaseSettings):
    # Audit Logging
    LOG_DIR: str = "logs"
    AUDIT_LOG_ENABLED: bool = True
    AUDIT_LOG_RETENTION_DAYS: int = 90
```

## ログ分析

### コマンドライン（jq使用）

**特定ユーザーの操作を検索:**
```bash
cat logs/api_operations.jsonl | jq 'select(.user_email == "user@example.com")'
```

**特定期間の操作を検索:**
```bash
cat logs/api_operations.jsonl | jq 'select(.timestamp >= "2025-01-20T00:00:00")'
```

**M365操作の失敗を検索:**
```bash
cat logs/m365_operations.jsonl | jq 'select(.result == "FAILED")'
```

**操作回数の集計:**
```bash
cat logs/api_operations.jsonl | jq -r '.action' | sort | uniq -c | sort -rn
```

### Python スクリプト

```python
import json
from pathlib import Path

def analyze_logs(log_file: str, user_email: str):
    """特定ユーザーの操作を分析"""
    operations = []

    with open(log_file, 'r', encoding='utf-8') as f:
        for line in f:
            record = json.loads(line)
            if record.get('user_email') == user_email:
                operations.append(record)

    return operations

# 使用例
user_ops = analyze_logs('logs/api_operations.jsonl', 'user@example.com')
print(f"Total operations: {len(user_ops)}")
```

## セキュリティ考慮事項

### 1. ファイルパーミッション

**Linux:**
```bash
# ログディレクトリとファイルの権限設定
sudo chown -R mirai-app:mirai-app /var/log/mirai-helpdesk
sudo chmod 750 /var/log/mirai-helpdesk
sudo chmod 640 /var/log/mirai-helpdesk/logs/*.jsonl
```

**Windows:**
```powershell
# ログディレクトリのアクセス権設定
icacls "Z:\Mirai-HelpDesk-Management-System\backend\logs" /grant "BUILTIN\Administrators:(OI)(CI)F" /grant "NT AUTHORITY\SYSTEM:(OI)(CI)F" /grant "AppUser:(OI)(CI)RX"
```

### 2. ログの整合性保護

ログファイルが改ざんされていないことを確認するため、定期的にハッシュを計算して保存することを推奨します。

```bash
# ログファイルのSHA256ハッシュを計算
sha256sum logs/*.jsonl > logs/checksums.txt

# ハッシュの検証
sha256sum -c logs/checksums.txt
```

### 3. 機密情報のマスキング

パスワードやトークンなどの機密情報がログに記録されないように注意してください。

```python
# 良い例: パスワードをマスキング
details = {
    "username": username,
    "password": "********"  # 実際のパスワードは記録しない
}

# 悪い例: パスワードをそのまま記録
details = {
    "username": username,
    "password": plain_password  # NG
}
```

## トラブルシューティング

### ログファイルが作成されない

1. **ログディレクトリの確認:**
   ```bash
   ls -la logs/
   ```

2. **書き込み権限の確認:**
   ```bash
   # Linux
   ls -la logs/

   # Windows
   icacls logs/
   ```

3. **AUDIT_LOG_ENABLEDの確認:**
   ```bash
   # .envファイルを確認
   grep AUDIT_LOG_ENABLED backend/.env
   ```

### ログローテーションが動作しない

**Linux:**
```bash
# logrotateの状態確認
sudo logrotate -d /etc/logrotate.d/mirai-audit

# logrotateのログ確認
sudo tail -f /var/log/logrotate.log
```

**Windows:**
```powershell
# タスクスケジューラの履歴確認
Get-ScheduledTask -TaskName "Mirai Audit Log Rotation" | Get-ScheduledTaskInfo

# スクリプトの手動実行（デバッグ）
powershell.exe -ExecutionPolicy Bypass -File "scripts\windows\rotate-logs.ps1"
```

### ログファイルが大きくなりすぎる

1. **ローテーション設定の調整:**
   - ローテーションサイズを小さくする（例: 5MB）
   - 保持期間を短くする（例: 30日）

2. **不要なログの除外:**
   ```python
   # middleware/audit.py の EXCLUDED_PATHS に追加
   EXCLUDED_PATHS = {
       "/health",
       "/metrics",
       "/static/*",
       # 追加のパス
   }
   ```

## 監査レポート生成

### 月次レポート

```python
import json
from collections import defaultdict
from datetime import datetime, timedelta
from pathlib import Path

def generate_monthly_report(log_dir: str, year: int, month: int):
    """月次監査レポートを生成"""

    operations = defaultdict(int)
    users = set()

    log_file = Path(log_dir) / "api_operations.jsonl"

    with open(log_file, 'r', encoding='utf-8') as f:
        for line in f:
            record = json.loads(line)
            timestamp = datetime.fromisoformat(record['timestamp'])

            if timestamp.year == year and timestamp.month == month:
                operations[record['action']] += 1
                users.add(record['user_email'])

    print(f"=== 月次監査レポート {year}年{month}月 ===")
    print(f"総操作数: {sum(operations.values())}")
    print(f"アクティブユーザー数: {len(users)}")
    print("\n操作種別:")
    for action, count in sorted(operations.items(), key=lambda x: x[1], reverse=True):
        print(f"  {action}: {count}")

# 使用例
generate_monthly_report('logs', 2025, 1)
```

## まとめ

Mirai HelpDesk Management System の監査ログシステムは、以下の特徴を持ちます:

- **自動化**: API操作は自動的に記録
- **包括性**: すべての重要な操作を記録
- **拡張性**: JSON Lines形式で機械可読性が高い
- **セキュリティ**: 追記専用、改ざん防止
- **運用性**: ログローテーション、圧縮、保持期間管理

これにより、コンプライアンス要件を満たし、セキュリティインシデント発生時の調査を容易にします。
