-- ============================================================================
-- マイグレーション: 014_add_ai_routing_logs.sql
-- 目的: AIルーティング判定履歴テーブルの追加
-- 作成日: 2026-02-04
-- 説明:
--   - ai_routing_logs テーブルを作成（サービス要求のルーティング判定履歴）
--   - 承認必要性、推奨担当者、推奨承認者を記録
--   - フィードバックループによる精度改善を実現
-- ============================================================================

-- AIルーティング履歴テーブル
-- 目的: サービス要求のルーティング判定（承認必要性・担当者・承認者）を記録し、精度評価を行う
CREATE TABLE ai_routing_logs (
  routing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,

  -- ルーティング判定結果
  requires_approval BOOLEAN NOT NULL,                      -- 承認が必要か（true/false）
  approval_reason TEXT,                                    -- 承認が必要な理由（承認必要時のみ）
  suggested_approver_id UUID REFERENCES users(user_id),   -- 推奨承認者のUUID
  suggested_assignee_id UUID NOT NULL REFERENCES users(user_id), -- 推奨担当者のUUID（必須）

  -- AI判断の根拠（監査・説明可能性）
  rationale JSONB NOT NULL,                                -- {"reasoning": "...", "matched_rules": ["RULE_LICENSE_CHANGE"]}
  confidence_score DECIMAL(5,4) NOT NULL CHECK (           -- 信頼度スコア (0.0-1.0)
    confidence_score >= 0 AND confidence_score <= 1
  ),

  -- フィードバック（実際の値）
  was_accepted BOOLEAN,                                    -- NULL=未決定, TRUE=採用, FALSE=却下
  actual_assignee_id UUID REFERENCES users(user_id),      -- 実際に割り当てられた担当者

  -- モデル情報
  model_version VARCHAR(50) NOT NULL,                      -- 使用したAIモデルバージョン（例: 'claude-sonnet-4-5-20250929'）
  processing_time_ms INTEGER,                              -- レスポンスタイム計測（パフォーマンス分析用）

  -- タイムスタンプ（追記専用のため updated_at なし）
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- ルーティングをリクエストしたユーザー（監査用）
  created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE SET NULL
);

-- インデックス（パフォーマンス最適化）
CREATE INDEX idx_ai_routing_ticket ON ai_routing_logs(ticket_id);
CREATE INDEX idx_ai_routing_created_at ON ai_routing_logs(created_at DESC);
CREATE INDEX idx_ai_routing_created_by ON ai_routing_logs(created_by);
CREATE INDEX idx_ai_routing_suggested_assignee ON ai_routing_logs(suggested_assignee_id);
CREATE INDEX idx_ai_routing_suggested_approver ON ai_routing_logs(suggested_approver_id);

-- 複合インデックス（精度分析用）
CREATE INDEX idx_ai_routing_acceptance ON ai_routing_logs(was_accepted)
  WHERE was_accepted IS NOT NULL;

-- 複合インデックス（承認必要性分析用）
CREATE INDEX idx_ai_routing_approval_required ON ai_routing_logs(requires_approval, was_accepted);

-- GIN インデックス（rationale JSONB検索用）
CREATE INDEX idx_ai_routing_rationale ON ai_routing_logs USING GIN(rationale);

-- 追記専用テーブルの保護トリガー
-- 注意: was_accepted と actual_assignee_id のみ更新可能（フィードバック用）
CREATE OR REPLACE FUNCTION prevent_ai_routing_logs_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'ai_routing_logs テーブルは削除禁止です。監査証跡を維持するため、DELETE操作はできません。';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- 更新禁止フィールドのチェック（フィードバック用フィールド以外）
    IF (OLD.routing_id <> NEW.routing_id OR
        OLD.ticket_id <> NEW.ticket_id OR
        OLD.requires_approval <> NEW.requires_approval OR
        (OLD.approval_reason IS DISTINCT FROM NEW.approval_reason) OR
        (OLD.suggested_approver_id IS DISTINCT FROM NEW.suggested_approver_id) OR
        OLD.suggested_assignee_id <> NEW.suggested_assignee_id OR
        (OLD.rationale IS DISTINCT FROM NEW.rationale) OR
        OLD.confidence_score <> NEW.confidence_score OR
        OLD.model_version <> NEW.model_version OR
        (OLD.processing_time_ms IS DISTINCT FROM NEW.processing_time_ms) OR
        OLD.created_at <> NEW.created_at OR
        OLD.created_by <> NEW.created_by
    ) THEN
      RAISE EXCEPTION 'ai_routing_logs テーブルのルーティング結果フィールドは変更不可です。was_accepted と actual_assignee_id のみ更新できます。';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ai_routing_logs_immutable
BEFORE UPDATE OR DELETE ON ai_routing_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_ai_routing_logs_modification();

-- 自動評価トリガー（チケット担当者確定時にAI予測を評価）
CREATE OR REPLACE FUNCTION update_ai_routing_evaluation()
RETURNS TRIGGER AS $$
BEGIN
  -- 担当者が割り当てられた/変更された場合
  IF (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) AND (NEW.assignee_id IS NOT NULL) THEN
    UPDATE ai_routing_logs
    SET actual_assignee_id = NEW.assignee_id,
        was_accepted = (suggested_assignee_id = NEW.assignee_id)
    WHERE ticket_id = NEW.ticket_id
      AND actual_assignee_id IS NULL
      AND created_at > NEW.created_at - INTERVAL '1 hour'; -- 直近1時間以内のルーティングログのみ評価
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_ai_routing_evaluation
AFTER UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION update_ai_routing_evaluation();

-- コメント（ドキュメント）
COMMENT ON TABLE ai_routing_logs IS 'AIルーティング判定の履歴（追記専用・監査証跡）。was_accepted/actual_assignee_id のみ更新可能。';
COMMENT ON COLUMN ai_routing_logs.requires_approval IS '承認が必要かの判定結果（true/false）。';
COMMENT ON COLUMN ai_routing_logs.approval_reason IS '承認が必要な理由（日本語）。例: "ライセンス変更は財務影響があるため"';
COMMENT ON COLUMN ai_routing_logs.suggested_approver_id IS '推奨承認者のUUID。承認が必要な場合のみ設定。';
COMMENT ON COLUMN ai_routing_logs.suggested_assignee_id IS '推奨担当者のUUID。必須フィールド。';
COMMENT ON COLUMN ai_routing_logs.rationale IS 'AI判断の根拠（JSON形式）。例: {"reasoning": "...", "matched_rules": ["RULE_LICENSE_CHANGE"]}';
COMMENT ON COLUMN ai_routing_logs.confidence_score IS '信頼度スコア（0.0-1.0）。0.9以上を高信頼度とする。';
COMMENT ON COLUMN ai_routing_logs.was_accepted IS 'NULL=未決定, TRUE=採用, FALSE=却下。チケット担当者割当時に自動評価される。';
COMMENT ON COLUMN ai_routing_logs.actual_assignee_id IS '実際に割り当てられた担当者。フィードバック用。';

-- 精度分析用サンプルクエリ
-- SELECT
--   model_version,
--   COUNT(*) as total,
--   SUM(CASE WHEN was_accepted = true THEN 1 ELSE 0 END) as accepted,
--   SUM(CASE WHEN was_accepted = false THEN 1 ELSE 0 END) as rejected,
--   SUM(CASE WHEN was_accepted IS NULL THEN 1 ELSE 0 END) as pending,
--   ROUND(
--     SUM(CASE WHEN was_accepted = true THEN 1 ELSE 0 END)::numeric /
--     NULLIF(SUM(CASE WHEN was_accepted IS NOT NULL THEN 1 ELSE 0 END), 0) * 100,
--     2
--   ) as accuracy_percentage
-- FROM ai_routing_logs
-- WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
-- GROUP BY model_version;

-- ============================================================================
-- マイグレーション完了
-- ============================================================================
