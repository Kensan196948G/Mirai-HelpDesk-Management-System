import { query } from '../config/database';
import { TicketComment, CommentVisibility } from '../types';

export class TicketCommentModel {
  // コメント作成
  static async create(commentData: {
    ticket_id: string;
    author_id: string;
    body: string;
    visibility: CommentVisibility;
  }): Promise<TicketComment> {
    const result = await query(
      `INSERT INTO ticket_comments (ticket_id, author_id, body, visibility)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [
        commentData.ticket_id,
        commentData.author_id,
        commentData.body,
        commentData.visibility,
      ]
    );

    return result.rows[0];
  }

  // チケットのコメント一覧取得
  static async findByTicketId(
    ticketId: string,
    includeInternal: boolean = true
  ): Promise<TicketComment[]> {
    let queryText = `
      SELECT c.*,
             u.display_name as author_name,
             u.role as author_role
      FROM ticket_comments c
      LEFT JOIN users u ON c.author_id = u.user_id
      WHERE c.ticket_id = $1
    `;

    const params: any[] = [ticketId];

    if (!includeInternal) {
      queryText += ` AND c.visibility = $2`;
      params.push(CommentVisibility.PUBLIC);
    }

    queryText += ' ORDER BY c.created_at ASC';

    const result = await query(queryText, params);
    return result.rows;
  }

  // コメント詳細取得
  static async findById(commentId: string): Promise<TicketComment | null> {
    const result = await query(
      `SELECT c.*,
              u.display_name as author_name
       FROM ticket_comments c
       LEFT JOIN users u ON c.author_id = u.user_id
       WHERE c.comment_id = $1`,
      [commentId]
    );

    return result.rows[0] || null;
  }

  // コメント更新
  static async update(
    commentId: string,
    updates: Partial<{
      body: string;
      visibility: CommentVisibility;
    }>
  ): Promise<TicketComment> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    if (updates.body !== undefined) {
      fields.push(`body = $${paramIndex}`);
      params.push(updates.body);
      paramIndex++;
    }

    if (updates.visibility !== undefined) {
      fields.push(`visibility = $${paramIndex}`);
      params.push(updates.visibility);
      paramIndex++;
    }

    params.push(commentId);

    const result = await query(
      `UPDATE ticket_comments SET ${fields.join(', ')} WHERE comment_id = $${paramIndex} RETURNING *`,
      params
    );

    return result.rows[0];
  }

  // コメント削除（論理削除ではなく物理削除）
  static async delete(commentId: string): Promise<void> {
    await query('DELETE FROM ticket_comments WHERE comment_id = $1', [
      commentId,
    ]);
  }
}
