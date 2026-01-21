import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

// ユーザー一覧取得（管理者のみ）
router.get(
  '/',
  authorize(UserRole.MANAGER, UserRole.AUDITOR),
  async (req, res, next) => {
    // 実装は後で追加
    res.json({ success: true, data: { users: [] } });
  }
);

// ユーザー詳細取得
router.get('/:id', async (req, res, next) => {
  // 実装は後で追加
  res.json({ success: true, data: { user: null } });
});

export default router;
