import { Request, Response, NextFunction } from 'express';
import { ApprovalService } from '../services/approval.service';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger } from '../utils/logger';
import { ApprovalState, UserRole } from '../types';

export class ApprovalController {
  /**
   * 承認依頼作成
   * POST /api/tickets/:id/approvals
   */
  static createApprovalRequest = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id: ticketId } = req.params;
      const { approver_id, reason } = req.body;
      const user = req.user!;

      // バリデーション
      if (!approver_id) {
        throw new AppError('承認者IDは必須です', 400, 'APPROVER_ID_REQUIRED');
      }

      if (!reason || reason.trim().length === 0) {
        throw new AppError('承認依頼理由は必須です', 400, 'REASON_REQUIRED');
      }

      // 承認依頼作成（SODチェック込み）
      const approval = await ApprovalService.createApprovalRequest(
        ticketId,
        user.user_id,
        approver_id,
        reason
      );

      logger.info('承認依頼が作成されました', {
        approval_id: approval.approval_id,
        ticket_id: ticketId,
        requester_id: user.user_id,
        approver_id: approver_id,
      });

      res.status(201).json({
        success: true,
        data: { approval },
      });
    }
  );

  /**
   * 承認実行
   * POST /api/approvals/:id/approve
   */
  static approve = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id: approvalId } = req.params;
      const { comment } = req.body;
      const user = req.user!;

      // 承認権限チェック
      if (
        user.role !== UserRole.APPROVER &&
        user.role !== UserRole.MANAGER
      ) {
        throw new AppError(
          '承認権限がありません',
          403,
          'APPROVAL_PERMISSION_DENIED'
        );
      }

      // 承認実行
      const approval = await ApprovalService.approve(
        approvalId,
        user.user_id,
        comment
      );

      logger.info('承認依頼が承認されました', {
        approval_id: approvalId,
        approver_id: user.user_id,
      });

      res.json({
        success: true,
        data: { approval },
        message: '承認依頼を承認しました',
      });
    }
  );

  /**
   * 承認却下
   * POST /api/approvals/:id/reject
   */
  static reject = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id: approvalId } = req.params;
      const { reason } = req.body;
      const user = req.user!;

      // 承認権限チェック
      if (
        user.role !== UserRole.APPROVER &&
        user.role !== UserRole.MANAGER
      ) {
        throw new AppError(
          '承認権限がありません',
          403,
          'APPROVAL_PERMISSION_DENIED'
        );
      }

      // バリデーション
      if (!reason || reason.trim().length === 0) {
        throw new AppError('却下理由は必須です', 400, 'REJECTION_REASON_REQUIRED');
      }

      // 却下実行
      const approval = await ApprovalService.reject(
        approvalId,
        user.user_id,
        reason
      );

      logger.info('承認依頼が却下されました', {
        approval_id: approvalId,
        approver_id: user.user_id,
        reason: reason,
      });

      res.json({
        success: true,
        data: { approval },
        message: '承認依頼を却下しました',
      });
    }
  );

  /**
   * 承認一覧取得
   * GET /api/approvals
   */
  static getAll = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { state, ticket_id, page, pageSize } = req.query;
      const user = req.user!;

      // フィルタ構築
      let filters: any = {
        page: page ? parseInt(page as string) : 1,
        pageSize: pageSize ? parseInt(pageSize as string) : 20,
      };

      // ステータスフィルタ
      if (state) {
        if (typeof state === 'string' && state.includes(',')) {
          filters.state = state.split(',') as ApprovalState[];
        } else {
          filters.state = state as ApprovalState;
        }
      }

      // チケットIDフィルタ
      if (ticket_id) {
        filters.ticket_id = ticket_id as string;
      }

      // 承認者でフィルタ（自分の承認依頼のみ表示）
      // ManagerとAuditorは全件閲覧可能
      if (
        user.role !== UserRole.MANAGER &&
        user.role !== UserRole.AUDITOR
      ) {
        filters.approver_id = user.user_id;
      }

      const result = await ApprovalService.getApprovals(filters);

      res.json({
        success: true,
        data: {
          approvals: result.approvals,
          meta: {
            total: result.total,
            page: filters.page,
            pageSize: filters.pageSize,
            totalPages: Math.ceil(result.total / filters.pageSize),
          },
        },
      });
    }
  );

  /**
   * 承認詳細取得
   * GET /api/approvals/:id
   */
  static getById = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id: approvalId } = req.params;
      const user = req.user!;

      const approval = await ApprovalService.getApprovalById(approvalId);

      // アクセス権限チェック
      // 承認者、依頼者、Manager、Auditorのみ閲覧可能
      if (
        user.role !== UserRole.MANAGER &&
        user.role !== UserRole.AUDITOR &&
        approval.approver_id !== user.user_id &&
        approval.requester_id !== user.user_id
      ) {
        throw new AppError(
          'この承認依頼を閲覧する権限がありません',
          403,
          'FORBIDDEN'
        );
      }

      res.json({
        success: true,
        data: { approval },
      });
    }
  );

  /**
   * チケットの承認履歴取得
   * GET /api/tickets/:id/approvals
   */
  static getApprovalHistory = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id: ticketId } = req.params;

      const approvals = await ApprovalService.getApprovalHistory(ticketId);

      res.json({
        success: true,
        data: { approvals },
      });
    }
  );

  /**
   * 承認統計取得
   * GET /api/approvals/statistics
   */
  static getStatistics = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user!;

      // 承認者の場合は自分の統計のみ
      const approverId =
        user.role === UserRole.APPROVER ? user.user_id : undefined;

      const statistics = await ApprovalService.getStatistics(approverId);

      res.json({
        success: true,
        data: { statistics },
      });
    }
  );

  /**
   * SODチェック
   * POST /api/approvals/validate-sod
   */
  static validateSOD = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { ticket_id, approver_id } = req.body;

      if (!ticket_id || !approver_id) {
        throw new AppError(
          'ticket_id と approver_id は必須です',
          400,
          'VALIDATION_ERROR'
        );
      }

      const isValid = await ApprovalService.validateSOD(
        ticket_id,
        approver_id
      );

      res.json({
        success: true,
        data: {
          is_valid: isValid,
          message: isValid
            ? 'SODチェックに合格しました'
            : 'SOD違反: この承認者は承認できません',
        },
      });
    }
  );
}
