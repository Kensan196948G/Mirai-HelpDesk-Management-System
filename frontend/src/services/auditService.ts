import { apiRequest, ApiResponse } from './api';

// 監査ログエントリ
export interface AuditLog {
  audit_id: string;
  actor_id: string;
  actor_name: string;
  actor_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  resource_name?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// 監査ログ一覧取得パラメータ
export interface AuditLogQueryParams {
  page?: number;
  page_size?: number;
  action?: string;
  resource_type?: string;
  actor_id?: string;
  start_date?: string;
  end_date?: string;
  search?: string;
}

// 監査ログ統計
export interface AuditStatistics {
  total_logs: number;
  unique_users: number;
  action_breakdown: Record<string, number>;
  resource_type_breakdown: Record<string, number>;
  recent_activity_count: number;
}

// アクション種別
export const AUDIT_ACTIONS = {
  // 認証関連
  LOGIN: 'login',
  LOGOUT: 'logout',
  LOGIN_FAILED: 'login_failed',
  PASSWORD_RESET: 'password_reset',

  // チケット関連
  TICKET_CREATE: 'ticket_create',
  TICKET_UPDATE: 'ticket_update',
  TICKET_DELETE: 'ticket_delete',
  TICKET_STATUS_CHANGE: 'ticket_status_change',
  TICKET_ASSIGN: 'ticket_assign',
  TICKET_COMMENT: 'ticket_comment',
  TICKET_ATTACHMENT: 'ticket_attachment',

  // M365関連
  M365_TASK_CREATE: 'm365_task_create',
  M365_TASK_EXECUTE: 'm365_task_execute',
  M365_TASK_APPROVE: 'm365_task_approve',
  M365_TASK_REJECT: 'm365_task_reject',

  // ユーザー管理
  USER_CREATE: 'user_create',
  USER_UPDATE: 'user_update',
  USER_DELETE: 'user_delete',
  USER_ROLE_CHANGE: 'user_role_change',

  // ナレッジ
  KNOWLEDGE_CREATE: 'knowledge_create',
  KNOWLEDGE_UPDATE: 'knowledge_update',
  KNOWLEDGE_DELETE: 'knowledge_delete',

  // 設定変更
  SETTINGS_UPDATE: 'settings_update',
  SLA_POLICY_UPDATE: 'sla_policy_update',

  // その他
  EXPORT_DATA: 'export_data',
  BULK_OPERATION: 'bulk_operation',
};

// アクション表示名
export const ACTION_LABELS: Record<string, string> = {
  login: 'ログイン',
  logout: 'ログアウト',
  login_failed: 'ログイン失敗',
  password_reset: 'パスワードリセット',

  ticket_create: 'チケット作成',
  ticket_update: 'チケット更新',
  ticket_delete: 'チケット削除',
  ticket_status_change: 'ステータス変更',
  ticket_assign: 'チケット割当',
  ticket_comment: 'コメント追加',
  ticket_attachment: '添付ファイル追加',

  m365_task_create: 'M365タスク作成',
  m365_task_execute: 'M365タスク実行',
  m365_task_approve: 'M365タスク承認',
  m365_task_reject: 'M365タスク却下',

  user_create: 'ユーザー作成',
  user_update: 'ユーザー更新',
  user_delete: 'ユーザー削除',
  user_role_change: '役割変更',

  knowledge_create: 'ナレッジ作成',
  knowledge_update: 'ナレッジ更新',
  knowledge_delete: 'ナレッジ削除',

  settings_update: '設定変更',
  sla_policy_update: 'SLAポリシー変更',

  export_data: 'データエクスポート',
  bulk_operation: '一括操作',
};

// リソース種別
export const RESOURCE_TYPES = {
  TICKET: 'ticket',
  USER: 'user',
  M365_TASK: 'm365_task',
  KNOWLEDGE: 'knowledge',
  APPROVAL: 'approval',
  SETTINGS: 'settings',
  SLA_POLICY: 'sla_policy',
  AUTH: 'auth',
};

// リソース種別表示名
export const RESOURCE_TYPE_LABELS: Record<string, string> = {
  ticket: 'チケット',
  user: 'ユーザー',
  m365_task: 'M365タスク',
  knowledge: 'ナレッジ',
  approval: '承認',
  settings: '設定',
  sla_policy: 'SLAポリシー',
  auth: '認証',
};

// アクション種別の色
export const ACTION_COLORS: Record<string, string> = {
  login: 'green',
  logout: 'blue',
  login_failed: 'red',
  ticket_create: 'cyan',
  ticket_update: 'geekblue',
  ticket_delete: 'red',
  m365_task_execute: 'purple',
  m365_task_approve: 'green',
  m365_task_reject: 'red',
  user_create: 'cyan',
  user_update: 'blue',
  user_delete: 'red',
};

/**
 * 監査ログ一覧取得
 */
export const getAuditLogs = async (
  params?: AuditLogQueryParams
): Promise<ApiResponse<{ items: AuditLog[]; total: number; page: number; page_size: number; total_pages: number }>> => {
  return apiRequest<{ items: AuditLog[]; total: number; page: number; page_size: number; total_pages: number }>({
    method: 'GET',
    url: '/audit/logs',
    params,
  });
};

/**
 * 監査ログ詳細取得
 */
export const getAuditLog = async (
  auditId: string
): Promise<ApiResponse<{ audit_log: AuditLog }>> => {
  return apiRequest<{ audit_log: AuditLog }>({
    method: 'GET',
    url: `/audit/logs/${auditId}`,
  });
};

/**
 * 監査ログ統計取得
 */
export const getAuditStatistics = async (params?: {
  start_date?: string;
  end_date?: string;
}): Promise<ApiResponse<{ statistics: AuditStatistics }>> => {
  return apiRequest<{ statistics: AuditStatistics }>({
    method: 'GET',
    url: '/audit/statistics',
    params,
  });
};

/**
 * 監査ログエクスポート（CSV）
 */
export const exportAuditLogsCSV = async (
  params?: AuditLogQueryParams
): Promise<Blob> => {
  const queryString = new URLSearchParams(params as any).toString();
  const token = localStorage.getItem('auth-storage');
  let authToken = '';

  if (token) {
    const parsed = JSON.parse(token);
    authToken = parsed.state?.token || '';
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/audit/export?format=csv&${queryString}`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('エクスポートに失敗しました');
  }

  return response.blob();
};

/**
 * 監査ログエクスポート（JSON）
 */
export const exportAuditLogsJSON = async (
  params?: AuditLogQueryParams
): Promise<Blob> => {
  const queryString = new URLSearchParams(params as any).toString();
  const token = localStorage.getItem('auth-storage');
  let authToken = '';

  if (token) {
    const parsed = JSON.parse(token);
    authToken = parsed.state?.token || '';
  }

  const response = await fetch(
    `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'}/audit/export?format=json&${queryString}`,
    {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('エクスポートに失敗しました');
  }

  return response.blob();
};

/**
 * ユーザーアクティビティ取得（特定ユーザーの監査ログ）
 */
export const getUserActivity = async (
  userId: string,
  params?: { page?: number; page_size?: number; start_date?: string; end_date?: string }
): Promise<ApiResponse<{ items: AuditLog[]; total: number }>> => {
  return apiRequest<{ items: AuditLog[]; total: number }>({
    method: 'GET',
    url: `/audit/users/${userId}/activity`,
    params,
  });
};

/**
 * リソースアクティビティ取得（特定リソースの監査ログ）
 */
export const getResourceActivity = async (
  resourceType: string,
  resourceId: string,
  params?: { page?: number; page_size?: number }
): Promise<ApiResponse<{ items: AuditLog[]; total: number }>> => {
  return apiRequest<{ items: AuditLog[]; total: number }>({
    method: 'GET',
    url: `/audit/resources/${resourceType}/${resourceId}/activity`,
    params,
  });
};
