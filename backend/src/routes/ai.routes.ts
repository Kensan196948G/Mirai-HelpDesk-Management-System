/**
 * AI Routes
 *
 * AI機能のAPIエンドポイント定義
 */

import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { AIController } from '../controllers/ai.controller';
import { AIChatController } from '../controllers/ai-chat.controller';
import { body } from 'express-validator';
import { validate, runValidations } from '../middleware/validation';
import { UserRole } from '../types';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

/**
 * POST /api/ai/classify-ticket
 * チケット内容からAI分類を実行
 *
 * 認可: Requester以上（全ロール）
 */
router.post(
  '/classify-ticket',
  runValidations([
    body('subject')
      .notEmpty()
      .withMessage('件名は必須です')
      .isString()
      .withMessage('件名は文字列である必要があります')
      .isLength({ min: 5, max: 500 })
      .withMessage('件名は5文字以上500文字以内で入力してください'),
    body('description')
      .notEmpty()
      .withMessage('詳細は必須です')
      .isString()
      .withMessage('詳細は文字列である必要があります')
      .isLength({ min: 10 })
      .withMessage('詳細は10文字以上で入力してください'),
    body('requester_id')
      .optional()
      .isUUID()
      .withMessage('依頼者IDはUUID形式である必要があります'),
    body('ticket_id')
      .optional()
      .isUUID()
      .withMessage('チケットIDはUUID形式である必要があります'),
  ]),
  validate,
  AIController.classifyTicket
);

/**
 * GET /api/ai/metrics
 * AI機能のメトリクス取得
 *
 * 認可: Manager, Auditor のみ
 */
router.get(
  '/metrics',
  authorize(UserRole.MANAGER, UserRole.AUDITOR),
  AIController.getMetrics
);

/**
 * POST /api/ai/detect-escalation-risk
 * エスカレーションリスク検知
 *
 * 認可: Agent以上
 */
router.post(
  '/detect-escalation-risk',
  runValidations([
    body('ticket_id')
      .notEmpty()
      .withMessage('チケットIDは必須です')
      .isUUID()
      .withMessage('チケットIDはUUID形式である必要があります'),
  ]),
  validate,
  authorize(UserRole.AGENT, UserRole.M365_OPERATOR, UserRole.APPROVER, UserRole.MANAGER),
  AIController.detectEscalationRisk
);

/**
 * POST /api/ai/generate-knowledge
 * ナレッジ記事の自動生成
 *
 * 認可: Agent以上
 */
router.post(
  '/generate-knowledge',
  runValidations([
    body('similar_ticket_ids')
      .isArray({ min: 3 })
      .withMessage('similar_ticket_ids は最低3件の配列である必要があります'),
    body('similar_ticket_ids.*')
      .isUUID()
      .withMessage('チケットIDはUUID形式である必要があります'),
  ]),
  validate,
  authorize(UserRole.AGENT, UserRole.M365_OPERATOR, UserRole.APPROVER, UserRole.MANAGER),
  AIController.generateKnowledge
);

/**
 * POST /api/ai/smart-search
 * 自然言語クエリによるチケット検索
 *
 * 認可: 全ロール
 */
router.post(
  '/smart-search',
  runValidations([
    body('query')
      .notEmpty()
      .withMessage('検索クエリは必須です')
      .isString()
      .withMessage('検索クエリは文字列である必要があります')
      .isLength({ min: 3, max: 500 })
      .withMessage('検索クエリは3文字以上500文字以内で入力してください'),
    body('max_results')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('max_results は1-100の整数である必要があります'),
  ]),
  validate,
  AIController.smartSearch
);

/**
 * POST /api/ai/analyze-sentiment
 * 感情分析・顧客満足度予測
 *
 * 認可: Agent以上
 */
router.post(
  '/analyze-sentiment',
  runValidations([
    body('ticket_id')
      .notEmpty()
      .withMessage('チケットIDは必須です')
      .isUUID()
      .withMessage('チケットIDはUUID形式である必要があります'),
    body('comment_ids')
      .optional()
      .isArray()
      .withMessage('comment_ids は配列である必要があります'),
    body('comment_ids.*')
      .optional()
      .isUUID()
      .withMessage('コメントIDはUUID形式である必要があります'),
  ]),
  validate,
  authorize(UserRole.AGENT, UserRole.M365_OPERATOR, UserRole.APPROVER, UserRole.MANAGER),
  AIController.analyzeSentiment
);

/**
 * POST /api/ai/translate
 * テキスト翻訳
 *
 * 認可: 全ロール
 */
router.post(
  '/translate',
  runValidations([
    body('text')
      .notEmpty()
      .withMessage('翻訳対象テキストは必須です')
      .isString()
      .withMessage('翻訳対象テキストは文字列である必要があります')
      .isLength({ min: 1, max: 10000 })
      .withMessage('翻訳対象テキストは1文字以上10000文字以内で入力してください'),
    body('target_language')
      .notEmpty()
      .withMessage('翻訳先言語は必須です')
      .isIn(['ja', 'en'])
      .withMessage('翻訳先言語は ja または en である必要があります'),
    body('source_language')
      .optional()
      .isIn(['ja', 'en', 'auto'])
      .withMessage('翻訳元言語は ja, en, auto のいずれかである必要があります'),
  ]),
  validate,
  AIController.translateText
);

/**
 * POST /api/ai/chat/diagnose
 * AI対話による問題診断
 *
 * 認可: 全ロール（Requester以上）
 */
router.post(
  '/chat/diagnose',
  runValidations([
    body('initial_problem')
      .notEmpty()
      .withMessage('初期問題内容は必須です')
      .isString()
      .withMessage('初期問題内容は文字列である必要があります')
      .isLength({ min: 10, max: 5000 })
      .withMessage('初期問題内容は10文字以上5000文字以内で入力してください'),
    body('conversation_history')
      .optional()
      .isArray()
      .withMessage('会話履歴は配列である必要があります'),
  ]),
  validate,
  AIChatController.diagnoseRequest
);

/**
 * POST /api/ai/chat/suggest-solution
 * AI診断結果からの解決策提案
 *
 * 認可: 全ロール
 */
router.post(
  '/chat/suggest-solution',
  runValidations([
    body('conversation_history')
      .isArray()
      .withMessage('会話履歴は配列である必要があります')
      .custom((value) => {
        if (value.length > 50) {
          throw new Error('会話履歴は最大50件までです');
        }
        return true;
      }),
    body('diagnostic_answers')
      .isObject()
      .withMessage('診断回答はオブジェクトである必要があります'),
  ]),
  validate,
  AIChatController.suggestSolution
);

/**
 * POST /api/ai/chat/create-ticket
 * AI対話内容からチケット自動作成
 *
 * 認可: Requester以上（チケット作成権限）
 */
router.post(
  '/chat/create-ticket',
  runValidations([
    body('conversation_history')
      .isArray()
      .withMessage('会話履歴は配列である必要があります')
      .notEmpty()
      .withMessage('会話履歴は必須です'),
    body('user_confirmed_values')
      .optional()
      .isObject()
      .withMessage('ユーザー確認値はオブジェクトである必要があります'),
  ]),
  validate,
  AIChatController.createTicketFromChat
);

export default router;
