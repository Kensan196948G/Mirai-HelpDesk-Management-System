import { query, withTransaction } from '../config/database';
import { Approval, ApprovalState } from '../types';

export class ApprovalModel {
  // 承認依頼作成
  static async create(approvalData: {
    ticket_id: string;
    approver_id: string;
    requester_id: string;
    reason: string;
  }): Promise<Approval> {
    const result = await query(
      `INSERT INTO approvals (
        ticket_id, approver_id, requester_id, reason, state
      ) VALUES ($1, $2, $3, $4, $5)
      RETURNING *`,
      [
        approvalData.ticket_id,
        approvalData.approver_id,
        approvalData.requester_id,
        approvalData.reason,
        ApprovalState.REQUESTED,
      ]
    );

    return result.rows[0];
  }

  // 承認ID で検索
  static async findById(approvalId: string): Promise<Approval | null> {
    const result = await query(
      `SELECT a.*,
              t.ticket_number,
              t.subject as ticket_subject,
              u1.display_name as approver_name,
              u1.email as approver_email,
              u2.display_name as requester_name,
              u2.email as requester_email
       FROM approvals a
       LEFT JOIN tickets t ON a.ticket_id = t.ticket_id
       LEFT JOIN users u1 ON a.approver_id = u1.user_id
       LEFT JOIN users u2 ON a.requester_id = u2.user_id
       WHERE a.approval_id = $1`,
      [approvalId]
    );

    return result.rows[0] || null;
  }

  // チケットIDで承認一覧取得
  static async findByTicketId(ticketId: string): Promise<Approval[]> {
    const result = await query(
      `SELECT a.*,
              u1.display_name as approver_name,
              u1.email as approver_email,
              u2.display_name as requester_name,
              u2.email as requester_email
       FROM approvals a
       LEFT JOIN users u1 ON a.approver_id = u1.user_id
       LEFT JOIN users u2 ON a.requester_id = u2.user_id
       WHERE a.ticket_id = $1
       ORDER BY a.created_at DESC`,
      [ticketId]
    );

    return result.rows;
  }

  // 承認者IDで承認依頼一覧取得
  static async findByApproverId(
    approverId: string,
    filters?: {
      state?: ApprovalState | ApprovalState[];
      page?: number;
      pageSize?: number;
    }
  ): Promise<{ approvals: Approval[]; total: number }> {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let queryText = `
      SELECT a.*,
             t.ticket_number,
             t.subject as ticket_subject,
             t.type as ticket_type,
             t.priority,
             u1.display_name as approver_name,
             u2.display_name as requester_name
      FROM approvals a
      LEFT JOIN tickets t ON a.ticket_id = t.ticket_id
      LEFT JOIN users u1 ON a.approver_id = u1.user_id
      LEFT JOIN users u2 ON a.requester_id = u2.user_id
      WHERE a.approver_id = $1
    `;

    const params: any[] = [approverId];
    let paramIndex = 2;

    if (filters?.state) {
      if (Array.isArray(filters.state)) {
        queryText += ` AND a.state = ANY($${paramIndex})`;
        params.push(filters.state);
      } else {
        queryText += ` AND a.state = $${paramIndex}`;
        params.push(filters.state);
      }
      paramIndex++;
    }

    // 総件数取得
    const countResult = await query(
      queryText.replace(
        /SELECT a\.\*.*FROM approvals/s,
        'SELECT COUNT(*) FROM approvals'
      ),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // ページネーション付きで取得
    queryText += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSize, offset);

    const result = await query(queryText, params);

    return {
      approvals: result.rows,
      total,
    };
  }

  // 承認一覧取得（フィルタ付き）
  static async findAll(filters?: {
    state?: ApprovalState | ApprovalState[];
    approver_id?: string;
    ticket_id?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ approvals: Approval[]; total: number }> {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let queryText = `
      SELECT a.*,
             t.ticket_number,
             t.subject as ticket_subject,
             t.type as ticket_type,
             t.priority,
             u1.display_name as approver_name,
             u1.email as approver_email,
             u2.display_name as requester_name,
             u2.email as requester_email
      FROM approvals a
      LEFT JOIN tickets t ON a.ticket_id = t.ticket_id
      LEFT JOIN users u1 ON a.approver_id = u1.user_id
      LEFT JOIN users u2 ON a.requester_id = u2.user_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.state) {
      if (Array.isArray(filters.state)) {
        queryText += ` AND a.state = ANY($${paramIndex})`;
        params.push(filters.state);
      } else {
        queryText += ` AND a.state = $${paramIndex}`;
        params.push(filters.state);
      }
      paramIndex++;
    }

    if (filters?.approver_id) {
      queryText += ` AND a.approver_id = $${paramIndex}`;
      params.push(filters.approver_id);
      paramIndex++;
    }

    if (filters?.ticket_id) {
      queryText += ` AND a.ticket_id = $${paramIndex}`;
      params.push(filters.ticket_id);
      paramIndex++;
    }

    // 総件数取得
    const countResult = await query(
      queryText.replace(
        /SELECT a\.\*.*FROM approvals/s,
        'SELECT COUNT(*) FROM approvals'
      ),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // ページネーション付きで取得
    queryText += ` ORDER BY a.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSize, offset);

    const result = await query(queryText, params);

    return {
      approvals: result.rows,
      total,
    };
  }

  // 承認処理
  static async approve(
    approvalId: string,
    approverId: string,
    comment?: string
  ): Promise<Approval> {
    return withTransaction(async (client) => {
      // 承認レコード更新
      const result = await client.query(
        `UPDATE approvals
         SET state = $1,
             comment = $2,
             responded_at = CURRENT_TIMESTAMP
         WHERE approval_id = $3
           AND approver_id = $4
           AND state = $5
         RETURNING *`,
        [
          ApprovalState.APPROVED,
          comment,
          approvalId,
          approverId,
          ApprovalState.REQUESTED,
        ]
      );

      if (result.rows.length === 0) {
        throw new Error('承認依頼が見つからないか、既に処理済みです');
      }

      const approval = result.rows[0];

      // チケット履歴に記録
      await client.query(
        `INSERT INTO ticket_history (
          ticket_id, actor_id, actor_name, action,
          after_value, description
        ) SELECT
          $1, $2, u.display_name, 'approval_approved',
          $3::jsonb, $4
        FROM users u WHERE u.user_id = $2`,
        [
          approval.ticket_id,
          approverId,
          JSON.stringify({ approval_id: approvalId }),
          `承認依頼を承認${comment ? ': ' + comment : ''}`,
        ]
      );

      return approval;
    });
  }

  // 却下処理
  static async reject(
    approvalId: string,
    approverId: string,
    reason: string
  ): Promise<Approval> {
    return withTransaction(async (client) => {
      // 却下レコード更新
      const result = await client.query(
        `UPDATE approvals
         SET state = $1,
             reason = $2,
             responded_at = CURRENT_TIMESTAMP
         WHERE approval_id = $3
           AND approver_id = $4
           AND state = $5
         RETURNING *`,
        [
          ApprovalState.REJECTED,
          reason,
          approvalId,
          approverId,
          ApprovalState.REQUESTED,
        ]
      );

      if (result.rows.length === 0) {
        throw new Error('承認依頼が見つからないか、既に処理済みです');
      }

      const approval = result.rows[0];

      // チケット履歴に記録
      await client.query(
        `INSERT INTO ticket_history (
          ticket_id, actor_id, actor_name, action,
          after_value, description
        ) SELECT
          $1, $2, u.display_name, 'approval_rejected',
          $3::jsonb, $4
        FROM users u WHERE u.user_id = $2`,
        [
          approval.ticket_id,
          approverId,
          JSON.stringify({ approval_id: approvalId }),
          `承認依頼を却下: ${reason}`,
        ]
      );

      return approval;
    });
  }

  // 承認依頼の統計情報取得
  static async getStatistics(approverId?: string): Promise<any> {
    let queryText = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE state = 'requested') as pending_count,
        COUNT(*) FILTER (WHERE state = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE state = 'rejected') as rejected_count
      FROM approvals
      WHERE 1=1
    `;

    const params: any[] = [];

    if (approverId) {
      queryText += ` AND approver_id = $1`;
      params.push(approverId);
    }

    const result = await query(queryText, params);
    return result.rows[0];
  }
}
