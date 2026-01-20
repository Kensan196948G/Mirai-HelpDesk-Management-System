import { Request, Response, NextFunction } from 'express';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger, logAudit } from '../utils/logger';
import { pool } from '../config/database';
import { getFileInfo, deleteFile } from '../middleware/upload';
import path from 'path';
import fs from 'fs';

export class AttachmentController {
  // ファイルアップロード（単一または複数）
  static upload = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id: ticket_id } = req.params;
      const user = req.user!;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        throw new AppError('No files uploaded', 400, 'NO_FILES');
      }

      // チケットの存在確認と権限チェック
      const ticketResult = await pool.query(
        'SELECT ticket_id, requester_id, assignee_id FROM tickets WHERE ticket_id = $1',
        [ticket_id]
      );

      if (ticketResult.rows.length === 0) {
        // ファイルを削除
        for (const file of files) {
          await deleteFile(file.path).catch(() => {});
        }
        throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
      }

      const ticket = ticketResult.rows[0];

      // 権限チェック: 依頼者、担当者、または管理者のみアップロード可能
      const canUpload =
        ticket.requester_id === user.user_id ||
        ticket.assignee_id === user.user_id ||
        ['AGENT', 'M365_OPERATOR', 'MANAGER', 'APPROVER'].includes(user.role);

      if (!canUpload) {
        // ファイルを削除
        for (const file of files) {
          await deleteFile(file.path).catch(() => {});
        }
        throw new AppError(
          'You do not have permission to upload files to this ticket',
          403,
          'FORBIDDEN'
        );
      }

      // 各ファイルの情報を取得してデータベースに保存
      const attachments = [];

      try {
        for (const file of files) {
          const fileInfo = await getFileInfo(file);

          const result = await pool.query(
            `INSERT INTO ticket_attachments
            (ticket_id, uploader_id, filename, original_filename, file_size, mime_type, storage_path, storage_type, hash, is_evidence)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *`,
            [
              ticket_id,
              user.user_id,
              fileInfo.filename,
              fileInfo.originalName,
              fileInfo.size,
              fileInfo.mimetype,
              fileInfo.storagePath,
              'filesystem',
              fileInfo.hash,
              req.body.is_evidence === 'true' || req.body.is_evidence === true,
            ]
          );

          attachments.push(result.rows[0]);
        }

        // 監査ログ
        logAudit(
          'TICKET_ATTACHMENTS_UPLOADED',
          user.user_id,
          {
            ticket_id,
            file_count: files.length,
            attachment_ids: attachments.map((a) => a.attachment_id),
          },
          req.ip
        );

        logger.info('Files uploaded to ticket', {
          ticket_id,
          uploader_id: user.user_id,
          file_count: files.length,
        });

        res.status(201).json({
          success: true,
          data: {
            attachments,
          },
        });
      } catch (error) {
        // エラー時はアップロードされたファイルを削除
        for (const file of files) {
          await deleteFile(file.path).catch(() => {});
        }
        throw error;
      }
    }
  );

  // チケットの添付ファイル一覧取得
  static getByTicketId = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id: ticket_id } = req.params;
      const user = req.user!;

      // チケットの存在確認と権限チェック
      const ticketResult = await pool.query(
        'SELECT ticket_id, requester_id, assignee_id FROM tickets WHERE ticket_id = $1',
        [ticket_id]
      );

      if (ticketResult.rows.length === 0) {
        throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
      }

      const ticket = ticketResult.rows[0];

      // 権限チェック: 依頼者、担当者、または管理者のみ閲覧可能
      const canView =
        ticket.requester_id === user.user_id ||
        ticket.assignee_id === user.user_id ||
        ['AGENT', 'M365_OPERATOR', 'MANAGER', 'APPROVER', 'AUDITOR'].includes(
          user.role
        );

      if (!canView) {
        throw new AppError(
          'You do not have permission to view attachments for this ticket',
          403,
          'FORBIDDEN'
        );
      }

      // 添付ファイル一覧取得
      const result = await pool.query(
        `SELECT
          attachment_id,
          ticket_id,
          uploader_id,
          filename,
          original_filename,
          file_size,
          mime_type,
          is_evidence,
          created_at
        FROM ticket_attachments
        WHERE ticket_id = $1
        ORDER BY created_at DESC`,
        [ticket_id]
      );

      res.json({
        success: true,
        data: {
          attachments: result.rows,
        },
      });
    }
  );

  // ファイルダウンロード
  static download = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id: attachment_id } = req.params;
      const user = req.user!;

      // 添付ファイル情報取得
      const result = await pool.query(
        `SELECT
          a.attachment_id,
          a.ticket_id,
          a.filename,
          a.original_filename,
          a.mime_type,
          a.storage_path,
          t.requester_id,
          t.assignee_id
        FROM ticket_attachments a
        JOIN tickets t ON a.ticket_id = t.ticket_id
        WHERE a.attachment_id = $1`,
        [attachment_id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Attachment not found', 404, 'ATTACHMENT_NOT_FOUND');
      }

      const attachment = result.rows[0];

      // 権限チェック: 依頼者、担当者、または管理者のみダウンロード可能
      const canDownload =
        attachment.requester_id === user.user_id ||
        attachment.assignee_id === user.user_id ||
        ['AGENT', 'M365_OPERATOR', 'MANAGER', 'APPROVER', 'AUDITOR'].includes(
          user.role
        );

      if (!canDownload) {
        throw new AppError(
          'You do not have permission to download this file',
          403,
          'FORBIDDEN'
        );
      }

      // ファイルの存在確認
      if (!fs.existsSync(attachment.storage_path)) {
        logger.error('File not found on filesystem', {
          attachment_id,
          storage_path: attachment.storage_path,
        });
        throw new AppError(
          'File not found on storage',
          404,
          'FILE_NOT_FOUND'
        );
      }

      // 監査ログ
      logAudit(
        'ATTACHMENT_DOWNLOADED',
        user.user_id,
        {
          attachment_id,
          ticket_id: attachment.ticket_id,
          filename: attachment.original_filename,
        },
        req.ip
      );

      logger.info('File downloaded', {
        attachment_id,
        user_id: user.user_id,
      });

      // ファイル送信
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(attachment.original_filename)}"`
      );
      res.setHeader('Content-Type', attachment.mime_type);

      const fileStream = fs.createReadStream(attachment.storage_path);
      fileStream.pipe(res);
    }
  );

  // ファイル削除
  static delete = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id: attachment_id } = req.params;
      const user = req.user!;

      // 添付ファイル情報取得
      const result = await pool.query(
        `SELECT
          a.attachment_id,
          a.ticket_id,
          a.storage_path,
          a.uploader_id,
          a.is_evidence,
          t.requester_id,
          t.assignee_id,
          t.status
        FROM ticket_attachments a
        JOIN tickets t ON a.ticket_id = t.ticket_id
        WHERE a.attachment_id = $1`,
        [attachment_id]
      );

      if (result.rows.length === 0) {
        throw new AppError('Attachment not found', 404, 'ATTACHMENT_NOT_FOUND');
      }

      const attachment = result.rows[0];

      // エビデンスファイルは削除不可
      if (attachment.is_evidence) {
        throw new AppError(
          'Evidence files cannot be deleted',
          400,
          'CANNOT_DELETE_EVIDENCE'
        );
      }

      // 権限チェック: アップロード者またはチケット担当者、管理者のみ削除可能
      const canDelete =
        attachment.uploader_id === user.user_id ||
        attachment.assignee_id === user.user_id ||
        ['MANAGER'].includes(user.role);

      if (!canDelete) {
        throw new AppError(
          'You do not have permission to delete this file',
          403,
          'FORBIDDEN'
        );
      }

      // チケットがクローズされている場合は削除不可
      if (attachment.status === 'CLOSED') {
        throw new AppError(
          'Cannot delete attachments from closed tickets',
          400,
          'TICKET_CLOSED'
        );
      }

      // データベースから削除
      await pool.query(
        'DELETE FROM ticket_attachments WHERE attachment_id = $1',
        [attachment_id]
      );

      // ファイルシステムから削除
      await deleteFile(attachment.storage_path).catch((error) => {
        logger.error('Failed to delete file from filesystem', {
          attachment_id,
          storage_path: attachment.storage_path,
          error,
        });
      });

      // 監査ログ
      logAudit(
        'ATTACHMENT_DELETED',
        user.user_id,
        {
          attachment_id,
          ticket_id: attachment.ticket_id,
        },
        req.ip
      );

      logger.info('Attachment deleted', {
        attachment_id,
        user_id: user.user_id,
      });

      res.json({
        success: true,
        message: 'Attachment deleted successfully',
      });
    }
  );
}
