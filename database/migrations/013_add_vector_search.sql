-- ============================================================================
-- マイグレーション: 013_add_vector_search.sql
-- 目的: ベクトル検索機能の追加（pgvector）
-- 作成日: 2026-02-04
-- 説明:
--   - pgvector 拡張機能を有効化
--   - ticket_embeddings テーブルを作成（埋め込みベクトル保存）
--   - HNSW インデックスを作成（高速近似検索）
--   - 類似チケット検索によるナレッジ再利用を実現
-- ============================================================================

-- pgvector 拡張機能の有効化
-- 注意: PostgreSQL 11以降が必要、pgvector がインストール済みであること
CREATE EXTENSION IF NOT EXISTS vector;

-- チケット埋め込みベクトルテーブル
-- 目的: チケットの件名・詳細をベクトル化し、セマンティック検索を可能にする
CREATE TABLE ticket_embeddings (
  embedding_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,

  -- 埋め込みバージョン（モデル変更時に再生成が必要）
  embedding_version VARCHAR(50) NOT NULL, -- 例: 'gemini-text-embedding-004'

  -- ベクトルデータ（768次元 - Gemini text-embedding-004）
  subject_vector vector(768),        -- 件名のベクトル表現
  description_vector vector(768),    -- 詳細のベクトル表現
  combined_vector vector(768),       -- 統合ベクトル（検索用メイン）

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 制約: 同一チケット・同一バージョンは1つのみ
  UNIQUE(ticket_id, embedding_version)
);

-- インデックス: ticket_id での検索用
CREATE INDEX idx_ticket_embeddings_ticket_id ON ticket_embeddings(ticket_id);

-- インデックス: embedding_version での検索用
CREATE INDEX idx_ticket_embeddings_version ON ticket_embeddings(embedding_version);

-- ベクトル検索用 HNSW インデックス（高速近似検索）
-- HNSW (Hierarchical Navigable Small World) は、大規模データセットでの高速なベクトル検索を実現
-- vector_cosine_ops: コサイン類似度による検索（推奨）
CREATE INDEX idx_ticket_embeddings_combined_hnsw
  ON ticket_embeddings
  USING hnsw (combined_vector vector_cosine_ops);

-- 件名ベクトル用 HNSW インデックス（オプション: 件名のみで検索する場合）
CREATE INDEX idx_ticket_embeddings_subject_hnsw
  ON ticket_embeddings
  USING hnsw (subject_vector vector_cosine_ops);

-- 詳細ベクトル用 HNSW インデックス（オプション: 詳細のみで検索する場合）
CREATE INDEX idx_ticket_embeddings_description_hnsw
  ON ticket_embeddings
  USING hnsw (description_vector vector_cosine_ops);

-- updated_at 自動更新トリガー関数
CREATE OR REPLACE FUNCTION update_ticket_embeddings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 自動更新トリガー
CREATE TRIGGER trg_update_ticket_embeddings_updated_at
BEFORE UPDATE ON ticket_embeddings
FOR EACH ROW
EXECUTE FUNCTION update_ticket_embeddings_updated_at();

-- コメント（ドキュメント）
COMMENT ON TABLE ticket_embeddings IS 'チケット埋め込みベクトル（セマンティック検索用）。pgvector により類似チケットを高速検索可能。';
COMMENT ON COLUMN ticket_embeddings.embedding_version IS 'ベクトル生成に使用したモデルバージョン。例: gemini-text-embedding-004';
COMMENT ON COLUMN ticket_embeddings.subject_vector IS '件名のベクトル表現（768次元、Gemini text-embedding-004）。';
COMMENT ON COLUMN ticket_embeddings.description_vector IS '詳細のベクトル表現（768次元、Gemini text-embedding-004）。';
COMMENT ON COLUMN ticket_embeddings.combined_vector IS '件名+詳細の統合ベクトル（検索用メイン、768次元）。';

COMMENT ON INDEX idx_ticket_embeddings_combined_hnsw IS 'HNSW インデックス（combined_vector）。コサイン類似度による高速近似検索を実現。';

-- パフォーマンス最適化のヒント
-- 1. VACUUM ANALYZE を定期的に実行してインデックスを最適化
--    例: VACUUM ANALYZE ticket_embeddings;
-- 2. チケット数が10,000件を超える場合、パーティショニングを検討
-- 3. ベクトル生成は夜間バッチ処理で実行（Claude API コスト削減）

-- 類似チケット検索のサンプルクエリ
-- SELECT
--   t.ticket_id,
--   t.ticket_number,
--   t.subject,
--   1 - (te.combined_vector <=> $1::vector) AS similarity_score
-- FROM ticket_embeddings te
-- JOIN tickets t ON te.ticket_id = t.ticket_id
-- WHERE te.embedding_version = 'gemini-text-embedding-004'
--   AND t.status IN ('resolved', 'closed')
-- ORDER BY te.combined_vector <=> $1::vector
-- LIMIT 5;
--
-- 注: $1 は検索クエリのベクトル（768次元、Gemini text-embedding-004）
-- 注: <=> は pgvector のコサイン距離演算子（0に近いほど類似）
-- 注: 1 - distance で類似度スコア（0-1、1に近いほど類似）

-- ============================================================================
-- マイグレーション完了
-- ============================================================================
