// ユーザーロール
export enum UserRole {
  REQUESTER = 'requester',
  AGENT = 'agent',
  M365_OPERATOR = 'm365_operator',
  APPROVER = 'approver',
  MANAGER = 'manager',
  AUDITOR = 'auditor',
}

// チケットタイプ
export enum TicketType {
  INCIDENT = 'incident',
  SERVICE_REQUEST = 'service_request',
  CHANGE = 'change',
  PROBLEM = 'problem',
}

// チケットステータス
export enum TicketStatus {
  NEW = 'new',
  TRIAGE = 'triage',
  ASSIGNED = 'assigned',
  IN_PROGRESS = 'in_progress',
  PENDING_CUSTOMER = 'pending_customer',
  PENDING_APPROVAL = 'pending_approval',
  PENDING_CHANGE_WINDOW = 'pending_change_window',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  CANCELED = 'canceled',
  REOPENED = 'reopened',
}

// 優先度レベル
export enum PriorityLevel {
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4',
}

// 影響度レベル
export enum ImpactLevel {
  INDIVIDUAL = '個人',
  DEPARTMENT = '部署',
  COMPANY_WIDE = '全社',
  EXTERNAL = '対外影響',
}

// 緊急度レベル
export enum UrgencyLevel {
  LOW = '低',
  MEDIUM = '中',
  HIGH = '高',
  IMMEDIATE = '即時',
}

// ステータス表示名マッピング
export const STATUS_LABELS: Record<string, string> = {
  new: '新規',
  triage: '分類中',
  assigned: '割当済',
  in_progress: '対応中',
  pending_customer: '利用者回答待ち',
  pending_approval: '承認待ち',
  pending_change_window: '実施待ち',
  resolved: '解決',
  closed: '完了',
  canceled: '取消',
  reopened: '再開',
};

// 優先度表示色
export const PRIORITY_COLORS: Record<string, string> = {
  P1: 'red',
  P2: 'orange',
  P3: 'blue',
  P4: 'green',
};

// ステータス表示色
export const STATUS_COLORS: Record<string, string> = {
  new: 'blue',
  triage: 'cyan',
  assigned: 'geekblue',
  in_progress: 'processing',
  pending_customer: 'warning',
  pending_approval: 'warning',
  pending_change_window: 'default',
  resolved: 'success',
  closed: 'default',
  canceled: 'error',
  reopened: 'magenta',
};

// チケットタイプ表示名
export const TICKET_TYPE_LABELS: Record<string, string> = {
  incident: 'インシデント',
  service_request: 'サービス要求',
  change: '変更',
  problem: '問題',
};

// チケット統計データ型
export interface TicketStatistics {
  total: number;
  new: number;
  in_progress: number;
  resolved: number;
  closed: number;
  by_priority: {
    P1: number;
    P2: number;
    P3: number;
    P4: number;
  };
  by_status: Record<string, number>;
  sla_overdue: number;
  avg_response_time_hours?: number;
  avg_resolution_time_hours?: number;
}

// ナレッジ記事タイプ
export enum KnowledgeArticleType {
  FAQ = 'faq',
  HOW_TO = 'how_to',
  KNOWN_ERROR = 'known_error',
  WORKAROUND = 'workaround',
  POLICY = 'policy',
  ANNOUNCEMENT = 'announcement',
}

// ナレッジ記事の公開範囲
export enum KnowledgeVisibility {
  PUBLIC = 'public',
  STAFF_ONLY = 'staff_only',
  PRIVATE = 'private',
}

// ナレッジ記事タイプ表示名
export const KNOWLEDGE_TYPE_LABELS: Record<string, string> = {
  faq: 'FAQ',
  how_to: '手順書',
  known_error: '既知の問題',
  workaround: '回避策',
  policy: 'ポリシー',
  announcement: 'お知らせ',
};

// ナレッジ記事タイプ表示色
export const KNOWLEDGE_TYPE_COLORS: Record<string, string> = {
  faq: 'blue',
  how_to: 'green',
  known_error: 'red',
  workaround: 'orange',
  policy: 'purple',
  announcement: 'cyan',
};

// ナレッジ記事の公開範囲表示名
export const KNOWLEDGE_VISIBILITY_LABELS: Record<string, string> = {
  public: '公開',
  staff_only: 'スタッフのみ',
  private: '非公開',
};

// ナレッジ記事
export interface KnowledgeArticle {
  article_id: string;
  title: string;
  body: string;
  summary?: string;
  type: KnowledgeArticleType | string;
  category?: string;
  tags: string[];
  visibility: KnowledgeVisibility | string;
  is_published: boolean;
  is_featured?: boolean;
  owner_id: string;
  owner_name?: string;
  view_count?: number;
  helpful_count?: number;
  not_helpful_count?: number;
  created_at: string;
  updated_at: string;
}

// ナレッジ記事作成・更新用DTO
export interface KnowledgeArticleInput {
  title: string;
  body: string;
  summary?: string;
  type: string;
  category?: string;
  tags?: string[];
  visibility: string;
  is_published: boolean;
  is_featured?: boolean;
}

// ナレッジ記事リストレスポンス
export interface KnowledgeListResponse {
  items: KnowledgeArticle[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
