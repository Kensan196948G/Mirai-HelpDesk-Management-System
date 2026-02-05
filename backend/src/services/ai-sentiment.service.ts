/**
 * AI Sentiment Analysis Service
 *
 * 感情分析と顧客満足度予測機能
 */

import { getClaudeAPIClient } from './claude-api.client';
import { claudeConfig } from '../config/claude.config';
import { query } from '../config/database';

export interface SentimentAnalysisInput {
  ticket_id: string;
  comment_ids?: string[];
}

export interface SentimentScore {
  score: number; // -1.0（非常にネガティブ）〜 1.0（非常にポジティブ）
  label: 'very_negative' | 'negative' | 'neutral' | 'positive' | 'very_positive';
  confidence: number;
}

export interface CommentSentiment {
  comment_id: string;
  body: string;
  sentiment: SentimentScore;
  key_phrases: string[];
  concerns: string[];
}

export interface SatisfactionPrediction {
  predicted_satisfaction: number; // 1.0-5.0
  satisfaction_level: 'very_dissatisfied' | 'dissatisfied' | 'neutral' | 'satisfied' | 'very_satisfied';
  confidence: number;
  risk_factors: string[];
  improvement_suggestions: string[];
}

export interface SentimentAnalysisResult {
  ticket_id: string;
  overall_sentiment: SentimentScore;
  comment_sentiments: CommentSentiment[];
  satisfaction_prediction: SatisfactionPrediction;
  alert_required: boolean;
  processing_time_ms: number;
  model_version: string;
}

export class AISentimentService {
  /**
   * チケットコメントの感情分析を実行
   */
  static async analyzeSentiment(input: SentimentAnalysisInput): Promise<SentimentAnalysisResult> {
    const startTime = Date.now();
    const claudeClient = getClaudeAPIClient();

    // 1. チケット情報を取得
    const ticketResult = await query(
      `SELECT ticket_id, ticket_number, subject, status, priority
       FROM tickets
       WHERE ticket_id = $1`,
      [input.ticket_id]
    );

    if (ticketResult.rows.length === 0) {
      throw new Error(`チケット ${input.ticket_id} が見つかりません`);
    }

    const ticket = ticketResult.rows[0];

    // 2. コメントを取得
    const commentsQuery = input.comment_ids
      ? `SELECT comment_id, body, author_name, visibility, created_at
         FROM ticket_comments
         WHERE comment_id = ANY($1)
         ORDER BY created_at DESC`
      : `SELECT comment_id, body, author_name, visibility, created_at
         FROM ticket_comments
         WHERE ticket_id = $1
           AND visibility = 'public'
         ORDER BY created_at DESC
         LIMIT 10`;

    const commentsResult = await query(
      commentsQuery,
      input.comment_ids ? [input.comment_ids] : [input.ticket_id]
    );

    const comments = commentsResult.rows;

    // 3. プロンプト生成
    const commentsText = comments
      .map(
        (c, i) => `
# コメント${i + 1}
作成者: ${c.author_name}
日時: ${c.created_at}
内容: ${c.body}
`
      )
      .join('\n\n');

    const prompt = `あなたは顧客満足度分析のエキスパートです。
以下のチケットとコメントを分析し、感情と満足度を評価してください。

# チケット情報
チケット番号: ${ticket.ticket_number}
件名: ${ticket.subject}
ステータス: ${ticket.status}
優先度: ${ticket.priority}

# コメント履歴（${comments.length}件）
${commentsText}

# タスク
各コメントと全体の感情を分析し、以下を出力してください：

1. **overall_sentiment**: 全体的な感情スコア
   - score: -1.0（非常にネガティブ）〜 1.0（非常にポジティブ）
   - label: very_negative / negative / neutral / positive / very_positive
   - confidence: 信頼度（0.0-1.0）

2. **comment_sentiments**: 各コメントの感情分析
   - sentiment: 感情スコア
   - key_phrases: 重要なフレーズ
   - concerns: 懸念事項（ネガティブな場合）

3. **satisfaction_prediction**: 満足度予測
   - predicted_satisfaction: 予測満足度（1.0-5.0）
   - satisfaction_level: very_dissatisfied / dissatisfied / neutral / satisfied / very_satisfied
   - confidence: 信頼度
   - risk_factors: 不満要因
   - improvement_suggestions: 改善提案

# 感情スコアの定義
- 1.0: 非常に満足、感謝の言葉
- 0.5: やや満足、肯定的
- 0.0: 中立、事務的
- -0.5: やや不満、批判的
- -1.0: 非常に不満、クレーム

# 出力形式
\`\`\`json
{
  "overall_sentiment": {
    "score": -0.6,
    "label": "negative",
    "confidence": 0.85
  },
  "comment_sentiments": [
    {
      "comment_id": "comment-uuid",
      "sentiment": {
        "score": -0.7,
        "label": "negative",
        "confidence": 0.88
      },
      "key_phrases": ["全く解決しない", "何度も問い合わせ", "時間がかかりすぎ"],
      "concerns": ["長時間の待機", "繰り返しの説明", "進捗が見えない"]
    }
  ],
  "satisfaction_prediction": {
    "predicted_satisfaction": 2.5,
    "satisfaction_level": "dissatisfied",
    "confidence": 0.82,
    "risk_factors": [
      "複数回の問い合わせにも関わらず解決していない",
      "対応時間が長すぎる",
      "進捗が見えず不安を感じている"
    ],
    "improvement_suggestions": [
      "即座にManagerにエスカレーション",
      "進捗を明確に伝えるコメントを追加",
      "一時回避策を提案"
    ]
  }
}
\`\`\``;

    // 4. Claude API 呼び出し
    const claudeResponse = await claudeClient.sendPrompt(prompt, '', {
      maxTokens: 3072,
      temperature: 0.3,
    });

    // 5. レスポンスをパース
    const sentimentData = this.parseSentimentResponse(claudeResponse);

    const processingTime = Date.now() - startTime;

    // 6. アラートが必要かチェック
    const alertRequired =
      sentimentData.overall_sentiment.score < -0.5 || // 感情スコアが低い
      sentimentData.satisfaction_prediction.predicted_satisfaction < 3.0; // 満足度が低い

    // 7. アラート送信
    if (alertRequired) {
      await this.sendSatisfactionAlert(ticket.ticket_number, sentimentData);
    }

    return {
      ticket_id: input.ticket_id,
      overall_sentiment: sentimentData.overall_sentiment,
      comment_sentiments: sentimentData.comment_sentiments,
      satisfaction_prediction: sentimentData.satisfaction_prediction,
      alert_required: alertRequired,
      processing_time_ms: processingTime,
      model_version: claudeConfig.model,
    };
  }

  /**
   * Claude APIレスポンスをパース
   */
  private static parseSentimentResponse(response: string): {
    overall_sentiment: SentimentScore;
    comment_sentiments: CommentSentiment[];
    satisfaction_prediction: SatisfactionPrediction;
  } {
    try {
      let jsonText = response;
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonText);

      return {
        overall_sentiment: parsed.overall_sentiment,
        comment_sentiments: parsed.comment_sentiments || [],
        satisfaction_prediction: parsed.satisfaction_prediction,
      };
    } catch (error) {
      console.error('❌ 感情分析レスポンスのパース失敗:', response);
      throw new Error('感情分析結果の解析に失敗しました。');
    }
  }

  /**
   * 満足度低下アラートを送信
   */
  private static async sendSatisfactionAlert(
    ticketNumber: string,
    sentimentData: any
  ): Promise<void> {
    console.log(`⚠️ 満足度低下アラート: ${ticketNumber}`);

    // Manager への通知
    await query(
      `INSERT INTO notifications (user_id, type, title, body, created_at)
       SELECT u.user_id, 'satisfaction_alert', $1, $2, CURRENT_TIMESTAMP
       FROM users u
       WHERE u.role = 'manager'`,
      [
        `満足度低下アラート: ${ticketNumber}`,
        `感情スコア: ${sentimentData.overall_sentiment.score}
予測満足度: ${sentimentData.satisfaction_prediction.predicted_satisfaction}/5.0

リスク要因:
${sentimentData.satisfaction_prediction.risk_factors.join('\n')}

改善提案:
${sentimentData.satisfaction_prediction.improvement_suggestions.join('\n')}`,
      ]
    );
  }
}
