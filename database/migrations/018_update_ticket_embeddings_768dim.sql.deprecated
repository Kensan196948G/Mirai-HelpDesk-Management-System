-- ============================================================================
-- Migration: 017_update_ticket_embeddings_768dim.sql
-- Purpose: ticket_embeddings テーブルのベクトル次元を 1024 -> 768 に変更
-- Created: 2026-02-06
-- Description:
--   - 既存の 1024 次元カラムを 768 次元に変更（Gemini text-embedding-004 対応）
--   - Claude ベースの埋め込みから Gemini ベースに統一
--   - HNSW インデックスを再作成
-- ============================================================================

-- 既存データを削除（次元数変更のため再生成が必要）
TRUNCATE TABLE ticket_embeddings;

-- 既存の HNSW インデックスを削除
DROP INDEX IF EXISTS idx_ticket_embeddings_combined_hnsw;
DROP INDEX IF EXISTS idx_ticket_embeddings_subject_hnsw;
DROP INDEX IF EXISTS idx_ticket_embeddings_description_hnsw;

-- カラムの次元数を変更（1024 -> 768）
ALTER TABLE ticket_embeddings
  ALTER COLUMN subject_vector TYPE vector(768),
  ALTER COLUMN description_vector TYPE vector(768),
  ALTER COLUMN combined_vector TYPE vector(768);

-- HNSW インデックスを再作成（768 次元）
CREATE INDEX idx_ticket_embeddings_combined_hnsw
  ON ticket_embeddings
  USING hnsw (combined_vector vector_cosine_ops);

CREATE INDEX idx_ticket_embeddings_subject_hnsw
  ON ticket_embeddings
  USING hnsw (subject_vector vector_cosine_ops);

-- コメント更新
COMMENT ON COLUMN ticket_embeddings.subject_vector IS 'Subject embedding vector (768-dim, Gemini text-embedding-004)';
COMMENT ON COLUMN ticket_embeddings.description_vector IS 'Description embedding vector (768-dim, Gemini text-embedding-004)';
COMMENT ON COLUMN ticket_embeddings.combined_vector IS 'Combined subject+description embedding vector (768-dim, primary search target)';

-- ============================================================================
-- Migration complete
-- ============================================================================
