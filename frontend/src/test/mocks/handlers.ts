import { http, HttpResponse } from 'msw';

const API_BASE = 'http://localhost:3000/api';

export const handlers = [
  // 認証
  http.post(`${API_BASE}/auth/login`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        token: 'mock-token',
        refreshToken: 'mock-refresh-token',
        user: {
          user_id: '1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'Agent',
        },
      },
    });
  }),

  // チケット一覧
  http.get(`${API_BASE}/tickets`, ({ request }) => {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');

    const tickets = [
      {
        ticket_id: '1',
        ticket_number: 'TICKET-001',
        type: 'インシデント',
        subject: 'テストチケット1',
        status: 'New',
        priority: 'P2',
        impact: '部署',
        urgency: '高',
        requester_name: 'Test User',
        created_at: '2026-02-12T10:00:00Z',
      },
      {
        ticket_id: '2',
        ticket_number: 'TICKET-002',
        type: 'サービス要求',
        subject: 'テストチケット2',
        status: 'In Progress',
        priority: 'P3',
        impact: '個人',
        urgency: '中',
        requester_name: 'Test User 2',
        created_at: '2026-02-12T11:00:00Z',
      },
    ];

    const filtered = status ? tickets.filter((t) => t.status === status) : tickets;

    return HttpResponse.json({
      success: true,
      data: {
        tickets: filtered,
      },
      meta: {
        total: filtered.length,
        page: 1,
        pageSize: 20,
      },
    });
  }),

  // チケット詳細
  http.get(`${API_BASE}/tickets/:id`, ({ params }) => {
    const { id } = params;

    return HttpResponse.json({
      success: true,
      data: {
        ticket_id: id,
        ticket_number: `TICKET-${String(id).padStart(3, '0')}`,
        type: 'インシデント',
        subject: 'テストチケット詳細',
        description: 'これはテスト用のチケット詳細です。',
        status: 'New',
        priority: 'P2',
        impact: '部署',
        urgency: '高',
        requester_id: '1',
        requester_name: 'Test User',
        assignee_id: null,
        assignee_name: null,
        category_name: 'システム障害',
        created_at: '2026-02-12T10:00:00Z',
        updated_at: '2026-02-12T10:00:00Z',
        resolved_at: null,
        closed_at: null,
        due_at: '2026-02-12T18:00:00Z',
      },
    });
  }),

  // チケット作成
  http.post(`${API_BASE}/tickets`, async ({ request }) => {
    const body = await request.json();

    return HttpResponse.json({
      success: true,
      data: {
        ticket_id: '999',
        ticket_number: 'TICKET-999',
        ...body,
        status: 'New',
        created_at: new Date().toISOString(),
      },
    });
  }),

  // チケット更新
  http.patch(`${API_BASE}/tickets/:id`, async ({ params, request }) => {
    const { id } = params;
    const body = await request.json();

    return HttpResponse.json({
      success: true,
      data: {
        ticket_id: id,
        ...body,
        updated_at: new Date().toISOString(),
      },
    });
  }),

  // コメント一覧
  http.get(`${API_BASE}/tickets/:id/comments`, ({ params }) => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          comment_id: '1',
          ticket_id: params.id,
          author_name: 'Test User',
          body: 'テストコメント',
          visibility: 'public',
          created_at: '2026-02-12T10:30:00Z',
        },
      ],
    });
  }),

  // コメント作成
  http.post(`${API_BASE}/tickets/:id/comments`, async ({ params, request }) => {
    const body = await request.json();

    return HttpResponse.json({
      success: true,
      data: {
        comment_id: '999',
        ticket_id: params.id,
        author_name: 'Test User',
        ...body,
        created_at: new Date().toISOString(),
      },
    });
  }),

  // 通知
  http.get(`${API_BASE}/notifications`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          notification_id: '1',
          type: 'ticket_assigned',
          title: 'チケットが割り当てられました',
          message: 'TICKET-001が割り当てられました',
          is_read: false,
          created_at: '2026-02-12T10:00:00Z',
        },
      ],
    });
  }),

  // カテゴリ一覧
  http.get(`${API_BASE}/categories`, () => {
    return HttpResponse.json({
      success: true,
      data: {
        categories: [
          {
            category_id: '1',
            name: 'システム障害',
            description: 'システム障害対応',
          },
          {
            category_id: '2',
            name: 'アカウント管理',
            description: 'アカウント関連の要求',
          },
        ],
      },
    });
  }),

  // SLAポリシー一覧
  http.get(`${API_BASE}/sla`, () => {
    return HttpResponse.json({
      success: true,
      data: [
        {
          sla_policy_id: '1',
          priority: 'P1',
          response_time_minutes: 15,
          resolution_time_minutes: 120,
        },
        {
          sla_policy_id: '2',
          priority: 'P2',
          response_time_minutes: 60,
          resolution_time_minutes: 480,
        },
      ],
    });
  }),
];
