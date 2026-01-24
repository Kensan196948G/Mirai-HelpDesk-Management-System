import { apiRequest, ApiResponse } from './api';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  refreshToken: string;
  user: {
    user_id: string;
    email: string;
    display_name: string;
    department?: string;
    role: string;
  };
}

export interface User {
  user_id: string;
  email: string;
  display_name: string;
  department?: string;
  role: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// ログイン
export const login = async (
  credentials: LoginRequest
): Promise<ApiResponse<LoginResponse>> => {
  return apiRequest<LoginResponse>({
    method: 'POST',
    url: '/auth/login',
    data: credentials,
  });
};

// 現在のユーザー情報取得
export const getCurrentUser = async (): Promise<ApiResponse<{ user: User }>> => {
  return apiRequest<{ user: User }>({
    method: 'GET',
    url: '/auth/me',
  });
};

// ログアウト
export const logout = async (): Promise<ApiResponse<any>> => {
  return apiRequest({
    method: 'POST',
    url: '/auth/logout',
  });
};
