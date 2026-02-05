# AI機能 API仕様書

全AIエンドポイントの詳細仕様、リクエスト/レスポンス形式、サンプルコード、エラーハンドリングを記載します。

---

## 📋 目次

1. [エンドポイント一覧](#エンドポイント一覧)
2. [共通仕様](#共通仕様)
3. [POST /api/ai/classify-ticket](#post-apiai classify-ticket)
4. [POST /api/ai/route-ticket](#post-apiairoute-ticket)
5. [POST /api/ai/search-similar-tickets](#post-apiai search-similar-tickets)
6. [POST /api/ai/suggest-answer](#post-apiai suggest-answer)
7. [POST /api/ai/detect-escalation-risk](#post-apiai detect-escalation-risk)
8. [POST /api/ai/generate-report](#post-apiai generate-report)
9. [GET /api/ai/metrics](#get-apiaimetrics)
10. [エラーレスポンス](#エラーレスポンス)

---

## エンドポイント一覧

| エンドポイント | メソッド | 認可 | 目的 | ステータス |
|---------------|---------|------|------|----------|
| `/api/ai/classify-ticket` | POST | 全ロール | チケット自動分類 | ✅ 実装済み |
| `/api/ai/route-ticket` | POST | Agent以上 | ルーティング判定 | 🔄 計画中 |
| `/api/ai/search-similar-tickets` | POST | 全ロール | 類似チケット検索 | 🔄 計画中 |
| `/api/ai/suggest-answer` | POST | Agent以上 | 回答提案生成 | 🔄 計画中 |
| `/api/ai/detect-escalation-risk` | POST | Agent以上 | エスカレーション検知 | 🔄 計画中 |
| `/api/ai/generate-report` | POST | Manager/Auditor | 監査レポート生成 | 🔄 計画中 |
| `/api/ai/metrics` | GET | Manager/Auditor | メトリクス取得 | ✅ 実装済み |

---

## 共通仕様

### 認証

**方式**: JWT（JSON Web Token）

**ヘッダー**:
```
Authorization: Bearer <JWT_TOKEN>
```

**JWT ペイロード**:
```json
{
  "user_id": "uuid",
  "email": "user@company.com",
  "role": "agent"
}
```

### レート制限

**デフォルト**: 10回/分/ユーザー

**超過時のレスポンス**:
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "AI機能のリクエスト制限（10回/分）を超えました。あと 45秒待ってから再試行してください。"
  }
}
```

### 成功レスポンス形式

```json
{
  "success": true,
  "data": {
    // 機能固有のデータ
  }
}
```

### エラーレスポンス形式

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ（日本語）"
  }
}
```

---

## POST /api/ai/classify-ticket

### 概要

**目的**: チケット内容からAI分類を実行

**認可**: 全ロール（認証必須）

**削減時間**: 3-5分 → 数秒

**精度目標**: 90%以上

---

### リクエスト

**エンドポイント**: `POST /api/ai/classify-ticket`

**Content-Type**: `application/json`

**ボディ**:
```json
{
  "subject": "Outlookで添付ファイルが送信できない",
  "description": "5MBのPDFファイルを送信しようとするとエラーになります。昨日から発生しています。",
  "requester_id": "user-uuid",
  "ticket_id": "ticket-uuid (optional)"
}
```

**パラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `subject` | string | ✅ | チケット件名（5-500文字） |
| `description` | string | ✅ | チケット詳細（10文字以上） |
| `requester_id` | UUID | ✅ | 依頼者ID |
| `ticket_id` | UUID | - | チケットID（既存チケットの再分類時） |

---

### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "predictions": {
      "category": {
        "value": "category-uuid",
        "label": "Microsoft 365 > Exchange Online",
        "confidence": 0.92,
        "rationale": {
          "reasoning": "キーワード「Outlook」「添付ファイル」から、Exchange Online の問題と判断しました。",
          "keywords": ["Outlook", "添付ファイル", "PDF"],
          "similar_tickets": ["HD-2025-00123", "HD-2025-00098"]
        }
      },
      "priority": {
        "value": "P3",
        "confidence": 0.85,
        "rationale": {
          "reasoning": "個人の業務に影響があるが、回避策が存在するため P3 と判断しました。"
        }
      },
      "impact": {
        "value": "individual",
        "confidence": 0.88
      },
      "urgency": {
        "value": "medium",
        "confidence": 0.83
      },
      "assignee": {
        "value": "assignee-uuid",
        "label": "M365 Operator - 山田太郎",
        "confidence": 0.78,
        "rationale": {
          "reasoning": "Exchange Online 設定は M365 Operator の担当領域です。"
        }
      }
    },
    "processing_time_ms": 2450,
    "model_version": "claude-sonnet-4-5-20250929",
    "pii_masked": false
  }
}
```

---

### サンプルコード

**TypeScript（バックエンド）**:
```typescript
import { AIService } from '../services/ai.service';

async function classifyTicketExample() {
  const result = await AIService.classifyTicket({
    subject: "Outlookで添付ファイルが送信できない",
    description: "5MBのPDFファイルを送信しようとするとエラーになります",
    requester_id: "user-uuid",
  });

  console.log('カテゴリ:', result.predictions.category?.label);
  console.log('信頼度:', result.predictions.category?.confidence);
  console.log('処理時間:', result.processing_time_ms, 'ms');
}
```

**TypeScript（フロントエンド）**:
```typescript
import { aiService } from '@services/aiService';

async function handleAIClassification() {
  try {
    const result = await aiService.classifyTicket({
      subject: formData.subject,
      description: formData.description,
      requester_id: currentUser.user_id,
    });

    // 信頼度 70% 以上の提案のみ自動適用
    if (result.predictions.category?.confidence >= 0.7) {
      form.setFieldValue('category_id', result.predictions.category.value);
    }

    setAIResult(result);
  } catch (error) {
    message.error('AI分類に失敗しました');
  }
}
```

**cURL**:
```bash
curl -X POST http://localhost:3000/api/ai/classify-ticket \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Outlookで添付ファイルが送信できない",
    "description": "5MBのPDFファイルを送信しようとするとエラーになります",
    "requester_id": "user-uuid"
  }'
```

---

## POST /api/ai/route-ticket

### 概要

**目的**: サービス要求のルーティング判定（承認必要性・担当者・承認者）

**認可**: Agent以上

**削減時間**: 5分 → 10秒

**精度目標**: 95%以上

---

### リクエスト

**エンドポイント**: `POST /api/ai/route-ticket`

**ボディ**:
```json
{
  "ticket_id": "ticket-uuid (optional)",
  "type": "service_request",
  "subject": "Microsoft 365 E5ライセンス追加",
  "description": "新入社員（山田太郎）用にE5ライセンスを5つ追加したい。配属: 営業部",
  "category_id": "license-category-uuid (optional)",
  "requester_id": "user-uuid"
}
```

**パラメータ**:

| パラメータ | 型 | 必須 | 説明 |
|-----------|---|------|------|
| `ticket_id` | UUID | - | チケットID |
| `type` | string | ✅ | チケット種別（`service_request`, `incident`） |
| `subject` | string | ✅ | チケット件名 |
| `description` | string | ✅ | チケット詳細 |
| `category_id` | UUID | - | カテゴリID |
| `requester_id` | UUID | ✅ | 依頼者ID |

---

### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "routing": {
      "requires_approval": true,
      "approval_reason": "Microsoft 365ライセンス変更は財務影響があるため、Manager承認が必要です。",
      "suggested_approver": {
        "user_id": "manager-uuid",
        "display_name": "IT Manager - 鈴木一郎",
        "confidence": 0.95,
        "reasoning": "IT Manager は全ライセンス変更の承認権限を持っています。"
      },
      "suggested_assignee": {
        "user_id": "operator-uuid",
        "display_name": "M365 Operator - 佐藤花子",
        "role": "m365_operator",
        "confidence": 0.92,
        "reasoning": "M365 Operator は Microsoft 365 の操作経験が豊富です。"
      },
      "rationale": {
        "reasoning": "ライセンス変更は財務影響とセキュリティリスクを伴うため、Manager の承認が必要です。実施は M365 Operator が適任です。",
        "matched_rules": ["RULE_LICENSE_CHANGE", "RULE_M365_OPERATOR"]
      }
    },
    "processing_time_ms": 1850,
    "model_version": "claude-sonnet-4-5-20250929"
  }
}
```

---

### サンプルコード

**TypeScript（バックエンド）**:
```typescript
import { AIRoutingService } from '../services/ai-routing.service';

async function routeTicketExample() {
  const result = await AIRoutingService.routeServiceRequest({
    type: 'service_request',
    subject: 'Microsoft 365 E5ライセンス追加',
    description: '新入社員用にE5ライセンスを5つ追加したい',
    category_id: 'license-category-uuid',
    requester_id: 'user-uuid',
  });

  if (result.routing.requires_approval) {
    console.log('承認が必要:', result.routing.approval_reason);
    console.log('推奨承認者:', result.routing.suggested_approver?.display_name);
  }

  console.log('推奨担当者:', result.routing.suggested_assignee.display_name);
}
```

---

## POST /api/ai/search-similar-tickets

### 概要

**目的**: ベクトル検索により、過去の類似チケットから最適解を推測

**認可**: 全ロール

**削減時間**: 10-15分 → 数秒

**精度目標**: 類似度 0.8以上を5件以内に発見

---

### リクエスト

**エンドポイント**: `POST /api/ai/search-similar-tickets`

**ボディ**:
```json
{
  "query": "Outlookで添付ファイルが送信できない",
  "limit": 5,
  "status_filter": ["resolved", "closed"],
  "min_similarity": 0.7
}
```

**パラメータ**:

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|---|------|-----------|------|
| `query` | string | ✅ | - | 検索クエリ（または ticket_id） |
| `limit` | number | - | 5 | 取得件数（1-20） |
| `status_filter` | string[] | - | `["resolved", "closed"]` | ステータスフィルター |
| `min_similarity` | number | - | 0.7 | 最小類似度（0.0-1.0） |

---

### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "similar_tickets": [
      {
        "ticket_id": "ticket-uuid-1",
        "ticket_number": "HD-2025-00123",
        "subject": "Outlook添付ファイル送信エラー",
        "description": "メール送信時に添付ファイルでエラーが発生",
        "category": "Microsoft 365 > Exchange Online",
        "status": "resolved",
        "similarity_score": 0.94,
        "resolution_summary": "Outlookキャッシュをクリアすることで解決しました。",
        "helpful_comments": [
          "ファイル → オプション → 詳細設定 → Outlookデータファイル → 今すぐクリア を実行してください。",
          "再起動後、添付ファイルの送信が正常に動作することを確認しました。"
        ],
        "resolved_at": "2025-01-10T15:30:00Z",
        "resolution_time_minutes": 45
      },
      {
        "ticket_id": "ticket-uuid-2",
        "ticket_number": "HD-2025-00098",
        "subject": "添付ファイルのサイズ制限エラー",
        "similarity_score": 0.87,
        "resolution_summary": "Exchange Online の添付ファイルサイズ制限を確認しました（デフォルト: 25MB）。",
        "helpful_comments": [
          "添付ファイルのサイズを確認してください。25MBを超える場合は、OneDrive 共有リンクを使用することを推奨します。"
        ]
      }
    ],
    "processing_time_ms": 850,
    "search_method": "vector",
    "total_indexed_tickets": 1250
  }
}
```

---

### サンプルコード

**TypeScript（フロントエンド）**:
```typescript
import { aiService } from '@services/aiService';

async function searchSimilarTickets(query: string) {
  const result = await aiService.searchSimilarTickets({
    query,
    limit: 5,
    min_similarity: 0.7,
  });

  // 類似チケット一覧を表示
  result.similar_tickets.forEach((ticket) => {
    console.log(`${ticket.ticket_number}: ${ticket.subject}`);
    console.log(`類似度: ${(ticket.similarity_score * 100).toFixed(0)}%`);
    console.log(`解決方法: ${ticket.resolution_summary}`);
  });
}
```

---

## POST /api/ai/suggest-answer

### 概要

**目的**: チケットに対する回答提案を生成

**認可**: Agent以上

**削減時間**: 回答作成 15-20分 → 2-3分（レビューのみ）

---

### リクエスト

**エンドポイント**: `POST /api/ai/suggest-answer`

**ボディ**:
```json
{
  "ticket_id": "ticket-uuid",
  "context": {
    "include_comments": true,
    "include_similar_tickets": true,
    "include_knowledge_base": true
  }
}
```

**パラメータ**:

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|---|------|-----------|------|
| `ticket_id` | UUID | ✅ | - | チケットID |
| `context.include_comments` | boolean | - | true | コメント履歴を含めるか |
| `context.include_similar_tickets` | boolean | - | true | 類似チケットを含めるか |
| `context.include_knowledge_base` | boolean | - | true | ナレッジ記事を含めるか |

---

### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "suggestion_id": "suggestion-uuid-1",
        "content": "# 解決方法\n\nOutlook の添付ファイル送信エラーについて、以下の手順で解決できます：\n\n## 手順1: Outlook キャッシュのクリア\n1. Outlook を起動\n2. ファイル → オプション → 詳細設定\n3. Outlook データファイル → 今すぐクリア\n\n## 手順2: Outlook の再起動\n...",
        "approach": "detailed",
        "confidence": 0.94,
        "linked_knowledge_articles": ["kb-uuid-1"],
        "linked_similar_tickets": ["HD-2025-00123"],
        "estimated_resolution_time": "15分"
      },
      {
        "suggestion_id": "suggestion-uuid-2",
        "content": "# 簡潔な手順\n\n1. Outlook を再起動してください\n2. キャッシュクリアを実行してください\n3. 問題が解決しない場合は、ナレッジベース KB-001 を参照してください\n\n詳細: https://kb.yourcompany.com/kb-001",
        "approach": "concise",
        "confidence": 0.88,
        "linked_knowledge_articles": ["kb-uuid-1"]
      },
      {
        "suggestion_id": "suggestion-uuid-3",
        "content": "# 代替手段\n\n添付ファイルのサイズが25MBを超える場合、以下の代替手段をご検討ください：\n\n1. OneDrive にアップロードして共有リンクを送信\n2. SharePoint のドキュメントライブラリを使用\n...",
        "approach": "alternative",
        "confidence": 0.82,
        "linked_knowledge_articles": ["kb-uuid-2", "kb-uuid-3"]
      }
    ],
    "processing_time_ms": 3200,
    "model_version": "claude-sonnet-4-5-20250929"
  }
}
```

---

## POST /api/ai/detect-escalation-risk

### 概要

**目的**: チケットのエスカレーションリスクを検知し、SLA違反を予測

**認可**: Agent以上

**削減時間**: リスク評価 10分 → 数秒

---

### リクエスト

**エンドポイント**: `POST /api/ai/detect-escalation-risk`

**ボディ**:
```json
{
  "ticket_id": "ticket-uuid"
}
```

---

### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "risk_level": "high",
    "risk_score": 0.87,
    "risk_factors": [
      {
        "factor": "sla_approaching",
        "description": "SLA期限まで残り30分です。",
        "severity": 0.9
      },
      {
        "factor": "multiple_reassignments",
        "description": "担当者が3回変更されており、対応が滞っています。",
        "severity": 0.7
      },
      {
        "factor": "low_comment_activity",
        "description": "過去6時間コメントがなく、進捗が見えません。",
        "severity": 0.6
      }
    ],
    "sla_breach_prediction": {
      "likely_to_breach": true,
      "estimated_breach_time": "2025-01-15T14:30:00Z",
      "current_sla_remaining": "25分",
      "breach_probability": 0.92
    },
    "recommended_actions": [
      "即座にManager にエスカレーション",
      "一時回避策の提案を検討",
      "利用者への状況説明コメントを追加",
      "より経験豊富な Agent に再割当"
    ],
    "processing_time_ms": 1200,
    "model_version": "claude-sonnet-4-5-20250929"
  }
}
```

---

### サンプルコード

**TypeScript（バックエンド）**:
```typescript
async function checkEscalationRisk(ticketId: string) {
  const result = await AIEscalationService.detectRisk(ticketId);

  if (result.risk_level === 'high' || result.risk_level === 'critical') {
    // Slack 通知
    await sendSlackAlert(
      `⚠️ エスカレーションリスク検出: ${result.risk_score}`,
      result.recommended_actions
    );

    // Manager に自動通知
    await notifyManager(ticketId, result);
  }
}
```

---

## POST /api/ai/generate-report

### 概要

**目的**: AI精度メトリクスの監査レポートを自動生成

**認可**: Manager, Auditor のみ

**削減時間**: 1時間 → 5分

**出力形式**: JSON, CSV, PDF

---

### リクエスト

**エンドポイント**: `POST /api/ai/generate-report`

**ボディ**:
```json
{
  "report_type": "accuracy",
  "start_date": "2025-01-01",
  "end_date": "2025-01-31",
  "format": "json"
}
```

**パラメータ**:

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|---|------|-----------|------|
| `report_type` | string | ✅ | - | `accuracy`, `usage`, `performance`, `cost`, `comprehensive` |
| `start_date` | string | ✅ | - | 集計開始日（ISO 8601: YYYY-MM-DD） |
| `end_date` | string | ✅ | - | 集計終了日（ISO 8601: YYYY-MM-DD） |
| `format` | string | - | `json` | `json`, `csv`, `pdf` |

---

### レスポンス

**成功時（200 OK）- JSON形式:**
```json
{
  "success": true,
  "data": {
    "report_id": "report-uuid",
    "status": "completed",
    "report_type": "accuracy",
    "period": {
      "start": "2025-01-01",
      "end": "2025-01-31",
      "days": 31
    },
    "report_data": {
      "accuracy": {
        "category": {
          "total": 100,
          "accepted": 92,
          "rejected": 5,
          "pending": 3,
          "accuracy": 92.0,
          "avg_confidence": 0.87
        },
        "priority": {
          "total": 100,
          "accepted": 87,
          "rejected": 8,
          "pending": 5,
          "accuracy": 87.0,
          "avg_confidence": 0.84
        },
        "routing": {
          "total": 65,
          "accepted": 62,
          "rejected": 2,
          "pending": 1,
          "accuracy": 95.4,
          "avg_confidence": 0.91
        }
      },
      "trends": {
        "category_accuracy_trend": [
          { "date": "2025-01-01", "accuracy": 88.0 },
          { "date": "2025-01-08", "accuracy": 90.5 },
          { "date": "2025-01-15", "accuracy": 92.0 },
          { "date": "2025-01-22", "accuracy": 93.2 },
          { "date": "2025-01-31", "accuracy": 92.0 }
        ]
      },
      "confidence_distribution": {
        "0.9-1.0": { "count": 45, "accuracy": 97.8 },
        "0.8-0.9": { "count": 32, "accuracy": 90.6 },
        "0.7-0.8": { "count": 18, "accuracy": 83.3 },
        "0.6-0.7": { "count": 5, "accuracy": 60.0 }
      }
    },
    "generated_at": "2025-02-01T10:00:00Z"
  }
}
```

**成功時（200 OK）- CSV/PDF形式:**
```json
{
  "success": true,
  "data": {
    "report_id": "report-uuid",
    "status": "completed",
    "download_url": "/api/reports/report-uuid/download",
    "expires_at": "2025-02-08T10:00:00Z"
  }
}
```

---

## GET /api/ai/metrics

### 概要

**目的**: AI機能のリアルタイムメトリクスを取得

**認可**: Manager, Auditor のみ

---

### リクエスト

**エンドポイント**: `GET /api/ai/metrics?days=30`

**クエリパラメータ**:

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|---|------|-----------|------|
| `days` | number | - | 30 | 集計期間（日数） |

---

### レスポンス

**成功時（200 OK）**:
```json
{
  "success": true,
  "data": {
    "period": {
      "days": 30,
      "start": "2025-01-05T00:00:00Z",
      "end": "2025-02-04T23:59:59Z"
    },
    "accuracy": {
      "category": {
        "total": 100,
        "accepted": 92,
        "rejected": 5,
        "pending": 3,
        "accuracy": 92.0,
        "avgConfidence": 0.8734
      },
      "priority": {
        "total": 100,
        "accepted": 87,
        "rejected": 8,
        "pending": 5,
        "accuracy": 87.0,
        "avgConfidence": 0.8421
      },
      "assignee": {
        "total": 85,
        "accepted": 72,
        "rejected": 10,
        "pending": 3,
        "accuracy": 84.7,
        "avgConfidence": 0.7986
      }
    },
    "operations": {
      "total_operations": 150,
      "by_type": {
        "classification": 100,
        "routing": 35,
        "similarity_search": 15
      },
      "avg_processing_time": 2450,
      "pii_masked_count": 12
    }
  }
}
```

---

## エラーレスポンス

### エラーコード一覧

| HTTPコード | エラーコード | 説明 | 対処法 |
|-----------|------------|------|--------|
| 400 | `VALIDATION_ERROR` | 入力検証エラー | リクエストボディを確認 |
| 401 | `UNAUTHORIZED` | 認証エラー | JWTトークンを確認 |
| 403 | `FORBIDDEN` | 認可エラー | ユーザー権限を確認 |
| 429 | `RATE_LIMIT_EXCEEDED` | レート制限超過 | 時間をおいて再試行 |
| 503 | `AI_DISABLED` | AI機能無効 | `AI_ENABLED=true` を設定 |
| 503 | `AI_API_ERROR` | Claude API エラー | APIキー、モデル設定を確認 |

---

### エラーレスポンス例

**400 Bad Request - 入力検証エラー:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "件名は5文字以上500文字以内で入力してください"
  }
}
```

**429 Too Many Requests - レート制限超過:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "AI機能のリクエスト制限（10回/分）を超えました。あと 45秒待ってから再試行してください。"
  }
}
```

**503 Service Unavailable - AI機能無効:**
```json
{
  "success": false,
  "error": {
    "code": "AI_DISABLED",
    "message": "AI機能は現在無効です。"
  }
}
```

**503 Service Unavailable - Claude API エラー:**
```json
{
  "success": false,
  "error": {
    "code": "AI_API_ERROR",
    "message": "Claude API 認証エラー: APIキーが無効です。環境変数 CLAUDE_API_KEY を確認してください。"
  }
}
```

---

## リクエスト例（全機能）

### cURL

**1. チケット分類:**
```bash
curl -X POST http://localhost:3000/api/ai/classify-ticket \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "subject": "Outlookで添付ファイルが送信できない",
    "description": "5MBのPDFファイルを送信しようとするとエラーになります",
    "requester_id": "user-uuid"
  }'
```

**2. ルーティング判定:**
```bash
curl -X POST http://localhost:3000/api/ai/route-ticket \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "service_request",
    "subject": "Microsoft 365 E5ライセンス追加",
    "description": "新入社員用にE5ライセンスを5つ追加したい",
    "requester_id": "user-uuid"
  }'
```

**3. 類似チケット検索:**
```bash
curl -X POST http://localhost:3000/api/ai/search-similar-tickets \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Outlookで添付ファイルが送信できない",
    "limit": 5
  }'
```

**4. メトリクス取得:**
```bash
curl -X GET "http://localhost:3000/api/ai/metrics?days=30" \
  -H "Authorization: Bearer $TOKEN"
```

---

## 次のステップ

- [05_精度改善ガイド.md](./05_精度改善ガイド.md) - フィードバックループの活用
- [06_トラブルシューティング.md](./06_トラブルシューティング.md) - よくある問題と解決策

---

**最終更新:** 2026年2月
**バージョン:** 1.0.0
