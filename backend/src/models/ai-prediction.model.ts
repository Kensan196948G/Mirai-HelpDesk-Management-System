/**
 * AI Prediction Model
 *
 * ai_predictions テーブルへのデータアクセス層
 */

import { query, withTransaction } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export type PredictionType = 'category' | 'priority' | 'assignee' | 'impact' | 'urgency';

export interface AIPrediction {
  prediction_id: string;
  ticket_id: string;
  prediction_type: PredictionType;
  predicted_value: string;
  confidence_score: number;
  actual_value?: string | null;
  was_accepted?: boolean | null;
  rationale?: {
    reasoning: string;
    keywords?: string[];
    similar_tickets?: string[];
  } | null;
  model_version: string;
  processing_time_ms?: number | null;
  created_at: Date;
  created_by: string;
}

export interface CreateAIPredictionData {
  ticket_id: string;
  prediction_type: PredictionType;
  predicted_value: string;
  confidence_score: number;
  rationale?: {
    reasoning: string;
    keywords?: string[];
    similar_tickets?: string[];
  };
  model_version: string;
  processing_time_ms?: number;
  created_by: string;
}

export class AIPredictionModel {
  /**
   * AI予測を作成
   */
  static async create(data: CreateAIPredictionData): Promise<AIPrediction> {
    const prediction_id = uuidv4();

    const result = await query(
      `INSERT INTO ai_predictions (
        prediction_id, ticket_id, prediction_type, predicted_value,
        confidence_score, rationale, model_version, processing_time_ms,
        created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        prediction_id,
        data.ticket_id,
        data.prediction_type,
        data.predicted_value,
        data.confidence_score,
        data.rationale ? JSON.stringify(data.rationale) : null,
        data.model_version,
        data.processing_time_ms || null,
        data.created_by,
      ]
    );

    return result.rows[0];
  }

  /**
   * チケットIDで予測一覧を取得
   */
  static async findByTicketId(ticketId: string): Promise<AIPrediction[]> {
    const result = await query(
      `SELECT * FROM ai_predictions
       WHERE ticket_id = $1
       ORDER BY created_at DESC`,
      [ticketId]
    );

    return result.rows;
  }

  /**
   * チケットIDと予測種別で予測を取得（最新1件）
   */
  static async findByTicketIdAndType(
    ticketId: string,
    type: PredictionType
  ): Promise<AIPrediction | null> {
    const result = await query(
      `SELECT * FROM ai_predictions
       WHERE ticket_id = $1 AND prediction_type = $2
       ORDER BY created_at DESC
       LIMIT 1`,
      [ticketId, type]
    );

    return result.rows[0] || null;
  }

  /**
   * 予測IDで取得
   */
  static async findById(predictionId: string): Promise<AIPrediction | null> {
    const result = await query(
      `SELECT * FROM ai_predictions WHERE prediction_id = $1`,
      [predictionId]
    );

    return result.rows[0] || null;
  }

  /**
   * フィードバック更新（actual_value, was_accepted のみ更新可能）
   */
  static async updateEvaluation(
    predictionId: string,
    actualValue: string,
    wasAccepted: boolean
  ): Promise<AIPrediction> {
    const result = await query(
      `UPDATE ai_predictions
       SET actual_value = $1, was_accepted = $2
       WHERE prediction_id = $3
       RETURNING *`,
      [actualValue, wasAccepted, predictionId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Prediction ${predictionId} not found`);
    }

    return result.rows[0];
  }

  /**
   * 精度メトリクス計算
   *
   * @param predictionType 予測種別
   * @param startDate 集計開始日
   * @param endDate 集計終了日
   * @returns 精度統計
   */
  static async getAccuracyMetrics(
    predictionType: PredictionType,
    startDate: Date,
    endDate: Date
  ): Promise<{
    total: number;
    accepted: number;
    rejected: number;
    pending: number;
    accuracy: number;
    avgConfidence: number;
  }> {
    const result = await query(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN was_accepted = true THEN 1 ELSE 0 END) as accepted,
        SUM(CASE WHEN was_accepted = false THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN was_accepted IS NULL THEN 1 ELSE 0 END) as pending,
        AVG(confidence_score) as avg_confidence
       FROM ai_predictions
       WHERE prediction_type = $1
         AND created_at >= $2
         AND created_at <= $3`,
      [predictionType, startDate, endDate]
    );

    const row = result.rows[0];
    const total = parseInt(row.total);
    const accepted = parseInt(row.accepted);
    const rejected = parseInt(row.rejected);
    const pending = parseInt(row.pending);
    const evaluatedTotal = accepted + rejected;
    const accuracy = evaluatedTotal > 0 ? (accepted / evaluatedTotal) * 100 : 0;
    const avgConfidence = parseFloat(row.avg_confidence || 0);

    return {
      total,
      accepted,
      rejected,
      pending,
      accuracy: parseFloat(accuracy.toFixed(2)),
      avgConfidence: parseFloat(avgConfidence.toFixed(4)),
    };
  }

  /**
   * 信頼度スコア別の精度分析
   */
  static async getAccuracyByConfidence(
    predictionType: PredictionType,
    startDate: Date,
    endDate: Date
  ): Promise<
    Array<{
      confidence_range: string;
      total: number;
      accuracy: number;
    }>
  > {
    const result = await query(
      `SELECT
        CASE
          WHEN confidence_score >= 0.9 THEN '0.9-1.0'
          WHEN confidence_score >= 0.8 THEN '0.8-0.9'
          WHEN confidence_score >= 0.7 THEN '0.7-0.8'
          WHEN confidence_score >= 0.6 THEN '0.6-0.7'
          ELSE '<0.6'
        END as confidence_range,
        COUNT(*) as total,
        ROUND(
          SUM(CASE WHEN was_accepted = true THEN 1 ELSE 0 END)::numeric /
          NULLIF(SUM(CASE WHEN was_accepted IS NOT NULL THEN 1 ELSE 0 END), 0) * 100,
          2
        ) as accuracy
       FROM ai_predictions
       WHERE prediction_type = $1
         AND created_at >= $2
         AND created_at <= $3
         AND was_accepted IS NOT NULL
       GROUP BY confidence_range
       ORDER BY confidence_range DESC`,
      [predictionType, startDate, endDate]
    );

    return result.rows.map((row) => ({
      confidence_range: row.confidence_range,
      total: parseInt(row.total),
      accuracy: parseFloat(row.accuracy || 0),
    }));
  }

  /**
   * チケット作成時の一括予測保存
   */
  static async createBatch(
    predictions: CreateAIPredictionData[]
  ): Promise<AIPrediction[]> {
    return withTransaction(async (client) => {
      const results: AIPrediction[] = [];

      for (const data of predictions) {
        const prediction_id = uuidv4();

        const result = await client.query(
          `INSERT INTO ai_predictions (
            prediction_id, ticket_id, prediction_type, predicted_value,
            confidence_score, rationale, model_version, processing_time_ms,
            created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          RETURNING *`,
          [
            prediction_id,
            data.ticket_id,
            data.prediction_type,
            data.predicted_value,
            data.confidence_score,
            data.rationale ? JSON.stringify(data.rationale) : null,
            data.model_version,
            data.processing_time_ms || null,
            data.created_by,
          ]
        );

        results.push(result.rows[0]);
      }

      return results;
    });
  }
}
