import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { query } from '../config/database';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

// カテゴリ一覧取得
router.get(
  '/',
  asyncHandler(async (req, res, next) => {
    const { is_active } = req.query;

    let queryText = `
      SELECT category_id, name, description, parent_category_id,
             path, level, sort_order, is_active
      FROM categories
      WHERE 1=1
    `;

    const params: any[] = [];

    if (is_active !== undefined) {
      queryText += ` AND is_active = $1`;
      params.push(is_active === 'true');
    }

    queryText += ` ORDER BY sort_order, path`;

    const result = await query(queryText, params);

    res.json({
      success: true,
      data: {
        categories: result.rows,
      },
    });
  })
);

export default router;
