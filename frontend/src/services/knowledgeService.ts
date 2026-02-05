import { apiRequest, ApiResponse } from './api';
import {
  KnowledgeArticle,
  KnowledgeArticleInput,
  KnowledgeListResponse,
} from '@appTypes/index';

/**
 * ナレッジ記事一覧取得
 */
export const getKnowledgeArticles = async (params?: {
  search?: string;
  type?: string;
  category?: string;
  tags?: string[];
  visibility?: string;
  is_published?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<ApiResponse<KnowledgeListResponse>> => {
  const queryParams = new URLSearchParams();

  if (params?.search) queryParams.append('search', params.search);
  if (params?.type) queryParams.append('type', params.type);
  if (params?.category) queryParams.append('category', params.category);
  if (params?.tags) params.tags.forEach(tag => queryParams.append('tags[]', tag));
  if (params?.visibility) queryParams.append('visibility', params.visibility);
  if (params?.is_published !== undefined) {
    queryParams.append('is_published', String(params.is_published));
  }
  if (params?.page) queryParams.append('page', String(params.page));
  if (params?.pageSize) queryParams.append('pageSize', String(params.pageSize));

  return apiRequest<KnowledgeListResponse>({
    method: 'GET',
    url: `/knowledge?${queryParams.toString()}`,
  });
};

/**
 * ナレッジ記事詳細取得
 */
export const getKnowledgeArticle = async (
  articleId: string
): Promise<ApiResponse<KnowledgeArticle>> => {
  return apiRequest<KnowledgeArticle>({
    method: 'GET',
    url: `/knowledge/${articleId}`,
  });
};

/**
 * ナレッジ記事作成
 */
export const createKnowledgeArticle = async (
  data: KnowledgeArticleInput
): Promise<ApiResponse<KnowledgeArticle>> => {
  return apiRequest<KnowledgeArticle>({
    method: 'POST',
    url: '/knowledge',
    data,
  });
};

/**
 * ナレッジ記事更新
 */
export const updateKnowledgeArticle = async (
  articleId: string,
  data: Partial<KnowledgeArticleInput>
): Promise<ApiResponse<KnowledgeArticle>> => {
  return apiRequest<KnowledgeArticle>({
    method: 'PATCH',
    url: `/knowledge/${articleId}`,
    data,
  });
};

/**
 * ナレッジ記事削除
 */
export const deleteKnowledgeArticle = async (
  articleId: string
): Promise<ApiResponse<void>> => {
  return apiRequest<void>({
    method: 'DELETE',
    url: `/knowledge/${articleId}`,
  });
};

/**
 * ナレッジ記事にフィードバック（役に立った/立たなかった）
 */
export const submitKnowledgeFeedback = async (
  articleId: string,
  isHelpful: boolean
): Promise<ApiResponse<void>> => {
  return apiRequest<void>({
    method: 'POST',
    url: `/knowledge/${articleId}/feedback`,
    data: { is_helpful: isHelpful },
  });
};

/**
 * ナレッジ記事の閲覧数カウント
 */
export const incrementKnowledgeViewCount = async (
  articleId: string
): Promise<ApiResponse<void>> => {
  return apiRequest<void>({
    method: 'POST',
    url: `/knowledge/${articleId}/view`,
  });
};

/**
 * カテゴリ一覧取得
 */
export const getKnowledgeCategories = async (): Promise<
  ApiResponse<string[]>
> => {
  return apiRequest<string[]>({
    method: 'GET',
    url: '/knowledge/categories',
  });
};

/**
 * 人気タグ一覧取得
 */
export const getPopularTags = async (limit?: number): Promise<
  ApiResponse<{ tag: string; count: number }[]>
> => {
  const queryParams = new URLSearchParams();
  if (limit) queryParams.append('limit', String(limit));

  return apiRequest<{ tag: string; count: number }[]>({
    method: 'GET',
    url: `/knowledge/tags/popular?${queryParams.toString()}`,
  });
};
