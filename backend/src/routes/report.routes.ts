import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { ReportController } from '../controllers/report.controller';
import { UserRole } from '../types';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

// KPIレポート取得（Manager/Auditor のみ）
router.get(
  '/kpi',
  authorize(UserRole.MANAGER, UserRole.AUDITOR),
  ReportController.getKPIReport
);

export default router;
