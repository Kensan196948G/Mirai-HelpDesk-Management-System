import { query, withTransaction } from '../config/database';
import { M365Task, M365TaskType, M365TaskState } from '../types';

export class M365TaskModel {
  // M365タスク作成
  static async create(taskData: {
    ticket_id: string;
    task_type: M365TaskType;
    target_upn?: string;
    target_resource_id?: string;
    target_resource_name?: string;
    task_details: any;
    scheduled_at?: Date;
  }): Promise<M365Task> {
    const result = await query(
      `INSERT INTO m365_tasks (
        ticket_id, task_type, target_upn, target_resource_id,
        target_resource_name, task_details, state, scheduled_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        taskData.ticket_id,
        taskData.task_type,
        taskData.target_upn,
        taskData.target_resource_id,
        taskData.target_resource_name,
        JSON.stringify(taskData.task_details),
        M365TaskState.PENDING,
        taskData.scheduled_at,
      ]
    );

    return result.rows[0];
  }

  // タスクID で検索
  static async findById(taskId: string): Promise<M365Task | null> {
    const result = await query(
      `SELECT t.*,
              tk.ticket_number,
              tk.subject as ticket_subject,
              u.display_name as operator_name,
              u.email as operator_email,
              a.state as approval_state
       FROM m365_tasks t
       LEFT JOIN tickets tk ON t.ticket_id = tk.ticket_id
       LEFT JOIN users u ON t.operator_id = u.user_id
       LEFT JOIN approvals a ON t.approval_id = a.approval_id
       WHERE t.task_id = $1`,
      [taskId]
    );

    return result.rows[0] || null;
  }

  // チケットIDで検索
  static async findByTicketId(ticketId: string): Promise<M365Task[]> {
    const result = await query(
      `SELECT t.*,
              u.display_name as operator_name,
              u.email as operator_email,
              a.state as approval_state
       FROM m365_tasks t
       LEFT JOIN users u ON t.operator_id = u.user_id
       LEFT JOIN approvals a ON t.approval_id = a.approval_id
       WHERE t.ticket_id = $1
       ORDER BY t.created_at DESC`,
      [ticketId]
    );

    return result.rows;
  }

  // タスク一覧取得（フィルタ付き）
  static async findAll(filters?: {
    state?: M365TaskState | M365TaskState[];
    task_type?: M365TaskType;
    operator_id?: string;
    ticket_id?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ tasks: M365Task[]; total: number }> {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let queryText = `
      SELECT t.*,
             tk.ticket_number,
             tk.subject as ticket_subject,
             tk.priority,
             u.display_name as operator_name,
             a.state as approval_state
      FROM m365_tasks t
      LEFT JOIN tickets tk ON t.ticket_id = tk.ticket_id
      LEFT JOIN users u ON t.operator_id = u.user_id
      LEFT JOIN approvals a ON t.approval_id = a.approval_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.state) {
      if (Array.isArray(filters.state)) {
        queryText += ` AND t.state = ANY($${paramIndex})`;
        params.push(filters.state);
      } else {
        queryText += ` AND t.state = $${paramIndex}`;
        params.push(filters.state);
      }
      paramIndex++;
    }

    if (filters?.task_type) {
      queryText += ` AND t.task_type = $${paramIndex}`;
      params.push(filters.task_type);
      paramIndex++;
    }

    if (filters?.operator_id) {
      queryText += ` AND t.operator_id = $${paramIndex}`;
      params.push(filters.operator_id);
      paramIndex++;
    }

    if (filters?.ticket_id) {
      queryText += ` AND t.ticket_id = $${paramIndex}`;
      params.push(filters.ticket_id);
      paramIndex++;
    }

    // 総件数取得
    const countResult = await query(
      queryText.replace(
        /SELECT t\.\*.*FROM m365_tasks/s,
        'SELECT COUNT(*) FROM m365_tasks'
      ),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // ページネーション付きで取得
    queryText += ` ORDER BY t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSize, offset);

    const result = await query(queryText, params);

    return {
      tasks: result.rows,
      total,
    };
  }

  // タスク更新
  static async update(
    taskId: string,
    updates: Partial<{
      state: M365TaskState;
      operator_id: string;
      approval_id: string;
      scheduled_at: Date;
      task_details: any;
    }>
  ): Promise<M365Task> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        if (key === 'task_details') {
          fields.push(`${key} = $${paramIndex}::jsonb`);
          params.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = $${paramIndex}`);
          params.push(value);
        }
        paramIndex++;
      }
    });

    // 完了時のタイムスタンプ設定
    if (updates.state === M365TaskState.COMPLETED) {
      fields.push(`completed_at = CURRENT_TIMESTAMP`);
    }

    params.push(taskId);

    const result = await query(
      `UPDATE m365_tasks SET ${fields.join(', ')} WHERE task_id = $${paramIndex} RETURNING *`,
      params
    );

    return result.rows[0];
  }

  // タスクステータス変更（履歴記録付き）
  static async updateState(
    taskId: string,
    newState: M365TaskState,
    actorId: string,
    reason?: string
  ): Promise<M365Task> {
    return withTransaction(async (client) => {
      // 現在のタスク情報取得
      const currentResult = await client.query(
        'SELECT * FROM m365_tasks WHERE task_id = $1',
        [taskId]
      );
      const currentTask = currentResult.rows[0];

      if (!currentTask) {
        throw new Error('M365タスクが見つかりません');
      }

      // ステータス更新
      const updateFields: string[] = ['state = $1'];
      const updateParams: any[] = [newState];

      if (newState === M365TaskState.COMPLETED) {
        updateFields.push('completed_at = CURRENT_TIMESTAMP');
      }

      updateParams.push(taskId);

      const updateResult = await client.query(
        `UPDATE m365_tasks SET ${updateFields.join(', ')} WHERE task_id = $${updateParams.length} RETURNING *`,
        updateParams
      );

      // チケット履歴に記録
      await client.query(
        `INSERT INTO ticket_history (
          ticket_id, actor_id, actor_name, action,
          before_value, after_value, description
        ) SELECT
          $1, $2, u.display_name, 'm365_task_state_change',
          $3::jsonb, $4::jsonb, $5
        FROM users u WHERE u.user_id = $2`,
        [
          currentTask.ticket_id,
          actorId,
          JSON.stringify({ task_id: taskId, state: currentTask.state }),
          JSON.stringify({ task_id: taskId, state: newState }),
          reason ||
            `M365タスクのステータスを ${currentTask.state} から ${newState} に変更`,
        ]
      );

      return updateResult.rows[0];
    });
  }

  // タスク割り当て
  static async assignOperator(
    taskId: string,
    operatorId: string,
    actorId: string
  ): Promise<M365Task> {
    return withTransaction(async (client) => {
      // タスク更新
      const result = await client.query(
        `UPDATE m365_tasks
         SET operator_id = $1
         WHERE task_id = $2
         RETURNING *`,
        [operatorId, taskId]
      );

      const task = result.rows[0];

      // 履歴記録
      await client.query(
        `INSERT INTO ticket_history (
          ticket_id, actor_id, actor_name, action,
          after_value, description
        ) SELECT
          $1, $2, u.display_name, 'm365_task_assigned',
          $3::jsonb, $4
        FROM users u WHERE u.user_id = $2`,
        [
          task.ticket_id,
          actorId,
          JSON.stringify({ task_id: taskId, operator_id: operatorId }),
          `M365タスクを担当者に割り当て`,
        ]
      );

      return result.rows[0];
    });
  }

  // 承認済みタスクに承認IDを紐付け
  static async linkApproval(
    taskId: string,
    approvalId: string
  ): Promise<M365Task> {
    const result = await query(
      `UPDATE m365_tasks
       SET approval_id = $1,
           state = $2
       WHERE task_id = $3
       RETURNING *`,
      [approvalId, M365TaskState.APPROVED, taskId]
    );

    return result.rows[0];
  }

  // 実施待ちタスク取得（スケジュール時刻到来済み）
  static async findPendingExecutionTasks(): Promise<M365Task[]> {
    const result = await query(
      `SELECT t.*,
              tk.ticket_number,
              tk.subject as ticket_subject
       FROM m365_tasks t
       LEFT JOIN tickets tk ON t.ticket_id = tk.ticket_id
       WHERE t.state = $1
         AND t.scheduled_at IS NOT NULL
         AND t.scheduled_at <= CURRENT_TIMESTAMP
       ORDER BY t.scheduled_at ASC`,
      [M365TaskState.APPROVED]
    );

    return result.rows;
  }

  // タスク統計取得
  static async getStatistics(filters?: {
    operator_id?: string;
    from_date?: Date;
    to_date?: Date;
  }): Promise<any> {
    let queryText = `
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE state = 'pending') as pending_count,
        COUNT(*) FILTER (WHERE state = 'approved') as approved_count,
        COUNT(*) FILTER (WHERE state = 'in_progress') as in_progress_count,
        COUNT(*) FILTER (WHERE state = 'completed') as completed_count,
        COUNT(*) FILTER (WHERE state = 'failed') as failed_count,
        COUNT(*) FILTER (WHERE state = 'canceled') as canceled_count
      FROM m365_tasks
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.operator_id) {
      queryText += ` AND operator_id = $${paramIndex}`;
      params.push(filters.operator_id);
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
