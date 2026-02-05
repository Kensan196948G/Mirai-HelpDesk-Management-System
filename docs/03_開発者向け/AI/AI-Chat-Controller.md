# AI Chat Controller 実装ドキュメント

## 概要

AI Chat Controller (`backend/src/controllers/ai-chat.controller.ts`) は、利用者とAIの対話を通じて問題診断から解決提案、チケット作成までを支援する3フェーズのワークフローを提供します。

## アーキテクチャ

```
┌─────────────────────────────────────────────────────────────┐
│                     フロントエンド                           │
│                     (AIChat.tsx)                            │
└─────────────────────────────────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                  AI Chat Controller                         │
│                  (ai-chat.controller.ts)                    │
├─────────────────────────────────────────────────────────────┤
│  フェーズ1: diagnoseRequest()                                │
│    - 初期問題文から診断質問を生成                              │
│    - Claude APIによる対話的診断                               │
│                                                             │
│  フェーズ2: suggestSolution()                                │
│    - 診断結果から解決策を3つのアプローチで提案                  │
│    - ナレッジベース検索連携                                    │
│                                                             │
│  フェーズ3: createTicketFromChat()                           │
│    - 会話履歴からチケット自動作成                              │
│    - AI分類による推奨値設定                                   │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
┌──────────────┐   ┌──────────────┐   ┌──────────────┐
│ Claude API   │   │ Knowledge    │   │ AI Service   │
│ Client       │   │ Base Search  │   │ (分類)       │
└──────────────┘   └──────────────┘   └──────────────┘
```

## 3つのフェーズ

### フェーズ1: 診断質問生成 (diagnoseRequest)

**エンドポイント**: `POST /api/ai/chat/diagnose`

**目的**: 利用者の初期問題文から、効率的に問題を診断するための質問を2-4個生成します。

#### リクエスト

```json
{
  "initial_problem": "Outlookで大きなファイルを添付して送信しようとすると、エラーが出て送信できません。",
  "conversation_history": [
    {
      "timestamp": "2026-02-05T10:30:15Z",
      "role": "user",
      "content": "Outlookで大きなファイルを添付して送信しようとすると、エラーが出て送信できません。"
    }
  ]
}
```

#### レスポンス

```json
{
  "success": true,
  "data": {
    "questions": [
      {
        "question_id": "q1",
        "question_text": "この問題はいつから発生していますか？",
        "question_type": "symptom",
        "suggested_answers": ["今日から", "昨日から", "1週間以上前から", "不明"],
        "rationale": "発生時期を特定することで、システム変更やアップデートとの関連を確認できます。"
      },
      {
        "question_id": "q2",
        "question_text": "送信しようとしているファイルのサイズを教えてください。",
        "question_type": "error",
        "suggested_answers": null,
        "rationale": "ファイルサイズがExchange Onlineの制限を超えていないか確認します。"
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

#### 質問タイプ

- **symptom**: 症状の詳細（いつから、頻度、影響範囲）
- **environment**: 環境情報（OS、ブラウザ、アプリケーションバージョン）
- **error**: エラー情報（エラーメッセージ、エラーコード）
- **impact**: 影響度（業務への影響、緊急度）
- **previous**: 過去の対応（以前に同じ問題が発生したか、試したこと）

### フェーズ2: 解決提案生成 (suggestSolution)

**エンドポイント**: `POST /api/ai/chat/suggest-solution`

**目的**: 診断結果から、利用者に適した解決策を3つのアプローチで提案します。

#### 3つのアプローチ

1. **Self-Service（自己解決策）**
   - 利用者自身で実施できる具体的な手順
   - ステップバイステップの説明
   - 所要時間の見積もり

2. **Workaround（一時的な回避策）**
   - 根本解決ではないが、業務を継続できる方法
   - 制限事項や注意点の明示

3. **Escalation（エスカレーション経路）**
   - ITサポートへのチケット作成が必要な理由
   - 推奨される type, impact, urgency

#### リクエスト

```json
{
  "conversation_history": [
    {
      "timestamp": "2026-02-05T10:30:15Z",
      "role": "user",
      "content": "Outlookで大きなファイルを添付して送信しようとすると、エラーが出て送信できません。"
    },
    {
      "timestamp": "2026-02-05T10:30:45Z",
      "role": "assistant",
      "content": "この問題はいつから発生していますか？"
    },
    {
      "timestamp": "2026-02-05T10:31:10Z",
      "role": "user",
      "content": "今朝から急にエラーが出るようになりました"
    }
  ],
  "diagnostic_answers": [
    {
      "question_id": "q1",
      "answer": "今朝から急にエラーが出るようになりました"
    },
    {
      "question_id": "q2",
      "answer": "10MBのExcelファイルです"
    }
  ]
}
```

#### レスポンス

```json
{
  "success": true,
  "data": {
    "solutions": [
      {
        "solution_id": "sol-1",
        "approach_type": "self_service",
        "title": "OneDrive for Business経由でファイル共有",
        "steps": [
          {
            "step_number": 1,
            "instruction": "OneDrive for Businessにファイルをアップロードします。",
            "expected_result": "ファイルがクラウドに保存されます。",
            "screenshot_required": false
          },
          {
            "step_number": 2,
            "instruction": "ファイルを右クリックして「リンクの共有」を選択し、受信者のメールアドレスを入力します。",
            "expected_result": "共有リンクが生成され、メールで通知されます。"
          }
        ],
        "linked_articles": ["kb-onedrive-share-001"],
        "estimated_resolution_time": "3-5分",
        "confidence": 0.92,
        "prerequisites": ["OneDrive for Businessのライセンス"],
        "warnings": ["ファイル共有のアクセス権限設定に注意してください"]
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
      }
    ],
    "escalation_recommendation": {
      "should_escalate": false,
      "reason": "利用者自身で実施可能な解決策が複数存在するため、まず自己解決を試行することを推奨します。",
      "suggested_ticket_values": {
        "type": "incident",
        "impact": "individual",
        "urgency": "medium",
        "category_id": null
      }
    },
    "knowledge_articles": [
      {
        "article_id": "kb-onedrive-share-001",
        "title": "OneDrive for Business でファイルを共有する方法",
        "content_preview": "OneDrive for Business を使用すると、大きなファイルを安全に共有できます。..."
      }
    ],
    "processing_time_ms": 2150
  }
}
```

### フェーズ3: チケット作成 (createTicketFromChat)

**エンドポイント**: `POST /api/ai/chat/create-ticket`

**目的**: 会話履歴から適切な件名・詳細説明を生成し、AI分類による推奨値でチケットを作成します。

#### リクエスト

```json
{
  "conversation_history": [
    {
      "timestamp": "2026-02-05T10:30:15Z",
      "role": "user",
      "content": "Outlookで大きなファイルを添付して送信しようとすると、エラーが出て送信できません。"
    },
    {
      "timestamp": "2026-02-05T10:30:45Z",
      "role": "assistant",
      "content": "この問題はいつから発生していますか？"
    },
    {
      "timestamp": "2026-02-05T10:31:10Z",
      "role": "user",
      "content": "今朝から急にエラーが出るようになりました"
    }
  ],
  "diagnostic_answers": [
    {
      "question_id": "q1",
      "answer": "今朝から急にエラーが出るようになりました"
    },
    {
      "question_id": "q2",
      "answer": "10MBのExcelファイルです"
    }
  ],
  "user_confirmed_values": {
    "type": "incident",
    "impact": "individual",
    "urgency": "high"
  }
}
```

#### レスポンス

```json
{
  "success": true,
  "data": {
    "ticket": {
      "ticket_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",
      "ticket_number": "INC-20260205-001",
      "subject": "Outlook - 添付ファイル送信時にサイズ制限エラー",
      "description": "【問題概要】\nOutlookで5MB以上の添付ファイルを送信しようとすると、サイズ制限エラーが表示され送信できません。営業部での顧客向け資料送信に支障が出ています。\n\n【発生状況】\n- いつから: 今朝から\n- 頻度: 常に（5MB以上のファイルで発生）\n- 影響範囲: 個人（田中様のみ）\n\n【診断結果】\n- ファイルサイズ: 10MBのExcelファイル\n- エラーメッセージ: 「ファイルサイズが大きすぎます」\n- Outlook バージョン: Microsoft 365版\n\n【会話履歴】\n[10:30:15] User: Outlookで大きなファイルを添付して送信しようとすると、エラーが出て送信できません。\n[10:30:45] Assistant: この問題はいつから発生していますか？\n[10:31:10] User: 今朝から急にエラーが出るようになりました",
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
          "reasoning": "キーワード「Outlook」「添付ファイル」「サイズ制限」から、Exchange Online の問題と判断しました。"
        }
      },
      "priority": {
        "value": "P3",
        "confidence": 0.88,
        "rationale": {
          "reasoning": "個人の業務に影響があるが、回避策（OneDrive共有）が存在するため P3 と判断しました。"
        }
      }
    },
    "processing_time_ms": 3200
  }
}
```

## 実装の詳細

### PII マスキング

利用者の個人情報（メールアドレス、電話番号、IPアドレス）を自動的にマスキングしてから Claude API に送信します。

```typescript
// PII マスキング適用
const problemMasked = PIIMasking.maskForAI(initial_problem);
const hasPII = problemMasked.hasPII;

if (hasPII) {
  console.log(`🔒 PII検出: ${problemMasked.maskedFields.join(', ')}`);
}
```

### レート制限

ユーザーごとに AI 機能のリクエスト制限（デフォルト: 10回/分）を適用します。

```typescript
// Claude API 呼び出し時に自動的にレート制限チェック
const claudeResponse = await claudeClient.sendPrompt(
  prompt,
  systemPrompt,
  {
    userId: user.user_id, // ← これでレート制限適用
    maxTokens: 2048,
    temperature: 0.4,
  }
);
```

### 監査ログ

すべての AI 操作を `ticket_history` テーブルに記録します。

```typescript
await AIAuditService.logAIOperation({
  operation_type: 'chat_diagnostic',
  user_id: user.user_id,
  ticket_id: ticket_id || undefined,
  input_data: { /* サニタイズ済み入力 */ },
  output_data: { /* 出力サマリ */ },
  processing_time_ms: processingTime,
  model_version: 'claude-sonnet-4-5-20250929',
  pii_masked: hasPII,
  ip_address: req.ip,
  user_agent: req.get('user-agent'),
});
```

### ナレッジベース検索

会話履歴からキーワードを抽出し、PostgreSQL の ILIKE 検索でナレッジ記事を検索します（将来的にはベクトル検索に置き換え予定）。

```typescript
private static async searchKnowledgeBase(
  queryText: string,
  maxResults: number = 3
): Promise<Array<{ article_id: string; title: string; content_preview: string }>> {
  // キーワード抽出
  const keywords = queryText
    .split(/[\s、。]+/)
    .filter((word) => word.length > 2)
    .slice(0, 5);

  // PostgreSQL ILIKE検索
  const result = await query(
    `SELECT article_id, title, content
     FROM knowledge_articles
     WHERE is_published = true
       AND (title ILIKE ANY($1) OR content ILIKE ANY($1))
     ORDER BY updated_at DESC
     LIMIT $2`,
    [keywords.map((kw) => `%${kw}%`), maxResults]
  );

  return result.rows.map((row) => ({
    article_id: row.article_id,
    title: row.title,
    content_preview: row.content.substring(0, 200) + '...',
  }));
}
```

## エラーハンドリング

### レート制限超過

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

### AI機能無効

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

### Claude APIエラー

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

## テスト

テストスクリプトを実行してエンドポイントを検証します。

```bash
# バックエンドサーバーを起動
cd backend
npm run dev

# 別のターミナルでテストスクリプトを実行
node backend/test-ai-chat.js
```

### 期待される出力

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   AI Chat Controller 統合テスト
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

=== ステップ1: ログイン ===
✅ ログイン成功
トークン: eyJhbGciOiJIUzI1NiIsI...

=== フェーズ1: 診断質問生成 ===
✅ 診断質問生成成功
処理時間: 1250ms
質問数: 3件
PII マスキング: なし

生成された質問:
  1. この問題はいつから発生していますか？
     選択肢: 今日から, 昨日から, 1週間以上前から, 不明
     タイプ: symptom
  2. 送信しようとしているファイルのサイズを教えてください。
     タイプ: error

=== フェーズ2: 解決提案生成 ===
✅ 解決提案生成成功
処理時間: 2150ms
提案数: 3件
ナレッジ記事: 1件

生成された解決策:
  1. [self_service] OneDrive for Business経由でファイル共有
     信頼度: 92.0%
     所要時間: 3-5分
     ステップ数: 2

=== フェーズ3: チケット作成 ===
✅ チケット作成成功
処理時間: 3200ms
チケット番号: INC-20260205-001
チケットID: f47ac10b-58cc-4372-a567-0e02b2c3d479
件名: Outlook - 添付ファイル送信時にサイズ制限エラー
優先度: P3

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ✅ 全テスト成功！
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## 設定

### 環境変数

```env
# AI機能
AI_ENABLED=true
CLAUDE_API_KEY=sk-ant-api03-...
CLAUDE_MODEL=claude-sonnet-4-5-20250929
CLAUDE_MAX_TOKENS=8192
CLAUDE_TEMPERATURE=0.3

# レート制限
AI_RATE_LIMIT_PER_USER=10
AI_CACHE_TTL=3600

# PII マスキング
ENABLE_PII_MASKING=true
```

## パフォーマンス最適化

### キャッシュ戦略

- 診断質問: キャッシュなし（毎回会話履歴が変化するため）
- 解決提案: キャッシュなし（ナレッジベース検索結果が変化するため）
- チケット作成: キャッシュなし（一意の操作のため）

### 処理時間の目安

- **フェーズ1（診断質問）**: 1-2秒
- **フェーズ2（解決提案）**: 2-3秒（ナレッジベース検索含む）
- **フェーズ3（チケット作成）**: 3-4秒（AI分類 + チケット作成）

## セキュリティ考慮事項

### 認証・認可

- すべてのエンドポイントで JWT 認証が必須
- `Requester` 以上のロールが必要

### PII保護

- Claude API への送信前に自動マスキング
- ログへの記録時も PII を除外

### レート制限

- ユーザーごとに 10回/分 の制限（Redis ベース）
- 悪意のある大量リクエストを防止

## トラブルシューティング

### Claude API が応答しない

```bash
# Claude API キーの確認
echo $CLAUDE_API_KEY

# Redis の確認
redis-cli ping
```

### ナレッジベース検索が動作しない

```sql
-- knowledge_articles テーブルの確認
SELECT COUNT(*) FROM knowledge_articles WHERE is_published = true;
```

### レート制限が厳しすぎる

```env
# .env で制限を緩和
AI_RATE_LIMIT_PER_USER=20  # デフォルト: 10
```

## 今後の拡張

- [ ] ベクトル検索（PostgreSQL pgvector）によるナレッジベース検索の高度化
- [ ] 多言語対応（英語/日本語の自動判定）
- [ ] 画像アップロード対応（スクリーンショット解析）
- [ ] 音声入力対応（Speech-to-Text）
- [ ] チャット履歴の永続化（セッション管理）
