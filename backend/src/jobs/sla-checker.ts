import { SLANotificationService } from '../services/slaNotification.service';
import { logger } from '../utils/logger';

/**
 * SLAチェッカー ジョブ管理
 *
 * cronジョブの起動・停止を管理する。
 * index.ts からはこのモジュールを通じてSLA通知のスケジューリングを制御する。
 *
 * 環境変数:
 *   SLA_CRON_EXPRESSION - cronスケジュール（デフォルト: '* /5 * * * *' 5分間隔）
 *   SMTP_HOST           - SMTPサーバーホスト名
 *   SMTP_PORT           - SMTPサーバーポート（デフォルト: 587）
 *   SMTP_USER           - SMTP認証ユーザー
 *   SMTP_PASS           - SMTP認証パスワード
 *   SMTP_FROM           - 送信元メールアドレス
 *   FRONTEND_URL        - フロントエンドURL（通知メール内リンク用）
 */

/**
 * SLAチェッカーcronジョブを開始
 */
export function startSLAChecker(): void {
  const cronExpression = process.env.SLA_CRON_EXPRESSION || '*/5 * * * *';
  SLANotificationService.start(cronExpression);
  logger.info(`SLA checker cron job started (${cronExpression})`);
}

/**
 * SLAチェッカーcronジョブを停止
 */
export function stopSLAChecker(): void {
  SLANotificationService.stop();
  logger.info('SLA checker cron job stopped');
}
