import { apiRequest, apiClient, ApiResponse } from './api';

// KPIレポートデータ型定義
export interface KPIReportData {
  period: { from: string; to: string };
  generatedAt: string;
  summary: {
    totalTickets: number;
    newTickets: number;
    resolvedTickets: number;
    closedTickets: number;
    openTickets: number;
    avgResolutionHours: number | null;
  };
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
  sla: {
    responseMetCount: number;
    responseTotal: number;
    responseMetRate: number;
    resolutionMetCount: number;
    resolutionTotal: number;
    resolutionMetRate: number;
    overdueCount: number;
  };
  slaBypriority: Record<string, {
    total: number;
    responseMetRate: number;
    resolutionMetRate: number;
  }>;
  assigneePerformance: Array<{
    assignee_id: string;
    assignee_name: string;
    totalAssigned: number;
    resolvedCount: number;
    avgResolutionHours: number | null;
  }>;
  monthlyTrend: Array<{
    month: string;
    created: number;
    resolved: number;
    closed: number;
  }>;
}

/**
 * KPIレポートデータ取得（JSON形式）
 */
export const getKPIReport = async (
  from: string,
  to: string
): Promise<ApiResponse<{ report: KPIReportData }>> => {
  return apiRequest<{ report: KPIReportData }>({
    method: 'GET',
    url: '/reports/kpi',
    params: { from, to, format: 'json' },
  });
};

/**
 * KPIレポートをファイルとしてダウンロード（CSV or PDF）
 */
export const downloadKPIReport = async (
  from: string,
  to: string,
  format: 'csv' | 'pdf'
): Promise<void> => {
  const response = await apiClient.get('/reports/kpi', {
    params: { from, to, format },
    responseType: 'blob',
  });

  const mimeType = format === 'csv' ? 'text/csv' : 'application/pdf';
  const blob = new Blob([response.data], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `kpi-report_${from}_${to}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
