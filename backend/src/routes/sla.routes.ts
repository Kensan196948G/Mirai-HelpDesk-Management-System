import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { SLAController } from '../controllers/sla.controller';
import { param, body } from 'express-validator';
import { validate, runValidations } from '../middleware/validation';
import { UserRole } from '../types';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

// SLAポリシー一覧取得
router.get('/policies', SLAController.getPolicies);

// SLAメトリクス取得（Manager以上）
router.get(
  '/metrics',
  authorize(UserRole.MANAGER, UserRole.AUDITOR),
  SLAController.getMetrics
);

// 特定SLAポリシー取得
router.get(
  '/policies/:id',
  runValidations([param('id').isUUID().withMessage('Invalid SLA policy ID')]),
  validate,
  SLAController.getPolicy
);

export default router;
