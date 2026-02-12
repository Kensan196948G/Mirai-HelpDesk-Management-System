import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import jwt from 'jsonwebtoken';
import { logger } from '../utils/logger';
import { UserRole } from '../types';
import { redisPubClient, redisSubClient } from '../config/redis.config';

interface AuthenticatedSocket extends Socket {
  user?: {
    user_id: string;
    email: string;
    role: UserRole;
  };
}

let io: Server | null = null;

/**
 * socket.io サーバーを初期化し、HTTPサーバーにアタッチする
 */
export function initializeSocketServer(httpServer: HttpServer): Server {
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3001')
    .split(',')
    .map((origin) => origin.trim());

  io = new Server(httpServer, {
    cors: {
      origin: corsOrigins,
      credentials: true,
    },
    path: '/socket.io',
  });

  // Redis Adapter設定（複数インスタンス対応）
  io.adapter(createAdapter(redisPubClient, redisSubClient));
  logger.info('✅ WebSocket Redis Adapter設定完了（複数インスタンス対応）');

  // JWT認証ミドルウェア
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      return next(new Error('Authentication token required'));
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return next(new Error('Server configuration error'));
    }

    try {
      const decoded = jwt.verify(token as string, jwtSecret) as {
        user_id: string;
        email: string;
        role: UserRole;
      };
      socket.user = decoded;
      next();
    } catch (err) {
      next(new Error('Invalid or expired token'));
    }
  });

  // 接続ハンドラ
  io.on('connection', (socket: AuthenticatedSocket) => {
    const user = socket.user;
    if (!user) return;

    logger.info('WebSocket client connected', {
      user_id: user.user_id,
      role: user.role,
    });

    // ユーザー専用ルームに参加
    socket.join(`user:${user.user_id}`);

    // ロール別ルームに参加
    socket.join(`role:${user.role}`);

    // Agent/Manager/Operator は全チケット通知ルームに参加
    if (
      user.role === UserRole.AGENT ||
      user.role === UserRole.MANAGER ||
      user.role === UserRole.M365_OPERATOR ||
      user.role === UserRole.APPROVER ||
      user.role === UserRole.AUDITOR
    ) {
      socket.join('staff');
    }

    socket.on('disconnect', () => {
      logger.info('WebSocket client disconnected', {
        user_id: user.user_id,
      });
    });
  });

  logger.info('WebSocket server initialized');
  return io;
}

/**
 * socket.io サーバーインスタンスを取得する
 * WebSocket未初期化の場合は null を返す（防御的設計）
 */
export function getIO(): Server | null {
  return io;
}

// --- イベント発行ヘルパー ---

/**
 * チケット作成イベントを発行
 */
export function emitTicketCreated(ticket: any): void {
  try {
    const server = getIO();
    if (!server) return;
    // スタッフ全員に通知
    server.to('staff').emit('ticket:created', { ticket });
    // 作成者にも通知
    if (ticket.requester_id) {
      server.to(`user:${ticket.requester_id}`).emit('ticket:created', { ticket });
    }
  } catch (err) {
    logger.error('Failed to emit ticket:created', err);
  }
}

/**
 * チケット更新イベントを発行
 */
export function emitTicketUpdated(ticket: any, updatedBy?: string): void {
  try {
    const server = getIO();
    if (!server) return;
    const payload = { ticket, updatedBy };
    server.to('staff').emit('ticket:updated', payload);
    if (ticket.requester_id) {
      server.to(`user:${ticket.requester_id}`).emit('ticket:updated', payload);
    }
    if (ticket.assignee_id) {
      server.to(`user:${ticket.assignee_id}`).emit('ticket:updated', payload);
    }
  } catch (err) {
    logger.error('Failed to emit ticket:updated', err);
  }
}

/**
 * コメント追加イベントを発行
 */
export function emitTicketComment(
  ticketId: string,
  comment: any,
  requesterId?: string,
  assigneeId?: string
): void {
  try {
    const server = getIO();
    if (!server) return;
    const payload = { ticketId, comment };
    server.to('staff').emit('ticket:comment', payload);
    if (requesterId) {
      server.to(`user:${requesterId}`).emit('ticket:comment', payload);
    }
    if (assigneeId) {
      server.to(`user:${assigneeId}`).emit('ticket:comment', payload);
    }
  } catch (err) {
    logger.error('Failed to emit ticket:comment', err);
  }
}

/**
 * 個人宛通知を発行
 */
export function emitNotification(userId: string, notification: any): void {
  try {
    const server = getIO();
    if (!server) return;
    server.to(`user:${userId}`).emit('notification:new', notification);
  } catch (err) {
    logger.error('Failed to emit notification:new', err);
  }
}

/**
 * SLA警告イベントを発行
 */
export function emitSLAWarning(ticket: any): void {
  try {
    const server = getIO();
    if (!server) return;
    const payload = { ticket };
    server.to('staff').emit('sla:warning', payload);
    if (ticket.assignee_id) {
      server.to(`user:${ticket.assignee_id}`).emit('sla:warning', payload);
    }
  } catch (err) {
    logger.error('Failed to emit sla:warning', err);
  }
}
