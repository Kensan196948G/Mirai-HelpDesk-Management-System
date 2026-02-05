/**
 * M365 Service
 *
 * Microsoft 365 タスク管理のAPI呼び出しを管理
 */

import { apiClient, ApiResponse } from './api';

// 型定義
export interface M365Task {
  task_id: string;
  ticket_id: string;
  ticket_number: string;
  task_type: string;
  state: 'pending' | 'approved' | 'in_progress' | 'completed' | 'failed' | 'canceled';
  target_upn?: string;
  target_resource_id?: string;
  target_resource_name?: string;
  task_details: any;
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface M365ExecutionLog {
  method: 'admin_center' | 'powershell' | 'graph_api' | 'manual';
  command_or_screen: string;
  result: 'success' | 'partial_success' | 'failed';
  result_message?: string;
  evidence: File;
  rollback_procedure?: string;
}

export interface M365TaskFilters {
  state?: string;
  task_type?: string;
  ticket_id?: string;
  page?: number;
  pageSize?: number;
}

/**
 * M365 API サービス
 */
export const m365Service = {
  /**
   * M365タスク一覧取得
   */
  async getTasks(
    filters?: M365TaskFilters
  ): Promise<ApiResponse<{ tasks: M365Task[]; total: number; meta: any }>> {
    return apiClient.get('/m365/tasks', { params: filters });
  },

  /**
   * M365タスク詳細取得
   */
  async getTask(taskId: string): Promise<ApiResponse<{ task: M365Task }>> {
    return apiClient.get(`/m365/tasks/${taskId}`);
  },

  /**
   * M365タスク作成
   */
  async createTask(data: {
    ticket_id: string;
    task_type: string;
    target_upn?: string;
    target_resource_id?: string;
    target_resource_name?: string;
    task_details: any;
    scheduled_at?: string;
  }): Promise<ApiResponse<{ task: M365Task }>> {
    return apiClient.post('/m365/tasks', data);
  },

  /**
   * M365タスク実施ログ記録
   */
  async executeTask(
    taskId: string,
    logData: M365ExecutionLog
  ): Promise<ApiResponse<any>> {
    const formData = new FormData();
    formData.append('method', logData.method);
    formData.append('command_or_screen', logData.command_or_screen);
    formData.append('result', logData.result);

    if (logData.result_message) {
      formData.append('result_message', logData.result_message);
    }

    formData.append('evidence', logData.evidence);

    if (logData.rollback_procedure) {
      formData.append('rollback_procedure', logData.rollback_procedure);
    }

    return apiClient.post(`/m365/tasks/${taskId}/execute`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  /**
   * M365タスクステータス更新
   */
  async updateTaskStatus(
    taskId: string,
    state: string
  ): Promise<ApiResponse<{ task: M365Task }>> {
    return apiClient.patch(`/m365/tasks/${taskId}/status`, { state });
  },

  /**
   * M365タスク削除/キャンセル
   */
  async cancelTask(taskId: string): Promise<ApiResponse<void>> {
    return apiClient.delete(`/m365/tasks/${taskId}`);
  },
};
