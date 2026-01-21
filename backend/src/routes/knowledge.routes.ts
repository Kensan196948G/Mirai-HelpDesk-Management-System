import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

// ナレッジ記事一覧取得
router.get('/', async (req, res, next) => {
  res.json({ success: true, data: { articles: [] } });
});

// ナレッジ記事検索
router.get('/search', async (req, res, next) => {
  res.json({ success: true, data: { articles: [] } });
});

export default router;
