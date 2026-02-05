import { apiRequest, ApiResponse } from './api';

// SLAポリシー定義
export interface SLAPolicy {
  priority: string;
  responseMinutes: number;
  resolutionMinutes: number;
  businessHoursOnly: boolean;
}

// SLAステータス
export interface SLAStatus {
  responseMetSLA: boolean | null;
  resolutionMetSLA: boolean | null;
  isOverdue: boolean;
}

// SLAメトリクス（優先度別）
export interface SLAPriorityMetrics {
  total: number;
  responseMetCount: number;
  responseMetRate: number;
  resolutionMetCount: number;
  resolutionMetRate: number;
}

// SLAメトリクス全体
export interface SLAMetrics {
  total: number;
  responseMetCount: number;
  responseMetRate: number;
  resolutionMetCount: number;
  resolutionMetRate: number;
  overdueCount: number;
  overdueRate: number;
  byPriority: Record<string, SLAPriorityMetrics>;
}

// チケットSLAステータス
export interface TicketSLAStatus {
  ticket_id: string;
  ticket_number: string;
  subject: string;
  priority: string;
  status: string;
  response_due_at: string | null;
  due_at: string | null;
  sla_status: SLAStatus;
}

/**
 * SLAポリシー一覧取得
 */
export const getSLAPolicies = async (): Promise<ApiResponse<{ policies: SLAPolicy[] }>> => {
  return apiRequest<{ policies: SLAPolicy[] }>({
    method: 'GET',
    url: '/sla',
  });
};

/**
 * SLAポリシー詳細取得
 */
export const getSLAPolicy = async (
  priority: string
): Promise<ApiResponse<{ policy: SLAPolicy }>> => {
  return apiRequest<{ policy: SLAPolicy }>({
    method: 'GET',
    url: `/sla/${priority}`,
  });
};

/**
 * SLAメトリクス取得
 */
export const getSLAMetrics = async (): Promise<ApiResponse<{ metrics: SLAMetrics }>> => {
  return apiRequest<{ metrics: SLAMetrics }>({
    method: 'GET',
    url: '/sla/metrics',
  });
};

/**
 * チケットSLAステータス取得
 */
export const getTicketSLAStatus = async (
  ticketId: string
): Promise<ApiResponse<{ sla_status: TicketSLAStatus }>> => {
  return apiRequest<{ sla_status: TicketSLAStatus }>({
    method: 'GET',
    url: `/tickets/${ticketId}/sla-status`,
  });
};

// 優先度ラベル
export const PRIORITY_LABELS: Record<string, string> = {
  P1: 'P1 - 緊急',
  P2: 'P2 - 高',
  P3: 'P3 - 中',
  P4: 'P4 - 低',
};

// 優先度の説明
export const PRIORITY_DESCRIPTIONS: Record<string, string> = {
  P1: '全社停止レベル。24時間体制で対応。',
  P2: '部門影響レベル。営業時間内で対応。',
  P3: '個人影響レベル。通常業務として対応。',
  P4: '問い合わせレベル。余裕を持って対応。',
};

// SLA時間をフォーマット（分 → 読みやすい形式）
export const formatSLATime = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}分`;
  }
  const hours = minutes / 60;
  if (hours < 24) {
    return hours % 1 === 0 ? `${hours}時間` : `${hours.toFixed(1)}時間`;
  }
  const days = hours / 24;
  if (days % 1 === 0) {
    return `${days}日`;
  }
  return `${hours}時間（${Math.ceil(days)}営業日）`;
};

// 営業日換算のフォーマット（営業時間ベース）
export const formatBusinessTime = (minutes: number, businessHoursOnly: boolean): string => {
  if (!businessHoursOnly) {
    return formatSLATime(minutes);
  }
  const hours = minutes / 60;
  if (hours <= 9) {
    return `${hours}時間`;
  }
  const businessDays = Math.ceil(hours / 9);
  if (hours % 9 === 0) {
    return `${businessDays}営業日`;
  }
  return `${hours}時間（約${businessDays}営業日）`;
};
