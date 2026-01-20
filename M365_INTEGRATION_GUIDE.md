# Microsoft 365 Graph API Integration Guide

## 概要

Mirai HelpDesk Management SystemにMicrosoft Graph APIを統合し、Microsoft 365操作を自動化します。
すべての操作は承認フロー、SOD（職務分離）原則、監査証跡の記録を遵守します。

## アーキテクチャ

### コンポーネント構成

```
backend/app/m365/
├── __init__.py              # パッケージエクスポート
├── exceptions.py            # M365固有の例外クラス
├── auth.py                  # 認証設定とトークン取得
├── graph_client.py          # Graph API低レベルクライアント
└── operations.py            # 高レベルM365操作
```

### レイヤー構造

1. **GraphClient** (Low-Level)
   - HTTPリクエスト処理
   - トークン管理
   - リトライロジック
   - エラーハンドリング

2. **M365Operations** (High-Level)
   - ビジネスロジック実装
   - タスクタイプ別の操作
   - バリデーション
   - 結果整形

3. **M365 Routes** (API Endpoint)
   - 認証・認可チェック
   - 承認フロー検証
   - SOD原則検証
   - 実施ログ記録

## 初期設定

### 1. Azure ADアプリケーション登録

1. Azure Portal → Azure Active Directory → App registrations
2. 新しいアプリを登録:
   - Name: Mirai-HelpDesk-API
   - Supported account types: Single tenant
   - Redirect URI: (不要)

3. API Permissions設定:
   ```
   Microsoft Graph - Application permissions:
   - User.Read.All
   - User.ReadWrite.All
   - Group.Read.All
   - Group.ReadWrite.All
   - Directory.Read.All
   - Directory.ReadWrite.All
   - Organization.Read.All
   - UserAuthenticationMethod.ReadWrite.All
   ```

4. Admin Consentを付与

5. Certificate & secrets → New client secret
   - 有効期限を選択（推奨: 1年または2年）
   - シークレット値を保存

### 2. 環境変数設定

`.env`ファイルに以下を追加:

```env
# Microsoft Graph API Configuration
MS_TENANT_ID=your-tenant-id-here
MS_CLIENT_ID=your-application-client-id-here
MS_CLIENT_SECRET=your-client-secret-here
MS_AUTHORITY=https://login.microsoftonline.com/{tenant-id}
MS_GRAPH_ENDPOINT=https://graph.microsoft.com/v1.0
MS_SCOPES=https://graph.microsoft.com/.default
```

### 3. 依存関係インストール

```bash
cd backend
pip install httpx pydantic-settings
```

### 4. 動作確認

```bash
cd backend
python test_m365_integration.py
```

成功すると以下のような出力が表示されます:

```
============================================================
M365 Graph API Integration Test
============================================================

[1] Testing module imports...
[OK] All M365 modules imported successfully

[2] Testing M365AuthConfig...
   Tenant ID: a7232f7a-a9e5-4f71-9372-dc8b1c6645ea
   Client ID: 22e5d6e4-805f-4516-af09-ff09c7c224c4
   Graph Endpoint: https://graph.microsoft.com/v1.0
   Is Configured: True
[OK] M365 authentication is configured

[3] Testing GraphClient instantiation...
[OK] GraphClient instantiated successfully

[4] Testing M365Operations...
   [OK] search_users
   [OK] get_user
   ...
[OK] M365Operations class initialized successfully

[5] Testing M365 routes...
   Total routes: 12
   ...
[OK] M365 routes loaded successfully
```

## API エンドポイント

### 既存エンドポイント（更新済み）

#### `POST /api/m365/tasks/{task_id}/execute`

M365タスクを実行（Graph API統合版）

**主な変更点:**
- 実際のGraph API呼び出しを実行
- 自動的に実施ログに記録
- タスクタイプに応じた処理分岐
- 詳細なエラーハンドリング

**対応タスクタイプ:**
- `LICENSE_ASSIGN` - ライセンス付与
- `LICENSE_REMOVE` - ライセンス剥奪
- `PASSWORD_RESET` - パスワードリセット
- `MFA_RESET` - MFA認証方法リセット
- `GROUP_ADD` - グループメンバー追加
- `GROUP_REMOVE` - グループメンバー削除

**リクエスト:**
```json
{
  "action": "ライセンス付与実施",
  "method": "graph_api",
  "command_or_action": "Assign E3 license to user@example.com",
  "result": "success"
}
```

**レスポンス:**
```json
{
  "message": "Task execution completed",
  "log_id": 123,
  "task_status": "completed",
  "result": "success",
  "execution_result": {
    "status": "success",
    "message": "License assigned successfully",
    "user_id": "user@example.com",
    "sku_id": "sku-id-here",
    "graph_response": {...}
  },
  "error_message": null
}
```

### 新規エンドポイント

#### `GET /api/m365/users/search`

M365ユーザー検索

**クエリパラメータ:**
- `query`: 検索クエリ（displayName, mail, userPrincipalNameで検索）
- `top`: 最大取得件数（デフォルト: 10、最大: 50）

**レスポンス:**
```json
{
  "query": "yamada",
  "count": 3,
  "users": [
    {
      "id": "user-object-id",
      "userPrincipalName": "yamada@example.com",
      "displayName": "山田 太郎",
      "mail": "yamada@example.com",
      "jobTitle": "営業部長",
      "department": "営業部"
    }
  ]
}
```

#### `GET /api/m365/users/{user_id}`

ユーザー詳細情報取得

**レスポンス:**
```json
{
  "user": {
    "id": "user-object-id",
    "userPrincipalName": "user@example.com",
    "displayName": "山田 太郎",
    "mail": "user@example.com",
    "jobTitle": "営業部長",
    "department": "営業部",
    "accountEnabled": true,
    ...
  }
}
```

#### `GET /api/m365/licenses/available`

利用可能なライセンス一覧取得

**レスポンス:**
```json
{
  "count": 5,
  "licenses": [
    {
      "sku_id": "sku-id-1",
      "sku_part_number": "ENTERPRISEPACK",
      "consumed_units": 50,
      "enabled_units": 100,
      "available_units": 50
    }
  ]
}
```

#### `GET /api/m365/users/{user_id}/licenses`

ユーザーのライセンス取得

**レスポンス:**
```json
{
  "user_id": "user@example.com",
  "count": 2,
  "licenses": [
    {
      "skuId": "sku-id-1",
      "disabledPlans": []
    }
  ]
}
```

#### `GET /api/m365/tasks/{task_id}/summary`

タスク実行前のサマリー情報取得

**レスポンス:**
```json
{
  "task_id": 123,
  "task_type": "license_assign",
  "target_description": "E3ライセンス付与",
  "current_state": {
    "user_id": "user-object-id",
    "upn": "user@example.com",
    "display_name": "山田 太郎",
    "current_licenses": [...]
  }
}
```

## 使用例

### 1. ライセンス付与フロー

```python
# 1. M365タスク作成
POST /api/m365/tasks
{
  "ticket_id": 100,
  "task_type": "license_assign",
  "target_upn": "newuser@example.com",
  "target_resource_id": "sku-id-for-e3-license",
  "target_description": "新入社員へのE3ライセンス付与"
}

# 2. 承認依頼
POST /api/m365/tasks/{task_id}/request-approval
{
  "reason": "新入社員の業務開始に必要"
}

# 3. 承認
POST /api/m365/approvals/{approval_id}/approve
{
  "comment": "承認します"
}

# 4. タスク実行（Graph API統合）
POST /api/m365/tasks/{task_id}/execute
{
  "action": "E3ライセンス付与実施",
  "method": "graph_api",
  "command_or_action": "Assign E3 license"
}

# → 自動的にGraph APIが呼び出され、実施ログに記録される
```

### 2. パスワードリセット

```python
# タスク実行時に一時パスワードが自動生成される
POST /api/m365/tasks/{task_id}/execute
{
  "action": "パスワードリセット実施",
  "method": "graph_api",
  "command_or_action": ""  # 空の場合は自動生成
}

# レスポンスに一時パスワードが含まれる
{
  "execution_result": {
    "status": "success",
    "temporary_password": "Abc123!@#Xyz",
    "force_change_on_next_login": true
  }
}
```

## エラーハンドリング

### エラータイプ

1. **M365AuthenticationError**
   - HTTPステータス: 503 Service Unavailable
   - 原因: 認証情報の不正、トークン取得失敗
   - 対処: `.env`ファイルの設定を確認

2. **M365AuthorizationError**
   - HTTPステータス: 403 Forbidden
   - 原因: APIアクセス権限不足
   - 対処: Azure ADアプリのAPI Permissionsを確認

3. **M365APIError**
   - HTTPステータス: 502 Bad Gateway
   - 原因: Graph APIエラー、ネットワークエラー
   - 詳細: `details.status_code`で元のHTTPステータスコードを確認

4. **M365ValidationError**
   - HTTPステータス: 400 Bad Request
   - 原因: 入力パラメータの不正

### エラーレスポンス例

```json
{
  "message": "Task execution completed",
  "result": "failure",
  "error_message": "Authorization error: Insufficient permissions for this operation",
  "execution_result": {
    "error": "Authorization error: Insufficient permissions for this operation",
    "details": {
      "status_code": 403,
      "error": {
        "code": "Authorization_RequestDenied",
        "message": "Insufficient privileges to complete the operation."
      }
    }
  }
}
```

## セキュリティ

### 認証方式

- **Client Credentials Flow** (OAuth 2.0)
- サービスプリンシパルによる非対話的認証
- トークンは自動管理（有効期限: 約1時間）

### 承認フロー

すべてのM365操作には承認が必須:
1. タスク作成
2. 承認依頼
3. 承認者による承認
4. オペレータによる実行

### SOD原則

- 承認者と実施者が同一人物の場合はエラー
- `execute`エンドポイントで自動チェック

### 監査証跡

すべての操作は`m365_execution_logs`に記録:
- オペレータID
- 実行時刻
- 操作内容
- Graph APIレスポンス
- 結果（成功/失敗）
- エラーメッセージ

ログは追記専用（削除・更新不可）

## トラブルシューティング

### 問題: トークン取得失敗

```
M365AuthenticationError: Failed to acquire access token: 401
```

**解決方法:**
1. `.env`ファイルの設定を確認
2. Azure ADアプリのClient Secretが有効か確認
3. Tenant IDとClient IDが正しいか確認

### 問題: 権限不足エラー

```
M365AuthorizationError: Insufficient permissions for this operation
```

**解決方法:**
1. Azure Portal → App registrations → API Permissions
2. 必要な権限が追加されているか確認
3. Admin Consentが付与されているか確認

### 問題: ユーザーが見つからない

```
M365APIError: Graph API error: 404
```

**解決方法:**
1. UPNが正しいか確認
2. ユーザーが削除されていないか確認
3. `GET /api/m365/users/search`で検索して確認

## パフォーマンス

### レート制限

- Graph APIのレート制限: 約10,000リクエスト/10分/アプリ
- 自動リトライ機能実装済み
- `Retry-After`ヘッダーに従って待機

### リトライロジック

- 401 Unauthorized: 最大3回リトライ（トークン再取得）
- 429 Too Many Requests: `Retry-After`秒待機後リトライ
- 5xx Server Error: Exponential Backoffでリトライ

## 今後の拡張

### Phase 2: 追加操作

- Teams作成/管理
- メールボックス権限管理
- OneDrive操作
- SharePoint操作
- 退職者処理自動化

### Phase 3: 高度な機能

- バッチ操作
- バックグラウンドジョブ
- Webhook通知
- 詳細な監査レポート

## 参考資料

- [Microsoft Graph API Documentation](https://learn.microsoft.com/en-us/graph/api/overview)
- [Azure AD App Registration](https://learn.microsoft.com/en-us/azure/active-directory/develop/quickstart-register-app)
- [Graph API Permissions](https://learn.microsoft.com/en-us/graph/permissions-reference)
