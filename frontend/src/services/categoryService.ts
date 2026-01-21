import { apiRequest, ApiResponse } from './api';

export interface Category {
  category_id: string;
  name: string;
  parent_category_id?: string;
  description?: string;
  sla_policy_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// カテゴリ一覧取得
export const getCategories = async (params?: {
  is_active?: boolean;
}): Promise<ApiResponse<{ categories: Category[] }>> => {
  return apiRequest<{ categories: Category[] }>({
    method: 'GET',
    url: '/categories',
    params,
  });
};

// カテゴリ詳細取得
export const getCategory = async (
  id: string
): Promise<ApiResponse<{ category: Category }>> => {
  return apiRequest<{ category: Category }>({
    method: 'GET',
    url: `/categories/${id}`,
  });
};
