import { Request, Response, NextFunction } from 'express';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { KPIReportService } from '../services/kpiReport.service';
import { logger, logAudit } from '../utils/logger';

export class ReportController {
  /**
   * KPIレポート取得
   * GET /api/reports/kpi?from=YYYY-MM-DD&to=YYYY-MM-DD&format=json|csv|pdf
   */
  static getKPIReport = asyncHandler(
    async (req: Request, res: Response, _next: NextFunction) => {
      const { from, to, format } = req.query;
      const user = req.user!;

      // バリデーション
      if (!from || !to) {
        throw new AppError(
          'Query parameters "from" and "to" are required (YYYY-MM-DD)',
          400,
          'MISSING_DATE_RANGE'
        );
      }

      const fromStr = from as string;
      const toStr = to as string;

      // 日付フォーマットチェック
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(fromStr) || !dateRegex.test(toStr)) {
        throw new AppError(
          'Date format must be YYYY-MM-DD',
          400,
          'INVALID_DATE_FORMAT'
        );
      }

      if (new Date(fromStr) > new Date(toStr)) {
        throw new AppError(
          '"from" date must be before or equal to "to" date',
          400,
          'INVALID_DATE_RANGE'
        );
      }

      // レポートデータ生成
      const reportData = await KPIReportService.generateReport({
        from: fromStr,
        to: toStr,
      });

      // 監査ログ
      logAudit(
        'KPI_REPORT_GENERATED',
        user.user_id,
        { from: fromStr, to: toStr, format: format || 'json' },
        req.ip
      );

      const exportFormat = (format as string)?.toLowerCase() || 'json';

      switch (exportFormat) {
        case 'csv': {
          const csvBuffer = KPIReportService.generateCSV(reportData);
          const filename = `kpi-report_${fromStr}_${toStr}.csv`;

          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.send(csvBuffer);
          return;
        }

        case 'pdf': {
          const pdfBuffer = await KPIReportService.generatePDF(reportData);
          const filename = `kpi-report_${fromStr}_${toStr}.pdf`;

          res.setHeader('Content-Type', 'application/pdf');
          res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
          res.send(pdfBuffer);
          return;
        }

        case 'json':
        default: {
          res.json({
            success: true,
            data: { report: reportData },
          });
          return;
        }
      }
    }
  );
}
