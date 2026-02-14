import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';
import { AppError } from './errorHandler';

// バリデーション結果を検証するミドルウェア
export const validate = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorDetails = errors.array().map((err: any) => ({
      field: err.type === 'field' ? err.path : (err.path || err.param || 'unknown'),
      message: err.msg,
      value: err.type === 'field' ? err.value : undefined,
    }));

    throw new AppError(
      'Validation failed',
      400,
      'VALIDATION_ERROR',
      errorDetails
    );
  }

  next();
};

// バリデーションチェインを実行するヘルパー
export const runValidations = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (const validation of validations) {
      await validation.run(req);
    }
    next();
  };
};
