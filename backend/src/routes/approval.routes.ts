import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

// 承認依頼一覧取得（承認者のみ）
router.get(
  '/',
  authorize(UserRole.APPROVER, UserRole.MANAGER),
  async (req, res, next) => {
    res.json({ success: true, data: { approvals: [] } });
  }
);

// 承認実行
router.post('/:id/approve', async (req, res, next) => {
  res.json({ success: true, data: { approval: null } });
});

// 却下実行
router.post('/:id/reject', async (req, res, next) => {
  res.json({ success: true, data: { approval: null } });
});

export default router;
