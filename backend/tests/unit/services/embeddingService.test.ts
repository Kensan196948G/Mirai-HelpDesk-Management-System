import { EmbeddingService } from '../../../src/services/embedding.service';

// モック設定
const mockGenerateEmbedding = jest.fn();
const mockQuery = jest.fn();

jest.mock('../../../src/services/gemini-api.client', () => ({
  getGeminiAPIClient: () => ({
    generateEmbedding: mockGenerateEmbedding,
  }),
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

describe('EmbeddingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateEmbedding', () => {
    it('テキストから埋め込みベクトルを生成', async () => {
      const mockVector = Array(768).fill(0).map(() => Math.random());
      mockGenerateEmbedding.mockResolvedValue(mockVector);

      const result = await EmbeddingService.generateEmbedding('テスト文章');

      expect(mockGenerateEmbedding).toHaveBeenCalledWith(
        'テスト文章',
        expect.objectContaining({
          cacheKey: expect.any(String),
          cacheTTL: 86400 * 7,
        })
      );
      expect(result).toEqual(mockVector);
      expect(result).toHaveLength(768);
    });

    it('8000文字を超えるテキストは切り詰められる', async () => {
      const longText = 'あ'.repeat(10000);
      mockGenerateEmbedding.mockResolvedValue([]);

      await EmbeddingService.generateEmbedding(longText);

      expect(mockGenerateEmbedding).toHaveBeenCalledWith(
        'あ'.repeat(8000),
        expect.any(Object)
      );
    });

    it('空文字列でも埋め込み生成可能', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));

      const result = await EmbeddingService.generateEmbedding('');

      expect(result).toHaveLength(768);
    });

    it('特殊文字を含むテキストを処理', async () => {
      const specialText = '!@#$%^&*()_+-=[]{}|;:",.<>?/~`';
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));

      await EmbeddingService.generateEmbedding(specialText);

      expect(mockGenerateEmbedding).toHaveBeenCalledWith(
        specialText,
        expect.any(Object)
      );
    });

    it('日本語・英語・数字混在テキストを処理', async () => {
      const mixedText = 'Test テスト 123 @example.com';
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));

      await EmbeddingService.generateEmbedding(mixedText);

      expect(mockGenerateEmbedding).toHaveBeenCalled();
    });

    it('APIエラー時は例外をスロー', async () => {
      mockGenerateEmbedding.mockRejectedValue(new Error('API Error'));

      await expect(
        EmbeddingService.generateEmbedding('test')
      ).rejects.toThrow('API Error');
    });

    it('タイムアウトエラーを処理', async () => {
      mockGenerateEmbedding.mockRejectedValue(new Error('Request timeout'));

      await expect(
        EmbeddingService.generateEmbedding('test')
      ).rejects.toThrow('Request timeout');
    });

    it('レート制限エラーを処理', async () => {
      mockGenerateEmbedding.mockRejectedValue(new Error('Rate limit exceeded'));

      await expect(
        EmbeddingService.generateEmbedding('test')
      ).rejects.toThrow('Rate limit exceeded');
    });

    it('キャッシュキーが正しく生成される', async () => {
      mockGenerateEmbedding.mockResolvedValue([]);

      await EmbeddingService.generateEmbedding('test');

      const call = mockGenerateEmbedding.mock.calls[0];
      expect(call[1].cacheKey).toMatch(/^embedding:/);
      expect(call[1].cacheTTL).toBe(86400 * 7);
    });

    it('改行を含むテキストを処理', async () => {
      const multilineText = 'Line 1\nLine 2\nLine 3';
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));

      await EmbeddingService.generateEmbedding(multilineText);

      expect(mockGenerateEmbedding).toHaveBeenCalledWith(
        multilineText,
        expect.any(Object)
      );
    });
  });

  describe('updateArticleEmbedding', () => {
    const mockArticle = {
      article_id: 'article-001',
      title: 'テスト記事',
      body: '記事の本文',
      tags: ['タグ1', 'タグ2'],
    };

    it('記事の埋め込みを更新', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockArticle] }) // SELECT
        .mockResolvedValueOnce({ rows: [] }); // UPDATE

      const mockVector = Array(768).fill(0.5);
      mockGenerateEmbedding.mockResolvedValue(mockVector);

      await EmbeddingService.updateArticleEmbedding('article-001');

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('SELECT article_id'),
        ['article-001']
      );
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE knowledge_articles'),
        [expect.stringContaining('[0.5,'), 'article-001']
      );
    });

    it('存在しない記事IDでエラー', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      await expect(
        EmbeddingService.updateArticleEmbedding('nonexistent')
      ).rejects.toThrow('Article not found');
    });

    it('タグなしの記事を処理', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockArticle, tags: null }],
      }).mockResolvedValueOnce({ rows: [] });

      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));

      await EmbeddingService.updateArticleEmbedding('article-001');

      expect(mockGenerateEmbedding).toHaveBeenCalledWith(
        expect.not.stringContaining('Tags:'),
        expect.any(Object)
      );
    });

    it('空配列タグを処理', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ ...mockArticle, tags: [] }],
      }).mockResolvedValueOnce({ rows: [] });

      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));

      await EmbeddingService.updateArticleEmbedding('article-001');

      expect(mockGenerateEmbedding).toHaveBeenCalled();
    });

    it('DBエラー時は例外をスロー', async () => {
      mockQuery.mockRejectedValue(new Error('DB Error'));

      await expect(
        EmbeddingService.updateArticleEmbedding('article-001')
      ).rejects.toThrow('DB Error');
    });

    it('埋め込み生成失敗時は例外をスロー', async () => {
      mockQuery.mockResolvedValue({ rows: [mockArticle] });
      mockGenerateEmbedding.mockRejectedValue(new Error('Embedding failed'));

      await expect(
        EmbeddingService.updateArticleEmbedding('article-001')
      ).rejects.toThrow('Embedding failed');
    });

    it('UPDATE失敗時は例外をスロー', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [mockArticle] })
        .mockRejectedValueOnce(new Error('UPDATE failed'));

      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));

      await expect(
        EmbeddingService.updateArticleEmbedding('article-001')
      ).rejects.toThrow('UPDATE failed');
    });

    it('長い本文（6000文字超）は切り詰められる', async () => {
      const longArticle = {
        ...mockArticle,
        body: 'あ'.repeat(7000),
      };

      mockQuery
        .mockResolvedValueOnce({ rows: [longArticle] })
        .mockResolvedValueOnce({ rows: [] });

      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));

      await EmbeddingService.updateArticleEmbedding('article-001');

      expect(mockGenerateEmbedding).toHaveBeenCalledWith(
        expect.stringContaining('あ'.repeat(6000).substring(0, 100)),
        expect.any(Object)
      );
    });
  });

  describe('reindexAllArticles', () => {
    it('全記事の埋め込みを再生成（成功）', async () => {
      const mockArticles = [
        { article_id: 'a1', title: 'T1', body: 'B1', tags: [] },
        { article_id: 'a2', title: 'T2', body: 'B2', tags: [] },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockArticles }) // SELECT
        .mockResolvedValue({ rows: [] }); // UPDATE x2

      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));

      const result = await EmbeddingService.reindexAllArticles();

      expect(result).toEqual({
        total: 2,
        success: 2,
        failed: 0,
        errors: [],
      });
    });

    it('一部失敗の場合もエラー情報を返す', async () => {
      const mockArticles = [
        { article_id: 'a1', title: 'T1', body: 'B1', tags: [] },
        { article_id: 'a2', title: 'T2', body: 'B2', tags: [] },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockArticles })
        .mockResolvedValueOnce({ rows: [] }) // a1成功
        .mockRejectedValueOnce(new Error('DB Error')); // a2失敗

      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));

      const result = await EmbeddingService.reindexAllArticles();

      expect(result).toEqual({
        total: 2,
        success: 1,
        failed: 1,
        errors: [
          { articleId: 'a2', error: 'DB Error' },
        ],
      });
    });

    it('記事が0件の場合', async () => {
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await EmbeddingService.reindexAllArticles();

      expect(result).toEqual({
        total: 0,
        success: 0,
        failed: 0,
        errors: [],
      });
    });

    it('全記事失敗の場合', async () => {
      const mockArticles = [
        { article_id: 'a1', title: 'T1', body: 'B1', tags: [] },
      ];

      mockQuery.mockResolvedValueOnce({ rows: mockArticles });
      mockGenerateEmbedding.mockRejectedValue(new Error('API Error'));

      const result = await EmbeddingService.reindexAllArticles();

      expect(result).toEqual({
        total: 1,
        success: 0,
        failed: 1,
        errors: [
          { articleId: 'a1', error: 'API Error' },
        ],
      });
    });

    it('レート制限対策で100ms待機する', async () => {
      const mockArticles = [
        { article_id: 'a1', title: 'T1', body: 'B1', tags: [] },
      ];

      mockQuery
        .mockResolvedValueOnce({ rows: mockArticles })
        .mockResolvedValue({ rows: [] });

      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));

      const startTime = Date.now();
      await EmbeddingService.reindexAllArticles();
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeGreaterThanOrEqual(100);
    });
  });

  describe('searchByVector', () => {
    it('ベクトル類似度検索を実行', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0.5));
      mockQuery.mockResolvedValue({
        rows: [
          {
            article_id: 'a1',
            title: 'Title 1',
            summary: 'Summary 1',
            category: 'FAQ',
            view_count: '10',
            similarity_score: '0.8523',
          },
        ],
      });

      const result = await EmbeddingService.searchByVector('検索クエリ');

      expect(result).toEqual([
        {
          article_id: 'a1',
          title: 'Title 1',
          summary: 'Summary 1',
          category: 'FAQ',
          view_count: 10,
          similarity_score: 0.8523,
        },
      ]);
    });

    it('結果が0件の場合は空配列', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await EmbeddingService.searchByVector('query');

      expect(result).toEqual([]);
    });

    it('limitパラメータが機能する', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      await EmbeddingService.searchByVector('query', 10);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.any(String), expect.any(Number), 10])
      );
    });

    it('thresholdパラメータが機能する', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      await EmbeddingService.searchByVector('query', 5, 0.5);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.any(String), 0.5, 5])
      );
    });

    it('埋め込み生成失敗時は例外をスロー', async () => {
      mockGenerateEmbedding.mockRejectedValue(new Error('Embedding failed'));

      await expect(
        EmbeddingService.searchByVector('query')
      ).rejects.toThrow('Embedding failed');
    });
  });

  describe('hybridSearch', () => {
    it('キーワード+ベクトルのハイブリッド検索', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0.5));
      mockQuery.mockResolvedValue({
        rows: [
          {
            article_id: 'a1',
            title: 'Title 1',
            summary: 'Summary',
            category: 'FAQ',
            view_count: '5',
            keyword_score: '0.1234',
            vector_score: '0.8765',
            combined_score: '0.6543',
          },
        ],
      });

      const result = await EmbeddingService.hybridSearch('query');

      expect(result).toEqual([
        {
          article_id: 'a1',
          title: 'Title 1',
          summary: 'Summary',
          category: 'FAQ',
          view_count: 5,
          keyword_score: 0.1234,
          vector_score: 0.8765,
          combined_score: 0.6543,
        },
      ]);
    });

    it('埋め込み失敗時はキーワード検索のみ', async () => {
      mockGenerateEmbedding.mockRejectedValue(new Error('API Error'));
      mockQuery.mockResolvedValue({
        rows: [
          {
            article_id: 'a1',
            title: 'Title',
            summary: 'Summary',
            category: 'FAQ',
            view_count: '3',
            keyword_score: '0.5',
            vector_score: '0',
            combined_score: '0.5',
          },
        ],
      });

      const result = await EmbeddingService.hybridSearch('query');

      expect(result[0].vector_score).toBe(0);
      expect(result[0].combined_score).toBeGreaterThan(0);
    });

    it('重み付けパラメータが機能する', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      await EmbeddingService.hybridSearch('query', 5, 0.4, 0.6);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([expect.any(String), expect.any(String), 0.4, 0.6, 5])
      );
    });

    it('結果が0件の場合は空配列', async () => {
      mockGenerateEmbedding.mockResolvedValue(Array(768).fill(0));
      mockQuery.mockResolvedValue({ rows: [] });

      const result = await EmbeddingService.hybridSearch('query');

      expect(result).toEqual([]);
    });
  });
});
