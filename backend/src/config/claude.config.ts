/**
 * Claude API 設定
 *
 * Anthropic Claude API の接続設定と定数を管理
 */

import dotenv from 'dotenv';

dotenv.config();

export interface ClaudeConfig {
  apiKey: string;
  apiVersion: string;
  model: string;
  maxTokens: number;
  temperature: number;
  timeout: number;
}

export const claudeConfig: ClaudeConfig = {
  apiKey: process.env.CLAUDE_API_KEY || '',
  apiVersion: process.env.CLAUDE_API_VERSION || '2023-06-01',
  model: process.env.CLAUDE_MODEL || 'claude-sonnet-4-5-20250929',
  maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS || '8192', 10),
  temperature: parseFloat(process.env.CLAUDE_TEMPERATURE || '0.3'),
  timeout: 30000, // 30秒
};

// APIキー検証
if (!claudeConfig.apiKey) {
  console.warn(
    '⚠️  CLAUDE_API_KEY が設定されていません。AI機能は無効です。'
  );
}

// AI機能制御
export const aiFeatureConfig = {
  enabled: process.env.AI_ENABLED === 'true',
  rateLimitPerUser: parseInt(process.env.AI_RATE_LIMIT_PER_USER || '10', 10),
  cacheTTL: parseInt(process.env.AI_CACHE_TTL || '3600', 10), // 秒
};

// プロンプトテンプレート（日本語最適化）
export const promptTemplates = {
  ticketClassification: `あなたは社内ITヘルプデスクの経験豊富なエージェントです。
以下のチケット内容を分析し、適切な分類を提案してください。

# チケット内容
件名: {subject}
詳細: {description}

# 利用可能なカテゴリ
{categories}

# 過去の類似チケット（参考）
{similar_tickets}

# タスク
以下の項目を予測し、JSON形式で回答してください：

1. **category_id**: 最も適切なカテゴリのUUID
2. **priority**: P1（最高）からP4（最低）の優先度
3. **impact**: individual（個人）/ department（部署）/ company_wide（全社）/ external（対外影響）
4. **urgency**: low（低）/ medium（中）/ high（高）/ immediate（即時）
5. **suggested_assignee_id**: 推奨担当者のUUID（適切な専門知識を持つ人）
6. **confidence_score**: 各予測の信頼度（0.0-1.0）
7. **reasoning**: なぜその判断に至ったかの説明（日本語、簡潔に）

# 出力形式（必ずこの形式で回答してください）
\`\`\`json
{
  "category": {
    "value": "category-uuid-here",
    "confidence": 0.92,
    "reasoning": "キーワード「Outlook」「添付ファイル」から、Exchange Online の問題と判断しました。"
  },
  "priority": {
    "value": "P3",
    "confidence": 0.85,
    "reasoning": "個人の業務に影響があるが、回避策が存在するため P3 と判断しました。"
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
    "value": "assignee-uuid-here",
    "confidence": 0.78,
    "reasoning": "Exchange Online 設定は M365 Operator の担当領域です。"
  }
}
\`\`\`

**重要**: JSON以外の説明文は不要です。必ず上記フォーマットの JSON のみを返してください。`,

  knowledgeSearch: `あなたは社内ITヘルプデスクのナレッジベース検索エンジンです。

# 検索クエリ
{query}

# ナレッジベース（全文）
{knowledge_articles}

# タスク
検索クエリに最も関連性の高いナレッジ記事を特定し、関連度スコアを付けて回答してください。

# 出力形式
\`\`\`json
{
  "results": [
    {
      "article_id": "article-uuid-1",
      "relevance_score": 0.96,
      "matched_keywords": ["Outlook", "添付ファイル", "サイズ制限"],
      "snippet": "...記事の関連箇所を抜粋..."
    }
  ]
}
\`\`\``,

  answerSuggestion: `あなたは社内ITヘルプデスクの経験豊富なエージェントです。
以下のチケットに対する回答候補を生成してください。

# チケット情報
件名: {subject}
詳細: {description}
カテゴリ: {category}
ステータス: {status}

# コメント履歴
{comments}

# 関連ナレッジ記事
{related_knowledge}

# タスク
利用者に送信する回答文を3つ提案してください。それぞれ異なるアプローチ（詳細説明 vs 簡潔手順 vs 代替策）で作成してください。

# 出力形式
\`\`\`json
{
  "suggestions": [
    {
      "content": "回答文（日本語、丁寧語）",
      "approach": "detailed_explanation",
      "confidence": 0.94,
      "linked_articles": ["kb-uuid-1", "kb-uuid-2"]
    }
  ]
}
\`\`\``,

  serviceRequestRouting: `あなたは社内ITヘルプデスクの経験豊富なルーティングスペシャリストです。
以下のチケット情報を分析し、適切な担当者と承認フローを判定してください。

# チケット情報
種別: {type}
件名: {subject}
詳細: {description}
カテゴリ: {category}

# 利用可能な担当者（役割別）
{available_assignees}

# 承認ルール
- ライセンス変更: Manager承認必須
- 権限付与（管理者権限）: Manager承認必須
- 特権アカウント操作: Manager承認必須
- 通常のサービス要求: Agent対応可能（承認不要）

# M365操作テンプレート
{m365_templates}

# タスク
以下を判定し、JSON形式で回答してください：

1. **requires_approval**: この要求に承認が必要か（true/false）
2. **approval_reason**: 承認が必要な理由（承認必要時のみ）
3. **suggested_approver_id**: 推奨承認者のUUID（承認必要時のみ）
4. **suggested_assignee_id**: 推奨担当者のUUID
5. **confidence_score**: 判定の信頼度（0.0-1.0）
6. **reasoning**: 判断根拠（日本語、簡潔に）
7. **matched_rules**: 適用したルール名の配列

# 出力形式
\`\`\`json
{
  "requires_approval": true,
  "approval_reason": "Microsoft 365ライセンス変更は財務影響があるため、Manager承認が必要です。",
  "suggested_approver": {
    "value": "approver-uuid",
    "confidence": 0.95,
    "reasoning": "IT Manager は全ライセンス変更の承認権限を持っています。"
  },
  "suggested_assignee": {
    "value": "assignee-uuid",
    "confidence": 0.92,
    "reasoning": "M365 Operator は Microsoft 365 の操作経験が豊富です。"
  },
  "rationale": {
    "reasoning": "ライセンス変更は財務影響とセキュリティリスクを伴うため、Manager の承認が必要です。",
    "matched_rules": ["RULE_LICENSE_CHANGE", "RULE_M365_OPERATOR"]
  }
}
\`\`\``,

  escalationRiskDetection: `あなたは社内ITヘルプデスクのエスカレーション予測エキスパートです。
以下のチケット情報を分析し、エスカレーションリスクを評価してください。

# チケット情報
作成日時: {created_at}
経過時間: {elapsed_time}
ステータス: {status}
優先度: {priority}
SLA残り時間: {sla_remaining}
コメント数: {comment_count}
担当者変更回数: {reassignment_count}

# コメント履歴（最新5件）
{recent_comments}

# タスク
以下を評価し、JSON形式で回答してください：

1. **risk_level**: low / medium / high / critical
2. **risk_score**: 0.0-1.0
3. **risk_factors**: リスク要因の配列
4. **sla_breach_prediction**: SLA違反予測
5. **recommended_actions**: 推奨アクション

# 出力形式
\`\`\`json
{
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
    }
  ],
  "sla_breach_prediction": {
    "likely_to_breach": true,
    "estimated_breach_time": "2025-01-15T14:30:00Z",
    "current_sla_remaining": "25分"
  },
  "recommended_actions": [
    "即座にManager にエスカレーション",
    "一時回避策の提案を検討",
    "利用者への状況説明コメントを追加"
  ]
}
\`\`\``,
};
