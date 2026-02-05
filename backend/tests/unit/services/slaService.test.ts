import { SLAService } from '../../../src/services/sla.service';
import { PriorityLevel, TicketStatus, Ticket } from '../../../src/types';

// テスト用チケットファクトリ
function createMockTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    ticket_id: 'ticket-001',
    ticket_number: 'INC-0001',
    type: 'incident' as any,
    subject: 'テスト用チケット',
    description: 'テスト用の説明',
    status: TicketStatus.IN_PROGRESS,
    priority: PriorityLevel.P3,
    impact: '個人' as any,
    urgency: '中' as any,
    requester_id: 'user-001',
    created_at: new Date('2025-06-02T10:00:00'), // 月曜日 10:00
    updated_at: new Date('2025-06-02T10:00:00'),
    ...overrides,
  };
}

describe('SLAService', () => {
  describe('getSLAPolicy', () => {
    it('P1 ポリシーを正しく返す（初動15分/解決120分/24時間体制）', () => {
      const policy = SLAService.getSLAPolicy(PriorityLevel.P1);
      expect(policy.responseMinutes).toBe(15);
      expect(policy.resolutionMinutes).toBe(120);
      expect(policy.businessHoursOnly).toBe(false);
    });

    it('P2 ポリシーを正しく返す（初動60分/解決480分/営業時間）', () => {
      const policy = SLAService.getSLAPolicy(PriorityLevel.P2);
      expect(policy.responseMinutes).toBe(60);
      expect(policy.resolutionMinutes).toBe(480);
      expect(policy.businessHoursOnly).toBe(true);
    });

    it('P3 ポリシーを正しく返す（初動240分/解決4320分/営業時間）', () => {
      const policy = SLAService.getSLAPolicy(PriorityLevel.P3);
      expect(policy.responseMinutes).toBe(240);
      expect(policy.resolutionMinutes).toBe(4320);
      expect(policy.businessHoursOnly).toBe(true);
    });

    it('P4 ポリシーを正しく返す（初動1440分/解決7200分/営業時間）', () => {
      const policy = SLAService.getSLAPolicy(PriorityLevel.P4);
      expect(policy.responseMinutes).toBe(1440);
      expect(policy.resolutionMinutes).toBe(7200);
      expect(policy.businessHoursOnly).toBe(true);
    });
  });

  describe('getAllSLAPolicies', () => {
    it('全4種類のポリシーを返す', () => {
      const policies = SLAService.getAllSLAPolicies();
      expect(Object.keys(policies)).toHaveLength(4);
      expect(policies).toHaveProperty(PriorityLevel.P1);
      expect(policies).toHaveProperty(PriorityLevel.P2);
      expect(policies).toHaveProperty(PriorityLevel.P3);
      expect(policies).toHaveProperty(PriorityLevel.P4);
    });

    it('元のポリシーオブジェクトのコピーを返す（イミュータブル）', () => {
      const policies1 = SLAService.getAllSLAPolicies();
      const policies2 = SLAService.getAllSLAPolicies();
      expect(policies1).not.toBe(policies2);
    });
  });

  describe('calculateDueDates', () => {
    describe('P1（24時間体制）', () => {
      it('営業時間内: 初動15分後・解決2時間後を正しく計算', () => {
        const createdAt = new Date('2025-06-02T10:00:00'); // 月曜10:00
        const result = SLAService.calculateDueDates(PriorityLevel.P1, createdAt);

        expect(result.response_due_at).toEqual(new Date('2025-06-02T10:15:00'));
        expect(result.due_at).toEqual(new Date('2025-06-02T12:00:00'));
      });

      it('深夜: 24時間体制のため暦通りに加算', () => {
        const createdAt = new Date('2025-06-02T23:00:00'); // 月曜23:00
        const result = SLAService.calculateDueDates(PriorityLevel.P1, createdAt);

        expect(result.response_due_at).toEqual(new Date('2025-06-02T23:15:00'));
        expect(result.due_at).toEqual(new Date('2025-06-03T01:00:00'));
      });

      it('週末: 24時間体制のため暦通りに加算', () => {
        const createdAt = new Date('2025-06-07T14:00:00'); // 土曜14:00
        const result = SLAService.calculateDueDates(PriorityLevel.P1, createdAt);

        expect(result.response_due_at).toEqual(new Date('2025-06-07T14:15:00'));
        expect(result.due_at).toEqual(new Date('2025-06-07T16:00:00'));
      });
    });

    describe('P2（営業時間のみ）', () => {
      it('営業時間内で完結する場合', () => {
        const createdAt = new Date('2025-06-02T10:00:00'); // 月曜10:00
        const result = SLAService.calculateDueDates(PriorityLevel.P2, createdAt);

        // 初動: 10:00 + 1時間 = 11:00
        expect(result.response_due_at).toEqual(new Date('2025-06-02T11:00:00'));
        // 解決: 10:00 + 8時間 = 18:00 (営業時間終了)
        expect(result.due_at).toEqual(new Date('2025-06-02T18:00:00'));
      });

      it('営業時間を跨ぐ場合は翌営業日に繰り越し', () => {
        const createdAt = new Date('2025-06-02T17:30:00'); // 月曜17:30
        const result = SLAService.calculateDueDates(PriorityLevel.P2, createdAt);

        // 初動: 17:30 + 1時間 → 当日は30分のみ → 翌日09:30
        expect(result.response_due_at).toEqual(new Date('2025-06-03T09:30:00'));
      });
    });

    describe('P3（営業時間のみ）', () => {
      it('初動4時間・解決72時間（3営業日相当）を計算', () => {
        const createdAt = new Date('2025-06-02T10:00:00'); // 月曜10:00
        const result = SLAService.calculateDueDates(PriorityLevel.P3, createdAt);

        // 初動: 10:00 + 4時間 = 14:00
        expect(result.response_due_at).toEqual(new Date('2025-06-02T14:00:00'));
        // 解決: 72営業時間 = 8営業日（9時間/日）
        // 月10:00 → 当日8h → 火9h → 水9h → 木9h → 金9h → 月9h → 火9h → 水9h+1h(残1h) → 水10:00
        // 72h / 9h/day = 8日 → 月(8h)+火(9h)+水(9h)+木(9h)+金(9h) = 44h, 残28h
        // 来週月(9h)+火(9h)+水(9h) = 27h, 残1h → 水(1h) = 10:00
        // 合計: 6/2(月)8h + 6/3(火)9h=17 + 6/4(水)9h=26 + 6/5(木)9h=35 + 6/6(金)9h=44
        //       + 6/9(月)9h=53 + 6/10(火)9h=62 + 6/11(水)9h=71 + 6/12(木)1h=72
        expect(result.due_at).toEqual(new Date('2025-06-12T10:00:00'));
      });
    });

    it('未定義の優先度でエラーをスロー', () => {
      expect(() => {
        SLAService.calculateDueDates('P5' as any, new Date());
      }).toThrow('未定義の優先度');
    });
  });

  describe('isOverdue', () => {
    it('クローズ済みチケットは超過扱いしない', () => {
      const ticket = createMockTicket({
        status: TicketStatus.CLOSED,
        due_at: new Date('2020-01-01'), // 過去の期限
      });
      expect(SLAService.isOverdue(ticket)).toBe(false);
    });

    it('キャンセル済みチケットは超過扱いしない', () => {
      const ticket = createMockTicket({
        status: TicketStatus.CANCELED,
        due_at: new Date('2020-01-01'),
      });
      expect(SLAService.isOverdue(ticket)).toBe(false);
    });

    it('解決期限を超過した未解決チケットはtrue', () => {
      const ticket = createMockTicket({
        status: TicketStatus.IN_PROGRESS,
        due_at: new Date('2020-01-01'), // 過去の期限
        assigned_at: new Date('2020-01-01'),
      });
      expect(SLAService.isOverdue(ticket)).toBe(true);
    });

    it('初動対応期限を超過した未割当チケットはtrue', () => {
      const ticket = createMockTicket({
        status: TicketStatus.NEW,
        response_due_at: new Date('2020-01-01'), // 過去の期限
        assigned_at: undefined,
      });
      expect(SLAService.isOverdue(ticket)).toBe(true);
    });

    it('期限内のチケットはfalse', () => {
      const ticket = createMockTicket({
        status: TicketStatus.IN_PROGRESS,
        due_at: new Date('2099-12-31'),
        response_due_at: new Date('2099-12-31'),
        assigned_at: new Date(),
      });
      expect(SLAService.isOverdue(ticket)).toBe(false);
    });

    it('解決済みでも初動対応期限超過の場合はtrue', () => {
      const ticket = createMockTicket({
        status: TicketStatus.RESOLVED,
        response_due_at: new Date('2020-01-01'), // 過去
        assigned_at: undefined, // 未割当のまま解決
      });
      expect(SLAService.isOverdue(ticket)).toBe(true);
    });

    it('解決済みで初動対応期限内の場合はfalse', () => {
      const ticket = createMockTicket({
        status: TicketStatus.RESOLVED,
        response_due_at: new Date('2099-12-31'),
        assigned_at: new Date(),
      });
      expect(SLAService.isOverdue(ticket)).toBe(false);
    });

    it('期限が設定されていないチケットはfalse', () => {
      const ticket = createMockTicket({
        status: TicketStatus.IN_PROGRESS,
        due_at: undefined,
        response_due_at: undefined,
      });
      expect(SLAService.isOverdue(ticket)).toBe(false);
    });
  });

  describe('getSLAStatus', () => {
    it('割当済み＆期限内: responseMetSLA = true', () => {
      const ticket = createMockTicket({
        assigned_at: new Date('2025-06-02T10:30:00'),
        response_due_at: new Date('2025-06-02T14:00:00'),
        due_at: new Date('2099-12-31'),
      });
      const status = SLAService.getSLAStatus(ticket);
      expect(status.responseMetSLA).toBe(true);
    });

    it('割当済み＆期限超過: responseMetSLA = false', () => {
      const ticket = createMockTicket({
        assigned_at: new Date('2025-06-02T15:00:00'),
        response_due_at: new Date('2025-06-02T14:00:00'),
        due_at: new Date('2099-12-31'),
      });
      const status = SLAService.getSLAStatus(ticket);
      expect(status.responseMetSLA).toBe(false);
    });

    it('未割当: responseMetSLA = null', () => {
      const ticket = createMockTicket({
        assigned_at: undefined,
        response_due_at: new Date('2099-12-31'),
        due_at: new Date('2099-12-31'),
      });
      const status = SLAService.getSLAStatus(ticket);
      expect(status.responseMetSLA).toBeNull();
    });

    it('解決済み＆期限内: resolutionMetSLA = true', () => {
      const ticket = createMockTicket({
        status: TicketStatus.RESOLVED,
        resolved_at: new Date('2025-06-02T16:00:00'),
        due_at: new Date('2025-06-05T18:00:00'),
        assigned_at: new Date('2025-06-02T10:30:00'),
        response_due_at: new Date('2025-06-02T14:00:00'),
      });
      const status = SLAService.getSLAStatus(ticket);
      expect(status.resolutionMetSLA).toBe(true);
    });

    it('解決済み＆期限超過: resolutionMetSLA = false', () => {
      const ticket = createMockTicket({
        status: TicketStatus.RESOLVED,
        resolved_at: new Date('2025-06-10T16:00:00'),
        due_at: new Date('2025-06-05T18:00:00'),
        assigned_at: new Date('2025-06-02T10:30:00'),
        response_due_at: new Date('2025-06-02T14:00:00'),
      });
      const status = SLAService.getSLAStatus(ticket);
      expect(status.resolutionMetSLA).toBe(false);
    });

    it('未解決: resolutionMetSLA = null', () => {
      const ticket = createMockTicket({
        resolved_at: undefined,
        due_at: new Date('2025-06-05T18:00:00'),
      });
      const status = SLAService.getSLAStatus(ticket);
      expect(status.resolutionMetSLA).toBeNull();
    });
  });

  describe('calculateSLAMetrics', () => {
    it('空配列の場合、ゼロを返す', () => {
      const metrics = SLAService.calculateSLAMetrics([]);
      expect(metrics.total).toBe(0);
      expect(metrics.responseMetCount).toBe(0);
      expect(metrics.responseMetRate).toBe(0);
      expect(metrics.resolutionMetCount).toBe(0);
      expect(metrics.resolutionMetRate).toBe(0);
      expect(metrics.overdueCount).toBe(0);
      expect(metrics.overdueRate).toBe(0);
    });

    it('複数チケットのSLA達成率を正しく計算', () => {
      const tickets: Ticket[] = [
        // P1: 初動達成、解決達成
        createMockTicket({
          priority: PriorityLevel.P1,
          status: TicketStatus.RESOLVED,
          assigned_at: new Date('2025-06-02T10:10:00'),
          response_due_at: new Date('2025-06-02T10:15:00'),
          resolved_at: new Date('2025-06-02T11:00:00'),
          due_at: new Date('2025-06-02T12:00:00'),
        }),
        // P2: 初動未達成、解決達成
        createMockTicket({
          priority: PriorityLevel.P2,
          status: TicketStatus.RESOLVED,
          assigned_at: new Date('2025-06-02T12:00:00'),
          response_due_at: new Date('2025-06-02T11:00:00'),
          resolved_at: new Date('2025-06-02T16:00:00'),
          due_at: new Date('2025-06-02T18:00:00'),
        }),
        // P3: 未割当（初動null）、未解決（解決null）、超過中
        createMockTicket({
          priority: PriorityLevel.P3,
          status: TicketStatus.IN_PROGRESS,
          assigned_at: undefined,
          response_due_at: new Date('2020-01-01'),
          resolved_at: undefined,
          due_at: new Date('2020-01-01'),
        }),
      ];

      const metrics = SLAService.calculateSLAMetrics(tickets);

      expect(metrics.total).toBe(3);
      // 初動: 2件評価可能（P1達成、P2未達成）→ 1/2 = 50%
      expect(metrics.responseMetCount).toBe(1);
      expect(metrics.responseMetRate).toBe(50);
      // 解決: 2件評価可能（P1達成、P2達成）→ 2/2 = 100%
      expect(metrics.resolutionMetCount).toBe(2);
      expect(metrics.resolutionMetRate).toBe(100);
      // 超過: P3が超過中 → 1/3
      expect(metrics.overdueCount).toBe(1);
    });

    it('優先度別の集計が正しい', () => {
      const tickets: Ticket[] = [
        createMockTicket({
          priority: PriorityLevel.P1,
          status: TicketStatus.RESOLVED,
          assigned_at: new Date('2025-06-02T10:10:00'),
          response_due_at: new Date('2025-06-02T10:15:00'),
          resolved_at: new Date('2025-06-02T11:00:00'),
          due_at: new Date('2025-06-02T12:00:00'),
        }),
        createMockTicket({
          priority: PriorityLevel.P1,
          status: TicketStatus.RESOLVED,
          assigned_at: new Date('2025-06-02T10:20:00'),
          response_due_at: new Date('2025-06-02T10:15:00'),
          resolved_at: new Date('2025-06-02T11:30:00'),
          due_at: new Date('2025-06-02T12:00:00'),
        }),
      ];

      const metrics = SLAService.calculateSLAMetrics(tickets);

      expect(metrics.byPriority[PriorityLevel.P1].total).toBe(2);
      expect(metrics.byPriority[PriorityLevel.P1].responseMetCount).toBe(1);
      expect(metrics.byPriority[PriorityLevel.P1].responseMetRate).toBe(50);
      expect(metrics.byPriority[PriorityLevel.P1].resolutionMetCount).toBe(2);
      expect(metrics.byPriority[PriorityLevel.P1].resolutionMetRate).toBe(100);
      expect(metrics.byPriority[PriorityLevel.P2].total).toBe(0);
    });
  });
});
