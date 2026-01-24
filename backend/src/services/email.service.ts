import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../utils/logger';
import { Ticket, User, Approval } from '../types';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  cc?: string[];
  bcc?: string[];
}

export class EmailService {
  private static transporter: Transporter | null = null;

  /**
   * メールトランスポーターを初期化
   */
  private static getTransporter(): Transporter {
    if (!this.transporter) {
      const config = {
        host: process.env.SMTP_HOST || 'localhost',
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
        auth: process.env.SMTP_USER && process.env.SMTP_PASSWORD ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        } : undefined,
      };

      this.transporter = nodemailer.createTransport(config);

      logger.info('Email transporter initialized', {
        host: config.host,
        port: config.port,
        secure: config.secure,
      });
    }

    return this.transporter;
  }

  /**
   * メール送信の基本メソッド
   */
  static async sendEmail(options: EmailOptions): Promise<void> {
    try {
      const transporter = this.getTransporter();
      const from = process.env.EMAIL_FROM || 'noreply@mirai-helpdesk.local';

      const mailOptions = {
        from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        cc: options.cc,
        bcc: options.bcc,
      };

      await transporter.sendMail(mailOptions);

      logger.info('Email sent successfully', {
        to: options.to,
        subject: options.subject,
      });
    } catch (error) {
      logger.error('Failed to send email', {
        error,
        to: options.to,
        subject: options.subject,
      });
      // メール送信失敗でも例外を投げずにログのみ記録
      // チケット操作などの主要処理は継続させる
    }
  }

  /**
   * チケット作成通知メール
   */
  static async sendTicketCreated(
    ticket: Ticket,
    requester: User,
    assignee?: User
  ): Promise<void> {
    const subject = `[Mirai Helpdesk] チケット作成: ${ticket.ticket_number}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0078d4; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f5f5f5; padding: 20px; margin-top: 20px; }
            .ticket-info { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #0078d4; }
            .label { font-weight: bold; color: #666; }
            .value { margin-left: 10px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background-color: #0078d4; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>チケットが作成されました</h2>
            </div>
            <div class="content">
              <div class="ticket-info">
                <p><span class="label">チケット番号:</span><span class="value">${ticket.ticket_number}</span></p>
                <p><span class="label">件名:</span><span class="value">${ticket.subject}</span></p>
                <p><span class="label">種別:</span><span class="value">${this.formatTicketType(ticket.type)}</span></p>
                <p><span class="label">優先度:</span><span class="value">${ticket.priority}</span></p>
                <p><span class="label">ステータス:</span><span class="value">${this.formatStatus(ticket.status)}</span></p>
                <p><span class="label">依頼者:</span><span class="value">${requester.display_name}</span></p>
                ${assignee ? `<p><span class="label">担当者:</span><span class="value">${assignee.display_name}</span></p>` : ''}
                <p><span class="label">作成日時:</span><span class="value">${this.formatDate(ticket.created_at)}</span></p>
                ${ticket.due_at ? `<p><span class="label">期限:</span><span class="value">${this.formatDate(ticket.due_at)}</span></p>` : ''}
              </div>
              <div style="margin-top: 20px;">
                <p><strong>説明:</strong></p>
                <p style="white-space: pre-wrap;">${ticket.description}</p>
              </div>
              <a href="${this.getTicketUrl(ticket.ticket_id)}" class="button">チケットを確認</a>
            </div>
            <div class="footer">
              <p>このメールは自動送信されています。返信しないでください。</p>
              <p>Mirai Helpdesk Management System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // 依頼者に送信
    await this.sendEmail({
      to: requester.email,
      subject,
      html,
    });

    // 担当者にも送信（存在する場合）
    if (assignee) {
      await this.sendEmail({
        to: assignee.email,
        subject: `[Mirai Helpdesk] チケット割り当て: ${ticket.ticket_number}`,
        html,
      });
    }
  }

  /**
   * チケット割り当て通知メール
   */
  static async sendTicketAssigned(
    ticket: Ticket,
    assignee: User,
    requester: User
  ): Promise<void> {
    const subject = `[Mirai Helpdesk] チケット割り当て: ${ticket.ticket_number}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0078d4; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f5f5f5; padding: 20px; margin-top: 20px; }
            .ticket-info { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #0078d4; }
            .label { font-weight: bold; color: #666; }
            .value { margin-left: 10px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background-color: #0078d4; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px; }
            .alert { background-color: #fff4ce; padding: 10px; margin: 15px 0; border-left: 4px solid #ffc107; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>チケットが割り当てられました</h2>
            </div>
            <div class="content">
              <div class="alert">
                <p><strong>${assignee.display_name}様</strong>へチケットが割り当てられました。</p>
              </div>
              <div class="ticket-info">
                <p><span class="label">チケット番号:</span><span class="value">${ticket.ticket_number}</span></p>
                <p><span class="label">件名:</span><span class="value">${ticket.subject}</span></p>
                <p><span class="label">種別:</span><span class="value">${this.formatTicketType(ticket.type)}</span></p>
                <p><span class="label">優先度:</span><span class="value">${ticket.priority}</span></p>
                <p><span class="label">依頼者:</span><span class="value">${requester.display_name}</span></p>
                ${ticket.due_at ? `<p><span class="label">期限:</span><span class="value">${this.formatDate(ticket.due_at)}</span></p>` : ''}
              </div>
              <div style="margin-top: 20px;">
                <p><strong>説明:</strong></p>
                <p style="white-space: pre-wrap;">${ticket.description}</p>
              </div>
              <a href="${this.getTicketUrl(ticket.ticket_id)}" class="button">チケットを確認</a>
            </div>
            <div class="footer">
              <p>このメールは自動送信されています。返信しないでください。</p>
              <p>Mirai Helpdesk Management System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: assignee.email,
      subject,
      html,
    });
  }

  /**
   * 承認依頼通知メール
   */
  static async sendApprovalRequest(
    approval: Approval,
    ticket: Ticket,
    approver: User,
    requester: User
  ): Promise<void> {
    const subject = `[Mirai Helpdesk] 承認依頼: ${ticket.ticket_number}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #d83b01; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f5f5f5; padding: 20px; margin-top: 20px; }
            .ticket-info { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #d83b01; }
            .label { font-weight: bold; color: #666; }
            .value { margin-left: 10px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background-color: #d83b01; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px; margin-right: 10px; }
            .button-secondary { background-color: #666; }
            .alert { background-color: #fde7e9; padding: 10px; margin: 15px 0; border-left: 4px solid #d83b01; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>承認依頼</h2>
            </div>
            <div class="content">
              <div class="alert">
                <p><strong>${approver.display_name}様</strong>の承認が必要です。</p>
              </div>
              <div class="ticket-info">
                <p><span class="label">チケット番号:</span><span class="value">${ticket.ticket_number}</span></p>
                <p><span class="label">件名:</span><span class="value">${ticket.subject}</span></p>
                <p><span class="label">種別:</span><span class="value">${this.formatTicketType(ticket.type)}</span></p>
                <p><span class="label">優先度:</span><span class="value">${ticket.priority}</span></p>
                <p><span class="label">依頼者:</span><span class="value">${requester.display_name}</span></p>
                ${approval.reason ? `<p><span class="label">承認依頼理由:</span><span class="value">${approval.reason}</span></p>` : ''}
              </div>
              <div style="margin-top: 20px;">
                <p><strong>説明:</strong></p>
                <p style="white-space: pre-wrap;">${ticket.description}</p>
              </div>
              <div style="margin-top: 20px;">
                <a href="${this.getApprovalUrl(approval.approval_id)}" class="button">承認する</a>
                <a href="${this.getApprovalUrl(approval.approval_id)}" class="button button-secondary">却下する</a>
              </div>
            </div>
            <div class="footer">
              <p>このメールは自動送信されています。返信しないでください。</p>
              <p>Mirai Helpdesk Management System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: approver.email,
      subject,
      html,
    });
  }

  /**
   * SLA期限超過通知メール
   */
  static async sendSLAOverdue(
    ticket: Ticket,
    assignee: User,
    managers: User[]
  ): Promise<void> {
    const subject = `[Mirai Helpdesk] SLA期限超過: ${ticket.ticket_number}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #a4262c; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f5f5f5; padding: 20px; margin-top: 20px; }
            .ticket-info { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #a4262c; }
            .label { font-weight: bold; color: #666; }
            .value { margin-left: 10px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background-color: #a4262c; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px; }
            .alert { background-color: #fde7e9; padding: 15px; margin: 15px 0; border-left: 4px solid #a4262c; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>⚠ SLA期限超過</h2>
            </div>
            <div class="content">
              <div class="alert">
                <p><strong>警告:</strong> 以下のチケットがSLA期限を超過しています。</p>
                <p>早急な対応が必要です。</p>
              </div>
              <div class="ticket-info">
                <p><span class="label">チケット番号:</span><span class="value">${ticket.ticket_number}</span></p>
                <p><span class="label">件名:</span><span class="value">${ticket.subject}</span></p>
                <p><span class="label">種別:</span><span class="value">${this.formatTicketType(ticket.type)}</span></p>
                <p><span class="label">優先度:</span><span class="value">${ticket.priority}</span></p>
                <p><span class="label">ステータス:</span><span class="value">${this.formatStatus(ticket.status)}</span></p>
                <p><span class="label">担当者:</span><span class="value">${assignee.display_name}</span></p>
                <p><span class="label">作成日時:</span><span class="value">${this.formatDate(ticket.created_at)}</span></p>
                <p><span class="label">期限:</span><span class="value" style="color: #a4262c; font-weight: bold;">${this.formatDate(ticket.due_at!)}</span></p>
              </div>
              <a href="${this.getTicketUrl(ticket.ticket_id)}" class="button">チケットを確認</a>
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
    await this.sendEmail({
      to: assignee.email,
      subject,
      html,
    });

    // 管理者にもBCCで送信
    if (managers.length > 0) {
      await this.sendEmail({
        to: assignee.email,
        subject,
        html,
        bcc: managers.map(m => m.email),
      });
    }
  }

  /**
   * チケット解決通知メール
   */
  static async sendTicketResolved(
    ticket: Ticket,
    requester: User,
    resolver: User
  ): Promise<void> {
    const subject = `[Mirai Helpdesk] チケット解決: ${ticket.ticket_number}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #107c10; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f5f5f5; padding: 20px; margin-top: 20px; }
            .ticket-info { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #107c10; }
            .label { font-weight: bold; color: #666; }
            .value { margin-left: 10px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background-color: #107c10; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px; }
            .alert { background-color: #dff6dd; padding: 15px; margin: 15px 0; border-left: 4px solid #107c10; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>✓ チケットが解決されました</h2>
            </div>
            <div class="content">
              <div class="alert">
                <p>チケットが解決されました。内容をご確認ください。</p>
                <p>問題が解決していない場合は、チケットを再オープンしてください。</p>
              </div>
              <div class="ticket-info">
                <p><span class="label">チケット番号:</span><span class="value">${ticket.ticket_number}</span></p>
                <p><span class="label">件名:</span><span class="value">${ticket.subject}</span></p>
                <p><span class="label">種別:</span><span class="value">${this.formatTicketType(ticket.type)}</span></p>
                <p><span class="label">解決者:</span><span class="value">${resolver.display_name}</span></p>
                <p><span class="label">解決日時:</span><span class="value">${this.formatDate(ticket.resolved_at!)}</span></p>
              </div>
              ${ticket.resolution_summary ? `
              <div style="margin-top: 20px;">
                <p><strong>解決内容:</strong></p>
                <p style="white-space: pre-wrap;">${ticket.resolution_summary}</p>
              </div>
              ` : ''}
              <a href="${this.getTicketUrl(ticket.ticket_id)}" class="button">チケットを確認</a>
            </div>
            <div class="footer">
              <p>このメールは自動送信されています。返信しないでください。</p>
              <p>Mirai Helpdesk Management System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    await this.sendEmail({
      to: requester.email,
      subject,
      html,
    });
  }

  /**
   * チケットコメント通知メール
   */
  static async sendCommentAdded(
    ticket: Ticket,
    comment: string,
    author: User,
    recipients: User[]
  ): Promise<void> {
    const subject = `[Mirai Helpdesk] コメント追加: ${ticket.ticket_number}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0078d4; color: white; padding: 20px; text-align: center; }
            .content { background-color: #f5f5f5; padding: 20px; margin-top: 20px; }
            .ticket-info { background-color: white; padding: 15px; margin: 10px 0; border-left: 4px solid #0078d4; }
            .comment-box { background-color: #e8f4fd; padding: 15px; margin: 15px 0; border-radius: 4px; }
            .label { font-weight: bold; color: #666; }
            .value { margin-left: 10px; }
            .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
            .button { display: inline-block; padding: 10px 20px; background-color: #0078d4; color: white; text-decoration: none; border-radius: 4px; margin-top: 15px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h2>新しいコメントが追加されました</h2>
            </div>
            <div class="content">
              <div class="ticket-info">
                <p><span class="label">チケット番号:</span><span class="value">${ticket.ticket_number}</span></p>
                <p><span class="label">件名:</span><span class="value">${ticket.subject}</span></p>
                <p><span class="label">コメント者:</span><span class="value">${author.display_name}</span></p>
              </div>
              <div class="comment-box">
                <p style="white-space: pre-wrap;">${comment}</p>
              </div>
              <a href="${this.getTicketUrl(ticket.ticket_id)}" class="button">チケットを確認</a>
            </div>
            <div class="footer">
              <p>このメールは自動送信されています。返信しないでください。</p>
              <p>Mirai Helpdesk Management System</p>
            </div>
          </div>
        </body>
      </html>
    `;

    for (const recipient of recipients) {
      await this.sendEmail({
        to: recipient.email,
        subject,
        html,
      });
    }
  }

  // ヘルパーメソッド

  private static formatTicketType(type: string): string {
    const types: Record<string, string> = {
      incident: 'インシデント',
      service_request: 'サービス要求',
      change: '変更',
      problem: '問題',
    };
    return types[type] || type;
  }

  private static formatStatus(status: string): string {
    const statuses: Record<string, string> = {
      new: '新規',
      triage: 'トリアージ',
      assigned: '割り当て済み',
      in_progress: '対応中',
      pending_customer: '利用者回答待ち',
      pending_approval: '承認待ち',
      pending_change_window: '実施待ち',
      resolved: '解決済み',
      closed: 'クローズ',
      canceled: 'キャンセル',
      reopened: '再オープン',
    };
    return statuses[status] || status;
  }

  private static formatDate(date: Date): string {
    return new Date(date).toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private static getTicketUrl(ticketId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/tickets/${ticketId}`;
  }

  private static getApprovalUrl(approvalId: string): string {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    return `${baseUrl}/approvals/${approvalId}`;
  }
}
