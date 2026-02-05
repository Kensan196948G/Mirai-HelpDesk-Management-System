-- ============================================================================
-- マイグレーション: 016_knowledge_vector_search.sql
-- 目的: ナレッジ記事テーブルにベクトル埋め込みカラムを追加（pgvector）
-- 作成日: 2026-02-06
-- 説明:
--   - knowledge_articles テーブルに embedding カラム追加（768次元 = Gemini text-embedding-004）
--   - HNSW インデックスを作成（高速セマンティック検索）
--   - 既存のキーワード検索（tsvector）とのハイブリッド検索を実現
-- ============================================================================

-- pgvector 拡張機能の有効化（既に有効なら何もしない）
CREATE EXTENSION IF NOT EXISTS vector;

-- ナレッジ記事テーブルに埋め込みベクトルカラムを追加
-- Gemini text-embedding-004 は 768 次元のベクトルを生成
ALTER TABLE knowledge_articles
  ADD COLUMN IF NOT EXISTS embedding vector(768);

-- 埋め込み生成日時（再インデックス管理用）
ALTER TABLE knowledge_articles
  ADD COLUMN IF NOT EXISTS embedding_updated_at TIMESTAMP WITH TIME ZONE;

-- ベクトル検索用 HNSW インデックス（コサイン類似度）
CREATE INDEX IF NOT EXISTS idx_knowledge_articles_embedding_hnsw
  ON knowledge_articles
  USING hnsw (embedding vector_cosine_ops);

-- コメント
COMMENT ON COLUMN knowledge_articles.embedding IS 'セマンティック検索用ベクトル埋め込み（768次元、Gemini text-embedding-004）';
COMMENT ON COLUMN knowledge_articles.embedding_updated_at IS '埋め込みベクトルの最終更新日時';
COMMENT ON INDEX idx_knowledge_articles_embedding_hnsw IS 'HNSW インデックス（コサイン類似度による高速セマンティック検索）';

-- ============================================================================
-- マイグレーション完了
-- ============================================================================
