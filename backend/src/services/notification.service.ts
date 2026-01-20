import { EmailService } from './email.service';
import { UserModel } from '../models/user.model';
import { Ticket, User, Approval, UserRole, TicketComment } from '../types';
import { logger } from '../utils/logger';

export class NotificationService {
  /**
   * チケット作成時の通知
   * - 依頼者に確認メール送信
   * - 担当者が割り当てられている場合は担当者にも送信
   */
  static async sendTicketCreated(ticket: Ticket): Promise<void> {
    try {
      // 依頼者情報取得
      const requester = await UserModel.findById(ticket.requester_id);
      if (!requester) {
        logger.warn('Requester not found for ticket notification', {
          ticket_id: ticket.ticket_id,
          requester_id: ticket.requester_id,
        });
        return;
      }

      // 担当者情報取得（割り当てられている場合）
      let assignee: User | undefined;
      if (ticket.assignee_id) {
        const assigneeResult = await UserModel.findById(ticket.assignee_id);
        if (assigneeResult) {
          assignee = assigneeResult;
        }
      }

      // メール送信
      await EmailService.sendTicketCreated(ticket, requester, assignee);

      logger.info('Ticket created notification sent', {
        ticket_id: ticket.ticket_id,
        ticket_number: ticket.ticket_number,
        requester_email: requester.email,
        assignee_email: assignee?.email,
      });
    } catch (error) {
      logger.error('Failed to send ticket created notification', {
        error,
        ticket_id: ticket.ticket_id,
      });
      // 通知失敗でも例外は投げない
    }
  }

  /**
   * チケット割り当て時の通知
   * - 新しい担当者に通知メール送信
   */
  static async sendTicketAssigned(ticket: Ticket, assignee: User): Promise<void> {
    try {
      // 依頼者情報取得
      const requester = await UserModel.findById(ticket.requester_id);
      if (!requester) {
        logger.warn('Requester not found for assignment notification', {
          ticket_id: ticket.ticket_id,
          requester_id: ticket.requester_id,
        });
        return;
      }

      // メール送信
      await EmailService.sendTicketAssigned(ticket, assignee, requester);

      logger.info('Ticket assigned notification sent', {
        ticket_id: ticket.ticket_id,
        ticket_number: ticket.ticket_number,
        assignee_email: assignee.email,
      });
    } catch (error) {
      logger.error('Failed to send ticket assigned notification', {
        error,
        ticket_id: ticket.ticket_id,
        assignee_id: assignee.user_id,
      });
      // 通知失敗でも例外は投げない
    }
  }

  /**
   * 承認依頼時の通知
   * - 承認者に承認依頼メール送信
   */
  static async sendApprovalRequest(approval: Approval, ticket: Ticket): Promise<void> {
    try {
      // 承認者情報取得
      const approver = await UserModel.findById(approval.approver_id);
      if (!approver) {
        logger.warn('Approver not found for approval notification', {
          approval_id: approval.approval_id,
          approver_id: approval.approver_id,
        });
        return;
      }

      // 依頼者情報取得
      const requester = await UserModel.findById(ticket.requester_id);
      if (!requester) {
        logger.warn('Requester not found for approval notification', {
          ticket_id: ticket.ticket_id,
          requester_id: ticket.requester_id,
        });
        return;
      }

      // メール送信
      await EmailService.sendApprovalRequest(approval, ticket, approver, requester);

      logger.info('Approval request notification sent', {
        approval_id: approval.approval_id,
        ticket_id: ticket.ticket_id,
        approver_email: approver.email,
      });
    } catch (error) {
      logger.error('Failed to send approval request notification', {
        error,
        approval_id: approval.approval_id,
        ticket_id: ticket.ticket_id,
      });
      // 通知失敗でも例外は投げない
    }
  }

  /**
   * SLA期限超過時の通知
   * - 担当者に警告メール送信
   * - 管理者にもBCCで送信
   */
  static async sendSLAOverdue(ticket: Ticket): Promise<void> {
    try {
      // 担当者情報取得
      if (!ticket.assignee_id) {
        logger.warn('No assignee for overdue SLA notification', {
          ticket_id: ticket.ticket_id,
        });
        return;
      }

      const assignee = await UserModel.findById(ticket.assignee_id);
      if (!assignee) {
        logger.warn('Assignee not found for SLA overdue notification', {
          ticket_id: ticket.ticket_id,
          assignee_id: ticket.assignee_id,
        });
        return;
      }

      // 管理者リスト取得
      const managers = await UserModel.findAll({
        role: UserRole.MANAGER,
      });

      // メール送信
      await EmailService.sendSLAOverdue(ticket, assignee, managers);

      logger.info('SLA overdue notification sent', {
        ticket_id: ticket.ticket_id,
        ticket_number: ticket.ticket_number,
        assignee_email: assignee.email,
        manager_count: managers.length,
      });
    } catch (error) {
      logger.error('Failed to send SLA overdue notification', {
        error,
        ticket_id: ticket.ticket_id,
      });
      // 通知失敗でも例外は投げない
    }
  }

  /**
   * チケット解決時の通知
   * - 依頼者に解決通知メール送信
   */
  static async sendTicketResolved(ticket: Ticket): Promise<void> {
    try {
      // 依頼者情報取得
      const requester = await UserModel.findById(ticket.requester_id);
      if (!requester) {
        logger.warn('Requester not found for resolution notification', {
          ticket_id: ticket.ticket_id,
          requester_id: ticket.requester_id,
        });
        return;
      }

      // 解決者情報取得（担当者）
      let resolver: User;
      if (ticket.assignee_id) {
        const resolverResult = await UserModel.findById(ticket.assignee_id);
        if (resolverResult) {
          resolver = resolverResult;
        } else {
          resolver = requester; // フォールバック
        }
      } else {
        resolver = requester; // フォールバック
      }

      // メール送信
      await EmailService.sendTicketResolved(ticket, requester, resolver);

      logger.info('Ticket resolved notification sent', {
        ticket_id: ticket.ticket_id,
        ticket_number: ticket.ticket_number,
        requester_email: requester.email,
      });
    } catch (error) {
      logger.error('Failed to send ticket resolved notification', {
        error,
        ticket_id: ticket.ticket_id,
      });
      // 通知失敗でも例外は投げない
    }
  }

  /**
   * コメント追加時の通知
   * - 依頼者、担当者、メンション先に通知
   */
  static async sendCommentAdded(
    ticket: Ticket,
    comment: TicketComment,
    isPublic: boolean
  ): Promise<void> {
    try {
      // コメント投稿者情報取得
      const author = await UserModel.findById(comment.author_id);
      if (!author) {
        logger.warn('Author not found for comment notification', {
          comment_id: comment.comment_id,
          author_id: comment.author_id,
        });
        return;
      }

      // 通知対象ユーザーのリスト
      const recipientIds = new Set<string>();

      // 公開コメントの場合は依頼者に通知
      if (isPublic) {
        recipientIds.add(ticket.requester_id);
      }

      // 担当者に通知（コメント投稿者自身でない場合）
      if (ticket.assignee_id && ticket.assignee_id !== comment.author_id) {
        recipientIds.add(ticket.assignee_id);
      }

      // メンションされたユーザーに通知
      if (comment.mentioned_user_ids) {
        comment.mentioned_user_ids.forEach(id => recipientIds.add(id));
      }

      // コメント投稿者自身は除外
      recipientIds.delete(comment.author_id);

      // 通知対象ユーザー情報取得
      const recipients: User[] = [];
      for (const userId of Array.from(recipientIds)) {
        const user = await UserModel.findById(userId);
        if (user) {
          recipients.push(user);
        }
      }

      // メール送信
      if (recipients.length > 0) {
        await EmailService.sendCommentAdded(
          ticket,
          comment.body,
          author,
          recipients
        );

        logger.info('Comment notification sent', {
          ticket_id: ticket.ticket_id,
          comment_id: comment.comment_id,
          recipient_count: recipients.length,
        });
      }
    } catch (error) {
      logger.error('Failed to send comment notification', {
        error,
        ticket_id: ticket.ticket_id,
        comment_id: comment.comment_id,
      });
      // 通知失敗でも例外は投げない
    }
  }

  /**
   * 承認完了時の通知
   * - 依頼者と担当者に通知
   */
  static async sendApprovalCompleted(
    approval: Approval,
    ticket: Ticket,
    approved: boolean
  ): Promise<void> {
    try {
      const requester = await UserModel.findById(ticket.requester_id);
      if (!requester) {
        logger.warn('Requester not found for approval completion notification', {
          ticket_id: ticket.ticket_id,
        });
        return;
      }

      const approver = await UserModel.findById(approval.approver_id);
      if (!approver) {
        logger.warn('Approver not found for approval completion notification', {
          approval_id: approval.approval_id,
        });
        return;
      }

      const subject = approved
        ? `[Mirai Helpdesk] 承認完了: ${ticket.ticket_number}`
        : `[Mirai Helpdesk] 承認却下: ${ticket.ticket_number}`;

      const status = approved ? '承認されました' : '却下されました';

      // 簡易的な通知（EmailServiceに専用メソッドを追加することも可能）
      const recipients = [requester.email];
      if (ticket.assignee_id) {
        const assignee = await UserModel.findById(ticket.assignee_id);
        if (assignee) {
          recipients.push(assignee.email);
        }
      }

      for (const email of recipients) {
        await EmailService.sendEmail({
          to: email,
          subject,
          html: `
            <p>チケット ${ticket.ticket_number} の承認が${status}。</p>
            <p>承認者: ${approver.display_name}</p>
            ${approval.comment ? `<p>コメント: ${approval.comment}</p>` : ''}
          `,
        });
      }

      logger.info('Approval completion notification sent', {
        approval_id: approval.approval_id,
        ticket_id: ticket.ticket_id,
        approved,
      });
    } catch (error) {
      logger.error('Failed to send approval completion notification', {
        error,
        approval_id: approval.approval_id,
      });
      // 通知失敗でも例外は投げない
    }
  }

  /**
   * バッチ処理: SLA期限超過チケットの通知
   * 定期的に実行されることを想定
   */
  static async notifyOverdueTickets(): Promise<void> {
    try {
      const TicketModel = (await import('../models/ticket.model')).TicketModel;
      const overdueTickets = await TicketModel.findOverdueSLA();

      logger.info('Processing overdue SLA notifications', {
        count: overdueTickets.length,
      });

      for (const ticket of overdueTickets) {
        await this.sendSLAOverdue(ticket);
      }

      logger.info('Completed overdue SLA notifications', {
        processed: overdueTickets.length,
      });
    } catch (error) {
      logger.error('Failed to process overdue SLA notifications', { error });
    }
  }
}
