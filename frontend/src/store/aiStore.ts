/**
 * AI Store
 *
 * AI機能の状態管理（Zustand）
 */

import { create } from 'zustand';
import { AISuggestion } from '../services/aiService';

interface AIState {
  // AI機能の有効/無効
  aiEnabled: boolean;

  // AI提案データ
  suggestions: AISuggestion[];

  // ローディング状態
  loading: boolean;

  // エラー状態
  error: string | null;

  // 最後のAI分類結果（キャッシュ）
  lastClassification: any | null;

  // アクション
  setAIEnabled: (enabled: boolean) => void;
  setSuggestions: (suggestions: AISuggestion[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLastClassification: (classification: any) => void;
  clearSuggestions: () => void;
  clearError: () => void;
}

export const useAIStore = create<AIState>((set) => ({
  aiEnabled: true,
  suggestions: [],
  loading: false,
  error: null,
  lastClassification: null,

  setAIEnabled: (enabled) => set({ aiEnabled: enabled }),
  setSuggestions: (suggestions) => set({ suggestions }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setLastClassification: (classification) => set({ lastClassification: classification }),
  clearSuggestions: () => set({ suggestions: [] }),
  clearError: () => set({ error: null }),
}));
