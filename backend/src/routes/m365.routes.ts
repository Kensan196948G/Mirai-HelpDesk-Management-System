import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { M365Controller } from '../controllers/m365.controller';
import { UserRole } from '../types';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

// M365接続テスト（管理者のみ）
router.get(
  '/test-connection',
  authorize(UserRole.MANAGER),
  M365Controller.testConnection
);

// M365ユーザー情報取得
router.get(
  '/users/:upn',
  authorize(UserRole.AGENT, UserRole.M365_OPERATOR, UserRole.MANAGER),
  M365Controller.getUser
);

// M365ユーザー一覧取得
router.get(
  '/users',
  authorize(UserRole.AGENT, UserRole.M365_OPERATOR, UserRole.MANAGER),
  M365Controller.listUsers
);

// M365ユーザーライセンス取得
router.get(
  '/users/:upn/licenses',
  authorize(UserRole.AGENT, UserRole.M365_OPERATOR, UserRole.MANAGER),
  M365Controller.getUserLicenses
);

// M365タスク一覧取得
router.get(
  '/tasks',
  authorize(UserRole.M365_OPERATOR, UserRole.MANAGER),
  M365Controller.getTasks
);

// M365タスク実施ログ記録
router.post(
  '/tasks/:id/execute',
  authorize(UserRole.M365_OPERATOR),
  M365Controller.executeTask
);

// M365実施ログ一覧取得（監査用）
router.get(
  '/execution-logs',
  authorize(UserRole.MANAGER, UserRole.AUDITOR),
  M365Controller.getExecutionLogs
);

export default router;
