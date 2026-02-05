/**
 * AI Chat Type Definitions
 *
 * AI対話アシスタント機能で使用される型定義
 * バックエンド: backend/src/controllers/ai-chat.controller.ts
 */

// ============================================
// 基本型
// ============================================

/**
 * メッセージ
 * チャット画面で表示されるメッセージ
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

/**
 * 会話フェーズ
 * AIチャットの3つのフェーズを表す
 */
export type ConversationPhase = 'diagnostic' | 'solution' | 'ticket_creation';

// ============================================
// フェーズ1: 診断質問
// ============================================

/**
 * 診断質問
 * AIが利用者に対して行う診断質問
 */
export interface DiagnosticQuestion {
  question_id: string;
  question_text: string;
  question_type: 'open' | 'choice' | 'yes_no' | 'technical';
  suggested_answers?: string[] | null;
  rationale: string;
}

/**
 * 診断回答
 * 利用者が診断質問に対して行った回答
 */
export interface DiagnosticAnswer {
  question_id: string;
  answer: string;
}

/**
 * 診断分析結果
 * AIによる問題分析の結果
 */
export interface DiagnosticAnalysis {
  detected_category?: string;
  detected_priority?: string;
  detected_impact?: string;
  detected_urgency?: string;
  confidence?: number;
  summary?: string;
}

/**
 * 診断結果（APIレスポンス）
 * POST /api/ai/chat/diagnose のレスポンス型
 */
export interface DiagnosticResult {
  questions: DiagnosticQuestion[];
  analysis: DiagnosticAnalysis;
  processing_time_ms: number;
  pii_masked: boolean;
}

// ============================================
// フェーズ2: 解決提案
// ============================================

/**
 * 解決手順のステップ
 * 解決策の個々のステップ
 */
export interface SolutionStep {
  step_number: number;
  instruction: string;
  expected_result?: string;
  screenshot_required?: boolean;
  command?: string;
}

/**
 * 解決提案
 * AIが提案する解決策
 */
export interface SolutionProposal {
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

/**
 * エスカレーション推奨
 * AIがエスカレーションを推奨する場合の情報
 */
export interface EscalationRecommendation {
  should_escalate: boolean;
  reason?: string;
  recommended_assignee?: string;
  recommended_priority?: string;
  urgency_level?: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * ナレッジ記事プレビュー
 * 関連するナレッジ記事のプレビュー情報
 */
export interface KnowledgeArticlePreview {
  article_id: string;
  title: string;
  content_preview: string;
  summary?: string;
  category?: string;
  view_count?: number;
  relevance_score?: number;
}

/**
 * 解決提案結果（APIレスポンス）
 * POST /api/ai/chat/suggest-solution のレスポンス型
 */
export interface SolutionResult {
  solutions: SolutionProposal[];
  escalation_recommendation: EscalationRecommendation;
  knowledge_articles: KnowledgeArticlePreview[];
  processing_time_ms: number;
}

// ============================================
// フェーズ3: チケット作成
// ============================================

/**
 * チケットドラフト
 * AIが生成したチケットの下書き
 */
export interface TicketDraft {
  subject: string;
  description: string;
  type?: 'incident' | 'service_request' | 'change' | 'problem';
  impact?: 'individual' | 'department' | 'company_wide' | 'external';
  urgency?: 'low' | 'medium' | 'high' | 'immediate';
  category_id?: string;
}

/**
 * AI分類予測
 * AIによるチケット分類の予測結果
 */
export interface AIPrediction {
  value: string;
  confidence: number;
  rationale?: string;
}

/**
 * AI分類結果
 * チケット作成時のAI分類結果
 */
export interface AIClassificationResult {
  category?: AIPrediction;
  priority?: AIPrediction;
  assignee?: AIPrediction;
  impact?: AIPrediction;
  urgency?: AIPrediction;
}

/**
 * 作成されたチケット情報
 * バックエンドから返されるチケット情報（簡易版）
 */
export interface CreatedTicket {
  ticket_id: string;
  ticket_number: string;
  subject: string;
  description: string;
  type: string;
  status: string;
  priority: string;
  impact: string;
  urgency: string;
  requester_id: string;
  category_id?: string;
  created_at: Date;
}

/**
 * ユーザー確認値
 * ユーザーが手動で確認・変更した値
 */
export interface UserConfirmedValues {
  type?: 'incident' | 'service_request' | 'change' | 'problem';
  impact?: 'individual' | 'department' | 'company_wide' | 'external';
  urgency?: 'low' | 'medium' | 'high' | 'immediate';
  category_id?: string;
}

/**
 * チケット作成結果（APIレスポンス）
 * POST /api/ai/chat/create-ticket のレスポンス型
 */
export interface TicketCreationResult {
  ticket: CreatedTicket;
  ai_classification: AIClassificationResult;
  processing_time_ms: number;
}

// ============================================
// APIリクエスト型
// ============================================

/**
 * 診断リクエスト
 * POST /api/ai/chat/diagnose のリクエストボディ
 */
export interface DiagnosticRequest {
  initial_problem: string;
  conversation_history?: Message[];
}

/**
 * 解決提案リクエスト
 * POST /api/ai/chat/suggest-solution のリクエストボディ
 */
export interface SolutionRequest {
  conversation_history: Message[];
  diagnostic_answers?: DiagnosticAnswer[];
}

/**
 * チケット作成リクエスト
 * POST /api/ai/chat/create-ticket のリクエストボディ
 */
export interface TicketCreationRequest {
  conversation_history: Message[];
  diagnostic_answers?: DiagnosticAnswer[];
  user_confirmed_values?: UserConfirmedValues;
}

// ============================================
// UI状態管理用型
// ============================================

/**
 * チャットセッション状態
 * フロントエンドで会話セッション全体を管理する状態
 */
export interface ChatSessionState {
  sessionId: string;
  phase: ConversationPhase;
  messages: Message[];
  diagnosticQuestions?: DiagnosticQuestion[];
  diagnosticAnswers?: DiagnosticAnswer[];
  diagnosticAnalysis?: DiagnosticAnalysis;
  solutionProposals?: SolutionProposal[];
  selectedSolutionId?: string;
  escalationRecommendation?: EscalationRecommendation;
  knowledgeArticles?: KnowledgeArticlePreview[];
  ticketDraft?: TicketDraft;
  createdTicket?: CreatedTicket;
  loading: boolean;
  error?: string;
}

/**
 * チャットアクション
 * チャットセッションで実行可能なアクション
 */
export type ChatAction =
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_PHASE'; payload: ConversationPhase }
  | { type: 'SET_DIAGNOSTIC_RESULT'; payload: DiagnosticResult }
  | { type: 'ADD_DIAGNOSTIC_ANSWER'; payload: DiagnosticAnswer }
  | { type: 'SET_SOLUTION_RESULT'; payload: SolutionResult }
  | { type: 'SELECT_SOLUTION'; payload: string }
  | { type: 'SET_TICKET_CREATION_RESULT'; payload: TicketCreationResult }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string }
  | { type: 'RESET_SESSION' };
