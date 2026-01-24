# API仕様書

Mirai ヘルプデスク管理システムのREST API仕様書です。

## 基本情報

- **ベースURL**: `http://localhost:3000/api`
- **認証方式**: JWT Bearer Token
- **コンテンツタイプ**: `application/json`

## 認証

### ログイン

ユーザー認証を行い、JWTトークンを取得します。

**エンドポイント**: `POST /auth/login`

**リクエスト**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "user": {
      "user_id": "uuid",
      "email": "user@example.com",
      "display_name": "山田太郎",
      "department": "営業部",
      "role": "requester"
    }
  }
}
```

### ユーザー登録

新規ユーザーを登録します（開発用）。

**エンドポイント**: `POST /auth/register`

**リクエスト**:
```json
{
  "email": "newuser@example.com",
  "display_name": "新規ユーザー",
  "department": "営業部",
  "role": "requester",
  "password": "SecurePass123!"
}
```

### 現在のユーザー情報取得

**エンドポイント**: `GET /auth/me`

**ヘッダー**: `Authorization: Bearer <token>`

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "user": {
      "user_id": "uuid",
      "email": "user@example.com",
      "display_name": "山田太郎",
      "department": "営業部",
      "role": "requester",
      "status": "active"
    }
  }
}
```

## チケット管理

### チケット一覧取得

**エンドポイント**: `GET /tickets`

**クエリパラメータ**:
- `status` - チケットステータス（new, in_progress, resolved, closed等）
- `priority` - 優先度（P1, P2, P3, P4）
- `type` - チケットタイプ（incident, service_request, change）
- `assignee_id` - 担当者ID
- `page` - ページ番号（デフォルト: 1）
- `pageSize` - 1ページあたりの件数（デフォルト: 20）

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "tickets": [
      {
        "ticket_id": "uuid",
        "ticket_number": "HD-2024-00001",
        "type": "service_request",
        "subject": "Microsoft 365 ライセンス追加依頼",
        "description": "E5ライセンスの追加をお願いします",
        "status": "new",
        "priority": "P3",
        "impact": "個人",
        "urgency": "中",
        "requester_id": "uuid",
        "requester_name": "山田太郎",
        "assignee_id": null,
        "assignee_name": null,
        "category_name": "Microsoft 365",
        "created_at": "2024-01-20T10:00:00Z",
        "due_at": "2024-01-23T10:00:00Z"
      }
    ],
    "meta": {
      "total": 100,
      "page": 1,
      "pageSize": 20,
      "totalPages": 5
    }
  }
}
```

### チケット詳細取得

**エンドポイント**: `GET /tickets/:id`

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "ticket": {
      "ticket_id": "uuid",
      "ticket_number": "HD-2024-00001",
      "type": "service_request",
      "subject": "Microsoft 365 ライセンス追加依頼",
      "description": "E5ライセンスの追加をお願いします",
      "status": "in_progress",
      "priority": "P3",
      "impact": "個人",
      "urgency": "中",
      "requester_id": "uuid",
      "requester_name": "山田太郎",
      "requester_email": "yamada@example.com",
      "assignee_id": "uuid",
      "assignee_name": "IT担当者",
      "assignee_email": "agent@example.com",
      "category_name": "Microsoft 365 / ライセンス",
      "sla_policy_name": "P3 - 個人影響",
      "created_at": "2024-01-20T10:00:00Z",
      "updated_at": "2024-01-20T11:00:00Z",
      "response_due_at": "2024-01-20T14:00:00Z",
      "due_at": "2024-01-23T10:00:00Z"
    },
    "comments": [
      {
        "comment_id": "uuid",
        "ticket_id": "uuid",
        "author_id": "uuid",
        "author_name": "IT担当者",
        "body": "承認依頼を提出しました。",
        "visibility": "public",
        "created_at": "2024-01-20T11:00:00Z"
      }
    ]
  }
}
```

### チケット作成

**エンドポイント**: `POST /tickets`

**リクエスト**:
```json
{
  "type": "service_request",
  "subject": "Microsoft 365 ライセンス追加依頼",
  "description": "業務拡大に伴い、E5ライセンスを1つ追加したいです。",
  "impact": "個人",
  "urgency": "中",
  "category_id": "uuid"
}
```

**レスポンス** (201 Created):
```json
{
  "success": true,
  "data": {
    "ticket": {
      "ticket_id": "uuid",
      "ticket_number": "HD-2024-00050",
      "type": "service_request",
      "status": "new",
      "priority": "P3",
      "created_at": "2024-01-20T12:00:00Z"
    }
  }
}
```

### チケット更新

**エンドポイント**: `PATCH /tickets/:id`

**リクエスト**:
```json
{
  "subject": "更新された件名",
  "description": "更新された説明",
  "category_id": "uuid"
}
```

### ステータス更新

**エンドポイント**: `PATCH /tickets/:id/status`

**リクエスト**:
```json
{
  "status": "resolved",
  "reason": "ライセンスを追加しました。"
}
```

### チケット割り当て

**エンドポイント**: `POST /tickets/:id/assign`

**権限**: Agent以上

**リクエスト**:
```json
{
  "assignee_id": "uuid"
}
```

### コメント追加

**エンドポイント**: `POST /tickets/:id/comments`

**リクエスト**:
```json
{
  "body": "承認依頼を提出しました。",
  "visibility": "public"
}
```

## Microsoft 365 連携

### M365タスク一覧

**エンドポイント**: `GET /m365/tasks`

**権限**: M365 Operator, Manager

**レスポンス** (200 OK):
```json
{
  "success": true,
  "data": {
    "tasks": [
      {
        "task_id": "uuid",
        "ticket_id": "uuid",
        "task_type": "license_assign",
        "state": "approved",
        "target_upn": "user@example.com",
        "task_details": {
          "skuId": "...",
          "licenceName": "Microsoft 365 E5"
        },
        "scheduled_at": "2024-01-20T15:00:00Z",
        "created_at": "2024-01-20T12:00:00Z"
      }
    ]
  }
}
```

### M365タスク実施ログ記録

**エンドポイント**: `POST /m365/tasks/:id/execute`

**権限**: M365 Operator

**リクエスト**:
```json
{
  "method": "powershell",
  "command_or_screen": "Set-MsolUserLicense -UserPrincipalName user@example.com -AddLicenses \"tenant:SPE_E5\"",
  "result": "success",
  "result_message": "ライセンスを正常に追加しました",
  "evidence_attachment_id": "uuid",
  "rollback_procedure": "Remove-MsolUserLicense -UserPrincipalName user@example.com -RemoveLicenses \"tenant:SPE_E5\""
}
```

## 承認ワークフロー

### 承認依頼一覧

**エンドポイント**: `GET /approvals`

**権限**: Approver, Manager

### 承認実行

**エンドポイント**: `POST /approvals/:id/approve`

**リクエスト**:
```json
{
  "reason": "業務上必要と判断し、承認します。",
  "comment": "来月からの配属に合わせて付与してください。"
}
```

### 却下実行

**エンドポイント**: `POST /approvals/:id/reject`

**リクエスト**:
```json
{
  "reason": "予算が不足しているため却下します。",
  "comment": "次四半期に再申請してください。"
}
```

## エラーレスポンス

すべてのエラーは以下の形式で返されます：

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ"
  }
}
```

### 一般的なエラーコード

| ステータスコード | エラーコード | 説明 |
|-----------------|-------------|------|
| 400 | VALIDATION_ERROR | バリデーションエラー |
| 401 | UNAUTHORIZED | 認証が必要 |
| 401 | INVALID_TOKEN | トークンが無効 |
| 401 | TOKEN_EXPIRED | トークンの有効期限切れ |
| 403 | FORBIDDEN | アクセス権限がない |
| 404 | TICKET_NOT_FOUND | チケットが見つからない |
| 409 | EMAIL_EXISTS | メールアドレスが既に存在 |
| 429 | RATE_LIMIT_EXCEEDED | レート制限超過 |
| 500 | INTERNAL_SERVER_ERROR | 内部サーバーエラー |

## レート制限

- **ウィンドウ**: 15分
- **最大リクエスト数**: 100リクエスト/IP

レート制限を超えた場合、`429 Too Many Requests` が返され、`Retry-After` ヘッダーで再試行可能時間が通知されます。
