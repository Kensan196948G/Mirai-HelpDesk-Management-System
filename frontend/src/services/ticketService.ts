import { apiRequest, ApiResponse } from './api';

export interface Ticket {
  ticket_id: string;
  ticket_number: string;
  type: string;
  subject: string;
  description: string;
  status: string;
  priority: string;
  impact: string;
  urgency: string;
  requester_id: string;
  requester_name?: string;
  assignee_id?: string;
  assignee_name?: string;
  category_name?: string;
  created_at: string;
  updated_at: string;
  due_at?: string;
  response_due_at?: string;
}

export interface TicketDetail extends Ticket {
  resolution_summary?: string;
  root_cause?: string;
  resolved_at?: string;
  closed_at?: string;
}

export interface TicketComment {
  comment_id: string;
  ticket_id: string;
  author_id: string;
  author_name: string;
  author_role?: string;
  body: string;
  visibility: 'public' | 'internal';
  created_at: string;
}

export interface CreateTicketRequest {
  type: string;
  subject: string;
  description: string;
  impact: string;
  urgency: string;
  category_id?: string;
}

// チケット一覧取得
export const getTickets = async (params?: {
  status?: string;
  priority?: string;
  type?: string;
  assignee_id?: string;
  page?: number;
  pageSize?: number;
}): Promise<ApiResponse<{ tickets: Ticket[] }>> => {
  return apiRequest<{ tickets: Ticket[] }>({
    method: 'GET',
    url: '/tickets',
    params,
  });
};

// チケット詳細取得
export const getTicket = async (
  id: string
): Promise<ApiResponse<{ ticket: TicketDetail; comments: TicketComment[] }>> => {
  return apiRequest<{ ticket: TicketDetail; comments: TicketComment[] }>({
    method: 'GET',
    url: `/tickets/${id}`,
  });
};

// チケット作成
export const createTicket = async (
  data: CreateTicketRequest
): Promise<ApiResponse<{ ticket: Ticket }>> => {
  return apiRequest<{ ticket: Ticket }>({
    method: 'POST',
    url: '/tickets',
    data,
  });
};

// チケット更新
export const updateTicket = async (
  id: string,
  data: Partial<Ticket>
): Promise<ApiResponse<{ ticket: Ticket }>> => {
  return apiRequest<{ ticket: Ticket }>({
    method: 'PATCH',
    url: `/tickets/${id}`,
    data,
  });
};

// ステータス更新
export const updateTicketStatus = async (
  id: string,
  status: string,
  reason?: string
): Promise<ApiResponse<{ ticket: Ticket }>> => {
  return apiRequest<{ ticket: Ticket }>({
    method: 'PATCH',
    url: `/tickets/${id}/status`,
    data: { status, reason },
  });
};

// コメント追加
export const addComment = async (
  ticketId: string,
  body: string,
  visibility: 'public' | 'internal' = 'public'
): Promise<ApiResponse<{ comment: TicketComment }>> => {
  return apiRequest<{ comment: TicketComment }>({
    method: 'POST',
    url: `/tickets/${ticketId}/comments`,
    data: { body, visibility },
  });
};

// チケット統計取得
export const getTicketStatistics = async (params?: {
  from_date?: string;
  to_date?: string;
}): Promise<ApiResponse<{ statistics: any }>> => {
  return apiRequest<{ statistics: any }>({
    method: 'GET',
    url: '/tickets/statistics',
    params,
  });
};
