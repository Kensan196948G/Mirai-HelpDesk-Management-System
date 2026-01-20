import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { ApprovalController } from '../controllers/approval.controller';
import { UserRole } from '../types';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

// 承認統計取得
router.get(
  '/statistics',
  authorize(UserRole.APPROVER, UserRole.MANAGER, UserRole.AUDITOR),
  ApprovalController.getStatistics
);

// SODチェック
router.post(
  '/validate-sod',
  authorize(UserRole.AGENT, UserRole.M365_OPERATOR, UserRole.MANAGER),
  ApprovalController.validateSOD
);

// 承認依頼一覧取得
router.get(
  '/',
  authorize(UserRole.APPROVER, UserRole.MANAGER, UserRole.AUDITOR),
  ApprovalController.getAll
);

// 承認詳細取得
router.get(
  '/:id',
  authorize(
    UserRole.APPROVER,
    UserRole.MANAGER,
    UserRole.AUDITOR,
    UserRole.AGENT,
    UserRole.M365_OPERATOR
  ),
  ApprovalController.getById
);

// 承認実行
router.post(
  '/:id/approve',
  authorize(UserRole.APPROVER, UserRole.MANAGER),
  ApprovalController.approve
);

// 却下実行
router.post(
  '/:id/reject',
  authorize(UserRole.APPROVER, UserRole.MANAGER),
  ApprovalController.reject
);

export default router;
