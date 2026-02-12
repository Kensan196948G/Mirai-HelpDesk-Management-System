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

    // ===== 追加テストケース =====

    it('priorityのカンマ区切りを配列に変換', async () => {
      mockTicketFindAll.mockResolvedValue({ tickets: [], total: 0 });

      const req = createMockReq({ query: { priority: 'P1,P2,P3' } });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getAll(req, res, next);
      await flushPromises();

      expect(mockTicketFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          priority: ['P1', 'P2', 'P3'],
        })
      );
    });

    it('typeフィルタが正しく渡される', async () => {
      mockTicketFindAll.mockResolvedValue({ tickets: [], total: 0 });

      const req = createMockReq({ query: { type: 'incident' } });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getAll(req, res, next);
      await flushPromises();

      expect(mockTicketFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'incident',
        })
      );
    });

    it('複数フィルタの組み合わせ', async () => {
      mockTicketFindAll.mockResolvedValue({ tickets: [], total: 0 });

      const req = createMockReq({
        query: {
          status: 'new,assigned',
          priority: 'P1,P2',
          type: 'incident',
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getAll(req, res, next);
      await flushPromises();

      expect(mockTicketFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['new', 'assigned'],
          priority: ['P1', 'P2'],
          type: 'incident',
        })
      );
    });

    it('空の結果セットを正しく処理', async () => {
      mockTicketFindAll.mockResolvedValue({ tickets: [], total: 0 });

      const req = createMockReq({ query: {} });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getAll(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: expect.objectContaining({
            tickets: [],
            meta: expect.objectContaining({
              total: 0,
            }),
          }),
        })
      );
    });

    it('大量のチケット（ページネーション）', async () => {
      const manyTickets = Array.from({ length: 20 }, (_, i) => ({
        ...sampleTicket,
        ticket_id: `ticket-${i}`,
      }));

      mockTicketFindAll.mockResolvedValue({
        tickets: manyTickets,
        total: 100,
      });

      const req = createMockReq({ query: { page: '3', pageSize: '20' } });
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
              total: 100,
              page: 3,
              pageSize: 20,
              totalPages: 5,
            }),
          }),
        })
      );
    });

    it('無効なページ番号（0以下）はデフォルト値1を使用', async () => {
      mockTicketFindAll.mockResolvedValue({ tickets: [], total: 0 });

      const req = createMockReq({ query: { page: '0' } });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getAll(req, res, next);
      await flushPromises();

      expect(mockTicketFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
        })
      );
    });

    it('無効なpageSize（100超過）は最大値100を使用', async () => {
      mockTicketFindAll.mockResolvedValue({ tickets: [], total: 0 });

      const req = createMockReq({ query: { pageSize: '200' } });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getAll(req, res, next);
      await flushPromises();

      expect(mockTicketFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          pageSize: 100,
        })
      );
    });

    it('AUDITORロールは全てのチケットを閲覧可能', async () => {
      mockTicketFindAll.mockResolvedValue({ tickets: [], total: 0 });

      const req = createMockReq({
        query: {},
        user: { user_id: 'auditor-001', email: 'auditor@example.com', role: UserRole.AUDITOR },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getAll(req, res, next);
      await flushPromises();

      expect(mockTicketFindAll).toHaveBeenCalledWith(
        expect.not.objectContaining({
          requester_id: 'auditor-001',
        })
      );
    });

    it('M365_OPERATORロールは全てのチケットを閲覧可能', async () => {
      mockTicketFindAll.mockResolvedValue({ tickets: [], total: 0 });

      const req = createMockReq({
        query: {},
        user: { user_id: 'operator-001', email: 'operator@example.com', role: UserRole.M365_OPERATOR },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getAll(req, res, next);
      await flushPromises();

      expect(mockTicketFindAll).toHaveBeenCalled();
    });

    it('検索キーワードが正しく渡される', async () => {
      mockTicketFindAll.mockResolvedValue({ tickets: [], total: 0 });

      const req = createMockReq({ query: { search: 'メール送信エラー' } });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getAll(req, res, next);
      await flushPromises();

      expect(mockTicketFindAll).toHaveBeenCalledWith(
        expect.objectContaining({
          search: 'メール送信エラー',
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

    // ===== 追加テストケース =====

    it('サービス要求チケット作成成功', async () => {
      const serviceTicket = {
        ...sampleTicket,
        type: 'service_request',
        ticket_number: 'SR-0001',
      };
      mockTicketCreate.mockResolvedValue(serviceTicket);

      const req = createMockReq({
        body: {
          type: 'service_request',
          subject: 'ライセンス付与依頼',
          description: 'Office 365 E3 ライセンスが必要',
          impact: ImpactLevel.INDIVIDUAL,
          urgency: UrgencyLevel.LOW,
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.create(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('件名なしで400エラー', async () => {
      const req = createMockReq({
        body: {
          type: 'incident',
          description: '詳細のみ',
          impact: ImpactLevel.INDIVIDUAL,
          urgency: UrgencyLevel.MEDIUM,
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.create(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(400);
    });

    it('typeなしで400エラー', async () => {
      const req = createMockReq({
        body: {
          subject: 'テスト',
          description: '詳細',
          impact: ImpactLevel.INDIVIDUAL,
          urgency: UrgencyLevel.MEDIUM,
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.create(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('impactなしで400エラー', async () => {
      const req = createMockReq({
        body: {
          type: 'incident',
          subject: 'テスト',
          description: '詳細',
          urgency: UrgencyLevel.MEDIUM,
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.create(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('urgencyなしで400エラー', async () => {
      const req = createMockReq({
        body: {
          type: 'incident',
          subject: 'テスト',
          description: '詳細',
          impact: ImpactLevel.INDIVIDUAL,
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.create(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('優先度P1（全社影響 × 即時）が自動計算される', async () => {
      mockTicketCreate.mockResolvedValue({
        ...sampleTicket,
        priority: PriorityLevel.P1,
      });

      const req = createMockReq({
        body: {
          type: 'incident',
          subject: '全社メール停止',
          description: 'Exchange Online ダウン',
          impact: ImpactLevel.COMPANY_WIDE,
          urgency: UrgencyLevel.IMMEDIATE,
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.create(req, res, next);
      await flushPromises();

      expect(mockTicketCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          impact: ImpactLevel.COMPANY_WIDE,
          urgency: UrgencyLevel.IMMEDIATE,
        })
      );
    });

    it('優先度P4（個人 × 低）が自動計算される', async () => {
      mockTicketCreate.mockResolvedValue({
        ...sampleTicket,
        priority: PriorityLevel.P4,
      });

      const req = createMockReq({
        body: {
          type: 'service_request',
          subject: '問い合わせ',
          description: '使い方を知りたい',
          impact: ImpactLevel.INDIVIDUAL,
          urgency: UrgencyLevel.LOW,
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.create(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('空の件名で400エラー', async () => {
      const req = createMockReq({
        body: {
          type: 'incident',
          subject: '',
          description: '詳細',
          impact: ImpactLevel.INDIVIDUAL,
          urgency: UrgencyLevel.MEDIUM,
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.create(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('空の説明で400エラー', async () => {
      const req = createMockReq({
        body: {
          type: 'incident',
          subject: 'テスト',
          description: '',
          impact: ImpactLevel.INDIVIDUAL,
          urgency: UrgencyLevel.MEDIUM,
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.create(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('長すぎる件名（500文字超）で400エラー', async () => {
      const req = createMockReq({
        body: {
          type: 'incident',
          subject: 'あ'.repeat(501),
          description: '詳細',
          impact: ImpactLevel.INDIVIDUAL,
          urgency: UrgencyLevel.MEDIUM,
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.create(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('無効なtypeで400エラー', async () => {
      const req = createMockReq({
        body: {
          type: 'invalid_type',
          subject: 'テスト',
          description: '詳細',
          impact: ImpactLevel.INDIVIDUAL,
          urgency: UrgencyLevel.MEDIUM,
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.create(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('無効なimpactで400エラー', async () => {
      const req = createMockReq({
        body: {
          type: 'incident',
          subject: 'テスト',
          description: '詳細',
          impact: 'invalid_impact',
          urgency: UrgencyLevel.MEDIUM,
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.create(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('無効なurgencyで400エラー', async () => {
      const req = createMockReq({
        body: {
          type: 'incident',
          subject: 'テスト',
          description: '詳細',
          impact: ImpactLevel.INDIVIDUAL,
          urgency: 'invalid_urgency',
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.create(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('カテゴリIDが正しく設定される', async () => {
      mockTicketCreate.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        body: {
          type: 'incident',
          subject: 'テスト',
          description: '詳細',
          impact: ImpactLevel.INDIVIDUAL,
          urgency: UrgencyLevel.MEDIUM,
          category_id: 'cat-001',
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.create(req, res, next);
      await flushPromises();

      expect(mockTicketCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          category_id: 'cat-001',
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

    // ===== 追加テストケース =====

    it('descriptionのみ更新成功', async () => {
      const updatedTicket = { ...sampleTicket, description: '更新後の詳細' };
      mockTicketFindById.mockResolvedValue(sampleTicket);
      mockTicketUpdate.mockResolvedValue(updatedTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { description: '更新後の詳細' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.update(req, res, next);
      await flushPromises();

      expect(mockTicketUpdate).toHaveBeenCalledWith(
        'ticket-001',
        expect.objectContaining({
          description: '更新後の詳細',
        }),
        'user-001'
      );
    });

    it('impact変更で優先度が再計算される', async () => {
      const updatedTicket = { ...sampleTicket, impact: ImpactLevel.COMPANY_WIDE, priority: PriorityLevel.P1 };
      mockTicketFindById.mockResolvedValue(sampleTicket);
      mockTicketUpdate.mockResolvedValue(updatedTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { impact: ImpactLevel.COMPANY_WIDE },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.update(req, res, next);
      await flushPromises();

      expect(mockTicketUpdate).toHaveBeenCalled();
    });

    it('urgency変更で優先度が再計算される', async () => {
      const updatedTicket = { ...sampleTicket, urgency: UrgencyLevel.IMMEDIATE, priority: PriorityLevel.P2 };
      mockTicketFindById.mockResolvedValue(sampleTicket);
      mockTicketUpdate.mockResolvedValue(updatedTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { urgency: UrgencyLevel.IMMEDIATE },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.update(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('複数フィールド同時更新', async () => {
      const updatedTicket = {
        ...sampleTicket,
        subject: '新件名',
        description: '新詳細',
        impact: ImpactLevel.DEPARTMENT,
      };
      mockTicketFindById.mockResolvedValue(sampleTicket);
      mockTicketUpdate.mockResolvedValue(updatedTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: {
          subject: '新件名',
          description: '新詳細',
          impact: ImpactLevel.DEPARTMENT,
        },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.update(req, res, next);
      await flushPromises();

      expect(mockTicketUpdate).toHaveBeenCalledWith(
        'ticket-001',
        expect.objectContaining({
          subject: '新件名',
          description: '新詳細',
          impact: ImpactLevel.DEPARTMENT,
        }),
        'user-001'
      );
    });

    it('AGENTロールは任意のチケットを更新可能', async () => {
      mockTicketFindById.mockResolvedValue(sampleTicket);
      mockTicketUpdate.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { subject: '更新' },
        user: { user_id: 'agent-001', email: 'agent@example.com', role: UserRole.AGENT },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.update(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('MANAGERロールは任意のチケットを更新可能', async () => {
      mockTicketFindById.mockResolvedValue(sampleTicket);
      mockTicketUpdate.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { subject: '更新' },
        user: { user_id: 'manager-001', email: 'manager@example.com', role: UserRole.MANAGER },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.update(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('空のbodyで400エラー', async () => {
      mockTicketFindById.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: {},
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.update(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('category_id更新', async () => {
      const updatedTicket = { ...sampleTicket, category_id: 'cat-002' };
      mockTicketFindById.mockResolvedValue(sampleTicket);
      mockTicketUpdate.mockResolvedValue(updatedTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { category_id: 'cat-002' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.update(req, res, next);
      await flushPromises();

      expect(mockTicketUpdate).toHaveBeenCalledWith(
        'ticket-001',
        expect.objectContaining({
          category_id: 'cat-002',
        }),
        'user-001'
      );
    });

    it('無効なimpact値で400エラー', async () => {
      mockTicketFindById.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { impact: 'invalid' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.update(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('無効なurgency値で400エラー', async () => {
      mockTicketFindById.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { urgency: 'invalid' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.update(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('Closedチケットは更新不可（400エラー）', async () => {
      mockTicketFindById.mockResolvedValue({
        ...sampleTicket,
        status: TicketStatus.CLOSED,
      });

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { subject: '更新' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.update(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
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

    // ===== 追加テストケース =====

    it('NEW → TRIAGE へのステータス更新', async () => {
      mockTicketUpdateStatus.mockResolvedValue({
        ...sampleTicket,
        status: TicketStatus.TRIAGE,
      });

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { status: TicketStatus.TRIAGE, reason: 'トリアージ開始' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.updateStatus(req, res, next);
      await flushPromises();

      expect(mockTicketUpdateStatus).toHaveBeenCalledWith(
        'ticket-001',
        TicketStatus.TRIAGE,
        'user-001',
        'トリアージ開始'
      );
    });

    it('IN_PROGRESS → RESOLVED へのステータス更新', async () => {
      mockTicketUpdateStatus.mockResolvedValue({
        ...sampleTicket,
        status: TicketStatus.RESOLVED,
      });

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { status: TicketStatus.RESOLVED, reason: '問題解決' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.updateStatus(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('RESOLVED → CLOSED へのステータス更新', async () => {
      mockTicketUpdateStatus.mockResolvedValue({
        ...sampleTicket,
        status: TicketStatus.CLOSED,
      });

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { status: TicketStatus.CLOSED, reason: '利用者確認完了' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.updateStatus(req, res, next);
      await flushPromises();

      expect(mockTicketUpdateStatus).toHaveBeenCalledWith(
        'ticket-001',
        TicketStatus.CLOSED,
        'user-001',
        '利用者確認完了'
      );
    });

    it('reason未指定でもステータス更新可能', async () => {
      mockTicketUpdateStatus.mockResolvedValue({
        ...sampleTicket,
        status: TicketStatus.IN_PROGRESS,
      });

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { status: TicketStatus.IN_PROGRESS },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.updateStatus(req, res, next);
      await flushPromises();

      expect(mockTicketUpdateStatus).toHaveBeenCalledWith(
        'ticket-001',
        TicketStatus.IN_PROGRESS,
        'user-001',
        undefined
      );
    });

    it('無効なステータス値で400エラー', async () => {
      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { status: 'invalid_status' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.updateStatus(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('REQUESTERロールはステータス更新不可（403）', async () => {
      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { status: TicketStatus.RESOLVED },
        user: { user_id: 'requester-001', email: 'user@example.com', role: UserRole.REQUESTER },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.updateStatus(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(403);
    });

    it('AGENTロールはステータス更新可能', async () => {
      mockTicketUpdateStatus.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { status: TicketStatus.IN_PROGRESS },
        user: { user_id: 'agent-001', email: 'agent@example.com', role: UserRole.AGENT },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.updateStatus(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
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

    // ===== 追加テストケース =====

    it('自分自身に割り当て', async () => {
      const assignedTicket = { ...sampleTicket, assignee_id: 'user-001' };
      mockTicketAssign.mockResolvedValue(assignedTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { assignee_id: 'user-001' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.assign(req, res, next);
      await flushPromises();

      expect(mockTicketAssign).toHaveBeenCalledWith('ticket-001', 'user-001', 'user-001');
    });

    it('MANAGERが他のAGENTに割り当て', async () => {
      mockTicketAssign.mockResolvedValue({
        ...sampleTicket,
        assignee_id: 'agent-002',
      });

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { assignee_id: 'agent-002' },
        user: { user_id: 'manager-001', email: 'manager@example.com', role: UserRole.MANAGER },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.assign(req, res, next);
      await flushPromises();

      expect(mockTicketAssign).toHaveBeenCalledWith('ticket-001', 'agent-002', 'manager-001');
    });

    it('割り当て解除（assignee_id = null）', async () => {
      mockTicketAssign.mockResolvedValue({
        ...sampleTicket,
        assignee_id: null,
      });

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { assignee_id: null },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.assign(req, res, next);
      await flushPromises();

      expect(mockTicketAssign).toHaveBeenCalledWith('ticket-001', null, 'user-001');
    });

    it('REQUESTERロールは割り当て不可（403）', async () => {
      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { assignee_id: 'agent-001' },
        user: { user_id: 'requester-001', email: 'user@example.com', role: UserRole.REQUESTER },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.assign(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(403);
    });

    it('存在しないチケットへの割り当てで404エラー', async () => {
      mockTicketAssign.mockRejectedValue(new AppError('Ticket not found', 404, 'TICKET_NOT_FOUND'));

      const req = createMockReq({
        params: { id: 'nonexistent' },
        body: { assignee_id: 'agent-001' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.assign(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('Closedチケットへの割り当て変更は不可（400エラー）', async () => {
      mockTicketAssign.mockRejectedValue(new AppError('Cannot assign closed ticket', 400, 'INVALID_STATE'));

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { assignee_id: 'agent-001' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.assign(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('無効なassignee_id形式で400エラー', async () => {
      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { assignee_id: 123 },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.assign(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
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

    // ===== 追加テストケース =====

    it('内部メモ（internal）追加成功', async () => {
      const internalComment = {
        comment_id: 'comment-002',
        ticket_id: 'ticket-001',
        author_id: 'user-001',
        body: '内部メモ',
        visibility: 'internal',
      };
      mockCommentCreate.mockResolvedValue(internalComment);
      mockTicketFindById.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { body: '内部メモ', visibility: 'internal' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.addComment(req, res, next);
      await flushPromises();

      expect(mockCommentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          visibility: 'internal',
        })
      );
    });

    it('REQUESTERは内部メモを追加不可（403）', async () => {
      mockTicketFindById.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { body: '内部メモ', visibility: 'internal' },
        user: { user_id: 'requester-001', email: 'user@example.com', role: UserRole.REQUESTER },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.addComment(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(403);
    });

    it('AGENTは内部メモを追加可能', async () => {
      mockCommentCreate.mockResolvedValue({});
      mockTicketFindById.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { body: '内部メモ', visibility: 'internal' },
        user: { user_id: 'agent-001', email: 'agent@example.com', role: UserRole.AGENT },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.addComment(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('存在しないチケットへのコメント追加で404エラー', async () => {
      mockTicketFindById.mockResolvedValue(null);

      const req = createMockReq({
        params: { id: 'nonexistent' },
        body: { body: 'テスト' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.addComment(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(404);
    });

    it('REQUESTERは他人のチケットにコメント不可（403）', async () => {
      mockTicketFindById.mockResolvedValue({
        ...sampleTicket,
        requester_id: 'other-user',
      });

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { body: 'コメント' },
        user: { user_id: 'requester-001', email: 'user@example.com', role: UserRole.REQUESTER },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.addComment(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
      const error = next.mock.calls[0][0] as AppError;
      expect(error.statusCode).toBe(403);
    });

    it('空のbodyで400エラー', async () => {
      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { body: '' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.addComment(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('長すぎるbody（10000文字超）で400エラー', async () => {
      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { body: 'あ'.repeat(10001) },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.addComment(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('無効なvisibility値で400エラー', async () => {
      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { body: 'テスト', visibility: 'invalid' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.addComment(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
    });

    it('author_idは自動的にリクエストユーザーに設定される', async () => {
      mockCommentCreate.mockResolvedValue({});
      mockTicketFindById.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { body: 'テスト' },
        user: { user_id: 'author-001', email: 'author@example.com', role: UserRole.AGENT },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.addComment(req, res, next);
      await flushPromises();

      expect(mockCommentCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          author_id: 'author-001',
        })
      );
    });

    it('M365_OPERATORは内部メモを追加可能', async () => {
      mockCommentCreate.mockResolvedValue({});
      mockTicketFindById.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { body: '内部メモ', visibility: 'internal' },
        user: { user_id: 'operator-001', email: 'operator@example.com', role: UserRole.M365_OPERATOR },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.addComment(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('APPROVERは内部メモを追加可能', async () => {
      mockCommentCreate.mockResolvedValue({});
      mockTicketFindById.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { body: '承認メモ', visibility: 'internal' },
        user: { user_id: 'approver-001', email: 'approver@example.com', role: UserRole.APPROVER },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.addComment(req, res, next);
      await flushPromises();

      expect(res.status).toHaveBeenCalledWith(201);
    });

    it('Closedチケットへのコメント追加は不可（400エラー）', async () => {
      mockTicketFindById.mockResolvedValue({
        ...sampleTicket,
        status: TicketStatus.CLOSED,
      });

      const req = createMockReq({
        params: { id: 'ticket-001' },
        body: { body: 'コメント' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.addComment(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
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

    // ===== 追加テストケース =====

    it('MANAGERは全ての統計を取得可能', async () => {
      mockTicketGetStatistics.mockResolvedValue({});

      const req = createMockReq({
        query: {},
        user: { user_id: 'manager-001', email: 'manager@example.com', role: UserRole.MANAGER },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getStatistics(req, res, next);
      await flushPromises();

      expect(mockTicketGetStatistics).toHaveBeenCalledWith(
        expect.not.objectContaining({
          requester_id: 'manager-001',
        })
      );
    });

    it('statusフィルタが正しく渡される', async () => {
      mockTicketGetStatistics.mockResolvedValue({});

      const req = createMockReq({
        query: { status: 'new,assigned' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getStatistics(req, res, next);
      await flushPromises();

      expect(mockTicketGetStatistics).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['new', 'assigned'],
        })
      );
    });

    it('assignee_idフィルタが正しく渡される', async () => {
      mockTicketGetStatistics.mockResolvedValue({});

      const req = createMockReq({
        query: { assignee_id: 'agent-001' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getStatistics(req, res, next);
      await flushPromises();

      expect(mockTicketGetStatistics).toHaveBeenCalledWith(
        expect.objectContaining({
          assignee_id: 'agent-001',
        })
      );
    });

    it('無効な日付形式でエラー', async () => {
      const req = createMockReq({
        query: { from_date: 'invalid-date' },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getStatistics(req, res, next);
      await flushPromises();

      expect(next).toHaveBeenCalledWith(expect.any(AppError));
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

    // ===== 追加テストケース =====

    it('MANAGERは任意のチケット履歴を閲覧可能', async () => {
      mockTicketFindById.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        user: { user_id: 'manager-001', email: 'manager@example.com', role: UserRole.MANAGER },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getHistory(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('AUDITORは任意のチケット履歴を閲覧可能', async () => {
      mockTicketFindById.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        user: { user_id: 'auditor-001', email: 'auditor@example.com', role: UserRole.AUDITOR },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getHistory(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });

    it('REQUESTERは自分のチケット履歴を閲覧可能', async () => {
      mockTicketFindById.mockResolvedValue({
        ...sampleTicket,
        requester_id: 'requester-001',
      });

      const req = createMockReq({
        params: { id: 'ticket-001' },
        user: { user_id: 'requester-001', email: 'user@example.com', role: UserRole.REQUESTER },
      });
      const res = createMockRes();
      const next = jest.fn();

      TicketController.getHistory(req, res, next);
      await flushPromises();

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
    });
  });

  // 論理削除機能のテスト（想定実装）
  describe('delete (logical)', () => {
    it('MANAGERロールはチケットを論理削除可能', async () => {
      mockTicketUpdate.mockResolvedValue({
        ...sampleTicket,
        deleted_at: new Date(),
      });
      mockTicketFindById.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        user: { user_id: 'manager-001', email: 'manager@example.com', role: UserRole.MANAGER },
      });
      const res = createMockRes();
      const next = jest.fn();

      // 実装想定: TicketController.delete
      // TicketController.delete(req, res, next);
      // await flushPromises();

      // expect(mockTicketUpdate).toHaveBeenCalledWith(
      //   'ticket-001',
      //   expect.objectContaining({
      //     deleted_at: expect.any(Date),
      //   }),
      //   'manager-001'
      // );
    });

    it('REQUESTERロールは論理削除不可（403）', async () => {
      mockTicketFindById.mockResolvedValue(sampleTicket);

      const req = createMockReq({
        params: { id: 'ticket-001' },
        user: { user_id: 'requester-001', email: 'user@example.com', role: UserRole.REQUESTER },
      });
      const res = createMockRes();
      const next = jest.fn();

      // 実装想定: 403エラーが返される
      // expect(next).toHaveBeenCalledWith(expect.any(AppError));
      // const error = next.mock.calls[0][0] as AppError;
      // expect(error.statusCode).toBe(403);
    });

    it('既に論理削除されたチケットは再削除不可', async () => {
      mockTicketFindById.mockResolvedValue({
        ...sampleTicket,
        deleted_at: new Date(),
      });

      const req = createMockReq({
        params: { id: 'ticket-001' },
        user: { user_id: 'manager-001', email: 'manager@example.com', role: UserRole.MANAGER },
      });
      const res = createMockRes();
      const next = jest.fn();

      // 実装想定: 400エラーが返される
    });

    it('論理削除されたチケットは一覧に表示されない', async () => {
      // 実装想定: findAll でdeleted_at IS NULL 条件が追加される
    });

    it('監査ログに削除操作が記録される', async () => {
      // 実装想定: logAudit('TICKET_DELETE', ...) が呼ばれる
    });
  });
});
