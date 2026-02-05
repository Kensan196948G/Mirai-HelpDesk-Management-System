# AI Chat API クイックリファレンス

## 目次

- [認証](#認証)
- [エンドポイント一覧](#エンドポイント一覧)
- [リクエスト/レスポンス例](#リクエストレスポンス例)
- [エラーコード](#エラーコード)

## 認証

すべてのエンドポイントで JWT トークンが必要です。

```bash
# 1. ログイン
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "yourpassword"
  }'

# レスポンス
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": { ... }
  }
}

# 2. 取得したトークンをAuthorizationヘッダーに設定
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

## エンドポイント一覧

| エンドポイント | メソッド | 説明 | 認可 |
|--------------|---------|------|------|
| `/api/ai/chat/diagnose` | POST | フェーズ1: 診断質問生成 | Requester以上 |
| `/api/ai/chat/suggest-solution` | POST | フェーズ2: 解決提案生成 | Requester以上 |
| `/api/ai/chat/create-ticket` | POST | フェーズ3: チケット作成 | Requester以上 |

## リクエスト/レスポンス例

### フェーズ1: 診断質問生成

```bash
curl -X POST http://localhost:3000/api/ai/chat/diagnose \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "initial_problem": "Outlookで大きなファイルを送信できません",
    "conversation_history": []
  }'
```

<details>
<summary>レスポンス例</summary>

```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "question_id": "q1",
        "question_text": "この問題はいつから発生していますか？",
        "question_type": "symptom",
        "suggested_answers": ["今日から", "昨日から", "1週間以上前から"],
        "rationale": "発生時期を特定することで、システム変更との関連を確認できます。"
      },
      {
        "question_id": "q2",
        "question_text": "ファイルのサイズを教えてください。",
        "question_type": "error",
        "suggested_answers": null,
        "rationale": "ファイルサイズ制限を超えていないか確認します。"
      }
    ],
    "analysis": {
      "detected_category": "M365 > Exchange Online",
      "severity_estimate": "medium",
      "requires_immediate_escalation": false
    },
    "processing_time_ms": 1250,
    "pii_masked": false
  }
}
```

</details>

### フェーズ2: 解決提案生成

```bash
curl -X POST http://localhost:3000/api/ai/chat/suggest-solution \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "conversation_history": [
      {
        "timestamp": "2026-02-05T10:30:15Z",
        "role": "user",
        "content": "Outlookで大きなファイルを送信できません"
      },
      {
        "timestamp": "2026-02-05T10:30:45Z",
        "role": "assistant",
        "content": "この問題はいつから発生していますか？"
      },
      {
        "timestamp": "2026-02-05T10:31:10Z",
        "role": "user",
        "content": "今朝からです"
      }
    ],
    "diagnostic_answers": [
      {
        "question_id": "q1",
        "answer": "今朝からです"
      },
      {
        "question_id": "q2",
        "answer": "10MBのExcelファイルです"
      }
    ]
  }'
```

<details>
<summary>レスポンス例</summary>

```json
{
  "success": true,
  "data": {
    "solutions": [
      {
        "solution_id": "sol-1",
        "approach_type": "self_service",
        "title": "OneDrive経由でファイル共有",
        "steps": [
          {
            "step_number": 1,
            "instruction": "OneDrive for Businessにファイルをアップロードします。",
            "expected_result": "ファイルがクラウドに保存されます。",
            "screenshot_required": false
          },
          {
            "step_number": 2,
            "instruction": "ファイルを右クリックして「リンクの共有」を選択します。",
            "expected_result": "共有リンクが生成されます。"
          }
        ],
        "linked_articles": ["kb-onedrive-001"],
        "estimated_resolution_time": "3-5分",
        "confidence": 0.92,
        "prerequisites": ["OneDrive for Businessのライセンス"],
        "warnings": ["アクセス権限設定に注意してください"]
      },
      {
        "solution_id": "sol-2",
        "approach_type": "workaround",
        "title": "ファイルを圧縮して送信",
        "steps": [
          {
            "step_number": 1,
            "instruction": "ファイルを右クリックして「送る」→「圧縮(zip形式)フォルダー」を選択します。"
          }
        ],
        "linked_articles": [],
        "estimated_resolution_time": "2分",
        "confidence": 0.75,
        "prerequisites": null,
        "warnings": ["圧縮後も5MB以下にならない場合は効果がありません"]
      },
      {
        "solution_id": "sol-3",
        "approach_type": "escalation",
        "title": "ITサポートへエスカレーション",
        "steps": [
          {
            "step_number": 1,
            "instruction": "チケットを作成します。"
          }
        ],
        "linked_articles": [],
        "estimated_resolution_time": "エージェント対応による",
        "confidence": 1.0,
        "prerequisites": null,
        "warnings": null
      }
    ],
    "escalation_recommendation": {
      "should_escalate": false,
      "reason": "利用者自身で実施可能な解決策が複数存在します。",
      "suggested_ticket_values": {
        "type": "incident",
        "impact": "individual",
        "urgency": "medium",
        "category_id": null
      }
    },
    "knowledge_articles": [
      {
        "article_id": "kb-onedrive-001",
        "title": "OneDrive for Business でファイルを共有する方法",
        "content_preview": "OneDrive for Business を使用すると..."
      }
    ],
    "processing_time_ms": 2150
  }
}
```

</details>

### フェーズ3: チケット作成

```bash
curl -X POST http://localhost:3000/api/ai/chat/create-ticket \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "conversation_history": [
      {
        "timestamp": "2026-02-05T10:30:15Z",
        "role": "user",
        "content": "Outlookで大きなファイルを送信できません"
      },
      {
        "timestamp": "2026-02-05T10:30:45Z",
        "role": "assistant",
        "content": "この問題はいつから発生していますか？"
      },
      {
        "timestamp": "2026-02-05T10:31:10Z",
        "role": "user",
        "content": "今朝からです"
      }
    ],
    "diagnostic_answers": [
      {
        "question_id": "q1",
        "answer": "今朝からです"
      }
    ],
    "user_confirmed_values": {
      "type": "incident",
      "impact": "individual",
      "urgency": "high"
    }
  }'
```

<details>
<summary>レスポンス例</summary>

```json
{
  "success": true,
  "data": {
    "ticket": {
      "ticket_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "ticket_number": "INC-20260205-001",
      "subject": "Outlook - 添付ファイル送信時にサイズ制限エラー",
      "description": "【問題概要】\nOutlookで5MB以上の添付ファイルを送信しようとすると、サイズ制限エラーが表示され送信できません。\n\n【発生状況】\n- いつから: 今朝から\n- 頻度: 常に（5MB以上のファイルで発生）\n- 影響範囲: 個人\n\n【診断結果】\n- ファイルサイズ: 10MBのExcelファイル\n\n【会話履歴】\n[10:30:15] User: Outlookで大きなファイルを送信できません\n[10:30:45] Assistant: この問題はいつから発生していますか？\n[10:31:10] User: 今朝からです",
      "type": "incident",
      "status": "new",
      "priority": "P3",
      "impact": "individual",
      "urgency": "high",
      "requester_id": "user-uuid",
      "category_id": "m365-exchange-uuid",
      "created_at": "2026-02-05T10:35:00Z"
    },
    "ai_classification": {
      "category": {
        "value": "m365-exchange-uuid",
        "label": "M365 > Exchange Online",
        "confidence": 0.95,
        "rationale": {
          "reasoning": "キーワード「Outlook」「添付ファイル」から判断しました。"
        }
      },
      "priority": {
        "value": "P3",
        "confidence": 0.88,
        "rationale": {
          "reasoning": "個人の業務に影響があるため P3 と判断しました。"
        }
      }
    },
    "processing_time_ms": 3200
  }
}
```

</details>

## エラーコード

### 400 Bad Request - 入力検証エラー

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "初期問題内容は必須です。",
    "statusCode": 400
  }
}
```

**原因**: 必須フィールドが不足している、または形式が不正

**対処**: リクエストボディを確認し、必須フィールドを追加

### 401 Unauthorized - 認証エラー

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "No token provided",
    "statusCode": 401
  }
}
```

**原因**: JWT トークンが未設定または無効

**対処**: `/api/auth/login` でログインし、トークンを取得

### 429 Too Many Requests - レート制限超過

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "AI機能のリクエスト制限（10回/分）を超えました。あと 45 秒待ってから再試行してください。",
    "statusCode": 429
  }
}
```

**原因**: 1分間に10回以上のリクエストを送信

**対処**: 指定された秒数待ってから再試行

### 503 Service Unavailable - AI機能無効

```json
{
  "success": false,
  "error": {
    "code": "AI_DISABLED",
    "message": "AI機能は現在無効です。",
    "statusCode": 503
  }
}
```

**原因**: 環境変数 `AI_ENABLED=false` が設定されている

**対処**: システム管理者に連絡

### 503 Service Unavailable - Claude API エラー

```json
{
  "success": false,
  "error": {
    "code": "AI_API_ERROR",
    "message": "Claude API レート制限エラー: しばらく待ってから再試行してください。",
    "statusCode": 503
  }
}
```

**原因**: Claude API のレート制限または障害

**対処**: 時間をおいて再試行

## TypeScript型定義

```typescript
// リクエスト型
interface ConversationMessage {
  timestamp: string;
  role: 'user' | 'assistant';
  content: string;
}

interface DiagnosticAnswer {
  question_id: string;
  answer: string;
}

interface UserConfirmedValues {
  type?: 'incident' | 'service_request' | 'change';
  impact?: 'individual' | 'department' | 'company_wide' | 'external';
  urgency?: 'low' | 'medium' | 'high' | 'immediate';
  category_id?: string;
}

// レスポンス型
interface DiagnosticQuestion {
  question_id: string;
  question_text: string;
  question_type: 'symptom' | 'environment' | 'error' | 'impact' | 'previous';
  suggested_answers: string[] | null;
  rationale: string;
}

interface Solution {
  solution_id: string;
  approach_type: 'self_service' | 'workaround' | 'escalation';
  title: string;
  steps: Array<{
    step_number: number;
    instruction: string;
    expected_result?: string;
    screenshot_required?: boolean;
    command?: string;
  }>;
  linked_articles: string[];
  estimated_resolution_time: string;
  confidence: number;
  prerequisites?: string[] | null;
  warnings?: string[] | null;
}
```

## JavaScript SDK サンプル

```javascript
class AIChatClient {
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl;
    this.token = token;
  }

  async diagnose(initialProblem, conversationHistory = []) {
    const response = await fetch(`${this.baseUrl}/api/ai/chat/diagnose`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        initial_problem: initialProblem,
        conversation_history: conversationHistory,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Diagnose failed');
    }

    return await response.json();
  }

  async suggestSolution(conversationHistory, diagnosticAnswers) {
    const response = await fetch(`${this.baseUrl}/api/ai/chat/suggest-solution`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        conversation_history: conversationHistory,
        diagnostic_answers: diagnosticAnswers,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Suggest solution failed');
    }

    return await response.json();
  }

  async createTicket(conversationHistory, diagnosticAnswers, userConfirmedValues) {
    const response = await fetch(`${this.baseUrl}/api/ai/chat/create-ticket`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`,
      },
      body: JSON.stringify({
        conversation_history: conversationHistory,
        diagnostic_answers: diagnosticAnswers,
        user_confirmed_values: userConfirmedValues,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Create ticket failed');
    }

    return await response.json();
  }
}

// 使用例
const client = new AIChatClient('http://localhost:3000', token);

// フェーズ1
const diagnoseResult = await client.diagnose(
  'Outlookで大きなファイルを送信できません'
);

// フェーズ2
const solutionResult = await client.suggestSolution(
  conversationHistory,
  diagnosticAnswers
);

// フェーズ3
const ticketResult = await client.createTicket(
  conversationHistory,
  diagnosticAnswers,
  { type: 'incident', impact: 'individual', urgency: 'high' }
);
```

## Postman コレクション

<details>
<summary>Postman コレクションをインポート</summary>

```json
{
  "info": {
    "name": "AI Chat API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Login",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"email\": \"admin@example.com\",\n  \"password\": \"Admin123!\"\n}"
        },
        "url": {
          "raw": "http://localhost:3000/api/auth/login",
          "host": ["http://localhost:3000"],
          "path": ["api", "auth", "login"]
        }
      }
    },
    {
      "name": "AI Chat - Diagnose",
      "request": {
        "method": "POST",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          },
          {
            "key": "Authorization",
            "value": "Bearer {{token}}"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\n  \"initial_problem\": \"Outlookで大きなファイルを送信できません\",\n  \"conversation_history\": []\n}"
        },
        "url": {
          "raw": "http://localhost:3000/api/ai/chat/diagnose",
          "host": ["http://localhost:3000"],
          "path": ["api", "ai", "chat", "diagnose"]
        }
      }
    }
  ]
}
```

</details>

## ベストプラクティス

### 会話履歴の管理

```javascript
// フロントエンドで会話履歴を保持
const [conversationHistory, setConversationHistory] = useState([]);

// ユーザーメッセージ追加
const addUserMessage = (content) => {
  setConversationHistory([
    ...conversationHistory,
    {
      timestamp: new Date().toISOString(),
      role: 'user',
      content,
    },
  ]);
};

// アシスタントメッセージ追加
const addAssistantMessage = (content) => {
  setConversationHistory([
    ...conversationHistory,
    {
      timestamp: new Date().toISOString(),
      role: 'assistant',
      content,
    },
  ]);
};
```

### エラーハンドリング

```javascript
try {
  const result = await client.diagnose(initialProblem);
  // 成功時の処理
} catch (error) {
  if (error.message.includes('リクエスト制限')) {
    // レート制限エラー
    alert('しばらく待ってから再試行してください。');
  } else if (error.message.includes('AI機能は現在無効')) {
    // AI機能無効
    alert('AI機能は現在ご利用いただけません。');
  } else {
    // その他のエラー
    console.error(error);
    alert('エラーが発生しました。');
  }
}
```

### レート制限対策

```javascript
// デバウンス処理
import { debounce } from 'lodash';

const debouncedDiagnose = debounce(async (problem) => {
  const result = await client.diagnose(problem);
  // 処理
}, 1000); // 1秒間隔
```
