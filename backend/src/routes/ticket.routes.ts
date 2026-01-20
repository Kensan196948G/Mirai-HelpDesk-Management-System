import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { TicketController } from '../controllers/ticket.controller';
import { body, param } from 'express-validator';
import { validate, runValidations } from '../middleware/validation';
import { UserRole } from '../types';

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

export default router;
