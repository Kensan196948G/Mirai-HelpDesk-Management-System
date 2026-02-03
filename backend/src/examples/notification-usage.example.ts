/**
 * 通知システム使用例
 *
 * このファイルは、NotificationServiceとEmailServiceの使用方法を示すサンプルコードです。
 * 実際のコントローラーやサービスに統合する際の参考としてください。
 */

import { NotificationService } from '../services/notification.service';
import { EmailService } from '../services/email.service';
import { TicketModel } from '../models/ticket.model';
import { UserModel } from '../models/user.model';
import { TicketType, TicketStatus, ImpactLevel, UrgencyLevel } from '../types';

// ========================================
// 例1: チケット作成時の通知
// ========================================
export async function exampleTicketCreation() {
  // チケットを作成
  const ticket = await TicketModel.create({
    type: TicketType.INCIDENT,
    subject: 'メールが送信できない',
    description: 'Outlookでメールを送信しようとするとエラーが発生します',
    impact: ImpactLevel.INDIVIDUAL,
    urgency: UrgencyLevel.HIGH,
    requester_id: 'user-123',
    category_id: 'cat-email',
  });

  // 通知を送信（依頼者に確認メール）
  await NotificationService.sendTicketCreated(ticket);

  console.log('チケット作成通知を送信しました:', ticket.ticket_number);
}

// ========================================
// 例2: チケット割り当て時の通知
// ========================================
export async function exampleTicketAssignment(ticketId: string, assigneeId: string, actorId: string) {
  // チケットを割り当て
  const ticket = await TicketModel.assign(ticketId, assigneeId, actorId);

  // 担当者情報を取得
  const assignee = await UserModel.findById(assigneeId);

  if (assignee) {
    // 担当者に通知を送信
    await NotificationService.sendTicketAssigned(ticket, assignee);
    console.log('チケット割り当て通知を送信しました:', assignee.email);
  }
}

// ========================================
// 例3: 承認依頼時の通知
// ========================================
export async function exampleApprovalRequest(ticketId: string, approverId: string) {
  // 承認レコードを作成（実際のモデルは別途実装が必要）
  const approval = {
    approval_id: 'approval-123',
    ticket_id: ticketId,
    approver_id: approverId,
    requester_id: 'user-123',
    state: 'requested' as const,
    reason: 'Microsoft 365ライセンス変更には承認が必要です',
    created_at: new Date(),
    updated_at: new Date(),
  };

  // チケット情報を取得
  const ticket = await TicketModel.findById(ticketId);

  if (ticket) {
    // 承認者に通知を送信
    await NotificationService.sendApprovalRequest(approval as any, ticket);
    console.log('承認依頼通知を送信しました:', approval.approval_id);
  }
}

// ========================================
// 例4: チケット解決時の通知
// ========================================
export async function exampleTicketResolution(ticketId: string, actorId: string) {
  // チケットを解決済みにステータス変更
  const ticket = await TicketModel.updateStatus(
    ticketId,
    TicketStatus.RESOLVED,
    actorId,
    '問題を解決しました'
  );

  // 依頼者に解決通知を送信
  await NotificationService.sendTicketResolved(ticket);
  console.log('チケット解決通知を送信しました:', ticket.ticket_number);
}

// ========================================
// 例5: コメント追加時の通知
// ========================================
export async function exampleCommentNotification(ticketId: string, commentId: string) {
  // チケット情報を取得
  const ticket = await TicketModel.findById(ticketId);

  // コメント情報（実際のモデルは別途実装が必要）
  const comment = {
    comment_id: commentId,
    ticket_id: ticketId,
    author_id: 'agent-456',
    body: '調査した結果、Outlookの設定に問題がありました。修正方法をご案内します。',
    visibility: 'public' as const,
    mentioned_user_ids: [],
    created_at: new Date(),
    updated_at: new Date(),
  };

  if (ticket) {
    // コメント通知を送信（依頼者、担当者、メンション先）
    await NotificationService.sendCommentAdded(ticket, comment as any, true);
    console.log('コメント通知を送信しました:', comment.comment_id);
  }
}

// ========================================
// 例6: SLA期限超過の通知（バッチ処理）
// ========================================
export async function exampleSLAOverdueNotification() {
  // すべての期限超過チケットに通知を送信
  // 通常はcronジョブで定期実行
  await NotificationService.notifyOverdueTickets();
  console.log('SLA期限超過通知を送信しました');
}

// ========================================
// 例7: カスタムメール送信
// ========================================
export async function exampleCustomEmail() {
  // EmailServiceを直接使用してカスタムメールを送信
  await EmailService.sendEmail({
    to: 'user@example.com',
    subject: 'カスタム通知',
    html: `
      <h2>こんにちは</h2>
      <p>これはカスタムメールです。</p>
      <p>通知システムのテストを行っています。</p>
    `,
  });
  console.log('カスタムメールを送信しました');
}

// ========================================
// 例8: エラーハンドリングの例
// ========================================
export async function exampleErrorHandling(ticketId: string) {
  try {
    const ticket = await TicketModel.findById(ticketId);

    if (!ticket) {
      console.error('チケットが見つかりません:', ticketId);
      return;
    }

    // 通知送信（失敗してもエラーは投げられない）
    await NotificationService.sendTicketCreated(ticket);

    console.log('通知処理が完了しました');
    // チケット作成などの主要処理は成功している

  } catch (error) {
    console.error('予期しないエラー:', error);
    // 通知システムのエラーはここには到達しない
    // NotificationServiceとEmailServiceは内部でエラーをキャッチする
  }
}

// ========================================
// 例9: 複数通知の一括送信
// ========================================
export async function exampleBulkNotifications(ticketIds: string[]) {
  // 並列処理で複数チケットに通知を送信
  await Promise.all(
    ticketIds.map(async (ticketId) => {
      const ticket = await TicketModel.findById(ticketId);
      if (ticket) {
        await NotificationService.sendTicketCreated(ticket);
      }
    })
  );

  console.log(`${ticketIds.length}件の通知を送信しました`);
}

// ========================================
// 例10: 環境変数の確認
// ========================================
export function exampleCheckEmailConfig() {
  console.log('メール設定:');
  console.log('  SMTP_HOST:', process.env.SMTP_HOST);
  console.log('  SMTP_PORT:', process.env.SMTP_PORT);
  console.log('  SMTP_USER:', process.env.SMTP_USER);
  console.log('  EMAIL_FROM:', process.env.EMAIL_FROM);
  console.log('  FRONTEND_URL:', process.env.FRONTEND_URL);

  // 必須設定の確認
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'EMAIL_FROM', 'FRONTEND_URL'];
  const missingVars = requiredVars.filter(v => !process.env[v]);

  if (missingVars.length > 0) {
    console.error('❌ 必須の環境変数が設定されていません:', missingVars.join(', '));
  } else {
    console.log('✓ すべての必須環境変数が設定されています');
  }
}

// ========================================
// 使用例のエクスポート
// ========================================
export const notificationExamples = {
  ticketCreation: exampleTicketCreation,
  ticketAssignment: exampleTicketAssignment,
  approvalRequest: exampleApprovalRequest,
  ticketResolution: exampleTicketResolution,
  commentNotification: exampleCommentNotification,
  slaOverdueNotification: exampleSLAOverdueNotification,
  customEmail: exampleCustomEmail,
  errorHandling: exampleErrorHandling,
  bulkNotifications: exampleBulkNotifications,
  checkEmailConfig: exampleCheckEmailConfig,
};
