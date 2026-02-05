/**
 * AI Service
 *
 * AI機能のAPI呼び出しを管理
 */

import { apiClient } from './api';

// 型定義
export interface AIClassificationInput {
  subject: string;
  description: string;
  requester_id?: string;
  ticket_id?: string;
}

export interface ClassificationPrediction {
  value: string;
  label?: string;
  confidence: number;
  rationale?: {
    reasoning: string;
    keywords?: string[];
    similar_tickets?: string[];
  };
}

export interface AIClassificationResult {
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

export interface AISuggestion {
  suggestion_id: string;
  suggestion_type: string;
  suggested_content: string;
  confidence_score: number;
  linked_knowledge_articles: string[];
  metadata: any;
  created_at: string;
}

export interface AIFeedback {
  prediction_id?: string;
  suggestion_id?: string;
  ticket_id: string;
  feedback_type: string;
  feedback_value: string;
  rating?: number;
  comment?: string;
}

/**
 * AI API サービス
 */
export const aiService = {
  /**
   * チケット内容からAI分類を実行
   */
  async classifyTicket(
    data: AIClassificationInput
  ): Promise<AIClassificationResult> {
    const response = await apiClient.post('/ai/classify-ticket', data);
    return response.data.data;
  },

  /**
   * AI回答提案を取得
   */
  async getSuggestions(
    ticketId: string,
    type?: string
  ): Promise<{ suggestions: AISuggestion[] }> {
    const response = await apiClient.get(`/tickets/${ticketId}/ai-suggestions`, {
      params: { type },
    });
    return response.data.data;
  },

  /**
   * チケット要約を生成（非同期）
   */
  async generateSummary(
    ticketId: string,
    options: {
      include_comments: boolean;
      include_attachments_info: boolean;
      summary_type: string;
    }
  ): Promise<{ job_id: string; status: string; poll_url: string }> {
    const response = await apiClient.post(
      `/tickets/${ticketId}/ai-summary`,
      options
    );
    return response.data.data;
  },

  /**
   * ジョブステータスを取得
   */
  async getJobStatus(jobId: string): Promise<any> {
    const response = await apiClient.get(`/ai/jobs/${jobId}`);
    return response.data.data;
  },

  /**
   * M365操作ガイドを取得
   */
  async getM365Guide(
    taskId: string,
    taskType: string,
    parameters: any
  ): Promise<any> {
    const response = await apiClient.post(`/m365/tasks/${taskId}/ai-guide`, {
      task_type: taskType,
      parameters,
    });
    return response.data.data;
  },

  /**
   * ナレッジ意味検索
   */
  async searchKnowledge(
    query: string,
    limit = 10
  ): Promise<{ articles: any[] }> {
    const response = await apiClient.get('/knowledge/ai-search', {
      params: { q: query, limit },
    });
    return response.data.data;
  },

  /**
   * AI提案へのフィードバック送信
   */
  async submitFeedback(feedback: AIFeedback): Promise<void> {
    await apiClient.post('/ai/feedback', feedback);
  },

  /**
   * AI精度メトリクスを取得
   */
  async getMetrics(days = 30): Promise<any> {
    const response = await apiClient.get('/ai/metrics', {
      params: { days },
    });
    return response.data.data;
  },

  /**
   * エスカレーションリスクを検知
   */
  async detectEscalationRisk(data: { ticket_id: string }): Promise<any> {
    const response = await apiClient.post('/ai/detect-escalation-risk', data);
    return response.data.data;
  },

  /**
   * ナレッジ記事を自動生成
   */
  async generateKnowledgeArticle(data: {
    similar_ticket_ids: string[];
  }): Promise<any> {
    const response = await apiClient.post('/ai/generate-knowledge', data);
    return response.data.data;
  },

  /**
   * 自然言語クエリでチケット検索
   */
  async smartSearch(data: {
    query: string;
    max_results?: number;
  }): Promise<any> {
    const response = await apiClient.post('/ai/smart-search', data);
    return response.data.data;
  },

  /**
   * 感情分析・顧客満足度予測
   */
  async analyzeSentiment(data: {
    ticket_id: string;
    comment_ids?: string[];
  }): Promise<any> {
    const response = await apiClient.post('/ai/analyze-sentiment', data);
    return response.data.data;
  },

  /**
   * テキスト翻訳
   */
  async translateText(data: {
    text: string;
    source_language?: 'ja' | 'en' | 'auto';
    target_language: 'ja' | 'en';
    context?: string;
  }): Promise<any> {
    const response = await apiClient.post('/ai/translate', data);
    return response.data.data;
  },
};
