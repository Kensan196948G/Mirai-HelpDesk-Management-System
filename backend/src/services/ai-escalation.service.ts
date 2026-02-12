/**
 * AI Escalation Service
 *
 * エスカレーションリスク検知とスマート通知機能
 */

import { getClaudeAPIClient } from './claude-api.client';
import { logger } from '../utils/logger';
import { claudeConfig, promptTemplates } from '../config/claude.config';
import { logger } from '../utils/logger';
import { query } from '../config/database';
import { logger } from '../utils/logger';
import { PIIMasking } from '../utils/pii-masking';
import { logger } from '../utils/logger';
import { AIAuditService } from './ai-audit.service';
import { logger } from '../utils/logger';

export interface EscalationRiskInput {
  ticket_id: string;
}

export interface RiskFactor {
  factor: string;
  description: string;
  severity: number;
}

export interface SLABreachPrediction {
  likely_to_breach: boolean;
  estimated_breach_time?: string;
  current_sla_remaining: string;
  breach_probability: number;
}

export interface EscalationRiskResult {
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  risk_score: number;
  risk_factors: RiskFactor[];
  sla_breach_prediction?: SLABreachPrediction;
  recommended_actions: string[];
  processing_time_ms: number;
  model_version: string;
}

export class AIEscalationService {
  /**
   * エスカレーションリスクを検知
   */
  static async detectRisk(input: EscalationRiskInput): Promise<EscalationRiskResult> {
    const startTime = Date.now();
    const claudeClient = getClaudeAPIClient();

    // 1. チケット情報を取得
    const ticketResult = await query(
      `SELECT
        t.ticket_id,
        t.ticket_number,
        t.subject,
        t.description,
        t.status,
        t.priority,
        t.created_at,
        t.updated_at,
        t.due_at,
        t.response_due_at,
        t.assignee_id,
        u.display_name as assignee_name
      FROM tickets t
      LEFT JOIN users u ON t.assignee_id = u.user_id
      WHERE t.ticket_id = $1`,
      [input.ticket_id]
    );

    if (ticketResult.rows.length === 0) {
      throw new Error(`チケット ${input.ticket_id} が見つかりません`);
    }

    const ticket = ticketResult.rows[0];

    // 2. コメント履歴を取得（最新5件）
    const commentsResult = await query(
      `SELECT body, created_at, author_name
       FROM ticket_comments
       WHERE ticket_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [input.ticket_id]
    );

    const recentComments = commentsResult.rows
      .map(
        (c) =>
          `- ${c.author_name} (${new Date(c.created_at).toISOString()}): ${c.body.substring(0, 200)}`
      )
      .join('\n');

    // 3. 担当者変更回数を取得
    const reassignmentResult = await query(
      `SELECT COUNT(*) as count
       FROM ticket_history
       WHERE ticket_id = $1
         AND action IN ('assigned', 'reassigned')`,
      [input.ticket_id]
    );

    const reassignmentCount = parseInt(reassignmentResult.rows[0].count);

    // 4. 経過時間とSLA残り時間を計算
    const now = new Date();
    const createdAt = new Date(ticket.created_at);
    const elapsedMs = now.getTime() - createdAt.getTime();
    const elapsedMinutes = Math.floor(elapsedMs / 60000);

    let slaRemainingMinutes = 0;
    if (ticket.due_at) {
      const dueAt = new Date(ticket.due_at);
      const slaRemainingMs = dueAt.getTime() - now.getTime();
      slaRemainingMinutes = Math.floor(slaRemainingMs / 60000);
    }

    // 5. プロンプト生成
    const prompt = promptTemplates.escalationRiskDetection
      .replace('{created_at}', createdAt.toISOString())
      .replace('{elapsed_time}', `${elapsedMinutes}分`)
      .replace('{status}', ticket.status)
      .replace('{priority}', ticket.priority)
      .replace('{sla_remaining}', slaRemainingMinutes > 0 ? `${slaRemainingMinutes}分` : '期限超過')
      .replace('{comment_count}', commentsResult.rows.length.toString())
      .replace('{reassignment_count}', reassignmentCount.toString())
      .replace('{recent_comments}', recentComments || 'なし');

    // 6. Claude API 呼び出し
    try {
      const claudeResponse = await claudeClient.sendPrompt(
        prompt,
        'あなたは社内ITヘルプデスクのエスカレーション予測エキスパートです。チケット情報を正確に分析し、リスクレベルを評価してください。',
        {
          cacheKey: `ai-escalation:${input.ticket_id}`,
          cacheTTL: 300, // 5分（短いTTL: リスクはリアルタイムで変化）
          userId: ticket.assignee_id || undefined,
          maxTokens: 2048,
          temperature: 0.3,
        }
      );

      // 7. レスポンスをパース
      const riskData = this.parseEscalationResponse(claudeResponse);

      const processingTime = Date.now() - startTime;

      // 8. 監査ログ記録
      await AIAuditService.logAIOperation({
        operation_type: 'escalation_detection',
        user_id: ticket.assignee_id || 'system',
        ticket_id: input.ticket_id,
        input_data: { ticket_number: ticket.ticket_number, priority: ticket.priority },
        output_data: riskData,
        processing_time_ms: processingTime,
        model_version: claudeConfig.model,
        pii_masked: false,
      });

      return {
        ...riskData,
        processing_time_ms: processingTime,
        model_version: claudeConfig.model,
      };
    } catch (error: any) {
      logger.error('❌ エスカレーションリスク検知エラー:', error);
      throw new Error(`エスカレーションリスク検知に失敗しました: ${error.message}`);
    }
  }

  /**
   * Claude APIレスポンスをパース
   */
  private static parseEscalationResponse(response: string): Omit<EscalationRiskResult, 'processing_time_ms' | 'model_version'> {
    try {
      // JSON部分を抽出
      let jsonText = response;
      const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const parsed = JSON.parse(jsonText);

      return {
        risk_level: parsed.risk_level || 'low',
        risk_score: parsed.risk_score || 0,
        risk_factors: parsed.risk_factors || [],
        sla_breach_prediction: parsed.sla_breach_prediction || undefined,
        recommended_actions: parsed.recommended_actions || [],
      };
    } catch (error) {
      logger.error('❌ エスカレーションレスポンスのパース失敗:', response);
      throw new Error('エスカレーションリスク結果の解析に失敗しました。');
    }
  }

  /**
   * 全未解決チケットのリスクをバッチチェック
   */
  static async batchCheckRisks(): Promise<{
    high_risk_tickets: Array<{
      ticket_id: string;
      ticket_number: string;
      risk_level: string;
      risk_score: number;
    }>;
    total_checked: number;
  }> {
    logger.info('🔍 バッチリスクチェック開始...');

    // 未解決チケットを取得
    const ticketsResult = await query(
      `SELECT ticket_id, ticket_number, priority, due_at
       FROM tickets
       WHERE status IN ('new', 'triage', 'assigned', 'in_progress', 'pending_customer', 'pending_approval', 'pending_change_window')
       ORDER BY priority, due_at
       LIMIT 100`
    );

    const tickets = ticketsResult.rows;
    logger.info(`📊 対象チケット数: ${tickets.length}件`);

    const highRiskTickets: Array<{
      ticket_id: string;
      ticket_number: string;
      risk_level: string;
      risk_score: number;
    }> = [];

    // バッチ処理（5件ずつ、レート制限対策）
    const batchSize = 5;
    for (let i = 0; i < tickets.length; i += batchSize) {
      const batch = tickets.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (ticket) => {
          try {
            const result = await this.detectRisk({ ticket_id: ticket.ticket_id });

            // high または critical の場合のみ記録
            if (result.risk_level === 'high' || result.risk_level === 'critical') {
              highRiskTickets.push({
                ticket_id: ticket.ticket_id,
                ticket_number: ticket.ticket_number,
                risk_level: result.risk_level,
                risk_score: result.risk_score,
              });
            }
          } catch (error) {
            logger.error(`❌ リスクチェック失敗 (${ticket.ticket_number}):`, error);
          }
        })
      );

      // レート制限対策: 1秒待機
      if (i + batchSize < tickets.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      logger.info(`📈 進捗: ${Math.min(i + batchSize, tickets.length)}/${tickets.length}件`);
    }

    logger.info(`✅ バッチリスクチェック完了: ${highRiskTickets.length}件のハイリスクチケット検出`);

    return {
      high_risk_tickets: highRiskTickets,
      total_checked: tickets.length,
    };
  }

  /**
   * リスクレベルに応じた通知を送信
   */
  static async sendRiskNotification(
    ticketId: string,
    riskResult: EscalationRiskResult
  ): Promise<void> {
    // high または critical の場合のみ通知
    if (riskResult.risk_level === 'high' || riskResult.risk_level === 'critical') {
      // チケット情報を取得
      const ticketResult = await query(
        `SELECT ticket_number, subject, assignee_id
         FROM tickets
         WHERE ticket_id = $1`,
        [ticketId]
      );

      if (ticketResult.rows.length === 0) return;

      const ticket = ticketResult.rows[0];

      // Slack 通知（将来実装）
      // await sendSlackAlert(
      //   `⚠️ エスカレーションリスク検出: ${ticket.ticket_number}`,
      //   riskResult.recommended_actions
      // );

      // WebSocket 通知（リアルタイム）
      // await websocketService.emit('escalation-alert', {
      //   ticket_id: ticketId,
      //   ticket_number: ticket.ticket_number,
      //   risk_level: riskResult.risk_level,
      //   risk_score: riskResult.risk_score,
      // });

      // Manager へのメール通知
      await query(
        `INSERT INTO notifications (user_id, type, title, body, ticket_id, created_at)
         SELECT u.user_id, 'escalation_alert', $1, $2, $3, CURRENT_TIMESTAMP
         FROM users u
         WHERE u.role = 'manager'`,
        [
          `エスカレーションリスク: ${ticket.ticket_number}`,
          `リスクレベル: ${riskResult.risk_level}\nリスクスコア: ${riskResult.risk_score}\n\n推奨アクション:\n${riskResult.recommended_actions.join('\n')}`,
          ticketId,
        ]
      );

      logger.info(`📧 エスカレーション通知送信: ${ticket.ticket_number}`);
    }
  }
}
