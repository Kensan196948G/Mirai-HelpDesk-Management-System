import { query, withTransaction } from '../config/database';
import {
  KnowledgeArticle,
  KnowledgeArticlePreview,
  ArticleType,
  ArticleVisibility,
} from '../types';

export class KnowledgeArticleModel {
  // ナレッジ記事全文検索
  static async searchByQuery(
    searchQuery: string,
    limit: number = 5
  ): Promise<KnowledgeArticlePreview[]> {
    const result = await query(
      `SELECT
        article_id,
        title,
        SUBSTRING(body, 1, 200) as summary,
        COALESCE(c.name, 'カテゴリなし') as category,
        view_count,
        ts_rank(search_vector, plainto_tsquery('simple', $1)) as relevance_score
      FROM knowledge_articles ka
      LEFT JOIN categories c ON ka.category_id = c.category_id
      WHERE is_published = true
        AND search_vector @@ plainto_tsquery('simple', $1)
      ORDER BY relevance_score DESC, view_count DESC
      LIMIT $2`,
      [searchQuery, limit]
    );

    return result.rows.map((row) => ({
      article_id: row.article_id,
      title: row.title,
      summary: row.summary,
      category: row.category,
      view_count: row.view_count,
      relevance_score: parseFloat(row.relevance_score),
    }));
  }

  // 全記事取得（フィルタ付き）
  static async findAll(filters?: {
    type?: ArticleType;
    visibility?: ArticleVisibility;
    category_id?: string;
    is_published?: boolean;
    owner_id?: string;
    page?: number;
    pageSize?: number;
  }): Promise<{ articles: KnowledgeArticle[]; total: number }> {
    const page = filters?.page || 1;
    const pageSize = filters?.pageSize || 20;
    const offset = (page - 1) * pageSize;

    let queryText = `
      SELECT ka.*,
             c.name as category_name,
             u.display_name as owner_name
      FROM knowledge_articles ka
      LEFT JOIN categories c ON ka.category_id = c.category_id
      LEFT JOIN users u ON ka.owner_id = u.user_id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramIndex = 1;

    if (filters?.type) {
      queryText += ` AND ka.type = $${paramIndex}`;
      params.push(filters.type);
      paramIndex++;
    }

    if (filters?.visibility) {
      queryText += ` AND ka.visibility = $${paramIndex}`;
      params.push(filters.visibility);
      paramIndex++;
    }

    if (filters?.category_id) {
      queryText += ` AND ka.category_id = $${paramIndex}`;
      params.push(filters.category_id);
      paramIndex++;
    }

    if (filters?.is_published !== undefined) {
      queryText += ` AND ka.is_published = $${paramIndex}`;
      params.push(filters.is_published);
      paramIndex++;
    }

    if (filters?.owner_id) {
      queryText += ` AND ka.owner_id = $${paramIndex}`;
      params.push(filters.owner_id);
      paramIndex++;
    }

    // 総件数取得
    const countResult = await query(
      queryText.replace(
        'SELECT ka.*, c.name as category_name, u.display_name as owner_name',
        'SELECT COUNT(*)'
      ),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // ページネーション付きで取得
    queryText += ` ORDER BY ka.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(pageSize, offset);

    const result = await query(queryText, params);

    return {
      articles: result.rows,
      total,
    };
  }

  // 記事詳細取得
  static async findById(articleId: string): Promise<KnowledgeArticle | null> {
    const result = await query(
      `SELECT ka.*,
              c.name as category_name,
              u.display_name as owner_name,
              u.email as owner_email
       FROM knowledge_articles ka
       LEFT JOIN categories c ON ka.category_id = c.category_id
       LEFT JOIN users u ON ka.owner_id = u.user_id
       WHERE ka.article_id = $1`,
      [articleId]
    );

    return result.rows[0] || null;
  }

  // 記事作成
  static async create(articleData: {
    title: string;
    body: string;
    type: ArticleType;
    category_id?: string;
    tags?: string[];
    visibility: ArticleVisibility;
    owner_id: string;
    is_published?: boolean;
    source_ticket_id?: string;
  }): Promise<KnowledgeArticle> {
    const result = await query(
      `INSERT INTO knowledge_articles (
        title, body, type, category_id, tags, visibility,
        owner_id, is_published, source_ticket_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        articleData.title,
        articleData.body,
        articleData.type,
        articleData.category_id,
        articleData.tags,
        articleData.visibility,
        articleData.owner_id,
        articleData.is_published || false,
        articleData.source_ticket_id,
      ]
    );

    return result.rows[0];
  }

  // 記事更新
  static async update(
    articleId: string,
    updates: Partial<{
      title: string;
      body: string;
      type: ArticleType;
      category_id: string;
      tags: string[];
      visibility: ArticleVisibility;
      is_published: boolean;
    }>
  ): Promise<KnowledgeArticle> {
    const fields: string[] = [];
    const params: any[] = [];
    let paramIndex = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (value !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    });

    // 公開時のタイムスタンプ設定
    if (updates.is_published === true) {
      fields.push(`published_at = CURRENT_TIMESTAMP`);
    }

    params.push(articleId);

    const result = await query(
      `UPDATE knowledge_articles SET ${fields.join(', ')} WHERE article_id = $${paramIndex} RETURNING *`,
      params
    );

    return result.rows[0];
  }

  // 記事削除
  static async delete(articleId: string): Promise<boolean> {
    const result = await query(
      'DELETE FROM knowledge_articles WHERE article_id = $1',
      [articleId]
    );

    return (result.rowCount ?? 0) > 0;
  }

  // 閲覧数インクリメント
  static async incrementViewCount(articleId: string): Promise<void> {
    await query(
      'UPDATE knowledge_articles SET view_count = view_count + 1 WHERE article_id = $1',
      [articleId]
    );
  }

  // 役立った数インクリメント
  static async incrementHelpfulCount(articleId: string): Promise<void> {
    await query(
      'UPDATE knowledge_articles SET helpful_count = helpful_count + 1 WHERE article_id = $1',
      [articleId]
    );
  }

  // 役立たなかった数インクリメント
  static async incrementNotHelpfulCount(articleId: string): Promise<void> {
    await query(
      'UPDATE knowledge_articles SET not_helpful_count = not_helpful_count + 1 WHERE article_id = $1',
      [articleId]
    );
  }

  // タグで検索
  static async findByTag(tag: string): Promise<KnowledgeArticle[]> {
    const result = await query(
      `SELECT ka.*,
              c.name as category_name,
              u.display_name as owner_name
       FROM knowledge_articles ka
       LEFT JOIN categories c ON ka.category_id = c.category_id
       LEFT JOIN users u ON ka.owner_id = u.user_id
       WHERE ka.is_published = true
         AND $1 = ANY(ka.tags)
       ORDER BY ka.view_count DESC, ka.created_at DESC`,
      [tag]
    );

    return result.rows;
  }

  // 人気記事取得
  static async findPopular(limit: number = 10): Promise<KnowledgeArticle[]> {
    const result = await query(
      `SELECT ka.*,
              c.name as category_name,
              u.display_name as owner_name
       FROM knowledge_articles ka
       LEFT JOIN categories c ON ka.category_id = c.category_id
       LEFT JOIN users u ON ka.owner_id = u.user_id
       WHERE ka.is_published = true
       ORDER BY ka.view_count DESC, ka.helpful_count DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }

  // 最新記事取得
  static async findRecent(limit: number = 10): Promise<KnowledgeArticle[]> {
    const result = await query(
      `SELECT ka.*,
              c.name as category_name,
              u.display_name as owner_name
       FROM knowledge_articles ka
       LEFT JOIN categories c ON ka.category_id = c.category_id
       LEFT JOIN users u ON ka.owner_id = u.user_id
       WHERE ka.is_published = true
       ORDER BY ka.created_at DESC
       LIMIT $1`,
      [limit]
    );

    return result.rows;
  }
}
