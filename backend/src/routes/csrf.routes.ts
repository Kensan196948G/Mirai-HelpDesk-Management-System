import { Router, Request, Response } from 'express';
import { csrfProtection } from '../middleware/csrf';

const router = Router();

/**
 * GET /api/csrf-token
 * Generates and returns a CSRF token for client-side forms
 * @returns {object} CSRF token
 */
router.get('/csrf-token', csrfProtection, (req: Request, res: Response) => {
  res.json({
    success: true,
    data: { csrfToken: req.csrfToken() }
  });
});

export default router;
