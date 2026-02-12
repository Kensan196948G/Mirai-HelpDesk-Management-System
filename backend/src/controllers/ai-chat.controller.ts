/**
 * AI Chat Controller
 *
 * AI対話アシスタント機能のHTTPエンドポイント処理
 * 3つのフェーズ: 診断質問 → 解決提案 → チケット作成
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { getClaudeAPIClient } from '../services/claude-api.client';
import { logger } from '../utils/logger';
import { AIService } from '../services/ai.service';
import { logger } from '../utils/logger';
import { AIAuditService } from '../services/ai-audit.service';
import { logger } from '../utils/logger';
import { TicketModel } from '../models/ticket.model';
import { logger } from '../utils/logger';
import { PIIMasking } from '../utils/pii-masking';
import { logger } from '../utils/logger';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { aiFeatureConfig, promptTemplates } from '../config/claude.config';
import { logger } from '../utils/logger';
import { query } from '../config/database';
import { logger } from '../utils/logger';

interface ConversationMessage {
  timestamp: string;
  role: 'user' | 'assistant';
  content: string;
}

interface DiagnosticQuestion {
  question_id: string;
  question_text: string;
  question_type: string;
  suggested_answers?: string[] | null;
  rationale: string;
}

interface DiagnosticAnswer {
  question_id: string;
  answer: string;
}

interface SolutionStep {
  step_number: number;
  instruction: string;
  expected_result?: string;
  screenshot_required?: boolean;
  command?: string;
}

interface Solution {
  solution_id: string;
  approach_type: 'self_service' | 'workaround' | 'escalation';
  title: string;
  steps: SolutionStep[];
  linked_articles: string[];
  estimated_resolution_time: string;
  confidence: number;
  prerequisites?: string[] | null;
  warnings?: string[] | null;
}

export class AIChatController {
  /**
   * POST /api/ai/chat/diagnose
   * フェーズ1: 診断質問を生成
   */
  static diagnoseRequest = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      // AI機能が無効な場合
      if (!aiFeatureConfig.enabled) {
        throw new AppError(
          'AI機能は現在無効です。',
          503,
          'AI_DISABLED'
        );
      }

      const { initial_problem, conversation_history } = req.body;
      const user = req.user!;

      // 入力検証
      if (!initial_problem) {
        throw new AppError(
          '初期問題文は必須です。',
          400,
          'VALIDATION_ERROR'
        );
      }

      const startTime = Date.now();

      try {
        // 1. PII マスキング
        const problemMasked = PIIMasking.maskForAI(initial_problem);
        const hasPII = problemMasked.hasPII;

        if (hasPII) {
          logger.info(`🔒 PII検出: ${problemMasked.maskedFields.join(', ')}`);
        }

        // 2. 会話履歴を文字列化
        const conversationText = this.formatConversationHistory(
          conversation_history || []
        );

        // 3. プロンプト生成
        const prompt = promptTemplates.chatDiagnostic
          .replace('{initial_problem}', problemMasked.masked)
          .replace('{conversation_history}', conversationText);

        // 4. Claude API 呼び出し
        const claudeClient = getClaudeAPIClient();
        const claudeResponse = await claudeClient.sendPrompt(
          prompt,
          'あなたは経験豊富なITヘルプデスクエージェントです。利用者の問題を効率的に診断してください。',
          {
            userId: user.user_id,
            maxTokens: 2048,
            temperature: 0.4,
          }
        );

        // 5. レスポンスをパース
        const parsedResponse = this.parseJsonResponse(claudeResponse);
        const processingTime = Date.now() - startTime;

        // 6. 監査ログ記録
        await AIAuditService.logAIOperation({
          operation_type: 'chat_diagnostic',
          user_id: user.user_id,
          input_data: {
            initial_problem: AIAuditService.sanitizeForLog(initial_problem),
            conversation_length: (conversation_history || []).length,
          },
          output_data: {
            questions_count: parsedResponse.questions?.length || 0,
            detected_category: parsedResponse.analysis?.detected_category,
          },
          processing_time_ms: processingTime,
          model_version: 'claude-sonnet-4-5-20250929',
          pii_masked: hasPII,
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
        });

        res.json({
          success: true,
          data: {
            questions: parsedResponse.questions || [],
            analysis: parsedResponse.analysis || {},
            processing_time_ms: processingTime,
            pii_masked: hasPII,
          },
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
   * POST /api/ai/chat/suggest-solution
   * フェーズ2: 解決提案を生成
   */
  static suggestSolution = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      // AI機能が無効な場合
      if (!aiFeatureConfig.enabled) {
        throw new AppError(
          'AI機能は現在無効です。',
          503,
          'AI_DISABLED'
        );
      }

      const { conversation_history, diagnostic_answers } = req.body;
      const user = req.user!;

      // 入力検証
      if (!conversation_history || !Array.isArray(conversation_history)) {
        throw new AppError(
          '会話履歴は必須です。',
          400,
          'VALIDATION_ERROR'
        );
      }

      const startTime = Date.now();

      try {
        // 1. 会話履歴を文字列化
        const conversationText = this.formatConversationHistory(conversation_history);

        // 2. 診断回答を文字列化
        const diagnosticAnswersText = this.formatDiagnosticAnswers(
          diagnostic_answers || []
        );

        // 3. ナレッジベース検索（簡易実装）
        const knowledgeArticles = await this.searchKnowledgeBase(
          conversationText,
          3 // 最大3件
        );

        const knowledgeText = knowledgeArticles.length > 0
          ? knowledgeArticles
              .map(
                (article) =>
                  `- [${article.article_id}] ${article.title}\n  ${article.content_preview}`
              )
              .join('\n\n')
          : 'なし（関連するナレッジ記事が見つかりませんでした）';

        // 4. プロンプト生成
        const prompt = promptTemplates.chatSolution
          .replace('{conversation_history}', conversationText)
          .replace('{diagnostic_answers}', diagnosticAnswersText)
          .replace('{knowledge_count}', knowledgeArticles.length.toString())
          .replace('{knowledge_articles}', knowledgeText);

        // 5. Claude API 呼び出し
        const claudeClient = getClaudeAPIClient();
        const claudeResponse = await claudeClient.sendPrompt(
          prompt,
          'あなたはITヘルプデスクの経験豊富なトラブルシューティングエキスパートです。利用者に最適な解決策を提案してください。',
          {
            userId: user.user_id,
            maxTokens: 4096,
            temperature: 0.5,
          }
        );

        // 6. レスポンスをパース
        const parsedResponse = this.parseJsonResponse(claudeResponse);
        const processingTime = Date.now() - startTime;

        // 7. 監査ログ記録
        await AIAuditService.logAIOperation({
          operation_type: 'chat_solution',
          user_id: user.user_id,
          input_data: {
            conversation_length: conversation_history.length,
            diagnostic_answers_count: (diagnostic_answers || []).length,
            knowledge_articles_used: knowledgeArticles.length,
          },
          output_data: {
            solutions_count: parsedResponse.solutions?.length || 0,
            escalation_recommended: parsedResponse.escalation_recommendation?.should_escalate || false,
          },
          processing_time_ms: processingTime,
          model_version: 'claude-sonnet-4-5-20250929',
          pii_masked: false,
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
        });

        res.json({
          success: true,
          data: {
            solutions: parsedResponse.solutions || [],
            escalation_recommendation: parsedResponse.escalation_recommendation || {},
            knowledge_articles: knowledgeArticles,
            processing_time_ms: processingTime,
          },
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
   * POST /api/ai/chat/create-ticket
   * フェーズ3: 会話履歴からチケットを作成
   */
  static createTicketFromChat = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      // AI機能が無効な場合
      if (!aiFeatureConfig.enabled) {
        throw new AppError(
          'AI機能は現在無効です。',
          503,
          'AI_DISABLED'
        );
      }

      const {
        conversation_history,
        diagnostic_answers,
        user_confirmed_values,
      } = req.body;
      const user = req.user!;

      // 入力検証
      if (!conversation_history || !Array.isArray(conversation_history)) {
        throw new AppError(
          '会話履歴は必須です。',
          400,
          'VALIDATION_ERROR'
        );
      }

      const startTime = Date.now();

      try {
        // 1. 会話履歴を文字列化
        const conversationText = this.formatConversationHistory(conversation_history);

        // 2. 診断回答を文字列化
        const diagnosticAnswersText = this.formatDiagnosticAnswers(
          diagnostic_answers || []
        );

        // 3. プロンプト生成
        const prompt = promptTemplates.chatTicketCreation
          .replace('{conversation_history}', conversationText)
          .replace('{diagnostic_answers}', diagnosticAnswersText);

        // 4. Claude API 呼び出し（件名・詳細生成）
        const claudeClient = getClaudeAPIClient();
        const claudeResponse = await claudeClient.sendPrompt(
          prompt,
          'あなたはITヘルプデスクのチケット管理エキスパートです。会話履歴から適切なチケットを生成してください。',
          {
            userId: user.user_id,
            maxTokens: 2048,
            temperature: 0.3,
          }
        );

        // 5. レスポンスをパース
        const parsedResponse = this.parseJsonResponse(claudeResponse);
        const subject = parsedResponse.subject || '（件名なし）';
        const description = parsedResponse.description || conversationText;

        // 6. AI分類で推奨値を取得
        const classificationResult = await AIService.classifyTicket({
          subject,
          description,
          requester_id: user.user_id,
        });

        // 7. ユーザー確認値で上書き（優先）
        const finalValues = {
          type: user_confirmed_values?.type || 'incident',
          impact: user_confirmed_values?.impact || classificationResult.predictions.impact?.value || 'individual',
          urgency: user_confirmed_values?.urgency || classificationResult.predictions.urgency?.value || 'medium',
          category_id: user_confirmed_values?.category_id || classificationResult.predictions.category?.value || undefined,
        };

        // 8. チケット作成
        const ticket = await TicketModel.create({
          type: finalValues.type as any,
          subject,
          description,
          impact: finalValues.impact as any,
          urgency: finalValues.urgency as any,
          requester_id: user.user_id,
          category_id: finalValues.category_id,
        });

        const processingTime = Date.now() - startTime;

        // 9. 監査ログ記録
        await AIAuditService.logAIOperation({
          operation_type: 'chat_ticket_creation',
          user_id: user.user_id,
          ticket_id: ticket.ticket_id,
          input_data: {
            conversation_length: conversation_history.length,
            diagnostic_answers_count: (diagnostic_answers || []).length,
          },
          output_data: {
            ticket_id: ticket.ticket_id,
            ticket_number: ticket.ticket_number,
            ai_suggested_category: classificationResult.predictions.category?.value,
            user_confirmed_category: finalValues.category_id,
          },
          processing_time_ms: processingTime,
          model_version: 'claude-sonnet-4-5-20250929',
          pii_masked: classificationResult.pii_masked,
          ip_address: req.ip,
          user_agent: req.get('user-agent'),
        });

        res.status(201).json({
          success: true,
          data: {
            ticket,
            ai_classification: classificationResult.predictions,
            processing_time_ms: processingTime,
          },
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
   * 会話履歴を文字列化
   */
  private static formatConversationHistory(
    history: ConversationMessage[]
  ): string {
    if (!history || history.length === 0) {
      return 'なし';
    }

    return history
      .map((msg) => {
        const timestamp = new Date(msg.timestamp).toLocaleTimeString('ja-JP');
        const role = msg.role === 'user' ? 'User' : 'Assistant';
        return `[${timestamp}] ${role}: ${msg.content}`;
      })
      .join('\n');
  }

  /**
   * 診断回答を文字列化
   */
  private static formatDiagnosticAnswers(
    answers: DiagnosticAnswer[]
  ): string {
    if (!answers || answers.length === 0) {
      return 'なし';
    }

    return answers
      .map((ans) => `- ${ans.question_id}: ${ans.answer}`)
      .join('\n');
  }

  /**
   * ナレッジベース検索（簡易実装）
   */
  private static async searchKnowledgeBase(
    queryText: string,
    maxResults: number = 3
  ): Promise<Array<{ article_id: string; title: string; content_preview: string }>> {
    try {
      // キーワード抽出（簡易版）
      const keywords = queryText
        .split(/[\s、。]+/)
        .filter((word) => word.length > 2)
        .slice(0, 5);

      if (keywords.length === 0) {
        return [];
      }

      // ILIKE検索（PostgreSQL全文検索の簡易版）
      const result = await query(
        `SELECT article_id, title, content
         FROM knowledge_articles
         WHERE is_published = true
           AND (
             title ILIKE ANY($1) OR
             content ILIKE ANY($1)
           )
         ORDER BY updated_at DESC
         LIMIT $2`,
        [keywords.map((kw) => `%${kw}%`), maxResults]
      );

      return result.rows.map((row) => ({
        article_id: row.article_id,
        title: row.title,
        content_preview: row.content.substring(0, 200) + '...',
      }));
    } catch (error) {
      logger.error('❌ ナレッジベース検索エラー:', error);
      // エラーの場合は空配列を返す（検索失敗はクリティカルエラーではない）
      return [];
    }
  }

  /**
   * Claude APIレスポンスのJSON部分を抽出してパース
   */
  private static parseJsonResponse(response: string): any {
    try {
      // JSON部分を抽出（```json ... ``` で囲まれている場合）
      let jsonText = response.trim();
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      return JSON.parse(jsonText);
    } catch (error) {
      logger.error('❌ Claude APIレスポンスのパース失敗:', response);
      throw new Error('AI応答の解析に失敗しました。フォーマットが不正です。');
    }
  }
}
