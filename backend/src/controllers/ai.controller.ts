/**
 * AI Controller
 *
 * AI機能のHTTPエンドポイント処理
 */

import { Request, Response, NextFunction } from 'express';
import { AIService } from '../services/ai.service';
import { AIAuditService } from '../services/ai-audit.service';
import { AIEscalationService } from '../services/ai-escalation.service';
import { AIKnowledgeService } from '../services/ai-knowledge.service';
import { AISmartSearchService } from '../services/ai-smart-search.service';
import { AISentimentService } from '../services/ai-sentiment.service';
import { AITranslationService } from '../services/ai-translation.service';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { aiFeatureConfig } from '../config/claude.config';

export class AIController {
  /**
   * POST /api/tickets/ai-classify
   * チケット内容からAI分類を実行
   */
  static classifyTicket = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      // AI機能が無効な場合
      if (!aiFeatureConfig.enabled) {
        throw new AppError(
          'AI機能は現在無効です。',
          503,
          'AI_DISABLED'
        );
      }

      const { subject, description, requester_id, ticket_id } = req.body;
      const user = req.user!;

      // 入力検証
      if (!subject || !description) {
        throw new AppError(
          '件名と詳細は必須です。',
          400,
          'VALIDATION_ERROR'
        );
      }

      // リクエスト者IDの検証（自分自身または管理者のみ）
      if (requester_id && requester_id !== user.user_id && user.role !== 'manager') {
        throw new AppError(
          '他のユーザーのチケット分類は実行できません。',
          403,
          'FORBIDDEN'
        );
      }

      try {
        // AI分類実行
        const result = await AIService.classifyTicket({
          subject,
          description,
          requester_id: requester_id || user.user_id,
          ticket_id,
        });

        // 監査ログ記録
        await AIAuditService.logAIOperation({
          operation_type: 'classification',
          user_id: user.user_id,
          ticket_id: ticket_id || undefined,
          input_data: { subject, description },
          output_data: result,
          processing_time_ms: result.processing_time_ms,
          model_version: result.model_version,
          pii_masked: result.pii_masked,
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
        });

        res.json({
          success: true,
          data: result,
        });
      } catch (error: any) {
        // レート制限エラーの場合
        if (error.message.includes('リクエスト制限')) {
          throw new AppError(error.message, 429, 'RATE_LIMIT_EXCEEDED');
        }

        // Claude APIエラー
        if (error.message.includes('Claude API')) {
          throw new AppError(error.message, 503, 'AI_API_ERROR');
        }

        throw error;
      }
    }
  );

  /**
   * GET /api/ai/metrics
   * AI機能のメトリクス取得（Manager/Auditor専用）
   */
  static getMetrics = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { days } = req.query;
      const daysNum = days ? parseInt(days as string) : 30;

      // カテゴリ精度
      const categoryMetrics = await AIService.getAccuracyMetrics('category', daysNum);

      // 優先度精度
      const priorityMetrics = await AIService.getAccuracyMetrics('priority', daysNum);

      // 担当者精度
      const assigneeMetrics = await AIService.getAccuracyMetrics('assignee', daysNum);

      // 操作統計
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysNum);
      const operationStats = await AIAuditService.getOperationStats(startDate, endDate);

      res.json({
        success: true,
        data: {
          period: {
            days: daysNum,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
          },
          accuracy: {
            category: categoryMetrics,
            priority: priorityMetrics,
            assignee: assigneeMetrics,
          },
          operations: operationStats,
        },
      });
    }
  );

  /**
   * POST /api/ai/detect-escalation-risk
   * エスカレーションリスク検知
   */
  static detectEscalationRisk = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      if (!aiFeatureConfig.enabled) {
        throw new AppError('AI機能は現在無効です。', 503, 'AI_DISABLED');
      }

      const { ticket_id } = req.body;
      const user = req.user!;

      if (!ticket_id) {
        throw new AppError('チケットIDは必須です。', 400, 'VALIDATION_ERROR');
      }

      try {
        const result = await AIEscalationService.detectRisk({ ticket_id });

        res.json({
          success: true,
          data: result,
        });
      } catch (error: any) {
        if (error.message.includes('リクエスト制限')) {
          throw new AppError(error.message, 429, 'RATE_LIMIT_EXCEEDED');
        }
        throw error;
      }
    }
  );

  /**
   * POST /api/ai/generate-knowledge
   * ナレッジ記事の自動生成
   */
  static generateKnowledge = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      if (!aiFeatureConfig.enabled) {
        throw new AppError('AI機能は現在無効です。', 503, 'AI_DISABLED');
      }

      const { similar_ticket_ids } = req.body;
      const user = req.user!;

      if (!similar_ticket_ids || !Array.isArray(similar_ticket_ids)) {
        throw new AppError('similar_ticket_ids は配列である必要があります。', 400, 'VALIDATION_ERROR');
      }

      try {
        const result = await AIKnowledgeService.generateKnowledgeArticle({
          similar_ticket_ids,
        });

        res.json({
          success: true,
          data: result,
        });
      } catch (error: any) {
        throw error;
      }
    }
  );

  /**
   * POST /api/ai/smart-search
   * 自然言語クエリによるチケット検索
   */
  static smartSearch = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      if (!aiFeatureConfig.enabled) {
        throw new AppError('AI機能は現在無効です。', 503, 'AI_DISABLED');
      }

      const { query: naturalLanguageQuery, max_results } = req.body;
      const user = req.user!;

      if (!naturalLanguageQuery) {
        throw new AppError('検索クエリは必須です。', 400, 'VALIDATION_ERROR');
      }

      try {
        const result = await AISmartSearchService.searchWithNaturalLanguage({
          natural_language_query: naturalLanguageQuery,
          user_id: user.user_id,
          max_results,
        });

        res.json({
          success: true,
          data: result,
        });
      } catch (error: any) {
        if (error.message.includes('リクエスト制限')) {
          throw new AppError(error.message, 429, 'RATE_LIMIT_EXCEEDED');
        }
        throw error;
      }
    }
  );

  /**
   * POST /api/ai/analyze-sentiment
   * 感情分析・顧客満足度予測
   */
  static analyzeSentiment = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      if (!aiFeatureConfig.enabled) {
        throw new AppError('AI機能は現在無効です。', 503, 'AI_DISABLED');
      }

      const { ticket_id, comment_ids } = req.body;
      const user = req.user!;

      if (!ticket_id) {
        throw new AppError('チケットIDは必須です。', 400, 'VALIDATION_ERROR');
      }

      try {
        const result = await AISentimentService.analyzeSentiment({
          ticket_id,
          comment_ids,
        });

        res.json({
          success: true,
          data: result,
        });
      } catch (error: any) {
        throw error;
      }
    }
  );

  /**
   * POST /api/ai/translate
   * テキスト翻訳
   */
  static translateText = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      if (!aiFeatureConfig.enabled) {
        throw new AppError('AI機能は現在無効です。', 503, 'AI_DISABLED');
      }

      const { text, source_language, target_language, context } = req.body;
      const user = req.user!;

      if (!text || !target_language) {
        throw new AppError('text と target_language は必須です。', 400, 'VALIDATION_ERROR');
      }

      try {
        const result = await AITranslationService.translate({
          text,
          source_language,
          target_language,
          context,
        });

        res.json({
          success: true,
          data: result,
        });
      } catch (error: any) {
        throw error;
      }
    }
  );
}
