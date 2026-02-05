/**
 * Vector Search Service
 *
 * pgvector を使用した類似チケット検索・ナレッジセマンティック検索。
 * ticket_embeddings テーブル（768次元、Gemini text-embedding-004）と
 * knowledge_articles.embedding カラムを活用。
 */

import { EmbeddingService } from './embedding.service';
import { query } from '../config/database';
import { logger } from '../utils/logger';

const EMBEDDING_VERSION = 'gemini-text-embedding-004';

export interface SimilarTicketResult {
  ticket_id: string;
  ticket_number: string;
  subject: string;
  description_summary: string;
  status: string;
  priority: string;
  category_name: string;
  similarity_score: number;
  created_at: string;
}

export interface KnowledgeSearchResult {
  article_id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  view_count: number;
  similarity_score: number;
}

export interface UnifiedSearchResult {
  tickets: SimilarTicketResult[];
  knowledge_articles: KnowledgeSearchResult[];
  processing_time_ms: number;
}

export class VectorSearchService {
  /**
   * チケットの埋め込みを生成して ticket_embeddings テーブルに保存
   */
  static async generateTicketEmbedding(
    ticketId: string,
    subject: string,
    description: string
  ): Promise<void> {
    try {
      const combinedText = `Subject: ${subject}\n\nDescription: ${description}`;
      const [subjectEmbedding, descriptionEmbedding, combinedEmbedding] =
        await Promise.all([
          EmbeddingService.generateEmbedding(subject),
          EmbeddingService.generateEmbedding(description.substring(0, 6000)),
          EmbeddingService.generateEmbedding(combinedText.substring(0, 8000)),
        ]);

      const subjectVec = `[${subjectEmbedding.join(',')}]`;
      const descVec = `[${descriptionEmbedding.join(',')}]`;
      const combinedVec = `[${combinedEmbedding.join(',')}]`;

      // UPSERT: 同一チケット・同一バージョンが既にあれば更新
      await query(
        `INSERT INTO ticket_embeddings (
          ticket_id, embedding_version,
          subject_vector, description_vector, combined_vector
        ) VALUES ($1, $2, $3::vector, $4::vector, $5::vector)
        ON CONFLICT (ticket_id, embedding_version)
        DO UPDATE SET
          subject_vector = EXCLUDED.subject_vector,
          description_vector = EXCLUDED.description_vector,
          combined_vector = EXCLUDED.combined_vector,
          updated_at = CURRENT_TIMESTAMP`,
        [ticketId, EMBEDDING_VERSION, subjectVec, descVec, combinedVec]
      );

      logger.info(`Ticket embedding generated: ${ticketId}`);
    } catch (error: any) {
      logger.warn(`Failed to generate ticket embedding for ${ticketId}:`, error);
      // 埋め込み生成失敗はチケット操作をブロックしない
    }
  }

  /**
   * 類似チケット検索（コサイン類似度）
   *
   * クエリテキストをベクトル化し、ticket_embeddings の combined_vector と
   * コサイン類似度で比較。解決済み/クローズ済みチケットを優先的に返す。
   */
  static async findSimilarTickets(
    queryText: string,
    options: {
      limit?: number;
      threshold?: number;
      statusFilter?: string[];
      excludeTicketId?: string;
    } = {}
  ): Promise<SimilarTicketResult[]> {
    const { limit = 5, threshold = 0.3, statusFilter, excludeTicketId } = options;

    const embedding = await EmbeddingService.generateEmbedding(queryText);
    const vectorStr = `[${embedding.join(',')}]`;

    let statusCondition = '';
    const params: any[] = [vectorStr, EMBEDDING_VERSION, threshold, limit];

    if (statusFilter && statusFilter.length > 0) {
      statusCondition = `AND t.status = ANY($${params.length + 1})`;
      params.push(statusFilter);
    }

    let excludeCondition = '';
    if (excludeTicketId) {
      excludeCondition = `AND t.ticket_id != $${params.length + 1}`;
      params.push(excludeTicketId);
    }

    const result = await query(
      `SELECT
        t.ticket_id,
        t.ticket_number,
        t.subject,
        SUBSTRING(t.description, 1, 200) as description_summary,
        t.status,
        t.priority,
        COALESCE(c.name, 'N/A') as category_name,
        1 - (te.combined_vector <=> $1::vector) as similarity_score,
        t.created_at
      FROM ticket_embeddings te
      JOIN tickets t ON te.ticket_id = t.ticket_id
      LEFT JOIN categories c ON t.category_id = c.category_id
      WHERE te.embedding_version = $2
        AND te.combined_vector IS NOT NULL
        AND 1 - (te.combined_vector <=> $1::vector) >= $3
        ${statusCondition}
        ${excludeCondition}
      ORDER BY te.combined_vector <=> $1::vector
      LIMIT $4`,
      params
    );

    return result.rows.map((row: any) => ({
      ticket_id: row.ticket_id,
      ticket_number: row.ticket_number,
      subject: row.subject,
      description_summary: row.description_summary,
      status: row.status,
      priority: row.priority,
      category_name: row.category_name,
      similarity_score: Math.round(parseFloat(row.similarity_score) * 10000) / 10000,
      created_at: row.created_at,
    }));
  }

  /**
   * ナレッジ記事のセマンティック検索
   *
   * embedding.service.ts の searchByVector を活用。
   */
  static async searchKnowledgeArticles(
    queryText: string,
    options: { limit?: number; threshold?: number } = {}
  ): Promise<KnowledgeSearchResult[]> {
    const { limit = 5, threshold = 0.3 } = options;

    const embedding = await EmbeddingService.generateEmbedding(queryText);
    const vectorStr = `[${embedding.join(',')}]`;

    const result = await query(
      `SELECT
        ka.article_id,
        ka.title,
        SUBSTRING(ka.body, 1, 200) as summary,
        COALESCE(c.name, 'N/A') as category,
        COALESCE(ka.tags, '{}') as tags,
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
      tags: Array.isArray(row.tags) ? row.tags : [],
      view_count: parseInt(row.view_count) || 0,
      similarity_score: Math.round(parseFloat(row.similarity_score) * 10000) / 10000,
    }));
  }

  /**
   * 統合検索: チケット + ナレッジ記事の両方を同時にベクトル検索
   */
  static async unifiedSearch(
    queryText: string,
    options: {
      ticketLimit?: number;
      articleLimit?: number;
      threshold?: number;
      ticketStatusFilter?: string[];
    } = {}
  ): Promise<UnifiedSearchResult> {
    const startTime = Date.now();
    const {
      ticketLimit = 5,
      articleLimit = 5,
      threshold = 0.3,
      ticketStatusFilter,
    } = options;

    // チケットとナレッジ記事を並列で検索
    const [tickets, articles] = await Promise.all([
      this.findSimilarTickets(queryText, {
        limit: ticketLimit,
        threshold,
        statusFilter: ticketStatusFilter,
      }),
      this.searchKnowledgeArticles(queryText, {
        limit: articleLimit,
        threshold,
      }),
    ]);

    return {
      tickets,
      knowledge_articles: articles,
      processing_time_ms: Date.now() - startTime,
    };
  }

  /**
   * 全チケットの埋め込みを一括生成（バッチ処理）
   */
  static async reindexAllTickets(): Promise<{
    total: number;
    success: number;
    failed: number;
    errors: Array<{ ticketId: string; error: string }>;
  }> {
    const result = await query(
      `SELECT ticket_id, subject, description FROM tickets ORDER BY created_at`
    );

    const total = result.rows.length;
    let success = 0;
    const errors: Array<{ ticketId: string; error: string }> = [];

    for (const ticket of result.rows) {
      try {
        await this.generateTicketEmbedding(
          ticket.ticket_id,
          ticket.subject,
          ticket.description || ''
        );
        success++;

        if (success % 10 === 0) {
          logger.info(`Ticket reindex progress: ${success}/${total}`);
        }

        // Gemini API レート制限対策
        await new Promise((resolve) => setTimeout(resolve, 150));
      } catch (error: any) {
        errors.push({
          ticketId: ticket.ticket_id,
          error: error.message || 'Unknown error',
        });
      }
    }

    logger.info(`Ticket reindex completed: ${success}/${total} succeeded, ${errors.length} failed`);

    return { total, success, failed: errors.length, errors };
  }
}
