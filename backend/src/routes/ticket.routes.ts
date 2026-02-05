import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { TicketController } from '../controllers/ticket.controller';
import { ApprovalController } from '../controllers/approval.controller';
import { SLAController } from '../controllers/sla.controller';
import { AttachmentController } from '../controllers/attachment.controller';
import { body, param } from 'express-validator';
import { validate, runValidations } from '../middleware/validation';
import { UserRole } from '../types';
import { uploadMultiple } from '../middleware/upload';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

// チケット一覧取得
router.get('/', TicketController.getAll);

// チケット統計取得
router.get('/statistics', TicketController.getStatistics);

// チケット詳細取得
router.get(
  '/:id',
  runValidations([param('id').isUUID().withMessage('Invalid ticket ID')]),
  validate,
  TicketController.getById
);

// チケット作成
router.post(
  '/',
  runValidations([
    body('type').notEmpty().withMessage('Type is required'),
    body('subject').notEmpty().withMessage('Subject is required'),
    body('description').notEmpty().withMessage('Description is required'),
    body('impact').notEmpty().withMessage('Impact is required'),
    body('urgency').notEmpty().withMessage('Urgency is required'),
  ]),
  validate,
  TicketController.create
);

// チケット更新
router.patch(
  '/:id',
  runValidations([param('id').isUUID().withMessage('Invalid ticket ID')]),
  validate,
  TicketController.update
);

// ステータス更新
router.patch(
  '/:id/status',
  runValidations([
    param('id').isUUID().withMessage('Invalid ticket ID'),
    body('status').notEmpty().withMessage('Status is required'),
  ]),
  validate,
  TicketController.updateStatus
);

// チケット割り当て（Agent以上）
router.post(
  '/:id/assign',
  authorize(UserRole.AGENT, UserRole.M365_OPERATOR, UserRole.MANAGER),
  runValidations([
    param('id').isUUID().withMessage('Invalid ticket ID'),
    body('assignee_id').isUUID().withMessage('Valid assignee ID is required'),
  ]),
  validate,
  TicketController.assign
);

// コメント追加
router.post(
  '/:id/comments',
  runValidations([
    param('id').isUUID().withMessage('Invalid ticket ID'),
    body('body').notEmpty().withMessage('Comment body is required'),
  ]),
  validate,
  TicketController.addComment
);

// 承認依頼作成（Agent/M365 Operator/Manager）
router.post(
  '/:id/approvals',
  authorize(UserRole.AGENT, UserRole.M365_OPERATOR, UserRole.MANAGER),
  runValidations([
    param('id').isUUID().withMessage('Invalid ticket ID'),
    body('approver_id').isUUID().withMessage('Valid approver ID is required'),
    body('reason').notEmpty().withMessage('Reason is required'),
  ]),
  validate,
  ApprovalController.createApprovalRequest
);

// チケットの承認履歴取得
router.get(
  '/:id/approvals',
  runValidations([param('id').isUUID().withMessage('Invalid ticket ID')]),
  validate,
  ApprovalController.getApprovalHistory
);

// チケットSLAステータス取得
router.get(
  '/:id/sla-status',
  runValidations([param('id').isUUID().withMessage('Invalid ticket ID')]),
  validate,
  SLAController.getTicketSLAStatus
);

// チケット優先度変更 + SLA再計算（Agent以上）
router.patch(
  '/:id/priority',
  authorize(UserRole.AGENT, UserRole.M365_OPERATOR, UserRole.MANAGER),
  runValidations([
    param('id').isUUID().withMessage('Invalid ticket ID'),
    body('priority').notEmpty().withMessage('Priority is required'),
  ]),
  validate,
  SLAController.updateTicketPriority
);

// チケット添付ファイル一覧取得
router.get(
  '/:id/attachments',
  runValidations([param('id').isUUID().withMessage('Invalid ticket ID')]),
  validate,
  AttachmentController.getByTicketId
);

// チケット添付ファイルアップロード
router.post(
  '/:id/attachments',
  runValidations([param('id').isUUID().withMessage('Invalid ticket ID')]),
  validate,
  uploadMultiple,
  AttachmentController.upload
);

// 添付ファイルダウンロード
router.get(
  '/:id/attachments/:fileId',
  runValidations([
    param('id').isUUID().withMessage('Invalid ticket ID'),
    param('fileId').isUUID().withMessage('Invalid attachment ID'),
  ]),
  validate,
  AttachmentController.downloadByFileId
);

// 添付ファイル削除
router.delete(
  '/:id/attachments/:fileId',
  runValidations([
    param('id').isUUID().withMessage('Invalid ticket ID'),
    param('fileId').isUUID().withMessage('Invalid attachment ID'),
  ]),
  validate,
  AttachmentController.deleteByFileId
);

// チケット履歴取得
router.get(
  '/:id/history',
  runValidations([param('id').isUUID().withMessage('Invalid ticket ID')]),
  validate,
  TicketController.getHistory
);

export default router;
