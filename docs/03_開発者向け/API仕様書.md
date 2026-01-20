# API仕様書

> **Note**: 完全なAPI仕様は [/docs/API.md](../API.md) を参照してください。
> このドキュメントは開発者向けのクイックリファレンスです。

## 基本情報

- **ベースURL**: `http://localhost:3000/api`
- **認証**: JWT Bearer Token
- **Content-Type**: `application/json`

## 認証エンドポイント

| Method | Path | 説明 |
|--------|------|------|
| POST | `/auth/login` | ログイン |
| POST | `/auth/register` | ユーザー登録 |
| GET | `/auth/me` | 現在のユーザー情報 |

## チケットエンドポイント

| Method | Path | 説明 | 権限 |
|--------|------|------|------|
| GET | `/tickets` | チケット一覧 | All |
| POST | `/tickets` | チケット作成 | All |
| GET | `/tickets/:id` | チケット詳細 | All |
| PATCH | `/tickets/:id` | チケット更新 | Agent+ |
| POST | `/tickets/:id/comments` | コメント追加 | All |
| POST | `/tickets/:id/attachments` | 添付ファイル | All |

## 承認エンドポイント

| Method | Path | 説明 | 権限 |
|--------|------|------|------|
| POST | `/tickets/:id/approvals/request` | 承認依頼 | Agent+ |
| POST | `/approvals/:id/approve` | 承認 | Approver+ |
| POST | `/approvals/:id/reject` | 却下 | Approver+ |

## M365エンドポイント

| Method | Path | 説明 | 権限 |
|--------|------|------|------|
| POST | `/tickets/:id/m365_tasks` | M365タスク作成 | Agent+ |
| POST | `/m365_tasks/:id/execute_log` | 実施ログ記録 | M365 Operator |

詳細は [/docs/API.md](../API.md) を参照してください。
