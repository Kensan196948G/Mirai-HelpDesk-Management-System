import { getGeminiAPIClient } from './gemini-api.client';
import { query } from '../config/database';
import { logger } from '../utils/logger';

/**
 * 埋め込みベクトル生成サービス
 *
 * Gemini text-embedding-004 を使用して、テキストを768次元のベクトルに変換する。
 * ナレッジ記事のセマンティック検索に使用。
 */
export class EmbeddingService {
  /**
   * テキストから埋め込みベクトルを生成
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    const client = getGeminiAPIClient();
    const truncated = text.substring(0, 8000); // APIの入力制限対応
    return client.generateEmbedding(truncated, {
      cacheKey: `embedding:${Buffer.from(truncated).toString('base64').substring(0, 64)}`,
      cacheTTL: 86400 * 7, // 7日間キャッシュ
    });
  }

  /**
   * ナレッジ記事の埋め込みを生成・更新
   */
  static async updateArticleEmbedding(articleId: string): Promise<void> {
    // 記事の内容を取得
    const result = await query(
      'SELECT article_id, title, body, tags FROM knowledge_articles WHERE article_id = $1',
      [articleId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Article not found: ${articleId}`);
    }

    const article = result.rows[0];
    const textForEmbedding = this.buildEmbeddingText(article.title, article.body, article.tags);
    const embedding = await this.generateEmbedding(textForEmbedding);

    // pgvector 形式の文字列に変換 [0.1, 0.2, ...]
    const vectorStr = `[${embedding.join(',')}]`;

    await query(
      `UPDATE knowledge_articles
       SET embedding = $1::vector,
           embedding_updated_at = CURRENT_TIMESTAMP
       WHERE article_id = $2`,
      [vectorStr, articleId]
    );

    logger.info(`Embedding updated for article ${articleId}`);
  }

  /**
   * 全ナレッジ記事の埋め込みを再生成（バッチ処理）
   */
  static async reindexAllArticles(): Promise<{
    total: number;
    success: number;
    failed: number;
    errors: Array<{ articleId: string; error: string }>;
  }> {
    const result = await query(
      'SELECT article_id, title, body, tags FROM knowledge_articles WHERE is_published = true ORDER BY created_at'
    );

    const total = result.rows.length;
    let success = 0;
    const errors: Array<{ articleId: string; error: string }> = [];

    for (const article of result.rows) {
      try {
        const text = this.buildEmbeddingText(article.title, article.body, article.tags);
        const embedding = await this.generateEmbedding(text);
        const vectorStr = `[${embedding.join(',')}]`;

        await query(
          `UPDATE knowledge_articles
           SET embedding = $1::vector,
               embedding_updated_at = CURRENT_TIMESTAMP
           WHERE article_id = $2`,
          [vectorStr, article.article_id]
        );

        success++;
        logger.info(`Reindex progress: ${success}/${total} - article ${article.article_id}`);

        // レート制限対策: 100ms待機
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error: any) {
        errors.push({
          articleId: article.article_id,
          error: error.message || 'Unknown error',
        });
        logger.error(`Failed to reindex article ${article.article_id}:`, error);
      }
    }

    return {
      total,
      success,
      failed: errors.length,
      errors,
    };
  }

  /**
   * ベクトル類似度検索
   *
   * クエリテキストをベクトル化し、コサイン類似度で最も近い記事を返す
   */
  static async searchByVector(
    queryText: string,
    limit: number = 5,
    threshold: number = 0.3
  ): Promise<Array<{
    article_id: string;
    title: string;
    summary: string;
    category: string;
    view_count: number;
    similarity_score: number;
  }>> {
    const embedding = await this.generateEmbedding(queryText);
    const vectorStr = `[${embedding.join(',')}]`;

    const result = await query(
      `SELECT
        ka.article_id,
        ka.title,
        SUBSTRING(ka.body, 1, 200) as summary,
        COALESCE(c.name, 'N/A') as category,
        ka.view_count,
        1 - (ka.embedding <=> $1::vector) as similarity_score
      FROM knowledge_articles ka
      LEFT JOIN categories c ON ka.category_id = c.category_id
      WHERE ka.is_published = true
        AND ka.embedding IS NOT NULL
        AND 1 - (ka.embedding <=> $1::vector) >= $2
      ORDER BY ka.embedding <=> $1::vector
      LIMIT $3`,
      [vectorStr, threshold, limit]
    );

    return result.rows.map((row: any) => ({
      article_id: row.article_id,
      title: row.title,
      summary: row.summary,
      category: row.category,
      view_count: parseInt(row.view_count),
      similarity_score: Math.round(parseFloat(row.similarity_score) * 10000) / 10000,
    }));
  }

  /**
   * ハイブリッド検索: キーワード + ベクトル検索の重み付き結合
   *
   * キーワード検索（tsvector）とベクトル検索（pgvector）のスコアを
   * 加重平均で統合し、より精度の高い検索結果を提供する。
   */
  static async hybridSearch(
    queryText: string,
    limit: number = 5,
    keywordWeight: number = 0.3,
    vectorWeight: number = 0.7
  ): Promise<Array<{
    article_id: string;
    title: string;
    summary: string;
    category: string;
    view_count: number;
    keyword_score: number;
    vector_score: number;
    combined_score: number;
  }>> {
    // ベクトル生成を試みる
    let embedding: number[] | null = null;
    try {
      embedding = await this.generateEmbedding(queryText);
    } catch (error) {
      logger.warn('Embedding generation failed, falling back to keyword-only search:', error);
    }

    if (!embedding) {
      // ベクトル生成失敗時はキーワード検索のみ
      const result = await query(
        `SELECT
          ka.article_id,
          ka.title,
          SUBSTRING(ka.body, 1, 200) as summary,
          COALESCE(c.name, 'N/A') as category,
          ka.view_count,
          ts_rank(ka.search_vector, plainto_tsquery('simple', $1)) as keyword_score,
          0 as vector_score,
          ts_rank(ka.search_vector, plainto_tsquery('simple', $1)) as combined_score
        FROM knowledge_articles ka
        LEFT JOIN categories c ON ka.category_id = c.category_id
        WHERE ka.is_published = true
          AND ka.search_vector @@ plainto_tsquery('simple', $1)
        ORDER BY combined_score DESC
        LIMIT $2`,
        [queryText, limit]
      );

      return result.rows.map((r: any) => ({
        article_id: r.article_id,
        title: r.title,
        summary: r.summary,
        category: r.category,
        view_count: parseInt(r.view_count),
        keyword_score: parseFloat(r.keyword_score) || 0,
        vector_score: 0,
        combined_score: parseFloat(r.combined_score) || 0,
      }));
    }

    const vectorStr = `[${embedding.join(',')}]`;

    // ハイブリッド検索: ILIKE フォールバック + ベクトル類似度の重み付き結合
    const result = await query(
      `WITH keyword_results AS (
        SELECT
          ka.article_id,
          ka.title,
          SUBSTRING(ka.body, 1, 200) as summary,
          COALESCE(c.name, 'N/A') as category,
          ka.view_count,
          ts_rank(ka.search_vector, plainto_tsquery('simple', $1)) as keyword_score,
          CASE WHEN ka.embedding IS NOT NULL
            THEN 1 - (ka.embedding <=> $2::vector)
            ELSE 0
          END as vector_score
        FROM knowledge_articles ka
        LEFT JOIN categories c ON ka.category_id = c.category_id
        WHERE ka.is_published = true
          AND (
            ka.search_vector @@ plainto_tsquery('simple', $1)
            OR (ka.embedding IS NOT NULL AND 1 - (ka.embedding <=> $2::vector) >= 0.3)
          )
      )
      SELECT *,
        (keyword_score * $3 + vector_score * $4) as combined_score
      FROM keyword_results
      ORDER BY combined_score DESC
      LIMIT $5`,
      [queryText, vectorStr, keywordWeight, vectorWeight, limit]
    );

    return result.rows.map((r: any) => ({
      article_id: r.article_id,
      title: r.title,
      summary: r.summary,
      category: r.category,
      view_count: parseInt(r.view_count),
      keyword_score: Math.round((parseFloat(r.keyword_score) || 0) * 10000) / 10000,
      vector_score: Math.round((parseFloat(r.vector_score) || 0) * 10000) / 10000,
      combined_score: Math.round((parseFloat(r.combined_score) || 0) * 10000) / 10000,
    }));
  }

  /**
   * 埋め込み用テキストを構築
   * タイトルに重みを置き、本文とタグを結合
   */
  private static buildEmbeddingText(
    title: string,
    body: string,
    tags: string[] | null
  ): string {
    const parts = [
      `Title: ${title}`,
      `Content: ${body.substring(0, 6000)}`,
    ];
    if (tags && tags.length > 0) {
      parts.push(`Tags: ${tags.join(', ')}`);
    }
    return parts.join('\n\n');
  }
}
