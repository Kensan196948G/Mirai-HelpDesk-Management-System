import { Request, Response, NextFunction } from 'express';
import { UserRole, TicketStatus, PriorityLevel, ImpactLevel, UrgencyLevel } from '../../../src/types';

// モック設定
const mockTicketFindAll = jest.fn();
const mockTicketFindById = jest.fn();
const mockTicketCreate = jest.fn();
const mockTicketUpdate = jest.fn();
const mockTicketUpdateStatus = jest.fn();
const mockTicketAssign = jest.fn();
const mockTicketGetStatistics = jest.fn();
const mockCommentFindByTicketId = jest.fn();
const mockCommentCreate = jest.fn();

jest.mock('../../../src/models/ticket.model', () => ({
  TicketModel: {
    findAll: mockTicketFindAll,
    findById: mockTicketFindById,
    create: mockTicketCreate,
    update: mockTicketUpdate,
    updateStatus: mockTicketUpdateStatus,
    assign: mockTicketAssign,
    getStatistics: mockTicketGetStatistics,
  },
}));

jest.mock('../../../src/models/ticket-comment.model', () => ({
  TicketCommentModel: {
    findByTicketId: mockCommentFindByTicketId,
    create: mockCommentCreate,
  },
}));

jest.mock('../../../src/config/database', () => ({
  query: jest.fn().mockResolvedValue({ rows: [] }),
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
  logAudit: jest.fn(),
}));

jest.mock('../../../src/websocket/socketServer', () => ({
  emitTicketCreated: jest.fn(),
  emitTicketUpdated: jest.fn(),
  emitTicketComment: jest.fn(),
}));

import { TicketController } from '../../../src/controllers/ticket.controller';
import { AppError } from '../../../src/middleware/errorHandler';

// asyncHandler の内部Promiseチェーンを完了させるためのヘルパー
function flushPromises(): Promise<void> {
  return new Promise(resolve => setImmediate(resolve));
}

function createMockReq(overrides: any = {}): Request {
  return {
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: '127.0.0.1',
    path: '/test',
    user: {
      user_id: 'user-001',
      email: 'agent@example.com',
      role: UserRole.AGENT,
    },
    ...overrides,
  } as any as Request;
}

function createMockRes(): Response {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };
  return res;
}

const sampleTicket = {
  ticket_id: 'ticket-001',
  ticket_number: 'INC-0001',
  type: 'incident',
  subject: 'テスト障害',
  description: 'テスト用の説明',
  status: TicketStatus.NEW,
  priority: PriorityLevel.P3,
  impact: ImpactLevel.INDIVIDUAL,
  urgency: UrgencyLevel.MEDIUM,
  requester_id: 'user-001',
  created_at: new Date(),
  updated_at: new Date(),
};

describe('TicketController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getAll', () => {
    it('チケット一覧を返す', async () => {
      mockTicketFindAll.mockResolvedValue({
        tickets: [sampleTicket],
        total: 1,
      });

      const req = createMockReq({ query: {} });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getAll(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            tickets: expect.any(Array),
            meta: expect.objectContaining({
              total: 1,
              page: 1,
              pageSize: 20,
            }),
          }),
        })
      );
    });

    it('REQUESTERロールは自分のチケットのみ取得', async () => {
      mockTicketFindAll.mockResolvedValue({ tickets: [], total: 0 });

      const req = createMockReq({
        query: {},
        user: { user_id: 'requester-001', email: 'user@example.com', role: UserRole.REQUESTER },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getAll(req, res, next);
      await flushPromises();

      expect(mockTicketFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          requester_id: 'requester-001',
        })
      );
    });

    it('ステータスのカンマ区切りを配列に変換', async () => {
      mockTicketFindAll.mockResolvedValue({ tickets: [], total: 0 });

      const req = createMockReq({ query: { status: 'new,assigned,in_progress' } });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getAll(req, res, next);
      await flushPromises();

      expect(mockTicketFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['new', 'assigned', 'in_progress'],
        })
      );
    });

    it('ページネーションパラメータが正しく渡される', async () => {
      mockTicketFindAll.mockResolvedValue({ tickets: [], total: 0 });

      const req = createMockReq({ query: { page: '2', pageSize: '10' } });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getAll(req, res, next);
      await flushPromises();

      expect(mockTicketFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 2,
          pageSize: 10,
        })
      );
    });

    it('assignee_idフィルタが正しく渡される（Agent以上のロール）', async () => {
      mockTicketFindAll.mockResolvedValue({ tickets: [], total: 0 });

      const req = createMockReq({
        query: { assignee_id: 'agent-001' },
        user: { user_id: 'manager-001', email: 'manager@example.com', role: UserRole.MANAGER },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getAll(req, res, next);
      await flushPromises();

      expect(mockTicketFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          assignee_id: 'agent-001',
        })
      );
    });
  });

  describe('getById', () => {
    it('チケット詳細とコメントを返す', async () => {
      mockTicketFindById.mockResolvedValue(sampleTicket);
      mockCommentFindByTicketId.mockResolvedValue([]);

      const req = createMockReq({ params: { id: 'ticket-001' } });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getById(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            ticket: sampleTicket,
            comments: [],
          }),
        })
      );
    });

    it('チケットが見つからない場合は404エラー', async () => {
      mockTicketFindById.mockResolvedValue(null);

      const req = createMockReq({ params: { id: 'nonexistent' } });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getById(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(404);
      expect(error.code).toBe('TICKET_NOT_FOUND');
    });

    it('REQUESTERは他人のチケットを閲覧不可（403）', async () => {
      mockTicketFindById.mockResolvedValue({
        ...sampleTicket,
        requester_id: 'other-user',
      });

      const req = createMockReq({
        params: { id: 'ticket-001' },
        user: { user_id: 'requester-001', email: 'user@example.com', role: UserRole.REQUESTER },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getById(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(403);
      expect(error.code).toBe('FORBIDDEN');
    });

    it('REQUESTERは自分のチケットは閲覧可能', async () => {
      mockTicketFindById.mockResolvedValue({
        ...sampleTicket,
        requester_id: 'requester-001',
      });
      mockCommentFindByTicketId.mockResolvedValue([]);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        user: { user_id: 'requester-001', email: 'user@example.com', role: UserRole.REQUESTER },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getById(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  describe('create', () => {
    it('必須項目でチケット作成成功', async () => {
      const createdTicket = {
        ...sampleTicket,
        ticket_id: 'ticket-new',
        ticket_number: 'INC-0002',
      };
      mockTicketCreate.mockResolvedValue(createdTicket);

      const req = createMockReq({
        body: {
          type: 'incident',
          subject: '新しい障害',
          description: '障害の詳細',
          impact: ImpactLevel.INDIVIDUAL,
          urgency: UrgencyLevel.MEDIUM,
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.create(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            ticket: createdTicket,
          }),
        })
      );
    });

    it('必須項目不足で400エラー', async () => {
      const req = createMockReq({
        body: {
          type: 'incident',
          subject: '件名のみ',
          // description, impact, urgency が不足
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.create(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('MISSING_FIELDS');
    });

    it('リクエストユーザーがrequester_idとして設定される', async () => {
      mockTicketCreate.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        body: {
          type: 'incident',
          subject: 'テスト',
          description: '詳細',
          impact: ImpactLevel.INDIVIDUAL,
          urgency: UrgencyLevel.MEDIUM,
        },
        user: { user_id: 'creator-001', email: 'user@example.com', role: UserRole.REQUESTER },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.create(req, res, next);
      await flushPromises();

      expect(mockTicketCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          requester_id: 'creator-001',
        })
      );
    });
  });

  describe('update', () => {
    it('チケット更新成功', async () => {
      const updatedTicket = { ...sampleTicket, subject: '更新後の件名' };
      mockTicketFindById.mockResolvedValue(sampleTicket);
      mockTicketUpdate.mockResolvedValue(updatedTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { subject: '更新後の件名' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.update(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            ticket: updatedTicket,
          }),
        })
      );
    });

    it('存在しないチケットの更新で404エラー', async () => {
      mockTicketFindById.mockResolvedValue(null);

      const req = createMockReq({
        params: { id: 'nonexistent' },
        body: { subject: '更新' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.update(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(404);
    });

    it('REQUESTERは他人のチケットを更新不可（403）', async () => {
      mockTicketFindById.mockResolvedValue({
        ...sampleTicket,
        requester_id: 'other-user',
      });

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { subject: '更新' },
        user: { user_id: 'requester-001', email: 'user@example.com', role: UserRole.REQUESTER },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.update(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(403);
    });
  });

  describe('updateStatus', () => {
    it('ステータス更新成功', async () => {
      const updatedTicket = { ...sampleTicket, status: TicketStatus.ASSIGNED };
      mockTicketUpdateStatus.mockResolvedValue(updatedTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { status: TicketStatus.ASSIGNED, reason: 'エスカレーション' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.updateStatus(req, res, next);
      await flushPromises();

      expect(mockTicketUpdateStatus).toHaveBeenCalledWith(
        'ticket-001',
        TicketStatus.ASSIGNED,
        'user-001',
        'エスカレーション'
      );
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('ステータスなしで400エラー', async () => {
      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: {},
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.updateStatus(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('MISSING_STATUS');
    });
  });

  describe('assign', () => {
    it('チケット割り当て成功', async () => {
      const assignedTicket = { ...sampleTicket, assignee_id: 'agent-001' };
      mockTicketAssign.mockResolvedValue(assignedTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { assignee_id: 'agent-001' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.assign(req, res, next);
      await flushPromises();

      expect(mockTicketAssign).toHaveBeenCalledWith('ticket-001', 'agent-001', 'user-001');
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('assignee_idなしで400エラー', async () => {
      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: {},
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.assign(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('MISSING_ASSIGNEE');
    });
  });

  describe('addComment', () => {
    it('コメント追加成功', async () => {
      const comment = {
        comment_id: 'comment-001',
        ticket_id: 'ticket-001',
        author_id: 'user-001',
        body: 'テストコメント',
        visibility: 'public',
      };
      mockCommentCreate.mockResolvedValue(comment);
      mockTicketFindById.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { body: 'テストコメント', visibility: 'public' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.addComment(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            comment,
          }),
        })
      );
    });

    it('bodyなしで400エラー', async () => {
      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: {},
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.addComment(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(400);
      expect(error.code).toBe('MISSING_BODY');
    });

    it('visibility未指定時はpublicがデフォルト', async () => {
      mockCommentCreate.mockResolvedValue({});
      mockTicketFindById.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { body: 'テスト' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.addComment(req, res, next);
      await flushPromises();

      expect(mockCommentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          visibility: 'public',
        })
      );
    });
  });

  describe('getStatistics', () => {
    it('統計情報を返す', async () => {
      const stats = { totalTickets: 100, openTickets: 30 };
      mockTicketGetStatistics.mockResolvedValue(stats);

      const req = createMockReq({ query: {} });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getStatistics(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            statistics: stats,
          }),
        })
      );
    });

    it('REQUESTERは自分の統計のみ取得', async () => {
      mockTicketGetStatistics.mockResolvedValue({});

      const req = createMockReq({
        query: {},
        user: { user_id: 'requester-001', email: 'user@example.com', role: UserRole.REQUESTER },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getStatistics(req, res, next);
      await flushPromises();

      expect(mockTicketGetStatistics).toHaveBeenCalledWith(
        expect.objectContaining({
          requester_id: 'requester-001',
        })
      );
    });

    it('日付フィルタが正しく渡される', async () => {
      mockTicketGetStatistics.mockResolvedValue({});

      const req = createMockReq({
        query: { from_date: '2025-01-01', to_date: '2025-12-31' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getStatistics(req, res, next);
      await flushPromises();

      expect(mockTicketGetStatistics).toHaveBeenCalledWith(
        expect.objectContaining({
          from_date: expect.any(Date),
          to_date: expect.any(Date),
        })
      );
    });
  });

  describe('getHistory', () => {
    it('チケットが見つからない場合は404エラー', async () => {
      mockTicketFindById.mockResolvedValue(null);

      const req = createMockReq({ params: { id: 'nonexistent' } });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getHistory(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(404);
    });

    it('REQUESTERは他人のチケット履歴を閲覧不可（403）', async () => {
      mockTicketFindById.mockResolvedValue({
        ...sampleTicket,
        requester_id: 'other-user',
      });

      const req = createMockReq({
        params: { id: 'ticket-001' },
        user: { user_id: 'requester-001', email: 'user@example.com', role: UserRole.REQUESTER },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getHistory(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(403);
    });
  });
});
