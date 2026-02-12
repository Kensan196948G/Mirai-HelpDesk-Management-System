import { VectorSearchService } from '../../../src/services/vector-search.service';

// モック設定
const mockGenerateEmbedding = jest.fn();
const mockQuery = jest.fn();

jest.mock('../../../src/services/embedding.service', () => ({
  EmbeddingService: {
    generateEmbedding: mockGenerateEmbedding,
  },
}));

jest.mock('../../../src/config/database', () => ({
  query: mockQuery,
}));

jest.mock('../../../src/utils/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('VectorSearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateTicketEmbedding', () => {
    it('チケットの埋め込みを生成してDBに保存', async () => {
      const mockVector = Array(768).fill(0.5);
      mockGenerateEmbedding.mockResolvedValue(mockVector);
      mockQuery.mockResolvedValue({ rows: [] });

      await VectorSearchService.generateTicketEmbedding(
        'ticket-001',
        'テスト件名',
        'テスト説明文'
      );

      expect(mockGenerateEmbedding).toHaveBeenCalledTimes(3); // subject, description, combined
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO ticket_embeddings'),
        expect.arrayContaining(['ticket-001', 'gemini-text-embedding-004'])
      );
    });

    it('説明が6000文字を超える場合は切り詰める', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      const longDesc = 'あ'.repeat(7000);
      await VectorSearchService.generateTicketEmbedding('t1', '件名', longDesc);

      expect(mockGenerateEmbedding).toHaveBeenCalledWith(
        'あ'.repeat(6000),
        expect.any(Object)
      );
    });

    it('説明がnullまたは空の場合も処理可能', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      await VectorSearchService.generateTicketEmbedding('t1', '件名', '');

      expect(mockGenerateEmbedding).toHaveBeenCalled();
    });

    it('埋め込み生成失敗時もエラーをスローしない（警告ログのみ）', async () => {
      mockGenerateEmbedding.mockRejectedValue(new Error('API Error'));

      await expect(
        VectorSearchService.generateTicketEmbedding('t1', '件名', '説明')
      ).resolves.not.toThrow();
    });

    it('DB挿入失敗時もエラーをスローしない', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockRejectedValue(new Error('DB Error'));

      await expect(
        VectorSearchService.generateTicketEmbedding('t1', '件名', '説明')
      ).resolves.not.toThrow();
    });

    it('ON CONFLICTでUPSERTが実行される', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      await VectorSearchService.generateTicketEmbedding('t1', '件名', '説明');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('ON CONFLICT'),
        expect.any(Array)
      );
    });

    it('件名のみでも埋め込み生成可能', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      await VectorSearchService.generateTicketEmbedding('t1', '件名のみ', '');

      expect(mockGenerateEmbedding).toHaveBeenCalledTimes(3);
    });
  });

  describe('findSimilarTickets', () => {
    const mockTickets = [
      {
        ticket_id: 't1',
        ticket_number: 'INC-0001',
        subject: 'メール障害',
        description_summary: '概要...',
        status: 'resolved',
        priority: 'P2',
        category_name: 'Email',
        similarity_score: '0.8523',
        created_at: '2025-01-01',
      },
    ];

    it('類似チケット検索を実行', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0.5));
      mockQuery.mockResolvedValue({ rows: mockTickets });

      const result = await VectorSearchService.findSimilarTickets('メール送信エラー');

      expect(result).toEqual([
        {
          ticket_id: 't1',
          ticket_number: 'INC-0001',
          subject: 'メール障害',
          description_summary: '概要...',
          status: 'resolved',
          priority: 'P2',
          category_name: 'Email',
          similarity_score: 0.8523,
          created_at: '2025-01-01',
        },
      ]);
    });

    it('limitオプションが機能する', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      await VectorSearchService.findSimilarTickets('query', { limit: 10 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([10])
      );
    });

    it('thresholdオプションが機能する', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      await VectorSearchService.findSimilarTickets('query', { threshold: 0.5 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([0.5])
      );
    });

    it('statusFilterオプションが機能する', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      await VectorSearchService.findSimilarTickets('query', {
        statusFilter: ['resolved', 'closed'],
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND t.status = ANY'),
        expect.arrayContaining([['resolved', 'closed']])
      );
    });

    it('excludeTicketIdオプションが機能する', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      await VectorSearchService.findSimilarTickets('query', {
        excludeTicketId: 'ticket-999',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND t.ticket_id !='),
        expect.arrayContaining(['ticket-999'])
      );
    });

    it('結果が0件の場合は空配列', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await VectorSearchService.findSimilarTickets('query');

      expect(result).toEqual([]);
    });

    it('埋め込み生成失敗時は例外をスロー', async () => {
      mockGenerateEmbedding.mockRejectedValue(new Error('API Error'));

      await expect(
        VectorSearchService.findSimilarTickets('query')
      ).rejects.toThrow('API Error');
    });

    it('複数オプション組み合わせ', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      await VectorSearchService.findSimilarTickets('query', {
        limit: 3,
        threshold: 0.7,
        statusFilter: ['resolved'],
        excludeTicketId: 't1',
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND t.status = ANY'),
        expect.any(Array)
      );
    });

    it('similarity_scoreが正しく丸められる', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({
        rows: [{ ...mockTickets[0], similarity_score: '0.123456789' }],
      });

      const result = await VectorSearchService.findSimilarTickets('query');

      expect(result[0].similarity_score).toBe(0.1235);
    });
  });

  describe('searchKnowledgeArticles', () => {
    const mockArticles = [
      {
        article_id: 'a1',
        title: 'FAQ記事',
        summary: '概要...',
        category: 'FAQ',
        tags: ['タグ1', 'タグ2'],
        view_count: '10',
        similarity_score: '0.9123',
      },
    ];

    it('ナレッジ記事のセマンティック検索', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0.5));
      mockQuery.mockResolvedValue({ rows: mockArticles });

      const result = await VectorSearchService.searchKnowledgeArticles('検索クエリ');

      expect(result).toEqual([
        {
          article_id: 'a1',
          title: 'FAQ記事',
          summary: '概要...',
          category: 'FAQ',
          tags: ['タグ1', 'タグ2'],
          view_count: 10,
          similarity_score: 0.9123,
        },
      ]);
    });

    it('limitオプションが機能する', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      await VectorSearchService.searchKnowledgeArticles('query', { limit: 10 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([10])
      );
    });

    it('thresholdオプションが機能する', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      await VectorSearchService.searchKnowledgeArticles('query', { threshold: 0.6 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([0.6])
      );
    });

    it('tagsがnullの場合は空配列', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({
        rows: [{ ...mockArticles[0], tags: null }],
      });

      const result = await VectorSearchService.searchKnowledgeArticles('query');

      expect(result[0].tags).toEqual([]);
    });

    it('tagsが文字列の場合も空配列', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({
        rows: [{ ...mockArticles[0], tags: 'invalid' }],
      });

      const result = await VectorSearchService.searchKnowledgeArticles('query');

      expect(result[0].tags).toEqual([]);
    });

    it('view_countがnullの場合は0', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({
        rows: [{ ...mockArticles[0], view_count: null }],
      });

      const result = await VectorSearchService.searchKnowledgeArticles('query');

      expect(result[0].view_count).toBe(0);
    });

    it('結果が0件の場合は空配列', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await VectorSearchService.searchKnowledgeArticles('query');

      expect(result).toEqual([]);
    });
  });

  describe('unifiedSearch', () => {
    it('チケット+ナレッジ記事を並列検索', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0.5));
      mockQuery
        .mockResolvedValueOnce({ rows: [] }) // tickets
        .mockResolvedValueOnce({ rows: [] }); // knowledge

      const result = await VectorSearchService.unifiedSearch('検索');

      expect(result).toEqual({
        tickets: [],
        knowledge_articles: [],
        processing_time_ms: expect.any(Number),
      });
    });

    it('処理時間が測定される', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await VectorSearchService.unifiedSearch('query');

      expect(result.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(result.processing_time_ms).toBeLessThan(1000);
    });

    it('ticketLimitオプションが機能する', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      await VectorSearchService.unifiedSearch('query', { ticketLimit: 10 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([10])
      );
    });

    it('articleLimitオプションが機能する', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      await VectorSearchService.unifiedSearch('query', { articleLimit: 8 });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([8])
      );
    });

    it('ticketStatusFilterオプションが機能する', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      await VectorSearchService.unifiedSearch('query', {
        ticketStatusFilter: ['resolved'],
      });

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('AND t.status = ANY'),
        expect.any(Array)
      );
    });

    it('チケット検索失敗時は例外をスロー', async () => {
      mockGenerateEmbedding.mockRejectedValue(new Error('API Error'));

      await expect(
        VectorSearchService.unifiedSearch('query')
      ).rejects.toThrow('API Error');
    });
  });

  describe('reindexAllTickets', () => {
    it('全チケットの埋め込みを一括生成', async () => {
      const mockTickets = [
        { ticket_id: 't1', subject: 'S1', description: 'D1' },
        { ticket_id: 't2', subject: 'S2', description: 'D2' },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockTickets }) // SELECT
        .mockResolvedValue({ rows: [] }); // INSERT x2

      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));

      const result = await VectorSearchService.reindexAllTickets();

      expect(result).toEqual({
        total: 2,
        success: 2,
        failed: 0,
        errors: [],
      });
    });

    it('一部失敗の場合もエラー情報を返す', async () => {
      const mockTickets = [
        { ticket_id: 't1', subject: 'S1', description: 'D1' },
        { ticket_id: 't2', subject: 'S2', description: 'D2' },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockTickets });
      mockGenerateEmbedding
        .mockResolvedValueOnce(Array(768).fill(0)) // t1成功
        .mockRejectedValueOnce(new Error('API Error')); // t2失敗

      const result = await VectorSearchService.reindexAllTickets();

      expect(result).toEqual({
        total: 2,
        success: 1,
        failed: 1,
        errors: [{ ticketId: 't2', error: 'API Error' }],
      });
    });

    it('チケットが0件の場合', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await VectorSearchService.reindexAllTickets();

      expect(result).toEqual({
        total: 0,
        success: 0,
        failed: 0,
        errors: [],
      });
    });

    it('レート制限対策で150ms待機する', async () => {
      const mockTickets = [
        { ticket_id: 't1', subject: 'S1', description: 'D1' },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockTickets })
        .mockResolvedValue({ rows: [] });

      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));

      const startTime = Date.now();
      await VectorSearchService.reindexAllTickets();
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(150);
    });

    it('descriptionがnullでも処理可能', async () => {
      const mockTickets = [
        { ticket_id: 't1', subject: 'S1', description: null },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockTickets })
        .mockResolvedValue({ rows: [] });

      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));

      const result = await VectorSearchService.reindexAllTickets();

      expect(result.success).toBe(1);
    });
  });
});
