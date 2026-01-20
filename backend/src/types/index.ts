// ユーザー関連
export enum UserRole {
  REQUESTER = 'requester',
  AGENT = 'agent',
  M365_OPERATOR = 'm365_operator',
  APPROVER = 'approver',
  MANAGER = 'manager',
  AUDITOR = 'auditor',
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
}

export interface User {
  user_id: string;
  email: string;
  display_name: string;
  department?: string;
  role: UserRole;
  status: UserStatus;
  azure_object_id?: string;
  created_at: Date;
  updated_at: Date;
  last_login_at?: Date;
}

// チケット関連
export enum TicketType {
  INCIDENT = 'incident',
  SERVICE_REQUEST = 'service_request',
  CHANGE = 'change',
  PROBLEM = 'problem',
}

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

export enum PriorityLevel {
  P1 = 'P1',
  P2 = 'P2',
  P3 = 'P3',
  P4 = 'P4',
}

export enum ImpactLevel {
  INDIVIDUAL = '個人',
  DEPARTMENT = '部署',
  COMPANY_WIDE = '全社',
  EXTERNAL = '対外影響',
}

export enum UrgencyLevel {
  LOW = '低',
  MEDIUM = '中',
  HIGH = '高',
  IMMEDIATE = '即時',
}

export interface Ticket {
  ticket_id: string;
  ticket_number: string;
  type: TicketType;
  subject: string;
  description: string;
  status: TicketStatus;
  priority: PriorityLevel;
  impact: ImpactLevel;
  urgency: UrgencyLevel;
  requester_id: string;
  assignee_id?: string;
  category_id?: string;
  sla_policy_id?: string;
  due_at?: Date;
  response_due_at?: Date;
  resolution_summary?: string;
  root_cause?: string;
  created_at: Date;
  updated_at: Date;
  assigned_at?: Date;
  resolved_at?: Date;
  closed_at?: Date;
}

// コメント関連
export enum CommentVisibility {
  PUBLIC = 'public',
  INTERNAL = 'internal',
}

export interface TicketComment {
  comment_id: string;
  ticket_id: string;
  author_id: string;
  body: string;
  visibility: CommentVisibility;
  mentioned_user_ids?: string[];
  created_at: Date;
  updated_at: Date;
}

// 添付ファイル関連
export interface TicketAttachment {
  attachment_id: string;
  ticket_id: string;
  uploader_id: string;
  filename: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  storage_path: string;
  storage_type: string;
  hash: string;
  is_evidence: boolean;
  created_at: Date;
}

// 承認関連
export enum ApprovalState {
  REQUESTED = 'requested',
  APPROVED = 'approved',
  REJECTED = 'rejected',
}

export interface Approval {
  approval_id: string;
  ticket_id: string;
  approver_id: string;
  requester_id: string;
  state: ApprovalState;
  comment?: string;
  reason?: string;
  created_at: Date;
  updated_at: Date;
  responded_at?: Date;
}

// M365タスク関連
export enum M365TaskType {
  LICENSE_ASSIGN = 'license_assign',
  LICENSE_REMOVE = 'license_remove',
  PASSWORD_RESET = 'password_reset',
  MFA_RESET = 'mfa_reset',
  MAILBOX_PERMISSION = 'mailbox_permission',
  GROUP_MEMBERSHIP = 'group_membership',
  TEAMS_CREATE = 'teams_create',
  TEAMS_OWNER_CHANGE = 'teams_owner_change',
  ONEDRIVE_RESTORE = 'onedrive_restore',
  ONEDRIVE_SHARE_REMOVE = 'onedrive_share_remove',
  OFFBOARDING = 'offboarding',
}

export enum M365TaskState {
  PENDING = 'pending',
  APPROVED = 'approved',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELED = 'canceled',
}

export interface M365Task {
  task_id: string;
  ticket_id: string;
  task_type: M365TaskType;
  state: M365TaskState;
  target_upn?: string;
  target_resource_id?: string;
  target_resource_name?: string;
  task_details: any;
  approval_id?: string;
  scheduled_at?: Date;
  operator_id?: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
}

// M365実施ログ関連
export enum M365ExecutionMethod {
  ADMIN_CENTER = 'admin_center',
  POWERSHELL = 'powershell',
  GRAPH_API = 'graph_api',
  MANUAL = 'manual',
}

export enum M365ExecutionResult {
  SUCCESS = 'success',
  PARTIAL_SUCCESS = 'partial_success',
  FAILED = 'failed',
}

export interface M365ExecutionLog {
  exec_id: string;
  task_id: string;
  ticket_id: string;
  operator_id: string;
  operator_name: string;
  method: M365ExecutionMethod;
  command_or_screen: string;
  result: M365ExecutionResult;
  result_message?: string;
  evidence_attachment_id: string;
  rollback_procedure?: string;
  graph_api_response?: any;
  created_at: Date;
  ip_address?: string;
  user_agent?: string;
}

// ナレッジ記事関連
export enum ArticleType {
  FAQ = 'faq',
  HOW_TO = 'how_to',
  KNOWN_ERROR = 'known_error',
  WORKAROUND = 'workaround',
  POLICY = 'policy',
  ANNOUNCEMENT = 'announcement',
}

export enum ArticleVisibility {
  PUBLIC = 'public',
  DEPARTMENT = 'department',
  IT_ONLY = 'it_only',
}

export interface KnowledgeArticle {
  article_id: string;
  title: string;
  body: string;
  type: ArticleType;
  category_id?: string;
  tags?: string[];
  visibility: ArticleVisibility;
  owner_id: string;
  is_published: boolean;
  published_at?: Date;
  view_count: number;
  helpful_count: number;
  not_helpful_count: number;
  source_ticket_id?: string;
  created_at: Date;
  updated_at: Date;
}

// カテゴリ関連
export interface Category {
  category_id: string;
  name: string;
  description?: string;
  parent_category_id?: string;
  path?: string;
  level: number;
  sort_order: number;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

// SLAポリシー関連
export interface SLAPolicy {
  sla_policy_id: string;
  name: string;
  description?: string;
  priority: PriorityLevel;
  impact?: ImpactLevel;
  urgency?: UrgencyLevel;
  response_time_minutes: number;
  resolution_time_minutes: number;
  business_hours_only: boolean;
  is_active: boolean;
  is_default: boolean;
  created_at: Date;
  updated_at: Date;
}

// API レスポンス型
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    total?: number;
    page?: number;
    pageSize?: number;
  };
}

// ページネーション
export interface PaginationParams {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
