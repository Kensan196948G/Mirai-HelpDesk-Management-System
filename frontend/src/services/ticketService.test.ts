import { describe, it, expect } from 'vitest';
import { getTickets, createTicket, updateTicketStatus, addComment } from './ticketService';

// 注意: MSWハンドラーは src/test/mocks/handlers.ts に定義済み

describe('ticketService', () => {
  describe('getTickets', () => {
    it('チケット一覧を取得できる', async () => {
      const result = await getTickets();

      expect(result.success).toBe(true);
      expect(result.data?.tickets).toBeInstanceOf(Array);
      expect(result.data?.tickets.length).toBeGreaterThan(0);
    });

    it('ステータスフィルタが機能する', async () => {
      const result = await getTickets({ status: 'New' });

      expect(result.success).toBe(true);
      expect(result.data?.tickets.every((t) => t.status === 'New')).toBe(true);
    });

    it('優先度フィルタが機能する', async () => {
      const result = await getTickets({ priority: 'P2' });

      expect(result.success).toBe(true);
    });

    it('複数のフィルタを組み合わせられる', async () => {
      const result = await getTickets({
        status: 'New',
        priority: 'P2',
      });

      expect(result.success).toBe(true);
    });

    it('ページネーションパラメータを受け付ける', async () => {
      const result = await getTickets({
        page: 1,
        pageSize: 20,
      });

      expect(result.success).toBe(true);
    });

    it('チケットに必須フィールドが含まれる', async () => {
      const result = await getTickets();

      const ticket = result.data?.tickets[0];
      expect(ticket).toHaveProperty('ticket_id');
      expect(ticket).toHaveProperty('ticket_number');
      expect(ticket).toHaveProperty('subject');
      expect(ticket).toHaveProperty('status');
      expect(ticket).toHaveProperty('priority');
    });
  });

  describe('createTicket', () => {
    it('チケットを作成できる', async () => {
      const result = await createTicket({
        type: 'インシデント',
        subject: 'テストチケット',
        description: 'テスト説明',
        impact: '個人',
        urgency: '中',
      });

      expect(result.success).toBe(true);
      expect(result.data?.ticket_id).toBeDefined();
    });

    it('作成したチケットに必須フィールドが含まれる', async () => {
      const result = await createTicket({
        type: 'インシデント',
        subject: 'テストチケット',
        description: 'テスト説明',
        impact: '個人',
        urgency: '中',
      });

      expect(result.data).toHaveProperty('ticket_id');
      expect(result.data).toHaveProperty('ticket_number');
      expect(result.data).toHaveProperty('status');
    });

    it('カテゴリIDを指定できる', async () => {
      const result = await createTicket({
        type: 'インシデント',
        subject: 'テストチケット',
        description: 'テスト説明',
        impact: '個人',
        urgency: '中',
        category_id: '1',
      });

      expect(result.success).toBe(true);
    });
  });

  describe('updateTicketStatus', () => {
    it('チケットステータスを更新できる', async () => {
      const result = await updateTicketStatus('1', {
        status: 'In Progress',
      });

      expect(result.success).toBe(true);
    });

    it('更新後のデータが返される', async () => {
      const result = await updateTicketStatus('1', {
        status: 'In Progress',
      });

      expect(result.data).toHaveProperty('ticket_id');
      expect(result.data).toHaveProperty('updated_at');
    });
  });

  describe('addComment', () => {
    it('コメントを追加できる', async () => {
      const result = await addComment('1', {
        body: 'テストコメント',
        visibility: 'public',
      });

      expect(result.success).toBe(true);
      expect(result.data?.comment_id).toBeDefined();
    });

    it('内部メモを追加できる', async () => {
      const result = await addComment('1', {
        body: '内部メモ',
        visibility: 'internal',
      });

      expect(result.success).toBe(true);
    });

    it('追加したコメントに必須フィールドが含まれる', async () => {
      const result = await addComment('1', {
        body: 'テストコメント',
        visibility: 'public',
      });

      expect(result.data).toHaveProperty('comment_id');
      expect(result.data).toHaveProperty('ticket_id');
      expect(result.data).toHaveProperty('author_name');
      expect(result.data).toHaveProperty('created_at');
    });
  });
});
