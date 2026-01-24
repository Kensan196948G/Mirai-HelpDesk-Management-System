import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';
import { UserRole } from '../types';
import { logger } from '../utils/logger';

// リクエストにユーザー情報を追加
declare global {
  namespace Express {
    interface Request {
      user?: {
        user_id: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

// JWT検証ミドルウェア
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('No token provided', 401, 'UNAUTHORIZED');
    }

    const token = authHeader.substring(7); // "Bearer "を除去
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      throw new AppError('JWT secret not configured', 500, 'CONFIG_ERROR');
    }

    const decoded = jwt.verify(token, jwtSecret) as {
      user_id: string;
      email: string;
      role: UserRole;
    };

    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('Invalid token', 401, 'INVALID_TOKEN'));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('Token expired', 401, 'TOKEN_EXPIRED'));
    } else {
      next(error);
    }
  }
};

// 役割ベース認可ミドルウェア
export const authorize = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      throw new AppError('User not authenticated', 401, 'UNAUTHORIZED');
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Unauthorized access attempt', {
        user_id: req.user.user_id,
        role: req.user.role,
        required_roles: allowedRoles,
        path: req.path,
      });
      throw new AppError(
        'You do not have permission to access this resource',
        403,
        'FORBIDDEN'
      );
    }

    next();
  };
};

// JWT生成ヘルパー
export const generateToken = (user: {
  user_id: string;
  email: string;
  role: UserRole;
}): string => {
  const jwtSecret = process.env.JWT_SECRET;
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '24h';

  if (!jwtSecret) {
    throw new AppError('JWT secret not configured', 500, 'CONFIG_ERROR');
  }

  return jwt.sign(
    {
      user_id: user.user_id,
      email: user.email,
      role: user.role,
    },
    jwtSecret,
    { expiresIn: jwtExpiresIn }
  );
};

// リフレッシュトークン生成
export const generateRefreshToken = (userId: string): string => {
  const jwtSecret = process.env.JWT_SECRET;
  const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

  if (!jwtSecret) {
    throw new AppError('JWT secret not configured', 500, 'CONFIG_ERROR');
  }

  return jwt.sign({ user_id: userId, type: 'refresh' }, jwtSecret, {
    expiresIn: refreshExpiresIn,
  });
};
