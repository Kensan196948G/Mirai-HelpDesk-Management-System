import { Router } from 'express';
import { authenticate, authorize } from '../middleware/auth';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { KnowledgeArticleModel } from '../models/knowledge-article.model';
import { EmbeddingService } from '../services/embedding.service';
import { UserRole } from '../types';
import { logger, logAudit } from '../utils/logger';

const router = Router();

// すべてのルートで認証が必要
router.use(authenticate);

// ナレッジ記事一覧取得
router.get(
  '/',
  asyncHandler(async (req, res) => {
    const { type, visibility, category_id, is_published, page, pageSize } = req.query;
    const result = await KnowledgeArticleModel.findAll({
      type: type as any,
      visibility: visibility as any,
      category_id: category_id as string,
      is_published: is_published !== undefined ? is_published === 'true' : undefined,
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
    });
    res.json({ success: true, data: result });
  })
);

// ナレッジ記事キーワード検索
router.get(
  '/search',
  asyncHandler(async (req, res) => {
    const { q, limit } = req.query;
    if (!q) {
      throw new AppError('Query parameter "q" is required', 400, 'MISSING_QUERY');
    }
    const articles = await KnowledgeArticleModel.searchByQuery(
      q as string,
      limit ? parseInt(limit as string) : 5
    );
    res.json({ success: true, data: { articles } });
  })
);

// ベクトル検索（セマンティック検索）
router.get(
  '/vector-search',
  asyncHandler(async (req, res) => {
    const { q, limit, threshold } = req.query;
    if (!q) {
      throw new AppError('Query parameter "q" is required', 400, 'MISSING_QUERY');
    }
    const articles = await EmbeddingService.searchByVector(
      q as string,
      limit ? parseInt(limit as string) : 5,
      threshold ? parseFloat(threshold as string) : 0.3
    );
    res.json({ success: true, data: { articles } });
  })
);

// ハイブリッド検索（キーワード + ベクトル）
router.get(
  '/hybrid-search',
  asyncHandler(async (req, res) => {
    const { q, limit, keyword_weight, vector_weight } = req.query;
    if (!q) {
      throw new AppError('Query parameter "q" is required', 400, 'MISSING_QUERY');
    }
    const articles = await EmbeddingService.hybridSearch(
      q as string,
      limit ? parseInt(limit as string) : 5,
      keyword_weight ? parseFloat(keyword_weight as string) : 0.3,
      vector_weight ? parseFloat(vector_weight as string) : 0.7
    );
    res.json({ success: true, data: { articles } });
  })
);

// 全記事の埋め込みを再生成（Manager のみ）
router.post(
  '/reindex',
  authorize(UserRole.MANAGER),
  asyncHandler(async (req, res) => {
    const user = req.user!;

    logAudit('KNOWLEDGE_REINDEX_STARTED', user.user_id, {}, req.ip);
    logger.info(`Knowledge reindex started by user ${user.user_id}`);

    const result = await EmbeddingService.reindexAllArticles();

    logAudit('KNOWLEDGE_REINDEX_COMPLETED', user.user_id, result, req.ip);

    res.json({
      success: true,
      data: {
        message: 'Reindex completed',
        ...result,
      },
    });
  })
);

// 人気記事取得
router.get(
  '/popular',
  asyncHandler(async (req, res) => {
    const { limit } = req.query;
    const articles = await KnowledgeArticleModel.findPopular(
      limit ? parseInt(limit as string) : 10
    );
    res.json({ success: true, data: { articles } });
  })
);

// 最新記事取得
router.get(
  '/recent',
  asyncHandler(async (req, res) => {
    const { limit } = req.query;
    const articles = await KnowledgeArticleModel.findRecent(
      limit ? parseInt(limit as string) : 10
    );
    res.json({ success: true, data: { articles } });
  })
);

// 記事詳細取得
router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const article = await KnowledgeArticleModel.findById(req.params.id);
    if (!article) {
      throw new AppError('Article not found', 404, 'ARTICLE_NOT_FOUND');
    }
    // 閲覧数インクリメント
    await KnowledgeArticleModel.incrementViewCount(req.params.id);
    res.json({ success: true, data: { article } });
  })
);

// 記事作成（Agent以上）
router.post(
  '/',
  authorize(UserRole.AGENT, UserRole.M365_OPERATOR, UserRole.MANAGER),
  asyncHandler(async (req, res) => {
    const user = req.user!;
    const article = await KnowledgeArticleModel.create({
      ...req.body,
      owner_id: user.user_id,
    });

    // 埋め込みを非同期で生成（失敗しても記事作成は成功とする）
    EmbeddingService.updateArticleEmbedding(article.article_id).catch((err) => {
      logger.warn(`Failed to generate embedding for new article ${article.article_id}:`, err);
    });

    res.status(201).json({ success: true, data: { article } });
  })
);

// 記事更新
router.patch(
  '/:id',
  authorize(UserRole.AGENT, UserRole.M365_OPERATOR, UserRole.MANAGER),
  asyncHandler(async (req, res) => {
    const article = await KnowledgeArticleModel.update(req.params.id, req.body);
    if (!article) {
      throw new AppError('Article not found', 404, 'ARTICLE_NOT_FOUND');
    }

    // 内容が変更された場合は埋め込みを再生成
    if (req.body.title || req.body.body || req.body.tags) {
      EmbeddingService.updateArticleEmbedding(article.article_id).catch((err) => {
        logger.warn(`Failed to update embedding for article ${article.article_id}:`, err);
      });
    }

    res.json({ success: true, data: { article } });
  })
);

// 記事削除
router.delete(
  '/:id',
  authorize(UserRole.MANAGER),
  asyncHandler(async (req, res) => {
    const deleted = await KnowledgeArticleModel.delete(req.params.id);
    if (!deleted) {
      throw new AppError('Article not found', 404, 'ARTICLE_NOT_FOUND');
    }
    res.json({ success: true, data: { message: 'Article deleted' } });
  })
);

export default router;
