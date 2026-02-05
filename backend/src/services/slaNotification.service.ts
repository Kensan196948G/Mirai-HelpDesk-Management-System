import { schedule, ScheduledTask } from 'node-cron';
import { query } from '../config/database';
import { EmailService } from './email.service';
import { UserModel } from '../models/user.model';
import { Ticket, User, UserRole, TicketStatus } from '../types';
import { logger } from '../utils/logger';

/**
 * SLA通知レベル
 * - approaching: SLA期限の30分前に送信
 * - warning: SLA期限の75%経過時に送信
 * - violation: SLA期限の100%経過（超過）時に送信
 */
type SLANotificationLevel = 'approaching' | 'warning' | 'violation';

const APPROACHING_THRESHOLD_MS = 30 * 60 * 1000; // 30分

interface SLACheckResult {
  ticket: Ticket;
  level: SLANotificationLevel;
  type: 'response' | 'resolution';
  elapsedPercent: number;
  dueAt: Date;
}

/**
 * SLA違反メール通知サービス
 *
 * 定期的にチケットのSLA状況を監視し、
 * 75%経過（警告）・100%超過（違反）のタイミングで
 * 担当者および管理者にメール通知を送信する。
 *
 * 重複通知を防ぐため、通知済みレコードをDBの sla_notifications テーブルで管理する。
 * テーブルが存在しない場合はメモリ内Setでフォールバックする。
 */
export class SLANotificationService {
  private static cronJob: ScheduledTask | null = null;
  private static notifiedSet: Set<string> = new Set();
  private static useDbTracking = true;

  /**
   * SLA通知cronジョブを開始
   * デフォルトは5分間隔で実行
   */
  static start(cronExpression = '*/5 * * * *'): void {
    if (this.cronJob) {
      logger.warn('SLA notification cron job is already running');
      return;
    }

    this.initializeTrackingTable().catch(() => {
      logger.warn('sla_notifications table not available, using in-memory tracking');
      this.useDbTracking = false;
    });

    this.cronJob = schedule(cronExpression, async () => {
      try {
        await this.checkAndNotify();
      } catch (error) {
        logger.error('SLA notification check failed', { error });
      }
    });

    logger.info('SLA notification cron job started', { cronExpression });
  }

  /**
   * cronジョブを停止
   */
  static stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('SLA notification cron job stopped');
    }
  }

  /**
   * 通知追跡テーブルの初期化（存在しなければ作成）
   */
  private static async initializeTrackingTable(): Promise<void> {
    await query(`
      CREATE TABLE IF NOT EXISTS sla_notifications (
        id SERIAL PRIMARY KEY,
        ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,
        notification_level VARCHAR(20) NOT NULL,
        notification_type VARCHAR(20) NOT NULL,
        sent_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(ticket_id, notification_level, notification_type)
      )
    `);
  }

  /**
   * メインのチェック＆通知処理
   */
  static async checkAndNotify(): Promise<number> {
    const activeTickets = await this.getActiveTicketsWithSLA();
    const results = this.evaluateTickets(activeTickets);

    let sentCount = 0;

    for (const result of results) {
      const alreadyNotified = await this.isAlreadyNotified(
        result.ticket.ticket_id,
        result.level,
        result.type
      );

      if (alreadyNotified) {
        continue;
      }

      try {
        await this.sendNotification(result);
        await this.markAsNotified(
          result.ticket.ticket_id,
          result.level,
          result.type
        );
        sentCount++;
      } catch (error) {
        logger.error('Failed to send SLA notification', {
          ticket_id: result.ticket.ticket_id,
          level: result.level,
          type: result.type,
          error,
        });
      }
    }

    if (sentCount > 0) {
      logger.info('SLA notifications sent', {
        checked: activeTickets.length,
        notified: sentCount,
      });
    }

    return sentCount;
  }

  /**
   * SLA期限が設定されたアクティブチケットを取得
   */
  private static async getActiveTicketsWithSLA(): Promise<Ticket[]> {
    const result = await query(
      `SELECT t.*, u.display_name as requester_name
       FROM tickets t
       LEFT JOIN users u ON t.requester_id = u.user_id
       WHERE t.status NOT IN ($1, $2, $3)
       AND (t.response_due_at IS NOT NULL OR t.due_at IS NOT NULL)
       ORDER BY t.priority, t.due_at`,
      [TicketStatus.CLOSED, TicketStatus.CANCELED, TicketStatus.RESOLVED]
    );

    return result.rows;
  }

  /**
   * チケットのSLA経過状況を評価し、通知が必要なものを返す
   *
   * 通知レベル判定（優先度順）：
   * 1. violation: 期限超過（elapsed >= 100%）
   * 2. warning: 期限の75%経過
   * 3. approaching: 期限まで残り30分以内
   */
  private static evaluateTickets(tickets: Ticket[]): SLACheckResult[] {
    const now = new Date();
    const results: SLACheckResult[] = [];

    for (const ticket of tickets) {
      // 初動対応SLAチェック（未割当の場合のみ）
      if (!ticket.assigned_at && ticket.response_due_at) {
        const createdAt = new Date(ticket.created_at);
        const dueAt = new Date(ticket.response_due_at);
        const totalDuration = dueAt.getTime() - createdAt.getTime();

        if (totalDuration > 0) {
          const elapsed = now.getTime() - createdAt.getTime();
          const elapsedPercent = (elapsed / totalDuration) * 100;
          const remainingMs = dueAt.getTime() - now.getTime();

          if (elapsedPercent >= 100) {
            results.push({
              ticket,
              level: 'violation',
              type: 'response',
              elapsedPercent,
              dueAt,
            });
          } else if (elapsedPercent >= 75) {
            results.push({
              ticket,
              level: 'warning',
              type: 'response',
              elapsedPercent,
              dueAt,
            });
          } else if (remainingMs <= APPROACHING_THRESHOLD_MS && remainingMs > 0) {
            results.push({
              ticket,
              level: 'approaching',
              type: 'response',
              elapsedPercent,
              dueAt,
            });
          }
        }
      }

      // 解決SLAチェック
      if (ticket.due_at) {
        const createdAt = new Date(ticket.created_at);
        const dueAt = new Date(ticket.due_at);
        const totalDuration = dueAt.getTime() - createdAt.getTime();

        if (totalDuration > 0) {
          const elapsed = now.getTime() - createdAt.getTime();
          const elapsedPercent = (elapsed / totalDuration) * 100;
          const remainingMs = dueAt.getTime() - now.getTime();

          if (elapsedPercent >= 100) {
            results.push({
              ticket,
              level: 'violation',
              type: 'resolution',
              elapsedPercent,
              dueAt,
            });
          } else if (elapsedPercent >= 75) {
            results.push({
              ticket,
              level: 'warning',
              type: 'resolution',
              elapsedPercent,
              dueAt,
            });
          } else if (remainingMs <= APPROACHING_THRESHOLD_MS && remainingMs > 0) {
            results.push({
              ticket,
              level: 'approaching',
              type: 'resolution',
              elapsedPercent,
              dueAt,
            });
          }
        }
      }
    }

    return results;
  }

  /**
   * 通知が既に送信済みかチェック
   */
  private static async isAlreadyNotified(
    ticketId: string,
    level: SLANotificationLevel,
    type: string
  ): Promise<boolean> {
    const key = `${ticketId}:${level}:${type}`;

    if (this.useDbTracking) {
      try {
        const result = await query(
          `SELECT 1 FROM sla_notifications
           WHERE ticket_id = $1 AND notification_level = $2 AND notification_type = $3`,
          [ticketId, level, type]
        );
        return result.rows.length > 0;
      } catch {
        return this.notifiedSet.has(key);
      }
    }

    return this.notifiedSet.has(key);
  }

  /**
   * 通知済みとしてマーク
   */
  private static async markAsNotified(
    ticketId: string,
    level: SLANotificationLevel,
    type: string
  ): Promise<void> {
    const key = `${ticketId}:${level}:${type}`;
    this.notifiedSet.add(key);

    if (this.useDbTracking) {
      try {
        await query(
          `INSERT INTO sla_notifications (ticket_id, notification_level, notification_type)
           VALUES ($1, $2, $3)
           ON CONFLICT (ticket_id, notification_level, notification_type) DO NOTHING`,
          [ticketId, level, type]
        );
      } catch (error) {
        logger.warn('Failed to persist SLA notification record', { ticketId, level, type });
      }
    }
  }

  /**
   * SLA通知メールを送信
   */
  private static async sendNotification(result: SLACheckResult): Promise<void> {
    const { ticket, level, type, elapsedPercent, dueAt } = result;

    // 担当者取得（未割当の場合はnull）
    let assignee: User | null = null;
    if (ticket.assignee_id) {
      assignee = await UserModel.findById(ticket.assignee_id);
    }

    // 管理者リスト取得
    const managers = await UserModel.findAll({ role: UserRole.MANAGER });

    const typeLabel = type === 'response' ? '初動対応' : '解決';
    const remainingMinutes = Math.max(0, Math.round((dueAt.getTime() - Date.now()) / 60000));

    let levelLabel: string;
    let headerColor: string;
    let alertBg: string;
    let alertBorder: string;

    switch (level) {
      case 'approaching':
        levelLabel = 'SLA期限接近';
        headerColor = '#0078d4';
        alertBg = '#e6f2ff';
        alertBorder = '#0078d4';
        break;
      case 'warning':
        levelLabel = 'SLA警告';
        headerColor = '#ff8c00';
        alertBg = '#fff4ce';
        alertBorder = '#ffc107';
        break;
      case 'violation':
      default:
        levelLabel = 'SLA違反';
        headerColor = '#a4262c';
        alertBg = '#fde7e9';
        alertBorder = '#a4262c';
        break;
    }

    const subject = `[Mirai Helpdesk] ${levelLabel}: ${ticket.ticket_number} - ${typeLabel}期限`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: ${headerColor}; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f5f5f5; padding: 20px; margin-top: 20px; }
            .ticket-info { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid ${headerColor}; }
            .label { font-weight: bold; color: #666; }
            .value { margin-left: 10px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background-color: ${headerColor}; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px; }
            .alert { background-color: ${alertBg}; padding: 15px; margin: 15px 0; border-left: 4px solid ${alertBorder}; }
            .progress-bar { background-color: #e0e0e0; border-radius: 4px; overflow: hidden; margin: 10px 0; }
            .progress-fill { height: 20px; background-color: ${headerColor}; text-align: center; color: white; font-size: 12px; line-height: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>${level === 'violation' ? '!! ' : '! '}${levelLabel} - ${typeLabel}期限</h2>
            </div>
            <div class="content">
              <div class="alert">
                <p><strong>${level === 'approaching' ? '通知' : level === 'warning' ? '警告' : '違反'}:</strong> ${
      level === 'approaching'
        ? `チケットの${typeLabel}期限まで残り約${remainingMinutes}分です。対応をお願いします。`
        : level === 'warning'
        ? `チケットの${typeLabel}期限まで残り${Math.max(0, Math.round(100 - elapsedPercent))}%です。早急な対応をお願いします。`
        : `チケットの${typeLabel}期限を超過しました。直ちに対応してください。`
    }</p>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${Math.min(100, Math.round(elapsedPercent))}%">
                  ${Math.round(elapsedPercent)}%
                </div>
              </div>
              <div class="ticket-info">
                <p><span class="label">チケット番号:</span><span class="value">${ticket.ticket_number}</span></p>
                <p><span class="label">件名:</span><span class="value">${ticket.subject}</span></p>
                <p><span class="label">優先度:</span><span class="value">${ticket.priority}</span></p>
                <p><span class="label">ステータス:</span><span class="value">${ticket.status}</span></p>
                <p><span class="label">担当者:</span><span class="value">${assignee ? assignee.display_name : '未割当'}</span></p>
                <p><span class="label">${typeLabel}期限:</span><span class="value" style="color: ${headerColor}; font-weight: bold;">${formatDate(dueAt)}</span></p>
                <p><span class="label">作成日時:</span><span class="value">${formatDate(new Date(ticket.created_at))}</span></p>
              </div>
              <a href="${getTicketUrl(ticket.ticket_id)}" class="button">チケットを確認</a>
            </div>
            <div class="footer">
              <p>このメールは自動送信されています。返信しないでください。</p>
              <p>Mirai Helpdesk Management System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // 担当者に送信
    if (assignee) {
      await EmailService.sendEmail({
        to: assignee.email,
        subject,
        html,
      });
    }

    // 管理者にも送信（violation: TO直送、warning/approaching: BCC）
    if (managers.length > 0) {
      const managerEmails = managers.map((m) => m.email);

      if (level === 'violation') {
        // 違反時は管理者全員にTO送信
        for (const email of managerEmails) {
          await EmailService.sendEmail({
            to: email,
            subject,
            html,
          });
        }
      } else if (assignee) {
        // 警告・接近時は管理者にBCC
        await EmailService.sendEmail({
          to: assignee.email,
          subject: `[参考] ${subject}`,
          html,
          bcc: managerEmails,
        });
      }
    }

    logger.info('SLA notification sent', {
      ticket_id: ticket.ticket_id,
      ticket_number: ticket.ticket_number,
      level,
      type,
      elapsedPercent: Math.round(elapsedPercent),
      assignee: assignee?.email || 'unassigned',
      manager_count: managers.length,
    });
  }
}

// ヘルパー関数
function formatDate(date: Date): string {
  return new Date(date).toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getTicketUrl(ticketId: string): string {
  const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${baseUrl}/tickets/${ticketId}`;
}
