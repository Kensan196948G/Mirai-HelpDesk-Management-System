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

export interface TicketAttachment {
  id: number;
  ticket_id: number;
  filename: string;
  original_filename: string;
  content_type: string;
  size: number;
  hash: string;
  uploader_id: number;
  uploader_name?: string;
  created_at: string;
}

export interface TicketHistoryEntry {
  id: number;
  ticket_id: number;
  actor_id: number | null;
  actor_name: string | null;
  action: string;
  field_name: string | null;
  before: string | null;
  after: string | null;
  reason: string | null;
  created_at: string;
}

export interface TicketDetailWithRelations {
  ticket: TicketDetail;
  comments: TicketComment[];
  attachments: TicketAttachment[];
  history: TicketHistoryEntry[];
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

// チケット詳細取得（基本情報のみ）
export const getTicket = async (
  id: string
): Promise<ApiResponse<{ ticket: TicketDetail; comments: TicketComment[] }>> => {
  return apiRequest<{ ticket: TicketDetail; comments: TicketComment[] }>({
    method: 'GET',
    url: `/tickets/${id}`,
  });
};

// チケット詳細取得（コメント・添付・履歴含む）
export const getTicketDetail = async (
  id: string
): Promise<ApiResponse<TicketDetailWithRelations>> => {
  // 基本情報・コメント、添付ファイル、履歴を並列取得
  const [response, attachmentsRes, historyRes] = await Promise.all([
    apiRequest<{ ticket: TicketDetail; comments: TicketComment[] }>({
      method: 'GET',
      url: `/tickets/${id}`,
    }),
    apiRequest<{ attachments: TicketAttachment[] }>({
      method: 'GET',
      url: `/tickets/${id}/attachments`,
    }).catch(() => ({ success: false, data: undefined })),
    apiRequest<{ items: TicketHistoryEntry[]; total: number; page: number; page_size: number; total_pages: number }>({
      method: 'GET',
      url: `/tickets/${id}/history`,
    }).catch(() => ({ success: false, data: undefined })),
  ]);

  // 成功した場合、添付ファイルと履歴を結合
  if (response.success && response.data) {
    return {
      ...response,
      data: {
        ticket: response.data.ticket,
        comments: response.data.comments || [],
        attachments: attachmentsRes.success && attachmentsRes.data
          ? attachmentsRes.data.attachments
          : [],
        history: historyRes.success && historyRes.data
          ? historyRes.data.items
          : [],
      },
    };
  }

  // エラーの場合はそのまま返す
  return response as ApiResponse<TicketDetailWithRelations>;
};

// 添付ファイル一覧取得
export const getTicketAttachments = async (
  ticketId: string
): Promise<ApiResponse<{ attachments: TicketAttachment[] }>> => {
  return apiRequest<{ attachments: TicketAttachment[] }>({
    method: 'GET',
    url: `/tickets/${ticketId}/attachments`,
  });
};

// 添付ファイルアップロード
export const uploadAttachment = async (
  ticketId: string,
  file: File
): Promise<ApiResponse<{ attachment: TicketAttachment }>> => {
  const formData = new FormData();
  formData.append('file', file);

  return apiRequest<{ attachment: TicketAttachment }>({
    method: 'POST',
    url: `/tickets/${ticketId}/attachments`,
    data: formData,
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

// チケット履歴取得
export const getTicketHistory = async (
  ticketId: string,
  params?: { page?: number; page_size?: number }
): Promise<ApiResponse<{ items: TicketHistoryEntry[]; total: number; page: number; page_size: number; total_pages: number }>> => {
  return apiRequest<{ items: TicketHistoryEntry[]; total: number; page: number; page_size: number; total_pages: number }>({
    method: 'GET',
    url: `/tickets/${ticketId}/history`,
    params,
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
