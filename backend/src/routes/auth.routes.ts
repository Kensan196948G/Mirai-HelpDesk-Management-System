import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth';
import { body } from 'express-validator';
import { validate, runValidations } from '../middleware/validation';

const router = Router();

// ログイン
router.post(
  '/login',
  runValidations([
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required'),
  ]),
  validate,
  AuthController.login
);

// ユーザー登録（開発用）
router.post(
  '/register',
  runValidations([
    body('email').isEmail().withMessage('Valid email is required'),
    body('display_name').notEmpty().withMessage('Display name is required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
  ]),
  validate,
  AuthController.register
);

// 現在のユーザー情報取得
router.get('/me', authenticate, AuthController.getCurrentUser);

// ログアウト
router.post('/logout', authenticate, AuthController.logout);

// トークンリフレッシュ
router.post('/refresh', AuthController.refreshToken);

export default router;
