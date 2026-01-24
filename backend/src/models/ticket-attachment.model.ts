import { query } from '../config/database';
import { TicketAttachment } from '../types';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

export class TicketAttachmentModel {
  // 添付ファイル作成
  static async create(attachmentData: {
    ticket_id: string;
    uploader_id: string;
    filename: string;
    original_filename: string;
    file_size: number;
    mime_type: string;
    storage_path: string;
    hash: string;
    is_evidence?: boolean;
  }): Promise<TicketAttachment> {
    const result = await query(
      `INSERT INTO ticket_attachments (
        ticket_id, uploader_id, filename, original_filename,
        file_size, mime_type, storage_path, hash, is_evidence
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        attachmentData.ticket_id,
        attachmentData.uploader_id,
        attachmentData.filename,
        attachmentData.original_filename,
        attachmentData.file_size,
        attachmentData.mime_type,
        attachmentData.storage_path,
        attachmentData.hash,
        attachmentData.is_evidence || false,
      ]
    );

    return result.rows[0];
  }

  // チケットの添付ファイル一覧取得
  static async findByTicketId(ticketId: string): Promise<TicketAttachment[]> {
    const result = await query(
      `SELECT a.*,
              u.display_name as uploader_name
       FROM ticket_attachments a
       LEFT JOIN users u ON a.uploader_id = u.user_id
       WHERE a.ticket_id = $1
       ORDER BY a.created_at DESC`,
      [ticketId]
    );

    return result.rows;
  }

  // 添付ファイル詳細取得
  static async findById(attachmentId: string): Promise<TicketAttachment | null> {
    const result = await query(
      'SELECT * FROM ticket_attachments WHERE attachment_id = $1',
      [attachmentId]
    );

    return result.rows[0] || null;
  }

  // 添付ファイル削除
  static async delete(attachmentId: string): Promise<void> {
    // ファイルシステムからも削除
    const attachment = await this.findById(attachmentId);
    if (attachment && attachment.storage_type === 'filesystem') {
      try {
        await fs.unlink(attachment.storage_path);
      } catch (error) {
        // ファイルが存在しない場合は無視
      }
    }

    await query('DELETE FROM ticket_attachments WHERE attachment_id = $1', [
      attachmentId,
    ]);
  }

  // ファイルハッシュ計算
  static calculateFileHash(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  // ファイル名生成（UUID + 拡張子）
  static generateFilename(originalFilename: string): string {
    const ext = path.extname(originalFilename);
    const uuid = crypto.randomUUID();
    return `${uuid}${ext}`;
  }

  // 許可されたファイルタイプか確認
  static isAllowedFileType(filename: string): boolean {
    const allowedExtensions = (
      process.env.ALLOWED_FILE_TYPES ||
      '.jpg,.jpeg,.png,.gif,.pdf,.doc,.docx,.xls,.xlsx,.zip,.txt,.log'
    )
      .split(',')
      .map((ext) => ext.trim().toLowerCase());

    const ext = path.extname(filename).toLowerCase();
    return allowedExtensions.includes(ext);
  }

  // ファイルサイズが許可範囲内か確認
  static isAllowedFileSize(fileSize: number): boolean {
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB
    return fileSize <= maxSize;
  }
}
