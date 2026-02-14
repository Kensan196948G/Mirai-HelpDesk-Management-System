import csrf from 'csurf';
import { Request, Response, NextFunction } from 'express';

/**
 * CSRF Protection Middleware
 * Protects against Cross-Site Request Forgery attacks
 */
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

/**
 * CSRF Error Handler
 * Returns a standardized error response for CSRF token validation failures
 */
export const csrfErrorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err.code === 'EBADCSRFTOKEN') {
    res.status(403).json({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'CSRF token validation failed'
      }
    });
  } else {
    next(err);
  }
};
