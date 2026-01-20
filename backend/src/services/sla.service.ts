import { PriorityLevel, Ticket, TicketStatus } from '../types';
import { BusinessHoursUtil } from '../utils/business-hours';

/**
 * SLA自動計算エンジン
 *
 * 優先度ごとのSLA基準:
 * - P1: 初動15分 / 解決2時間
 * - P2: 初動1時間 / 解決8時間
 * - P3: 初動4時間 / 解決72時間（3営業日）
 * - P4: 初動24時間（1営業日） / 解決120時間（5営業日）
 */

// SLA定義（分単位）
interface SLADefinition {
  responseMinutes: number; // 初動対応時間
  resolutionMinutes: number; // 解決時間
  businessHoursOnly: boolean; // 営業時間のみで計算するか
}

const SLA_POLICIES: Record<PriorityLevel, SLADefinition> = {
  [PriorityLevel.P1]: {
    responseMinutes: 15,
    resolutionMinutes: 120, // 2時間
    businessHoursOnly: false, // P1は24時間体制
  },
  [PriorityLevel.P2]: {
    responseMinutes: 60, // 1時間
    resolutionMinutes: 480, // 8時間
    businessHoursOnly: true,
  },
  [PriorityLevel.P3]: {
    responseMinutes: 240, // 4時間
    resolutionMinutes: 4320, // 72時間（3営業日 = 3日 × 9時間/日 × 60分）
    businessHoursOnly: true,
  },
  [PriorityLevel.P4]: {
    responseMinutes: 1440, // 24時間（1営業日 = 9時間 × 60分 = 540分、ただしここでは時計時間）
    resolutionMinutes: 7200, // 120時間（5営業日 = 5日 × 9時間/日 × 60分）
    businessHoursOnly: true,
  },
};

export class SLAService {
  /**
   * 優先度に基づいてSLA期限を計算
   *
   * @param priority 優先度
   * @param createdAt チケット作成日時
   * @returns response_due_at（初動対応期限）と due_at（解決期限）
   */
  static calculateDueDates(
    priority: PriorityLevel,
    createdAt: Date
  ): {
    response_due_at: Date;
    due_at: Date;
  } {
    const policy = SLA_POLICIES[priority];
    if (!policy) {
      throw new Error(`未定義の優先度: ${priority}`);
    }

    let response_due_at: Date;
    let due_at: Date;

    if (policy.businessHoursOnly) {
      // 営業時間のみで計算
      const responseHours = policy.responseMinutes / 60;
      const resolutionHours = policy.resolutionMinutes / 60;

      response_due_at = BusinessHoursUtil.addBusinessHours(createdAt, responseHours);
      due_at = BusinessHoursUtil.addBusinessHours(createdAt, resolutionHours);
    } else {
      // 24時間体制（P1など）
      response_due_at = new Date(createdAt.getTime() + policy.responseMinutes * 60 * 1000);
      due_at = new Date(createdAt.getTime() + policy.resolutionMinutes * 60 * 1000);
    }

    return {
      response_due_at,
      due_at,
    };
  }

  /**
   * チケットが期限超過しているかチェック
   *
   * @param ticket チケット
   * @returns 期限超過の有無
   */
  static isOverdue(ticket: Ticket): boolean {
    const now = new Date();

    // クローズ済み・キャンセル済みは超過扱いしない
    if (
      ticket.status === TicketStatus.CLOSED ||
      ticket.status === TicketStatus.CANCELED
    ) {
      return false;
    }

    // 解決済みは初動対応期限のみチェック（解決期限は達成済み）
    if (ticket.status === TicketStatus.RESOLVED) {
      if (ticket.response_due_at && now > ticket.response_due_at && !ticket.assigned_at) {
        return true;
      }
      return false;
    }

    // 初動対応期限超過チェック（未割当の場合）
    if (
      !ticket.assigned_at &&
      ticket.response_due_at &&
      now > ticket.response_due_at
    ) {
      return true;
    }

    // 解決期限超過チェック
    if (ticket.due_at && now > ticket.due_at) {
      return true;
    }

    return false;
  }

  /**
   * チケットのSLA達成状況を判定
   *
   * @param ticket チケット
   * @returns SLA達成情報
   */
  static getSLAStatus(ticket: Ticket): {
    responseMetSLA: boolean | null; // 初動対応SLA達成（null = 未確定）
    resolutionMetSLA: boolean | null; // 解決SLA達成（null = 未確定）
    isOverdue: boolean; // 現在超過中か
  } {
    let responseMetSLA: boolean | null = null;
    let resolutionMetSLA: boolean | null = null;

    // 初動対応SLA判定（割当済みの場合のみ判定可能）
    if (ticket.assigned_at && ticket.response_due_at) {
      responseMetSLA = ticket.assigned_at <= ticket.response_due_at;
    }

    // 解決SLA判定（解決済みの場合のみ判定可能）
    if (ticket.resolved_at && ticket.due_at) {
      resolutionMetSLA = ticket.resolved_at <= ticket.due_at;
    }

    return {
      responseMetSLA,
      resolutionMetSLA,
      isOverdue: this.isOverdue(ticket),
    };
  }

  /**
   * SLA達成率を計算
   *
   * @param tickets チケット配列
   * @returns SLAメトリクス
   */
  static calculateSLAMetrics(tickets: Ticket[]): {
    total: number;
    responseMetCount: number;
    responseMetRate: number;
    resolutionMetCount: number;
    resolutionMetRate: number;
    overdueCount: number;
    overdueRate: number;
    byPriority: Record<
      PriorityLevel,
      {
        total: number;
        responseMetCount: number;
        responseMetRate: number;
        resolutionMetCount: number;
        resolutionMetRate: number;
      }
    >;
  } {
    const total = tickets.length;
    let responseMetCount = 0;
    let responseEvaluatedCount = 0;
    let resolutionMetCount = 0;
    let resolutionEvaluatedCount = 0;
    let overdueCount = 0;

    // 優先度別の集計
    const byPriority: Record<
      PriorityLevel,
      {
        total: number;
        responseMetCount: number;
        responseEvaluatedCount: number;
        resolutionMetCount: number;
        resolutionEvaluatedCount: number;
      }
    > = {
      [PriorityLevel.P1]: {
        total: 0,
        responseMetCount: 0,
        responseEvaluatedCount: 0,
        resolutionMetCount: 0,
        resolutionEvaluatedCount: 0,
      },
      [PriorityLevel.P2]: {
        total: 0,
        responseMetCount: 0,
        responseEvaluatedCount: 0,
        resolutionMetCount: 0,
        resolutionEvaluatedCount: 0,
      },
      [PriorityLevel.P3]: {
        total: 0,
        responseMetCount: 0,
        responseEvaluatedCount: 0,
        resolutionMetCount: 0,
        resolutionEvaluatedCount: 0,
      },
      [PriorityLevel.P4]: {
        total: 0,
        responseMetCount: 0,
        responseEvaluatedCount: 0,
        resolutionMetCount: 0,
        resolutionEvaluatedCount: 0,
      },
    };

    tickets.forEach((ticket) => {
      const status = this.getSLAStatus(ticket);
      const priority = ticket.priority;

      // 優先度別カウント
      byPriority[priority].total++;

      // 初動対応SLA
      if (status.responseMetSLA !== null) {
        responseEvaluatedCount++;
        byPriority[priority].responseEvaluatedCount++;
        if (status.responseMetSLA) {
          responseMetCount++;
          byPriority[priority].responseMetCount++;
        }
      }

      // 解決SLA
      if (status.resolutionMetSLA !== null) {
        resolutionEvaluatedCount++;
        byPriority[priority].resolutionEvaluatedCount++;
        if (status.resolutionMetSLA) {
          resolutionMetCount++;
          byPriority[priority].resolutionMetCount++;
        }
      }

      // 超過中
      if (status.isOverdue) {
        overdueCount++;
      }
    });

    // 達成率計算
    const responseMetRate = responseEvaluatedCount > 0 ? (responseMetCount / responseEvaluatedCount) * 100 : 0;
    const resolutionMetRate = resolutionEvaluatedCount > 0 ? (resolutionMetCount / resolutionEvaluatedCount) * 100 : 0;
    const overdueRate = total > 0 ? (overdueCount / total) * 100 : 0;

    // 優先度別達成率計算
    const byPriorityResult: Record<
      PriorityLevel,
      {
        total: number;
        responseMetCount: number;
        responseMetRate: number;
        resolutionMetCount: number;
        resolutionMetRate: number;
      }
    > = {
      [PriorityLevel.P1]: {
        total: byPriority.P1.total,
        responseMetCount: byPriority.P1.responseMetCount,
        responseMetRate:
          byPriority.P1.responseEvaluatedCount > 0
            ? (byPriority.P1.responseMetCount / byPriority.P1.responseEvaluatedCount) * 100
            : 0,
        resolutionMetCount: byPriority.P1.resolutionMetCount,
        resolutionMetRate:
          byPriority.P1.resolutionEvaluatedCount > 0
            ? (byPriority.P1.resolutionMetCount / byPriority.P1.resolutionEvaluatedCount) * 100
            : 0,
      },
      [PriorityLevel.P2]: {
        total: byPriority.P2.total,
        responseMetCount: byPriority.P2.responseMetCount,
        responseMetRate:
          byPriority.P2.responseEvaluatedCount > 0
            ? (byPriority.P2.responseMetCount / byPriority.P2.responseEvaluatedCount) * 100
            : 0,
        resolutionMetCount: byPriority.P2.resolutionMetCount,
        resolutionMetRate:
          byPriority.P2.resolutionEvaluatedCount > 0
            ? (byPriority.P2.resolutionMetCount / byPriority.P2.resolutionEvaluatedCount) * 100
            : 0,
      },
      [PriorityLevel.P3]: {
        total: byPriority.P3.total,
        responseMetCount: byPriority.P3.responseMetCount,
        responseMetRate:
          byPriority.P3.responseEvaluatedCount > 0
            ? (byPriority.P3.responseMetCount / byPriority.P3.responseEvaluatedCount) * 100
            : 0,
        resolutionMetCount: byPriority.P3.resolutionMetCount,
        resolutionMetRate:
          byPriority.P3.resolutionEvaluatedCount > 0
            ? (byPriority.P3.resolutionMetCount / byPriority.P3.resolutionEvaluatedCount) * 100
            : 0,
      },
      [PriorityLevel.P4]: {
        total: byPriority.P4.total,
        responseMetCount: byPriority.P4.responseMetCount,
        responseMetRate:
          byPriority.P4.responseEvaluatedCount > 0
            ? (byPriority.P4.responseMetCount / byPriority.P4.responseEvaluatedCount) * 100
            : 0,
        resolutionMetCount: byPriority.P4.resolutionMetCount,
        resolutionMetRate:
          byPriority.P4.resolutionEvaluatedCount > 0
            ? (byPriority.P4.resolutionMetCount / byPriority.P4.resolutionEvaluatedCount) * 100
            : 0,
      },
    };

    return {
      total,
      responseMetCount,
      responseMetRate: Math.round(responseMetRate * 100) / 100,
      resolutionMetCount,
      resolutionMetRate: Math.round(resolutionMetRate * 100) / 100,
      overdueCount,
      overdueRate: Math.round(overdueRate * 100) / 100,
      byPriority: byPriorityResult,
    };
  }

  /**
   * SLAポリシー定義を取得
   *
   * @param priority 優先度
   * @returns SLAポリシー定義
   */
  static getSLAPolicy(priority: PriorityLevel): SLADefinition {
    return SLA_POLICIES[priority];
  }

  /**
   * すべてのSLAポリシー定義を取得
   */
  static getAllSLAPolicies(): Record<PriorityLevel, SLADefinition> {
    return { ...SLA_POLICIES };
  }
}
