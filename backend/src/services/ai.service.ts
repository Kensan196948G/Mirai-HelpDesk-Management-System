/**
 * AI Service
 *
 * Claude APIを使用したチケット分類・提案・要約機能
 */

import { getClaudeAPIClient } from './claude-api.client';
import { AIPredictionModel, CreateAIPredictionData, PredictionType } from '../models/ai-prediction.model';
import { PIIMasking } from '../utils/pii-masking';
import { claudeConfig, promptTemplates } from '../config/claude.config';
import { query } from '../config/database';
import { VectorSearchService } from './vector-search.service';
import { logger } from '../utils/logger';

export interface TicketClassificationInput {
  subject: string;
  description: string;
  requester_id: string;
  ticket_id?: string;
}

export interface ClassificationPrediction {
  value: string;
  label?: string;
  confidence: number;
  rationale: {
    reasoning: string;
    keywords?: string[];
    similar_tickets?: string[];
  };
}

export interface TicketClassificationResult {
  predictions: {
    category?: ClassificationPrediction;
    priority?: ClassificationPrediction;
    impact?: ClassificationPrediction;
    urgency?: ClassificationPrediction;
    assignee?: ClassificationPrediction;
  };
  processing_time_ms: number;
  model_version: string;
  pii_masked: boolean;
}

export class AIService {
  /**
   * チケット内容からAI分類を実行
   */
  static async classifyTicket(
    input: TicketClassificationInput
  ): Promise<TicketClassificationResult> {
    const startTime = Date.now();
    const claudeClient = getClaudeAPIClient();

    // 1. PII マスキング
    const subjectMasked = PIIMasking.maskForAI(input.subject);
    const descriptionMasked = PIIMasking.maskForAI(input.description);
    const hasPII = subjectMasked.hasPII || descriptionMasked.hasPII;

    if (hasPII) {
      logger.info(`🔒 PII検出: ${[...subjectMasked.maskedFields, ...descriptionMasked.maskedFields].join(', ')}`);
    }

    // 2. カテゴリ一覧を取得
    const categoriesResult = await query(
      `SELECT category_id, name, path, description
       FROM categories
       WHERE is_active = true
       ORDER BY path`
    );

    const categoriesText = categoriesResult.rows
      .map(
        (cat) =>
          `- ID: ${cat.category_id}\n  名前: ${cat.name}\n  パス: ${cat.path}\n  説明: ${cat.description || ''}`
      )
      .join('\n\n');

    // 3. 類似チケット検索（ベクトル検索: pgvector コサイン類似度）
    let similarTicketsText = 'なし';
    try {
      const similarTickets = await VectorSearchService.findSimilarTickets(
        `${input.subject} ${input.description.substring(0, 500)}`,
        {
          limit: 5,
          threshold: 0.3,
          statusFilter: ['resolved', 'closed'],
        }
      );

      if (similarTickets.length > 0) {
        similarTicketsText = similarTickets
          .map(
            (ticket) =>
              `- ${ticket.ticket_number}: ${ticket.subject} (カテゴリ: ${ticket.category_name}, 優先度: ${ticket.priority}, 類似度: ${(ticket.similarity_score * 100).toFixed(1)}%)`
          )
          .join('\n');
      }
    } catch (vectorError: any) {
      // ベクトル検索失敗時はキーワードマッチにフォールバック
      logger.warn('Vector search failed, falling back to keyword match:', vectorError.message);
      const similarTicketsResult = await query(
        `SELECT ticket_id, ticket_number, subject, category_id, priority, status
         FROM tickets
         WHERE (
           subject ILIKE $1 OR
           description ILIKE $1
         )
         AND status IN ('resolved', 'closed')
         ORDER BY created_at DESC
         LIMIT 5`,
        [`%${input.subject.split(' ')[0]}%`]
      );

      if (similarTicketsResult.rows.length > 0) {
        similarTicketsText = similarTicketsResult.rows
          .map(
            (ticket: any) =>
              `- ${ticket.ticket_number}: ${ticket.subject} (カテゴリ: ${ticket.category_id}, 優先度: ${ticket.priority})`
          )
          .join('\n');
      }
    }

    // 4. プロンプト生成
    const prompt = promptTemplates.ticketClassification
      .replace('{subject}', subjectMasked.masked)
      .replace('{description}', descriptionMasked.masked)
      .replace('{categories}', categoriesText)
      .replace('{similar_tickets}', similarTicketsText);

    // 5. Claude API 呼び出し
    try {
      const claudeResponse = await claudeClient.sendPrompt(
        prompt,
        'あなたは社内ITヘルプデスクの分類エキスパートです。チケット内容を正確に分析し、適切な分類を提案してください。',
        {
          cacheKey: input.ticket_id
            ? `ai-classify:${input.ticket_id}`
            : undefined,
          cacheTTL: 3600, // 1時間
          userId: input.requester_id,
          maxTokens: 2048,
          temperature: 0.3,
        }
      );

      // 6. レスポンスをパース
      const predictions = this.parseClassificationResponse(claudeResponse);

      // 7. カテゴリラベルを取得
      if (predictions.category) {
        const categoryResult = await query(
          `SELECT name, path FROM categories WHERE category_id = $1`,
          [predictions.category.value]
        );
        if (categoryResult.rows.length > 0) {
          predictions.category.label = categoryResult.rows[0].name;
        }
      }

      // 8. 担当者ラベルを取得
      if (predictions.assignee) {
        const assigneeResult = await query(
          `SELECT display_name FROM users WHERE user_id = $1`,
          [predictions.assignee.value]
        );
        if (assigneeResult.rows.length > 0) {
          predictions.assignee.label = assigneeResult.rows[0].display_name;
        }
      }

      const processingTime = Date.now() - startTime;

      // 9. 予測結果をデータベースに保存
      if (input.ticket_id) {
        await this.savePredictions(
          input.ticket_id,
          predictions,
          claudeConfig.model,
          processingTime,
          input.requester_id
        );
      }

      return {
        predictions,
        processing_time_ms: processingTime,
        model_version: claudeConfig.model,
        pii_masked: hasPII,
      };
    } catch (error: any) {
      logger.error('❌ AI分類エラー:', error);
      throw new Error(`AI分類に失敗しました: ${error.message}`);
    }
  }

  /**
   * Claude APIレスポンスをパース
   */
  private static parseClassificationResponse(response: string): TicketClassificationResult['predictions'] {
    try {
      // JSON部分を抽出（```json ... ``` で囲まれている場合）
      let jsonText = response;
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonText);

      return {
        category: parsed.category || undefined,
        priority: parsed.priority || undefined,
        impact: parsed.impact || undefined,
        urgency: parsed.urgency || undefined,
        assignee: parsed.assignee || undefined,
      };
    } catch (error) {
      logger.error('❌ Claude APIレスポンスのパース失敗:', response);
      throw new Error('AI分類結果の解析に失敗しました。フォーマットが不正です。');
    }
  }

  /**
   * 予測結果をデータベースに保存
   */
  private static async savePredictions(
    ticketId: string,
    predictions: TicketClassificationResult['predictions'],
    modelVersion: string,
    processingTime: number,
    createdBy: string
  ): Promise<void> {
    const predictionData: CreateAIPredictionData[] = [];

    // category
    if (predictions.category) {
      predictionData.push({
        ticket_id: ticketId,
        prediction_type: 'category',
        predicted_value: predictions.category.value,
        confidence_score: predictions.category.confidence,
        rationale: predictions.category.rationale,
        model_version: modelVersion,
        processing_time_ms: processingTime,
        created_by: createdBy,
      });
    }

    // priority
    if (predictions.priority) {
      predictionData.push({
        ticket_id: ticketId,
        prediction_type: 'priority',
        predicted_value: predictions.priority.value,
        confidence_score: predictions.priority.confidence,
        rationale: predictions.priority.rationale,
        model_version: modelVersion,
        processing_time_ms: processingTime,
        created_by: createdBy,
      });
    }

    // impact
    if (predictions.impact) {
      predictionData.push({
        ticket_id: ticketId,
        prediction_type: 'impact',
        predicted_value: predictions.impact.value,
        confidence_score: predictions.impact.confidence,
        rationale: predictions.impact.rationale || { reasoning: '' },
        model_version: modelVersion,
        processing_time_ms: processingTime,
        created_by: createdBy,
      });
    }

    // urgency
    if (predictions.urgency) {
      predictionData.push({
        ticket_id: ticketId,
        prediction_type: 'urgency',
        predicted_value: predictions.urgency.value,
        confidence_score: predictions.urgency.confidence,
        rationale: predictions.urgency.rationale || { reasoning: '' },
        model_version: modelVersion,
        processing_time_ms: processingTime,
        created_by: createdBy,
      });
    }

    // assignee
    if (predictions.assignee) {
      predictionData.push({
        ticket_id: ticketId,
        prediction_type: 'assignee',
        predicted_value: predictions.assignee.value,
        confidence_score: predictions.assignee.confidence,
        rationale: predictions.assignee.rationale,
        model_version: modelVersion,
        processing_time_ms: processingTime,
        created_by: createdBy,
      });
    }

    // 一括保存
    if (predictionData.length > 0) {
      await AIPredictionModel.createBatch(predictionData);
      logger.info(`💾 ${predictionData.length}件のAI予測を保存しました`);
    }
  }

  /**
   * AI分類の精度メトリクスを取得
   */
  static async getAccuracyMetrics(
    predictionType: PredictionType,
    days: number = 30
  ): Promise<any> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return await AIPredictionModel.getAccuracyMetrics(
      predictionType,
      startDate,
      endDate
    );
  }
}
