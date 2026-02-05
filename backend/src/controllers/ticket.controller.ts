import { Request, Response, NextFunction } from 'express';
import { TicketModel } from '../models/ticket.model';
import { TicketCommentModel } from '../models/ticket-comment.model';
import { AppError, asyncHandler } from '../middleware/errorHandler';
import { logger, logAudit } from '../utils/logger';
import { query } from '../config/database';
import {
  TicketType,
  TicketStatus,
  ImpactLevel,
  UrgencyLevel,
  UserRole,
} from '../types';
import { emitTicketCreated, emitTicketUpdated, emitTicketComment } from '../websocket/socketServer';
import { VectorSearchService } from '../services/vector-search.service';

export class TicketController {
  // チケット一覧取得
  static getAll = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { status, priority, type, page, pageSize, assignee_id } = req.query;
      const user = req.user!;

      // status パラメータをカンマ区切りから配列に変換
      let statusArray: string[] | undefined;
      if (status) {
        statusArray = typeof status === 'string' && status.includes(',')
          ? status.split(',').map(s => s.trim())
          : [status as string];
      }

      // 一般ユーザーは自分のチケットのみ閲覧可能
      let filters: any = {
        status: statusArray,
        priority: priority as any,
        type: type as any,
        page: page ? parseInt(page as string) : 1,
        pageSize: pageSize ? parseInt(pageSize as string) : 20,
      };

      if (user.role === UserRole.REQUESTER) {
        filters.requester_id = user.user_id;
      } else if (assignee_id) {
        filters.assignee_id = assignee_id as string;
      }

      const result = await TicketModel.findAll(filters);

      res.json({
        success: true,
        data: {
          tickets: result.tickets,
          meta: {
            total: result.total,
            page: filters.page,
            pageSize: filters.pageSize,
            totalPages: Math.ceil(result.total / filters.pageSize),
          },
        },
      });
    }
  );

  // チケット詳細取得
  static getById = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const user = req.user!;

      const ticket = await TicketModel.findById(id);

      if (!ticket) {
        throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
      }

      // 一般ユーザーは自分のチケットのみ閲覧可能
      if (
        user.role === UserRole.REQUESTER &&
        ticket.requester_id !== user.user_id
      ) {
        throw new AppError(
          'You do not have permission to view this ticket',
          403,
          'FORBIDDEN'
        );
      }

      // コメント取得
      const comments = await TicketCommentModel.findByTicketId(id);

      res.json({
        success: true,
        data: {
          ticket,
          comments,
        },
      });
    }
  );

  // チケット作成
  static create = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { type, subject, description, impact, urgency, category_id } =
        req.body;
      const user = req.user!;

      if (!type || !subject || !description || !impact || !urgency) {
        throw new AppError(
          'Required fields: type, subject, description, impact, urgency',
          400,
          'MISSING_FIELDS'
        );
      }

      const ticket = await TicketModel.create({
        type,
        subject,
        description,
        impact,
        urgency,
        requester_id: user.user_id,
        category_id,
      });

      // 監査ログ
      logAudit(
        'TICKET_CREATED',
        user.user_id,
        {
          ticket_id: ticket.ticket_id,
          ticket_number: ticket.ticket_number,
          subject: ticket.subject,
        },
        req.ip
      );

      logger.info('Ticket created', {
        ticket_id: ticket.ticket_id,
        ticket_number: ticket.ticket_number,
        requester_id: user.user_id,
      });

      // WebSocket: チケット作成通知
      emitTicketCreated(ticket);

      // 非同期でベクトル埋め込みを生成（レスポンスをブロックしない）
      VectorSearchService.generateTicketEmbedding(
        ticket.ticket_id,
        ticket.subject,
        ticket.description || ''
      ).catch(err => logger.warn('Ticket embedding generation failed:', err.message));

      res.status(201).json({
        success: true,
        data: {
          ticket,
        },
      });
    }
  );

  // チケット更新
  static update = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const updates = req.body;
      const user = req.user!;

      const ticket = await TicketModel.findById(id);

      if (!ticket) {
        throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
      }

      // 権限チェック
      if (
        user.role === UserRole.REQUESTER &&
        ticket.requester_id !== user.user_id
      ) {
        throw new AppError(
          'You do not have permission to update this ticket',
          403,
          'FORBIDDEN'
        );
      }

      const updatedTicket = await TicketModel.update(id, updates);

      // 監査ログ
      logAudit(
        'TICKET_UPDATED',
        user.user_id,
        {
          ticket_id: id,
          updates,
        },
        req.ip
      );

      // WebSocket: チケット更新通知
      emitTicketUpdated(updatedTicket, user.user_id);

      // 件名・説明が変更された場合、埋め込みを再生成
      if (updates.subject || updates.description) {
        VectorSearchService.generateTicketEmbedding(
          id,
          updatedTicket.subject,
          updatedTicket.description || ''
        ).catch(err => logger.warn('Ticket embedding regeneration failed:', err.message));
      }

      res.json({
        success: true,
        data: {
          ticket: updatedTicket,
        },
      });
    }
  );

  // ステータス更新
  static updateStatus = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const { status, reason } = req.body;
      const user = req.user!;

      if (!status) {
        throw new AppError('Status is required', 400, 'MISSING_STATUS');
      }

      const ticket = await TicketModel.updateStatus(
        id,
        status,
        user.user_id,
        reason
      );

      // 監査ログ
      logAudit(
        'TICKET_STATUS_CHANGED',
        user.user_id,
        {
          ticket_id: id,
          new_status: status,
          reason,
        },
        req.ip
      );

      logger.info('Ticket status updated', {
        ticket_id: id,
        new_status: status,
        actor: user.user_id,
      });

      // WebSocket: ステータス更新通知
      emitTicketUpdated(ticket, user.user_id);

      res.json({
        success: true,
        data: {
          ticket,
        },
      });
    }
  );

  // チケット割り当て
  static assign = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const { assignee_id } = req.body;
      const user = req.user!;

      if (!assignee_id) {
        throw new AppError('Assignee ID is required', 400, 'MISSING_ASSIGNEE');
      }

      const ticket = await TicketModel.assign(id, assignee_id, user.user_id);

      // 監査ログ
      logAudit(
        'TICKET_ASSIGNED',
        user.user_id,
        {
          ticket_id: id,
          assignee_id,
        },
        req.ip
      );

      logger.info('Ticket assigned', {
        ticket_id: id,
        assignee_id,
        actor: user.user_id,
      });

      // WebSocket: 割り当て更新通知
      emitTicketUpdated(ticket, user.user_id);

      res.json({
        success: true,
        data: {
          ticket,
        },
      });
    }
  );

  // コメント追加
  static addComment = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const { body, visibility } = req.body;
      const user = req.user!;

      if (!body) {
        throw new AppError('Comment body is required', 400, 'MISSING_BODY');
      }

      const comment = await TicketCommentModel.create({
        ticket_id: id,
        author_id: user.user_id,
        body,
        visibility: visibility || 'public',
      });

      // 監査ログ
      logAudit(
        'TICKET_COMMENT_ADDED',
        user.user_id,
        {
          ticket_id: id,
          comment_id: comment.comment_id,
          visibility,
        },
        req.ip
      );

      // WebSocket: コメント追加通知（チケット関係者に送信）
      try {
        const ticketData = await TicketModel.findById(id);
        emitTicketComment(
          id,
          comment,
          ticketData?.requester_id,
          ticketData?.assignee_id
        );
      } catch {
        // WebSocket通知の失敗はAPIレスポンスに影響させない
      }

      res.status(201).json({
        success: true,
        data: {
          comment,
        },
      });
    }
  );

  // チケット統計
  static getStatistics = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const user = req.user!;
      const { from_date, to_date } = req.query;

      let filters: any = {};

      // 一般ユーザーは自分の統計のみ
      if (user.role === UserRole.REQUESTER) {
        filters.requester_id = user.user_id;
      }

      if (from_date) {
        filters.from_date = new Date(from_date as string);
      }
      if (to_date) {
        filters.to_date = new Date(to_date as string);
      }

      const statistics = await TicketModel.getStatistics(filters);

      res.json({
        success: true,
        data: {
          statistics,
        },
      });
    }
  );

  // チケット履歴取得（追記専用監査証跡）
  static getHistory = asyncHandler(
    async (req: Request, res: Response, next: NextFunction) => {
      const { id } = req.params;
      const user = req.user!;

      // チケットの存在確認
      const ticket = await TicketModel.findById(id);

      if (!ticket) {
        throw new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND');
      }

      // 一般ユーザーは自分のチケットのみ閲覧可能
      if (
        user.role === UserRole.REQUESTER &&
        ticket.requester_id !== user.user_id
      ) {
        throw new AppError(
          'You do not have permission to view this ticket history',
          403,
          'FORBIDDEN'
        );
      }

      // 履歴をactor情報付きで取得
      const result = await query(
        `SELECT
          h.history_id,
          h.ticket_id,
          h.actor_id,
          h.actor_name,
          h.action,
          h.before_value,
          h.after_value,
          h.description,
          h.created_at,
          h.ip_address,
          u.email as actor_email,
          u.role as actor_role
        FROM ticket_history h
        LEFT JOIN users u ON h.actor_id = u.user_id
        WHERE h.ticket_id = $1
        ORDER BY h.created_at DESC`,
        [id]
      );

      res.json({
        success: true,
        data: {
          history: result.rows,
        },
      });
    }
  );
}
