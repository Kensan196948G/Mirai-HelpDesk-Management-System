import { Request, Response, NextFunction } from 'express';
import { UserModel } from '../models/user.model';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { generateToken, generateRefreshToken } from '../middleware/auth';
import { logger, logAudit } from '../utils/logger';
import { UserRole } from '../types';

export class AuthController {
  // ログイン（メール + パスワード）
  static login = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { email, password } = req.body;

      if (!email || !password) {
        throw new AppError('Email and password are required', 400, 'MISSING_CREDENTIALS');
      }

      // ユーザー検索
      const user = await UserModel.findByEmail(email);

      if (!user) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      // パスワード検証（DBのpassword_hashを取得）
      const result = await UserModel.verifyPassword(
        password,
        (user as any).password_hash
      );

      if (!result) {
        throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
      }

      // 最終ログイン時刻更新
      await UserModel.updateLastLogin(user.user_id);

      // JWTトークン生成
      const token = generateToken({
        user_id: user.user_id,
        email: user.email,
        role: user.role,
      });

      const refreshToken = generateRefreshToken(user.user_id);

      // 監査ログ
      logAudit('USER_LOGIN', user.user_id, { email: user.email }, req.ip);

      logger.info('User logged in', {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
      });

      // CSRF対策: SameSite Cookie設定
      const isProduction = process.env.NODE_ENV === 'production';

      res.cookie('accessToken', token, {
        httpOnly: true,
        secure: isProduction, // 本番環境のみHTTPS必須
        sameSite: 'strict', // CSRF対策
        maxAge: 24 * 60 * 60 * 1000, // 24時間
      });

      res.cookie('refreshToken', refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'strict', // CSRF対策
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7日間
      });

      res.json({
        success: true,
        data: {
          token,
          refreshToken,
          user: {
            user_id: user.user_id,
            email: user.email,
            display_name: user.display_name,
            department: user.department,
            role: user.role,
          },
        },
      });
    }
  );

  // ユーザー登録（開発用・管理者のみ）
  static register = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { email, display_name, department, role, password } = req.body;

      if (!email || !display_name || !password) {
        throw new AppError(
          'Email, display name, and password are required',
          400,
          'MISSING_FIELDS'
        );
      }

      // メールアドレスの重複チェック
      const existingUser = await UserModel.findByEmail(email);
      if (existingUser) {
        throw new AppError('Email already exists', 409, 'EMAIL_EXISTS');
      }

      // ユーザー作成
      const user = await UserModel.create({
        email,
        display_name,
        department,
        role: role || UserRole.REQUESTER,
        password,
      });

      // 監査ログ
      logAudit(
        'USER_REGISTERED',
        user.user_id,
        { email: user.email, role: user.role },
        req.ip
      );

      logger.info('New user registered', {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
      });

      // パスワードを除外してレスポンス
      const { password_hash, ...userResponse } = user as any;

      res.status(201).json({
        success: true,
        data: {
          user: userResponse,
        },
      });
    }
  );

  // 現在のユーザー情報取得
  static getCurrentUser = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      if (!req.user) {
        throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
      }

      const user = await UserModel.findById(req.user.user_id);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // パスワードハッシュを除外
      const { password_hash, ...userResponse } = user as any;

      res.json({
        success: true,
        data: {
          user: userResponse,
        },
      });
    }
  );

  // ログアウト（クライアント側でトークンを削除するのみ）
  static logout = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      if (req.user) {
        logAudit('USER_LOGOUT', req.user.user_id, {}, req.ip);
        logger.info('User logged out', { user_id: req.user.user_id });
      }

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    }
  );

  // トークンリフレッシュ
  static refreshToken = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        throw new AppError('Refresh token is required', 400, 'MISSING_REFRESH_TOKEN');
      }

      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new AppError('JWT secret not configured', 500, 'CONFIG_ERROR');
      }

      // リフレッシュトークンを検証
      let decoded: { user_id: string; type: string };
      try {
        const jwt = require('jsonwebtoken');
        decoded = jwt.verify(refreshToken, jwtSecret) as { user_id: string; type: string };
      } catch (error: any) {
        if (error.name === 'TokenExpiredError') {
          throw new AppError('Refresh token expired', 401, 'REFRESH_TOKEN_EXPIRED');
        }
        throw new AppError('Invalid refresh token', 401, 'INVALID_REFRESH_TOKEN');
      }

      // リフレッシュトークンであることを確認
      if (decoded.type !== 'refresh') {
        throw new AppError('Invalid token type', 401, 'INVALID_TOKEN_TYPE');
      }

      // ユーザーの存在と有効性を確認
      const user = await UserModel.findById(decoded.user_id);

      if (!user) {
        throw new AppError('User not found', 404, 'USER_NOT_FOUND');
      }

      // 新しいアクセストークンとリフレッシュトークンを生成
      const newToken = generateToken({
        user_id: user.user_id,
        email: user.email,
        role: user.role,
      });

      const newRefreshToken = generateRefreshToken(user.user_id);

      logger.info('Token refreshed', {
        user_id: user.user_id,
        email: user.email,
      });

      res.json({
        success: true,
        data: {
          token: newToken,
          refreshToken: newRefreshToken,
          user: {
            user_id: user.user_id,
            email: user.email,
            display_name: user.display_name,
            department: user.department,
            role: user.role,
          },
        },
      });
    }
  );
}
