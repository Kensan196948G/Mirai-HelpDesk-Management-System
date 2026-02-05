-- ============================================================================
-- マイグレーション: 015_add_ai_metrics_cache.sql
-- 目的: AI精度メトリクスキャッシュテーブルの追加
-- 作成日: 2026-02-04
-- 説明:
--   - ai_metrics_cache テーブルを作成（月次レポート用の集計結果キャッシュ）
--   - 精度・使用量・パフォーマンスメトリクスを保存
--   - 監査レポート生成の高速化を実現
-- ============================================================================

-- AI精度メトリクスキャッシュテーブル
-- 目的: AI精度メトリクスの集計結果をキャッシュし、月次レポート生成を高速化する
CREATE TABLE ai_metrics_cache (
  cache_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- メトリクス種別
  metric_type VARCHAR(50) NOT NULL CHECK (metric_type IN (
    'accuracy',       -- 精度メトリクス（カテゴリ、優先度、ルーティング等の正解率）
    'usage',          -- 使用量メトリクス（API呼び出し回数、トークン数）
    'performance',    -- パフォーマンスメトリクス（レスポンスタイム、キャッシュヒット率）
    'cost',           -- コストメトリクス（Claude API コスト）
    'user_feedback',  -- ユーザーフィードバック（満足度、採用率）
    'comprehensive'   -- 包括的メトリクス（全データの統合）
  )),

  -- 集計期間
  period_start DATE NOT NULL,                              -- 集計開始日
  period_end DATE NOT NULL,                                -- 集計終了日

  -- メトリクスデータ（JSON形式）
  metrics_data JSONB NOT NULL,                             -- 集計結果（柔軟なデータ構造）

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 制約: 同一メトリクス種別・同一期間は1つのみ
  UNIQUE(metric_type, period_start, period_end)
);

-- インデックス（パフォーマンス最適化）
CREATE INDEX idx_ai_metrics_cache_type ON ai_metrics_cache(metric_type);
CREATE INDEX idx_ai_metrics_cache_period ON ai_metrics_cache(period_start, period_end);
CREATE INDEX idx_ai_metrics_cache_created_at ON ai_metrics_cache(created_at DESC);

-- 複合インデックス（期間別メトリクス検索用）
CREATE INDEX idx_ai_metrics_cache_type_period ON ai_metrics_cache(metric_type, period_start, period_end);

-- GIN インデックス（metrics_data JSONB検索用）
CREATE INDEX idx_ai_metrics_cache_data ON ai_metrics_cache USING GIN(metrics_data);

-- コメント（ドキュメント）
COMMENT ON TABLE ai_metrics_cache IS 'AI精度メトリクスキャッシュ（月次レポート用）。集計結果を保存し、レポート生成を高速化。';
COMMENT ON COLUMN ai_metrics_cache.metric_type IS 'メトリクス種別: accuracy（精度）, usage（使用量）, performance（性能）, cost（コスト）, user_feedback（フィードバック）, comprehensive（包括的）';
COMMENT ON COLUMN ai_metrics_cache.period_start IS '集計開始日（例: 2025-01-01）';
COMMENT ON COLUMN ai_metrics_cache.period_end IS '集計終了日（例: 2025-01-31）';
COMMENT ON COLUMN ai_metrics_cache.metrics_data IS '集計結果（JSON形式）。例: {"category": {"total": 100, "accepted": 92, "accuracy": 92.0}}';

-- metrics_data の JSON スキーマ例（参考）
--
-- 1. accuracy メトリクス:
-- {
--   "category": {
--     "total": 100,
--     "accepted": 92,
--     "rejected": 5,
--     "pending": 3,
--     "accuracy": 92.0,
--     "avg_confidence": 0.87
--   },
--   "priority": { ... },
--   "routing": { ... }
-- }
--
-- 2. usage メトリクス:
-- {
--   "api_calls": 1250,
--   "total_tokens": 1850000,
--   "input_tokens": 1200000,
--   "output_tokens": 650000,
--   "cache_hits": 320,
--   "cache_hit_rate": 25.6
-- }
--
-- 3. performance メトリクス:
-- {
--   "avg_response_time_ms": 2450,
--   "p50_response_time_ms": 2100,
--   "p90_response_time_ms": 3200,
--   "p99_response_time_ms": 5100,
--   "max_response_time_ms": 8500
-- }
--
-- 4. cost メトリクス:
-- {
--   "total_cost_usd": 11.55,
--   "input_cost_usd": 3.60,
--   "output_cost_usd": 7.95,
--   "avg_cost_per_request_usd": 0.0092
-- }
--
-- 5. user_feedback メトリクス:
-- {
--   "total_feedback": 85,
--   "positive_feedback": 72,
--   "negative_feedback": 13,
--   "satisfaction_score": 4.2,
--   "adoption_rate": 84.7
-- }

-- 自動キャッシュ更新関数（月次バッチで実行）
-- 注意: この関数は backend/scripts/update-ai-metrics-cache.ts から呼び出される
CREATE OR REPLACE FUNCTION update_ai_metrics_cache(
  p_metric_type VARCHAR(50),
  p_period_start DATE,
  p_period_end DATE,
  p_metrics_data JSONB
) RETURNS UUID AS $$
DECLARE
  v_cache_id UUID;
BEGIN
  -- INSERT ... ON CONFLICT DO UPDATE パターンで UPSERT
  INSERT INTO ai_metrics_cache (metric_type, period_start, period_end, metrics_data)
  VALUES (p_metric_type, p_period_start, p_period_end, p_metrics_data)
  ON CONFLICT (metric_type, period_start, period_end)
  DO UPDATE SET
    metrics_data = EXCLUDED.metrics_data,
    created_at = CURRENT_TIMESTAMP
  RETURNING cache_id INTO v_cache_id;

  RETURN v_cache_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_ai_metrics_cache IS 'AI精度メトリクスキャッシュのUPSERT関数。月次バッチ処理から呼び出される。';

-- キャッシュ取得用関数（レポート生成で使用）
CREATE OR REPLACE FUNCTION get_ai_metrics_cache(
  p_metric_type VARCHAR(50),
  p_period_start DATE,
  p_period_end DATE
) RETURNS JSONB AS $$
DECLARE
  v_metrics_data JSONB;
BEGIN
  SELECT metrics_data INTO v_metrics_data
  FROM ai_metrics_cache
  WHERE metric_type = p_metric_type
    AND period_start = p_period_start
    AND period_end = p_period_end;

  RETURN v_metrics_data;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_ai_metrics_cache IS 'AI精度メトリクスキャッシュの取得関数。指定期間のメトリクスデータを返す。';

-- キャッシュクリーンアップ関数（古いデータの削除）
-- 注意: 2年以上前のキャッシュは自動削除される（監査保持期間: 2年）
CREATE OR REPLACE FUNCTION cleanup_old_ai_metrics_cache()
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  DELETE FROM ai_metrics_cache
  WHERE created_at < CURRENT_DATE - INTERVAL '2 years';

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_old_ai_metrics_cache IS '2年以上前のAI精度メトリクスキャッシュを削除する。月次メンテナンスで実行。';

-- サンプルクエリ: 最新の精度メトリクスを取得
-- SELECT
--   metric_type,
--   period_start,
--   period_end,
--   metrics_data,
--   created_at
-- FROM ai_metrics_cache
-- WHERE metric_type = 'accuracy'
-- ORDER BY created_at DESC
-- LIMIT 1;

-- サンプルクエリ: 月次推移を取得
-- SELECT
--   TO_CHAR(period_start, 'YYYY-MM') as month,
--   metrics_data->'category'->>'accuracy' as category_accuracy,
--   metrics_data->'priority'->>'accuracy' as priority_accuracy,
--   metrics_data->'routing'->>'accuracy' as routing_accuracy
-- FROM ai_metrics_cache
-- WHERE metric_type = 'accuracy'
--   AND period_start >= CURRENT_DATE - INTERVAL '6 months'
-- ORDER BY period_start;

-- ============================================================================
-- マイグレーション完了
-- ============================================================================
