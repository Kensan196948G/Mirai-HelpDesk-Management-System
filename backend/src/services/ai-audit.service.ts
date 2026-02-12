/**
 * AI Audit Service
 *
 * AI操作の監査ログ記録サービス
 */

import { query } from '../config/database';
import { logger } from '../utils/logger';
import { PIIMasking } from '../utils/pii-masking';
import { logger } from '../utils/logger';

export interface AIOperationLog {
  operation_type: string; // 'classification', 'suggestion', 'summary'
  user_id: string;
  ticket_id?: string;
  input_data: any;
  output_data: any;
  processing_time_ms: number;
  model_version: string;
  pii_masked: boolean;
  ip_address?: string;
  user_agent?: string;
}

export class AIAuditService {
  /**
   * AI操作を ticket_history に記録
   */
  static async logAIOperation(log: AIOperationLog): Promise<void> {
    try {
      // 1. ticket_history に記録
      if (log.ticket_id) {
        await query(
          `INSERT INTO ticket_history (
            ticket_id, actor_id, actor_name, action,
            before_value, after_value, description,
            ip_address, user_agent
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            log.ticket_id,
            log.user_id,
            'AI System', // actor_name
            `ai_${log.operation_type}`, // 例: 'ai_classification', 'ai_suggestion'
            null, // before_value
            {
              model_version: log.model_version,
              processing_time_ms: log.processing_time_ms,
              pii_masked: log.pii_masked,
              confidence_scores: this.extractConfidenceScores(log.output_data),
            },
            `AI ${log.operation_type} 実行`, // description
            log.ip_address || null,
            log.user_agent || null,
          ]
        );
      }

      // 2. コンソールログにも記録（Winston経由）
      logger.info('📝 AI操作ログ:', {
        timestamp: new Date().toISOString(),
        operation_type: log.operation_type,
        user_id: log.user_id,
        ticket_id: log.ticket_id || 'N/A',
        model_version: log.model_version,
        processing_time_ms: log.processing_time_ms,
        pii_masked: log.pii_masked,
      });
    } catch (error) {
      logger.error('❌ AI監査ログ記録エラー:', error);
      // 監査ログ失敗は致命的なエラーではないが、警告を出す
    }
  }

  /**
   * 信頼度スコアを抽出（ログ記録用）
   */
  private static extractConfidenceScores(outputData: any): Record<string, number> {
    const scores: Record<string, number> = {};

    if (outputData.predictions) {
      Object.keys(outputData.predictions).forEach((key) => {
        const prediction = outputData.predictions[key];
        if (prediction && typeof prediction.confidence === 'number') {
          scores[key] = prediction.confidence;
        }
      });
    }

    return scores;
  }

  /**
   * 入力データをサニタイズ（ログ記録用）
   */
  static sanitizeForLog(data: any): any {
    if (typeof data === 'string') {
      return PIIMasking.maskForLog(data);
    }

    if (Array.isArray(data)) {
      return data.map((item) => this.sanitizeForLog(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      Object.keys(data).forEach((key) => {
        // パスワード・トークン等の機密情報は完全にマスク
        if (
          key.toLowerCase().includes('password') ||
          key.toLowerCase().includes('secret') ||
          key.toLowerCase().includes('token')
        ) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeForLog(data[key]);
        }
      });
      return sanitized;
    }

    return data;
  }

  /**
   * AI操作統計（監査レポート用）
   */
  static async getOperationStats(
    startDate: Date,
    endDate: Date
  ): Promise<{
    total_operations: number;
    by_type: Record<string, number>;
    avg_processing_time: number;
    pii_masked_count: number;
  }> {
    const result = await query(
      `SELECT
        COUNT(*) as total_operations,
        jsonb_object_keys(after_value) as operation_type,
        AVG((after_value->>'processing_time_ms')::int) as avg_processing_time,
        SUM(CASE WHEN (after_value->>'pii_masked')::boolean = true THEN 1 ELSE 0 END) as pii_masked_count
       FROM ticket_history
       WHERE action LIKE 'ai_%'
         AND created_at >= $1
         AND created_at <= $2
       GROUP BY operation_type`,
      [startDate, endDate]
    );

    const byType: Record<string, number> = {};
    let totalOperations = 0;
    let avgProcessingTime = 0;
    let piiMaskedCount = 0;

    result.rows.forEach((row) => {
      totalOperations += parseInt(row.total_operations);
      avgProcessingTime = parseFloat(row.avg_processing_time || 0);
      piiMaskedCount = parseInt(row.pii_masked_count || 0);
    });

    return {
      total_operations: totalOperations,
      by_type: byType,
      avg_processing_time: Math.round(avgProcessingTime),
      pii_masked_count: piiMaskedCount,
    };
  }
}
