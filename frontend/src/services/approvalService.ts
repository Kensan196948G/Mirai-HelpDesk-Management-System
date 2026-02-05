/**
 * Approval Service
 *
 * 承認管理のAPI呼び出しを管理
 */

import { apiClient, ApiResponse } from './api';

// 型定義
export interface Approval {
  approval_id: string;
  ticket_id: string;
  ticket_number: string;
  ticket_subject: string;
  ticket_type: string;
  requester_id: string;
  requester_name: string;
  approver_id?: string;
  approver_name?: string;
  state: 'requested' | 'approved' | 'rejected';
  reason?: string;
  comment?: string;
  created_at: string;
  responded_at?: string;
  updated_at: string;
}

export interface ApprovalFilters {
  state?: string;
  ticket_type?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Approval API サービス
 */
export const approvalService = {
  /**
   * 承認依頼一覧取得
   */
  async getApprovals(
    filters?: ApprovalFilters
  ): Promise<ApiResponse<{ approvals: Approval[]; total: number; meta: any }>> {
    return apiClient.get('/approvals', { params: filters });
  },

  /**
   * 承認依頼詳細取得
   */
  async getApproval(approvalId: string): Promise<ApiResponse<{ approval: Approval }>> {
    return apiClient.get(`/approvals/${approvalId}`);
  },

  /**
   * 承認実行
   */
  async approve(
    approvalId: string,
    comment?: string
  ): Promise<ApiResponse<{ approval: Approval }>> {
    return apiClient.post(`/approvals/${approvalId}/approve`, { comment });
  },

  /**
   * 却下実行
   */
  async reject(
    approvalId: string,
    reason: string,
    comment?: string
  ): Promise<ApiResponse<{ approval: Approval }>> {
    return apiClient.post(`/approvals/${approvalId}/reject`, { reason, comment });
  },

  /**
   * 承認統計取得
   */
  async getStatistics(): Promise<ApiResponse<any>> {
    return apiClient.get('/approvals/statistics');
  },

  /**
   * SOD（職務分離）違反チェック
   */
  async validateSOD(data: {
    ticket_id: string;
    approver_id: string;
  }): Promise<ApiResponse<{ is_valid: boolean; message: string }>> {
    return apiClient.post('/approvals/validate-sod', data);
  },
};
