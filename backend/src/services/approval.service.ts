import { ApprovalModel } from '../models/approval.model';
import { TicketModel } from '../models/ticket.model';
import { query } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { logger, logAudit } from '../utils/logger';
import { Approval, ApprovalState, TicketStatus } from '../types';

/**
 * 承認サービス
 * SOD（職務分離）原則の遵守と承認フロー管理
 */
export class ApprovalService {
  /**
   * 承認依頼作成（SODチェック付き）
   * @param ticketId チケットID
   * @param requesterId 依頼者ID
   * @param approverId 承認者ID
   * @param reason 承認依頼理由
   */
  static async createApprovalRequest(
    ticketId: string,
    requesterId: string,
    approverId: string,
    reason: string
  ): Promise<Approval> {
    // チケット存在確認
    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) {
      throw new AppError('チケットが見つかりません', 404, 'TICKET_NOT_FOUND');
    }

    // SODチェック: 承認者 ≠ 依頼者
    if (approverId === requesterId) {
      throw new AppError(
        'SOD違反: 自己承認はできません',
        400,
        'SOD_VIOLATION_SELF_APPROVAL'
      );
    }

    // SODチェック: 承認者 ≠ チケット作成者
    if (approverId === ticket.requester_id) {
      throw new AppError(
        'SOD違反: チケット作成者は承認できません',
        400,
        'SOD_VIOLATION_REQUESTER_APPROVAL'
      );
    }

    // SODチェック: 承認者 ≠ 担当者
    if (ticket.assignee_id && approverId === ticket.assignee_id) {
      throw new AppError(
        'SOD違反: 担当者は承認できません',
        400,
        'SOD_VIOLATION_ASSIGNEE_APPROVAL'
      );
    }

    // 承認者がAPPROVER権限を持っているか確認
    const approverResult = await query(
      `SELECT role FROM users WHERE user_id = $1 AND status = 'active'`,
      [approverId]
    );

    if (approverResult.rows.length === 0) {
      throw new AppError(
        '承認者が見つからないか、無効なユーザーです',
        404,
        'APPROVER_NOT_FOUND'
      );
    }

    const approverRole = approverResult.rows[0].role;
    if (approverRole !== 'approver' && approverRole !== 'manager') {
      throw new AppError(
        '指定されたユーザーは承認権限を持っていません',
        403,
        'APPROVER_PERMISSION_DENIED'
      );
    }

    // 承認依頼作成
    const approval = await ApprovalModel.create({
      ticket_id: ticketId,
      approver_id: approverId,
      requester_id: requesterId,
      reason: reason,
    });

    // チケットステータスを「承認待ち」に変更
    await TicketModel.updateStatus(
      ticketId,
      TicketStatus.PENDING_APPROVAL,
      requesterId,
      `承認依頼を作成: ${reason}`
    );

    // 監査ログ記録
    logAudit(
      'approval_request_created',
      requesterId,
      {
        resource_type: 'approval',
        resource_id: approval.approval_id,
        ticket_id: ticketId,
        approver_id: approverId,
        reason: reason,
      }
    );

    logger.info('承認依頼を作成しました', {
      approval_id: approval.approval_id,
      ticket_id: ticketId,
      requester_id: requesterId,
      approver_id: approverId,
    });

    return approval;
  }

  /**
   * SODチェック（汎用）
   * @param ticketId チケットID
   * @param approverId 承認者ID
   * @returns SOD違反がない場合はtrue
   */
  static async validateSOD(
    ticketId: string,
    approverId: string
  ): Promise<boolean> {
    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) {
      throw new AppError('チケットが見つかりません', 404, 'TICKET_NOT_FOUND');
    }

    // チケット作成者と承認者が同一でないか
    if (ticket.requester_id === approverId) {
      return false;
    }

    // 担当者と承認者が同一でないか
    if (ticket.assignee_id && ticket.assignee_id === approverId) {
      return false;
    }

    // M365タスクの実施者と承認者が同一でないかチェック
    const taskResult = await query(
      `SELECT operator_id FROM m365_tasks WHERE ticket_id = $1`,
      [ticketId]
    );

    for (const task of taskResult.rows) {
      if (task.operator_id === approverId) {
        return false;
      }
    }

    return true;
  }

  /**
   * 承認処理
   * @param approvalId 承認ID
   * @param approverId 承認者ID
   * @param comment コメント（任意）
   */
  static async approve(
    approvalId: string,
    approverId: string,
    comment?: string
  ): Promise<Approval> {
    // 承認レコード取得
    const approval = await ApprovalModel.findById(approvalId);
    if (!approval) {
      throw new AppError('承認依頼が見つかりません', 404, 'APPROVAL_NOT_FOUND');
    }

    // 承認者の確認
    if (approval.approver_id !== approverId) {
      throw new AppError(
        'この承認依頼を処理する権限がありません',
        403,
        'APPROVAL_PERMISSION_DENIED'
      );
    }

    // 既に処理済みでないか確認
    if (approval.state !== ApprovalState.REQUESTED) {
      throw new AppError(
        'この承認依頼は既に処理済みです',
        400,
        'APPROVAL_ALREADY_PROCESSED'
      );
    }

    // 承認実行
    const updatedApproval = await ApprovalModel.approve(
      approvalId,
      approverId,
      comment
    );

    // チケットステータスを「進行中」に変更
    await TicketModel.updateStatus(
      approval.ticket_id,
      TicketStatus.IN_PROGRESS,
      approverId,
      `承認済み${comment ? ': ' + comment : ''}`
    );

    // M365タスクがある場合は「承認済み」に更新
    await query(
      `UPDATE m365_tasks
       SET state = 'approved',
           approval_id = $1
       WHERE ticket_id = $2
         AND state = 'pending'`,
      [approvalId, approval.ticket_id]
    );

    // 監査ログ記録
    logAudit(
      'approval_approved',
      approverId,
      {
        resource_type: 'approval',
        resource_id: approvalId,
        ticket_id: approval.ticket_id,
        comment: comment,
      }
    );

    logger.info('承認依頼を承認しました', {
      approval_id: approvalId,
      ticket_id: approval.ticket_id,
      approver_id: approverId,
    });

    return updatedApproval;
  }

  /**
   * 却下処理
   * @param approvalId 承認ID
   * @param approverId 承認者ID
   * @param reason 却下理由（必須）
   */
  static async reject(
    approvalId: string,
    approverId: string,
    reason: string
  ): Promise<Approval> {
    if (!reason || reason.trim().length === 0) {
      throw new AppError(
        '却下理由は必須です',
        400,
        'REJECTION_REASON_REQUIRED'
      );
    }

    // 承認レコード取得
    const approval = await ApprovalModel.findById(approvalId);
    if (!approval) {
      throw new AppError('承認依頼が見つかりません', 404, 'APPROVAL_NOT_FOUND');
    }

    // 承認者の確認
    if (approval.approver_id !== approverId) {
      throw new AppError(
        'この承認依頼を処理する権限がありません',
        403,
        'APPROVAL_PERMISSION_DENIED'
      );
    }

    // 既に処理済みでないか確認
    if (approval.state !== ApprovalState.REQUESTED) {
      throw new AppError(
        'この承認依頼は既に処理済みです',
        400,
        'APPROVAL_ALREADY_PROCESSED'
      );
    }

    // 却下実行
    const updatedApproval = await ApprovalModel.reject(
      approvalId,
      approverId,
      reason
    );

    // チケットステータスを「進行中」に戻す（再検討のため）
    await TicketModel.updateStatus(
      approval.ticket_id,
      TicketStatus.IN_PROGRESS,
      approverId,
      `承認却下: ${reason}`
    );

    // M365タスクがある場合は「キャンセル」に更新
    await query(
      `UPDATE m365_tasks
       SET state = 'canceled'
       WHERE ticket_id = $1
         AND state = 'pending'`,
      [approval.ticket_id]
    );

    // 監査ログ記録
    logAudit(
      'approval_rejected',
      approverId,
      {
        resource_type: 'approval',
        resource_id: approvalId,
        ticket_id: approval.ticket_id,
        reason: reason,
      }
    );

    logger.info('承認依頼を却下しました', {
      approval_id: approvalId,
      ticket_id: approval.ticket_id,
      approver_id: approverId,
      reason: reason,
    });

    return updatedApproval;
  }

  /**
   * 承認一覧取得
   * @param filters フィルタ条件
   */
  static async getApprovals(filters?: {
    state?: ApprovalState | ApprovalState[];
    approver_id?: string;
    ticket_id?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ approvals: Approval[]; total: number }> {
    return await ApprovalModel.findAll(filters);
  }

  /**
   * 承認詳細取得
   * @param approvalId 承認ID
   */
  static async getApprovalById(approvalId: string): Promise<Approval> {
    const approval = await ApprovalModel.findById(approvalId);
    if (!approval) {
      throw new AppError('承認依頼が見つかりません', 404, 'APPROVAL_NOT_FOUND');
    }
    return approval;
  }

  /**
   * チケットの承認履歴取得
   * @param ticketId チケットID
   */
  static async getApprovalHistory(ticketId: string): Promise<Approval[]> {
    const ticket = await TicketModel.findById(ticketId);
    if (!ticket) {
      throw new AppError('チケットが見つかりません', 404, 'TICKET_NOT_FOUND');
    }

    return await ApprovalModel.findByTicketId(ticketId);
  }

  /**
   * 承認統計取得
   * @param approverId 承認者ID（任意）
   */
  static async getStatistics(approverId?: string): Promise<any> {
    return await ApprovalModel.getStatistics(approverId);
  }
}
