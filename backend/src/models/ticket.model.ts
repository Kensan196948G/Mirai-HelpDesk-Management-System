import { query, withTransaction } from '../config/database';
import {
  Ticket,
  TicketType,
  TicketStatus,
  ImpactLevel,
  UrgencyLevel,
  PriorityLevel,
} from '../types';
import { SLAService } from '../services/sla.service';

export class TicketModel {
  // チケット作成
  static async create(ticketData: {
    type: TicketType;
    subject: string;
    description: string;
    impact: ImpactLevel;
    urgency: UrgencyLevel;
    requester_id: string;
    category_id?: string;
  }): Promise<Ticket> {
    return withTransaction(async (client) => {
      // チケットを仮作成（優先度は自動計算されるトリガーに依存）
      const insertResult = await client.query(
        `INSERT INTO tickets (
          type, subject, description, impact, urgency,
          requester_id, category_id, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *`,
        [
          ticketData.type,
          ticketData.subject,
          ticketData.description,
          ticketData.impact,
          ticketData.urgency,
          ticketData.requester_id,
          ticketData.category_id,
          TicketStatus.NEW,
        ]
      );

      const ticket = insertResult.rows[0];

      // SLA期限を計算
      const { response_due_at, due_at } = SLAService.calculateDueDates(
        ticket.priority,
        ticket.created_at
      );

      // SLA期限を更新
      const updateResult = await client.query(
        `UPDATE tickets
         SET response_due_at = $1, due_at = $2
         WHERE ticket_id = $3
         RETURNING *`,
        [response_due_at, due_at, ticket.ticket_id]
      );

      return updateResult.rows[0];
    });
  }

  // チケット検索（フィルタ付き）
  static async findAll(filters?: {
    status?: TicketStatus | TicketStatus[];
    priority?: PriorityLevel;
    requester_id?: string;
    assignee_id?: string;
    category_id?: string;
    type?: TicketType;
    page?: number;
    pageSize?: number;
  }): Promise<{ tickets: Ticket[]; total: number }> {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let queryText = `
      SELECT t.*,
             u1.display_name as requester_name,
             u2.display_name as assignee_name,
             c.name as category_name
      FROM tickets t
      LEFT JOIN users u1 ON t.requester_id = u1.user_id
      LEFT JOIN users u2 ON t.assignee_id = u2.user_id
      LEFT JOIN categories c ON t.category_id = c.category_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.status) {
      if (Array.isArray(filters.status)) {
        queryText += ` AND t.status = ANY($${paramIndex})`;
        params.push(filters.status);
      } else {
        queryText += ` AND t.status = $${paramIndex}`;
        params.push(filters.status);
      }
      paramIndex++;
    }

    if (filters?.priority) {
      queryText += ` AND t.priority = $${paramIndex}`;
      params.push(filters.priority);
      paramIndex++;
    }

    if (filters?.requester_id) {
      queryText += ` AND t.requester_id = $${paramIndex}`;
      params.push(filters.requester_id);
      paramIndex++;
    }

    if (filters?.assignee_id) {
      queryText += ` AND t.assignee_id = $${paramIndex}`;
      params.push(filters.assignee_id);
      paramIndex++;
    }

    if (filters?.category_id) {
      queryText += ` AND t.category_id = $${paramIndex}`;
      params.push(filters.category_id);
      paramIndex++;
    }

    if (filters?.type) {
      queryText += ` AND t.type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    // 総件数取得
    const countResult = await query(
      queryText.replace(
        'SELECT t.*, u1.display_name as requester_name, u2.display_name as assignee_name, c.name as category_name',
        'SELECT COUNT(*)'
      ),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // ページネーション付きで取得
    queryText += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSize, offset);

    const result = await query(queryText, params);

    return {
      tickets: result.rows,
      total,
    };
  }

  // チケット詳細取得
  static async findById(ticketId: string): Promise<Ticket | null> {
    const result = await query(
      `SELECT t.*,
              u1.display_name as requester_name,
              u1.email as requester_email,
              u2.display_name as assignee_name,
              u2.email as assignee_email,
              c.name as category_name,
              sla.name as sla_policy_name
       FROM tickets t
       LEFT JOIN users u1 ON t.requester_id = u1.user_id
       LEFT JOIN users u2 ON t.assignee_id = u2.user_id
       LEFT JOIN categories c ON t.category_id = c.category_id
       LEFT JOIN sla_policies sla ON t.sla_policy_id = sla.sla_policy_id
       WHERE t.ticket_id = $1`,
      [ticketId]
    );

    return result.rows[0] || null;
  }

  // チケット番号で検索
  static async findByTicketNumber(ticketNumber: string): Promise<Ticket | null> {
    const result = await query(
      'SELECT * FROM tickets WHERE ticket_number = $1',
      [ticketNumber]
    );

    return result.rows[0] || null;
  }

  // チケット更新
  static async update(
    ticketId: string,
    updates: Partial<{
      subject: string;
      description: string;
      status: TicketStatus;
      priority: PriorityLevel;
      impact: ImpactLevel;
      urgency: UrgencyLevel;
      assignee_id: string;
      category_id: string;
      resolution_summary: string;
      root_cause: string;
    }>
  ): Promise<Ticket> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });

    // ステータス変更時のタイムスタンプ自動設定
    if (updates.status === TicketStatus.ASSIGNED && updates.assignee_id) {
      fields.push(`assigned_at = CURRENT_TIMESTAMP`);
    }
    if (updates.status === TicketStatus.RESOLVED) {
      fields.push(`resolved_at = CURRENT_TIMESTAMP`);
    }
    if (updates.status === TicketStatus.CLOSED) {
      fields.push(`closed_at = CURRENT_TIMESTAMP`);
    }

    params.push(ticketId);

    const result = await query(
      `UPDATE tickets SET ${fields.join(', ')} WHERE ticket_id = $${paramIndex} RETURNING *`,
      params
    );

    return result.rows[0];
  }

  // チケットステータス変更（履歴記録付き）
  static async updateStatus(
    ticketId: string,
    newStatus: TicketStatus,
    actorId: string,
    reason?: string
  ): Promise<Ticket> {
    return withTransaction(async (client) => {
      // 現在のチケット情報取得
      const currentResult = await client.query(
        'SELECT * FROM tickets WHERE ticket_id = $1',
        [ticketId]
      );
      const currentTicket = currentResult.rows[0];

      if (!currentTicket) {
        throw new Error('Ticket not found');
      }

      // ステータス更新
      const updateFields: string[] = ['status = $1'];
      const updateParams: any[] = [newStatus];

      if (newStatus === TicketStatus.RESOLVED) {
        updateFields.push('resolved_at = CURRENT_TIMESTAMP');
      } else if (newStatus === TicketStatus.CLOSED) {
        updateFields.push('closed_at = CURRENT_TIMESTAMP');
      }

      updateParams.push(ticketId);

      const updateResult = await client.query(
        `UPDATE tickets SET ${updateFields.join(', ')} WHERE ticket_id = $${updateParams.length} RETURNING *`,
        updateParams
      );

      // 履歴記録
      await client.query(
        `INSERT INTO ticket_history (
          ticket_id, actor_id, actor_name, action,
          before_value, after_value, description
        ) SELECT
          $1, $2, u.display_name, 'status_change',
          $3::jsonb, $4::jsonb, $5
        FROM users u WHERE u.user_id = $2`,
        [
          ticketId,
          actorId,
          JSON.stringify({ status: currentTicket.status }),
          JSON.stringify({ status: newStatus }),
          reason || `ステータスを ${currentTicket.status} から ${newStatus} に変更`,
        ]
      );

      return updateResult.rows[0];
    });
  }

  // チケット割り当て
  static async assign(
    ticketId: string,
    assigneeId: string,
    actorId: string
  ): Promise<Ticket> {
    return withTransaction(async (client) => {
      // チケット更新
      const result = await client.query(
        `UPDATE tickets
         SET assignee_id = $1,
             status = $2,
             assigned_at = CURRENT_TIMESTAMP
         WHERE ticket_id = $3
         RETURNING *`,
        [assigneeId, TicketStatus.ASSIGNED, ticketId]
      );

      // 履歴記録
      await client.query(
        `INSERT INTO ticket_history (
          ticket_id, actor_id, actor_name, action,
          after_value, description
        ) SELECT
          $1, $2, u.display_name, 'assigned',
          $3::jsonb, $4
        FROM users u WHERE u.user_id = $2`,
        [
          ticketId,
          actorId,
          JSON.stringify({ assignee_id: assigneeId }),
          `担当者を割り当て`,
        ]
      );

      return result.rows[0];
    });
  }

  // SLA期限超過チケット検索
  static async findOverdueSLA(): Promise<Ticket[]> {
    const result = await query(
      `SELECT t.*, u.display_name as requester_name
       FROM tickets t
       LEFT JOIN users u ON t.requester_id = u.user_id
       WHERE t.status NOT IN ($1, $2, $3)
       AND (
         (t.response_due_at IS NOT NULL AND t.response_due_at < CURRENT_TIMESTAMP)
         OR (t.due_at IS NOT NULL AND t.due_at < CURRENT_TIMESTAMP)
       )
       ORDER BY t.priority, t.due_at`,
      [TicketStatus.CLOSED, TicketStatus.CANCELED, TicketStatus.RESOLVED]
    );

    return result.rows;
  }

  // チケット統計
  static async getStatistics(filters?: {
    requester_id?: string;
    assignee_id?: string;
    from_date?: Date;
    to_date?: Date;
  }): Promise<any> {
    let queryText = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'new') as new_count,
        COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE status = 'resolved') as resolved_count,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_count,
        COUNT(*) FILTER (WHERE priority = 'P1') as p1_count,
        COUNT(*) FILTER (WHERE priority = 'P2') as p2_count,
        COUNT(*) FILTER (WHERE priority = 'P3') as p3_count,
        COUNT(*) FILTER (WHERE priority = 'P4') as p4_count
      FROM tickets
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.requester_id) {
      queryText += ` AND requester_id = $${paramIndex}`;
      params.push(filters.requester_id);
      paramIndex++;
    }

    if (filters?.assignee_id) {
      queryText += ` AND assignee_id = $${paramIndex}`;
      params.push(filters.assignee_id);
      paramIndex++;
    }

    if (filters?.from_date) {
      queryText += ` AND created_at >= $${paramIndex}`;
      params.push(filters.from_date);
      paramIndex++;
    }

    if (filters?.to_date) {
      queryText += ` AND created_at <= $${paramIndex}`;
      params.push(filters.to_date);
      paramIndex++;
    }

    const result = await query(queryText, params);
    return result.rows[0];
  }
}
