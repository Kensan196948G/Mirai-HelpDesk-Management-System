import { Request, Response, NextFunction } from 'express';
import { M365AuthService } from '../services/m365-auth.service';
import { M365Service } from '../services/m365.service';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger, logAudit } from '../utils/logger';
import { UserRole } from '../types';

export class M365Controller {
  // M365接続テスト
  static testConnection = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const isConnected = await M365AuthService.testConnection();

      if (!isConnected) {
        throw new AppError(
          'Microsoft 365 connection test failed',
          500,
          'M365_CONNECTION_FAILED'
        );
      }

      res.json({
        success: true,
        message: 'Microsoft 365 connection successful',
      });
    }
  );

  // ユーザー情報取得
  static getUser = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { upn } = req.params;

      if (!upn) {
        throw new AppError(
          'User Principal Name is required',
          400,
          'MISSING_UPN'
        );
      }

      const user = await M365Service.getUser(upn);

      // 監査ログ
      logAudit(
        'M365_GET_USER',
        req.user!.user_id,
        { target_upn: upn },
        req.ip
      );

      res.json({
        success: true,
        data: {
          user,
        },
      });
    }
  );

  // ユーザー一覧取得
  static listUsers = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { filter } = req.query;

      const users = await M365Service.listUsers(filter as string);

      // 監査ログ
      logAudit('M365_LIST_USERS', req.user!.user_id, { filter }, req.ip);

      res.json({
        success: true,
        data: {
          users,
          total: users.length,
        },
      });
    }
  );

  // ユーザーライセンス取得
  static getUserLicenses = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { upn } = req.params;

      if (!upn) {
        throw new AppError(
          'User Principal Name is required',
          400,
          'MISSING_UPN'
        );
      }

      const licenses = await M365Service.getUserLicenses(upn);

      // 監査ログ
      logAudit(
        'M365_GET_LICENSES',
        req.user!.user_id,
        { target_upn: upn },
        req.ip
      );

      res.json({
        success: true,
        data: {
          licenses,
        },
      });
    }
  );

  // M365タスク一覧取得
  static getTasks = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      // 実装は後で追加（M365タスクモデルが必要）
      res.json({
        success: true,
        data: {
          tasks: [],
        },
      });
    }
  );

  // M365タスク実施ログ記録
  static executeTask = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const {
        method,
        command_or_screen,
        result,
        result_message,
        evidence_attachment_id,
        rollback_procedure,
      } = req.body;

      if (!method || !command_or_screen || !result || !evidence_attachment_id) {
        throw new AppError(
          'Required fields: method, command_or_screen, result, evidence_attachment_id',
          400,
          'MISSING_FIELDS'
        );
      }

      // 実装は後で追加（M365ExecutionLogモデルが必要）
      // SODチェックもここで実行

      // 監査ログ
      logAudit(
        'M365_TASK_EXECUTED',
        req.user!.user_id,
        {
          task_id: id,
          method,
          result,
        },
        req.ip
      );

      res.status(201).json({
        success: true,
        message: 'Execution log recorded successfully',
      });
    }
  );

  // M365実施ログ一覧取得（監査用）
  static getExecutionLogs = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      // 実装は後で追加
      res.json({
        success: true,
        data: {
          logs: [],
        },
      });
    }
  );
}
