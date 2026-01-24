import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

// カテゴリ一覧取得
router.get('/', async (req, res, next) => {
  res.json({ success: true, data: { categories: [] } });
});

export default router;
