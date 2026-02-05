import { query } from '../config/database';
import { PriorityLevel } from '../types';
import PDFDocument from 'pdfkit';
import { Parser } from '@json2csv/plainjs';
import { Readable } from 'stream';

export interface KPIReportFilters {
  from: string; // YYYY-MM-DD
  to: string;   // YYYY-MM-DD
}

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

export class KPIReportService {
  /**
   * KPIレポートデータを集計
   */
  static async generateReport(filters: KPIReportFilters): Promise<KPIReportData> {
    const { from, to } = filters;

    // 基本統計
    const summaryResult = await query(
      `SELECT
        COUNT(*) as total_tickets,
        COUNT(*) FILTER (WHERE status = 'new') as new_tickets,
        COUNT(*) FILTER (WHERE status IN ('resolved')) as resolved_tickets,
        COUNT(*) FILTER (WHERE status = 'closed') as closed_tickets,
        COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed', 'canceled')) as open_tickets,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 3600)
          FILTER (WHERE resolved_at IS NOT NULL) as avg_resolution_hours
      FROM tickets
      WHERE created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')`,
      [from, to]
    );
    const summary = summaryResult.rows[0];

    // ステータス別
    const statusResult = await query(
      `SELECT status, COUNT(*) as count
       FROM tickets
       WHERE created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')
       GROUP BY status ORDER BY count DESC`,
      [from, to]
    );
    const byStatus: Record<string, number> = {};
    statusResult.rows.forEach((r: any) => { byStatus[r.status] = parseInt(r.count); });

    // 優先度別
    const priorityResult = await query(
      `SELECT priority, COUNT(*) as count
       FROM tickets
       WHERE created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')
       GROUP BY priority ORDER BY priority`,
      [from, to]
    );
    const byPriority: Record<string, number> = {};
    priorityResult.rows.forEach((r: any) => { byPriority[r.priority] = parseInt(r.count); });

    // タイプ別
    const typeResult = await query(
      `SELECT type, COUNT(*) as count
       FROM tickets
       WHERE created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')
       GROUP BY type ORDER BY count DESC`,
      [from, to]
    );
    const byType: Record<string, number> = {};
    typeResult.rows.forEach((r: any) => { byType[r.type] = parseInt(r.count); });

    // SLA達成率
    const slaResult = await query(
      `SELECT
        COUNT(*) FILTER (WHERE assigned_at IS NOT NULL AND response_due_at IS NOT NULL
          AND assigned_at <= response_due_at) as response_met,
        COUNT(*) FILTER (WHERE assigned_at IS NOT NULL AND response_due_at IS NOT NULL) as response_total,
        COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND due_at IS NOT NULL
          AND resolved_at <= due_at) as resolution_met,
        COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND due_at IS NOT NULL) as resolution_total,
        COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed', 'canceled')
          AND due_at IS NOT NULL AND due_at < CURRENT_TIMESTAMP) as overdue_count
      FROM tickets
      WHERE created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')`,
      [from, to]
    );
    const slaRow = slaResult.rows[0];

    // 優先度別SLA達成率
    const slaPriorityResult = await query(
      `SELECT
        priority,
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE assigned_at IS NOT NULL AND response_due_at IS NOT NULL
          AND assigned_at <= response_due_at) as response_met,
        COUNT(*) FILTER (WHERE assigned_at IS NOT NULL AND response_due_at IS NOT NULL) as response_evaluated,
        COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND due_at IS NOT NULL
          AND resolved_at <= due_at) as resolution_met,
        COUNT(*) FILTER (WHERE resolved_at IS NOT NULL AND due_at IS NOT NULL) as resolution_evaluated
      FROM tickets
      WHERE created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')
      GROUP BY priority ORDER BY priority`,
      [from, to]
    );
    const slaBypriority: Record<string, { total: number; responseMetRate: number; resolutionMetRate: number }> = {};
    slaPriorityResult.rows.forEach((r: any) => {
      const responseEval = parseInt(r.response_evaluated);
      const resolutionEval = parseInt(r.resolution_evaluated);
      slaBypriority[r.priority] = {
        total: parseInt(r.total),
        responseMetRate: responseEval > 0
          ? Math.round((parseInt(r.response_met) / responseEval) * 10000) / 100
          : 0,
        resolutionMetRate: resolutionEval > 0
          ? Math.round((parseInt(r.resolution_met) / resolutionEval) * 10000) / 100
          : 0,
      };
    });

    // 担当者別パフォーマンス
    const assigneeResult = await query(
      `SELECT
        t.assignee_id,
        u.display_name as assignee_name,
        COUNT(*) as total_assigned,
        COUNT(*) FILTER (WHERE t.status IN ('resolved', 'closed')) as resolved_count,
        AVG(EXTRACT(EPOCH FROM (t.resolved_at - t.created_at)) / 3600)
          FILTER (WHERE t.resolved_at IS NOT NULL) as avg_resolution_hours
      FROM tickets t
      LEFT JOIN users u ON t.assignee_id = u.user_id
      WHERE t.created_at >= $1::date AND t.created_at < ($2::date + INTERVAL '1 day')
        AND t.assignee_id IS NOT NULL
      GROUP BY t.assignee_id, u.display_name
      ORDER BY total_assigned DESC`,
      [from, to]
    );

    // 月次トレンド
    const trendResult = await query(
      `SELECT
        TO_CHAR(created_at, 'YYYY-MM') as month,
        COUNT(*) as created,
        COUNT(*) FILTER (WHERE resolved_at IS NOT NULL) as resolved,
        COUNT(*) FILTER (WHERE closed_at IS NOT NULL) as closed
      FROM tickets
      WHERE created_at >= $1::date AND created_at < ($2::date + INTERVAL '1 day')
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY month`,
      [from, to]
    );

    const responseTotal = parseInt(slaRow.response_total) || 0;
    const resolutionTotal = parseInt(slaRow.resolution_total) || 0;

    return {
      period: { from, to },
      generatedAt: new Date().toISOString(),
      summary: {
        totalTickets: parseInt(summary.total_tickets),
        newTickets: parseInt(summary.new_tickets),
        resolvedTickets: parseInt(summary.resolved_tickets),
        closedTickets: parseInt(summary.closed_tickets),
        openTickets: parseInt(summary.open_tickets),
        avgResolutionHours: summary.avg_resolution_hours
          ? Math.round(parseFloat(summary.avg_resolution_hours) * 100) / 100
          : null,
      },
      byStatus,
      byPriority,
      byType,
      sla: {
        responseMetCount: parseInt(slaRow.response_met) || 0,
        responseTotal,
        responseMetRate: responseTotal > 0
          ? Math.round((parseInt(slaRow.response_met) / responseTotal) * 10000) / 100
          : 0,
        resolutionMetCount: parseInt(slaRow.resolution_met) || 0,
        resolutionTotal,
        resolutionMetRate: resolutionTotal > 0
          ? Math.round((parseInt(slaRow.resolution_met) / resolutionTotal) * 10000) / 100
          : 0,
        overdueCount: parseInt(slaRow.overdue_count) || 0,
      },
      slaBypriority,
      assigneePerformance: assigneeResult.rows.map((r: any) => ({
        assignee_id: r.assignee_id,
        assignee_name: r.assignee_name || 'Unknown',
        totalAssigned: parseInt(r.total_assigned),
        resolvedCount: parseInt(r.resolved_count),
        avgResolutionHours: r.avg_resolution_hours
          ? Math.round(parseFloat(r.avg_resolution_hours) * 100) / 100
          : null,
      })),
      monthlyTrend: trendResult.rows.map((r: any) => ({
        month: r.month,
        created: parseInt(r.created),
        resolved: parseInt(r.resolved),
        closed: parseInt(r.closed),
      })),
    };
  }

  /**
   * KPIレポートをCSV形式で生成（BOM付きUTF-8）
   */
  static generateCSV(data: KPIReportData): Buffer {
    const rows: any[] = [];

    // サマリー行
    rows.push({
      'セクション': 'サマリー',
      '項目': '総チケット数',
      '値': data.summary.totalTickets,
      '補足': '',
    });
    rows.push({
      'セクション': 'サマリー',
      '項目': '新規チケット',
      '値': data.summary.newTickets,
      '補足': '',
    });
    rows.push({
      'セクション': 'サマリー',
      '項目': '解決済み',
      '値': data.summary.resolvedTickets,
      '補足': '',
    });
    rows.push({
      'セクション': 'サマリー',
      '項目': 'クローズ済み',
      '値': data.summary.closedTickets,
      '補足': '',
    });
    rows.push({
      'セクション': 'サマリー',
      '項目': '未対応',
      '値': data.summary.openTickets,
      '補足': '',
    });
    rows.push({
      'セクション': 'サマリー',
      '項目': '平均解決時間(時間)',
      '値': data.summary.avgResolutionHours ?? 'N/A',
      '補足': '',
    });

    // SLA達成率
    rows.push({
      'セクション': 'SLA達成率',
      '項目': '初動対応SLA達成率',
      '値': `${data.sla.responseMetRate}%`,
      '補足': `${data.sla.responseMetCount}/${data.sla.responseTotal}`,
    });
    rows.push({
      'セクション': 'SLA達成率',
      '項目': '解決SLA達成率',
      '値': `${data.sla.resolutionMetRate}%`,
      '補足': `${data.sla.resolutionMetCount}/${data.sla.resolutionTotal}`,
    });
    rows.push({
      'セクション': 'SLA達成率',
      '項目': '期限超過チケット',
      '値': data.sla.overdueCount,
      '補足': '',
    });

    // 優先度別
    for (const [priority, count] of Object.entries(data.byPriority)) {
      const slaInfo = data.slaBypriority[priority];
      rows.push({
        'セクション': '優先度別',
        '項目': priority,
        '値': count,
        '補足': slaInfo
          ? `初動SLA: ${slaInfo.responseMetRate}%, 解決SLA: ${slaInfo.resolutionMetRate}%`
          : '',
      });
    }

    // 担当者別パフォーマンス
    for (const perf of data.assigneePerformance) {
      rows.push({
        'セクション': '担当者別',
        '項目': perf.assignee_name,
        '値': `${perf.resolvedCount}/${perf.totalAssigned}`,
        '補足': perf.avgResolutionHours !== null
          ? `平均解決: ${perf.avgResolutionHours}時間`
          : '',
      });
    }

    // 月次トレンド
    for (const trend of data.monthlyTrend) {
      rows.push({
        'セクション': '月次トレンド',
        '項目': trend.month,
        '値': `作成:${trend.created} 解決:${trend.resolved} 完了:${trend.closed}`,
        '補足': '',
      });
    }

    const parser = new Parser({
      fields: ['セクション', '項目', '値', '補足'],
    });
    const csv = parser.parse(rows);

    // BOM付きUTF-8（Excel日本語対応）
    const bom = Buffer.from([0xEF, 0xBB, 0xBF]);
    return Buffer.concat([bom, Buffer.from(csv, 'utf-8')]);
  }

  /**
   * KPIレポートをPDF形式で生成
   */
  static generatePDF(data: KPIReportData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 50,
        info: {
          Title: `KPIレポート ${data.period.from} - ${data.period.to}`,
          Author: 'Mirai HelpDesk System',
        },
      });

      const chunks: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // フォント設定（日本語対応のためHelveticaを使用、日本語は文字化けするが構造は保持）
      const titleSize = 18;
      const headerSize = 14;
      const bodySize = 10;

      // ヘッダー
      doc.fontSize(titleSize).text('KPI Report', { align: 'center' });
      doc.moveDown(0.5);
      doc.fontSize(bodySize).text(
        `Period: ${data.period.from} - ${data.period.to}`,
        { align: 'center' }
      );
      doc.text(`Generated: ${new Date().toLocaleString('ja-JP')}`, { align: 'center' });
      doc.moveDown(1);

      // 区切り線
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);

      // サマリー
      doc.fontSize(headerSize).text('1. Summary');
      doc.moveDown(0.3);
      doc.fontSize(bodySize);
      this.drawTable(doc, [
        ['Total Tickets', String(data.summary.totalTickets)],
        ['New', String(data.summary.newTickets)],
        ['Resolved', String(data.summary.resolvedTickets)],
        ['Closed', String(data.summary.closedTickets)],
        ['Open', String(data.summary.openTickets)],
        ['Avg Resolution (hours)', data.summary.avgResolutionHours?.toString() ?? 'N/A'],
      ]);
      doc.moveDown(1);

      // SLA達成率
      doc.fontSize(headerSize).text('2. SLA Achievement');
      doc.moveDown(0.3);
      doc.fontSize(bodySize);
      this.drawTable(doc, [
        ['Response SLA Rate', `${data.sla.responseMetRate}% (${data.sla.responseMetCount}/${data.sla.responseTotal})`],
        ['Resolution SLA Rate', `${data.sla.resolutionMetRate}% (${data.sla.resolutionMetCount}/${data.sla.resolutionTotal})`],
        ['Overdue Tickets', String(data.sla.overdueCount)],
      ]);
      doc.moveDown(1);

      // 優先度別
      doc.fontSize(headerSize).text('3. By Priority');
      doc.moveDown(0.3);
      doc.fontSize(bodySize);
      const priorityRows = Object.entries(data.byPriority).map(([p, c]) => {
        const slaInfo = data.slaBypriority[p];
        return [
          p,
          String(c),
          slaInfo ? `${slaInfo.responseMetRate}%` : 'N/A',
          slaInfo ? `${slaInfo.resolutionMetRate}%` : 'N/A',
        ];
      });
      this.drawTable(doc, [
        ['Priority', 'Count', 'Response SLA', 'Resolution SLA'],
        ...priorityRows,
      ]);
      doc.moveDown(1);

      // 担当者別パフォーマンス
      if (data.assigneePerformance.length > 0) {
        // ページ残量チェック
        if (doc.y > 650) doc.addPage();

        doc.fontSize(headerSize).text('4. Assignee Performance');
        doc.moveDown(0.3);
        doc.fontSize(bodySize);
        const assigneeRows = data.assigneePerformance.map((p) => [
          p.assignee_name,
          String(p.totalAssigned),
          String(p.resolvedCount),
          p.avgResolutionHours?.toString() ?? 'N/A',
        ]);
        this.drawTable(doc, [
          ['Assignee', 'Assigned', 'Resolved', 'Avg Hours'],
          ...assigneeRows,
        ]);
        doc.moveDown(1);
      }

      // 月次トレンド
      if (data.monthlyTrend.length > 0) {
        if (doc.y > 650) doc.addPage();

        doc.fontSize(headerSize).text('5. Monthly Trend');
        doc.moveDown(0.3);
        doc.fontSize(bodySize);
        const trendRows = data.monthlyTrend.map((t) => [
          t.month,
          String(t.created),
          String(t.resolved),
          String(t.closed),
        ]);
        this.drawTable(doc, [
          ['Month', 'Created', 'Resolved', 'Closed'],
          ...trendRows,
        ]);
      }

      // フッター
      doc.moveDown(2);
      doc.fontSize(8).text(
        'Mirai HelpDesk Management System - Confidential',
        { align: 'center' }
      );

      doc.end();
    });
  }

  /**
   * シンプルなテーブル描画ヘルパー
   */
  private static drawTable(doc: PDFKit.PDFDocument, rows: string[][]): void {
    if (rows.length === 0) return;

    const startX = 50;
    const colWidth = 490 / rows[0].length;
    const rowHeight = 20;

    rows.forEach((row, rowIdx) => {
      const y = doc.y;

      // ページ超過チェック
      if (y > 750) {
        doc.addPage();
      }

      row.forEach((cell, colIdx) => {
        const x = startX + colIdx * colWidth;

        // ヘッダー行は太字
        if (rowIdx === 0) {
          doc.font('Helvetica-Bold');
        } else {
          doc.font('Helvetica');
        }

        doc.text(cell, x, doc.y, {
          width: colWidth - 5,
          continued: colIdx < row.length - 1,
        });
      });

      doc.moveDown(0.1);
    });
  }
}
