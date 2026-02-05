/**
 * AI Auth Middleware
 *
 * AI機能の認証・認可ミドルウェア
 */

import { Request, Response, NextFunction } from 'express';
import { AppError } from './errorHandler';
import { aiFeatureConfig } from '../config/claude.config';
import { UserRole } from '../types';

/**
 * AI機能使用権限チェック
 */
export const requireAIAccess = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const user = req.user;

  // 認証されていない場合
  if (!user) {
    throw new AppError('認証が必要です', 401, 'UNAUTHORIZED');
  }

  // AI機能が無効な場合
  if (!aiFeatureConfig.enabled) {
    throw new AppError(
      'AI機能は現在無効です。',
      503,
      'AI_DISABLED'
    );
  }

  // すべての認証済みユーザーがAI機能を使用可能
  // （ロール別のアクセス制御は各エンドポイントで実施）
  next();
};

/**
 * AI機能のロール別アクセス制御
 */
export const aiRBAC = {
  /**
   * AI分類機能（Requester以上 = 全ロール）
   */
  canClassify: (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      throw new AppError('認証が必要です', 401, 'UNAUTHORIZED');
    }
    // 全ロールでアクセス可能
    next();
  },

  /**
   * AI回答提案（Agent以上）
   */
  canUseSuggestions: (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      throw new AppError('認証が必要です', 401, 'UNAUTHORIZED');
    }

    const allowedRoles = [
      UserRole.AGENT,
      UserRole.M365_OPERATOR,
      UserRole.APPROVER,
      UserRole.MANAGER,
      UserRole.AUDITOR,
    ];

    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new AppError(
        'AI回答提案の使用権限がありません（Agent以上）',
        403,
        'FORBIDDEN'
      );
    }

    next();
  },

  /**
   * M365ガイド（M365 Operator以上）
   */
  canUseM365Guide: (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      throw new AppError('認証が必要です', 401, 'UNAUTHORIZED');
    }

    const allowedRoles = [UserRole.M365_OPERATOR, UserRole.MANAGER];

    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new AppError(
        'M365ガイドの使用権限がありません（M365 Operator以上）',
        403,
        'FORBIDDEN'
      );
    }

    next();
  },

  /**
   * AIメトリクス閲覧（Manager, Auditor）
   */
  canViewMetrics: (req: Request, res: Response, next: NextFunction): void => {
    const user = req.user;
    if (!user) {
      throw new AppError('認証が必要です', 401, 'UNAUTHORIZED');
    }

    const allowedRoles = [UserRole.MANAGER, UserRole.AUDITOR];

    if (!allowedRoles.includes(user.role as UserRole)) {
      throw new AppError(
        'AIメトリクスの閲覧権限がありません（Manager/Auditor専用）',
        403,
        'FORBIDDEN'
      );
    }

    next();
  },
};
