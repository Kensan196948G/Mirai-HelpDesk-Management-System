import { Request, Response, NextFunction } from 'express';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { pool } from '../config/database';
import { query } from '../config/database';
import { TicketModel } from '../models/ticket.model';
import { SLAService } from '../services/sla.service';
import { PriorityLevel, UserRole } from '../types';

export class SLAController {
  // SLAポリシー一覧取得
  static getPolicies = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { priority, is_active } = req.query;

      let queryText = `
        SELECT *
        FROM sla_policies
        WHERE 1=1
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (priority) {
        queryText += ` AND priority = $${paramIndex}`;
        params.push(priority);
        paramIndex++;
      }

      if (is_active !== undefined) {
        queryText += ` AND is_active = $${paramIndex}`;
        params.push(is_active === 'true');
        paramIndex++;
      }

      queryText += ' ORDER BY priority, created_at';

      const result = await query(queryText, params);

      // DB にポリシーがない場合はサービス定義のデフォルトを返す
      if (result.rows.length === 0) {
        const defaultPolicies = SLAService.getAllSLAPolicies();
        const policies = Object.entries(defaultPolicies).map(([key, value]) => ({
          priority: key,
          name: `${key} SLAポリシー`,
          response_time_minutes: value.responseMinutes,
          resolution_time_minutes: value.resolutionMinutes,
          business_hours_only: value.businessHoursOnly,
          is_active: true,
          is_default: true,
        }));

        res.json({
          success: true,
          data: {
            policies,
          },
        });
        return;
      }

      res.json({
        success: true,
        data: {
          policies: result.rows,
        },
      });
    }
  );

  // 特定SLAポリシー取得
  static getPolicy = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;

      const result = await query(
        'SELECT * FROM sla_policies WHERE sla_policy_id = $1',
        [id]
      );

      if (result.rows.length === 0) {
        throw new AppError('SLA policy not found', 404, 'SLA_POLICY_NOT_FOUND');
      }

      res.json({
        success: true,
        data: {
          policy: result.rows[0],
        },
      });
    }
  );

  // チケットのSLAステータス取得
  static getTicketSLAStatus = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const user = req.user!;

      const ticket = await TicketModel.findById(id);

      if (!ticket) {
        throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
      }

      // 一般ユーザーは自分のチケットのみ閲覧可能
      if (
        user.role === UserRole.REQUESTER &&
        ticket.requester_id !== user.user_id
      ) {
        throw new AppError(
          'You do not have permission to view this ticket',
          403,
          'FORBIDDEN'
        );
      }

      // SLAステータスを計算
      const slaStatus = SLAService.getSLAStatus(ticket);
      const slaPolicy = ticket.priority
        ? SLAService.getSLAPolicy(ticket.priority)
        : null;

      // SLA期限の計算
      const now = new Date();
      let responseTimeRemaining: number | null = null;
      let resolutionTimeRemaining: number | null = null;

      if (ticket.response_due_at) {
        responseTimeRemaining = Math.max(
          0,
          new Date(ticket.response_due_at).getTime() - now.getTime()
        );
      }

      if (ticket.due_at) {
        resolutionTimeRemaining = Math.max(
          0,
          new Date(ticket.due_at).getTime() - now.getTime()
        );
      }

      res.json({
        success: true,
        data: {
          ticket_id: ticket.ticket_id,
          priority: ticket.priority,
          status: ticket.status,
          sla: {
            responseMetSLA: slaStatus.responseMetSLA,
            resolutionMetSLA: slaStatus.resolutionMetSLA,
            isOverdue: slaStatus.isOverdue,
            response_due_at: ticket.response_due_at,
            due_at: ticket.due_at,
            responseTimeRemainingMs: responseTimeRemaining,
            resolutionTimeRemainingMs: resolutionTimeRemaining,
          },
          policy: slaPolicy
            ? {
                responseMinutes: slaPolicy.responseMinutes,
                resolutionMinutes: slaPolicy.resolutionMinutes,
                businessHoursOnly: slaPolicy.businessHoursOnly,
              }
            : null,
        },
      });
    }
  );

  // SLAメトリクス取得（管理者向け）
  static getMetrics = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { from_date, to_date } = req.query;

      let queryText = `
        SELECT * FROM tickets
        WHERE status NOT IN ('canceled')
      `;
      const params: any[] = [];
      let paramIndex = 1;

      if (from_date) {
        queryText += ` AND created_at >= $${paramIndex}`;
        params.push(new Date(from_date as string));
        paramIndex++;
      }

      if (to_date) {
        queryText += ` AND created_at <= $${paramIndex}`;
        params.push(new Date(to_date as string));
        paramIndex++;
      }

      const result = await query(queryText, params);
      const metrics = SLAService.calculateSLAMetrics(result.rows);

      res.json({
        success: true,
        data: {
          metrics,
        },
      });
    }
  );

  // チケット優先度変更 + SLA再計算
  static updateTicketPriority = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const { priority } = req.body;
      const user = req.user!;

      if (!priority) {
        throw new AppError('Priority is required', 400, 'MISSING_PRIORITY');
      }

      // 有効な優先度か確認
      if (!Object.values(PriorityLevel).includes(priority)) {
        throw new AppError(
          `Invalid priority. Must be one of: ${Object.values(PriorityLevel).join(', ')}`,
          400,
          'INVALID_PRIORITY'
        );
      }

      const ticket = await TicketModel.findById(id);

      if (!ticket) {
        throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
      }

      // SLA期限を再計算
      const { response_due_at, due_at } = SLAService.calculateDueDates(
        priority,
        ticket.created_at
      );

      // チケットを更新
      const result = await query(
        `UPDATE tickets
         SET priority = $1, response_due_at = $2, due_at = $3
         WHERE ticket_id = $4
         RETURNING *`,
        [priority, response_due_at, due_at, id]
      );

      // 履歴記録
      await query(
        `INSERT INTO ticket_history (
          ticket_id, actor_id, actor_name, action,
          before_value, after_value, description
        ) SELECT
          $1, $2, u.display_name, 'priority_change',
          $3::jsonb, $4::jsonb, $5
        FROM users u WHERE u.user_id = $2`,
        [
          id,
          user.user_id,
          JSON.stringify({ priority: ticket.priority }),
          JSON.stringify({ priority }),
          `優先度を ${ticket.priority} から ${priority} に変更`,
        ]
      );

      logger.info('Ticket priority updated with SLA recalculation', {
        ticket_id: id,
        old_priority: ticket.priority,
        new_priority: priority,
        actor: user.user_id,
      });

      res.json({
        success: true,
        data: {
          ticket: result.rows[0],
        },
      });
    }
  );
}
