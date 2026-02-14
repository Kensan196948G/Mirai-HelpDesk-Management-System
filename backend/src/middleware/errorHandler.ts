import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// カスタムエラークラス
export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;
  code?: string;
  details?: any;

  constructor(message: string, statusCode: number = 500, code?: string, details?: any) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.code = code;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// エラーハンドラーミドルウェア
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = 'Internal server error';
  let code = 'INTERNAL_SERVER_ERROR';
  let details = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
    code = err.code || 'APP_ERROR';
    details = err.details;
  }

  // ログ記録（詳細なエラー情報を含む）
  logger.error('Error occurred:', {
    statusCode,
    message,
    code,
    path: req.path,
    method: req.method,
    stack: err.stack,
    user: (req as any).user?.user_id,
    details,
  });

  // 本番環境では詳細を隠す
  if (process.env.NODE_ENV === 'production') {
    // 本番環境では詳細を隠す
    const sanitizedError = {
      success: false,
      error: {
        code: code || 'INTERNAL_ERROR',
        message: statusCode < 500 ? message : 'An internal error occurred',
        // スタックトレースやデータベース詳細は含めない
        // details は 4xx エラーの場合のみ含める（バリデーションエラー等）
        ...(statusCode < 500 && details ? { details } : {}),
      }
    };

    res.status(statusCode).json(sanitizedError);
  } else {
    // 開発環境のみ詳細を返す
    res.status(statusCode).json({
      success: false,
      error: {
        code,
        message,
        stack: err.stack,
        details
      }
    });
  }
};

// 非同期エラーハンドラーラッパー
export const asyncHandler = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 404エラーハンドラー
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const error = new AppError(
    `Route not found: ${req.method} ${req.path}`,
    404,
    'ROUTE_NOT_FOUND'
  );
  next(error);
};
