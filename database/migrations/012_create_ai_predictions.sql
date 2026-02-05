-- AI予測履歴テーブル（追記専用・監査証跡）
-- 目的: AI分類結果の履歴を記録し、精度評価とフィードバックループを実現
-- 重要: このテーブルは追記専用で、一部フィールド（actual_value, was_accepted）を除き UPDATE/DELETE禁止

CREATE TABLE ai_predictions (
  prediction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,

  -- 予測種別
  prediction_type VARCHAR(50) NOT NULL CHECK (prediction_type IN (
    'category',    -- カテゴリ予測
    'priority',    -- 優先度予測
    'assignee',    -- 担当者予測
    'impact',      -- 影響度予測
    'urgency'      -- 緊急度予測
  )),

  -- 予測結果
  predicted_value TEXT NOT NULL,                        -- 予測値（UUID or Enum値）
  confidence_score DECIMAL(5,4) NOT NULL CHECK (        -- 信頼度スコア (0.0-1.0)
    confidence_score >= 0 AND confidence_score <= 1
  ),

  -- フィードバック（実際の値）
  actual_value TEXT,                                    -- 実際に採用された値
  was_accepted BOOLEAN,                                 -- NULL=未決定, TRUE=採用, FALSE=却下

  -- AI判断の根拠（監査・説明可能性）
  rationale JSONB,                                      -- {"reasoning": "...", "keywords": [...], "similar_tickets": [...]}

  -- モデル情報
  model_version VARCHAR(50) NOT NULL,                   -- 使用したAIモデルバージョン（例: 'claude-3-haiku-20240307'）
  processing_time_ms INTEGER,                           -- レスポンスタイム計測（パフォーマンス分析用）

  -- タイムスタンプ（追記専用のため updated_at なし）
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 予測をリクエストしたユーザー（監査用）
  created_by UUID NOT NULL REFERENCES users(user_id) ON DELETE SET NULL
);

-- インデックス（パフォーマンス最適化）
CREATE INDEX idx_ai_predictions_ticket ON ai_predictions(ticket_id);
CREATE INDEX idx_ai_predictions_type ON ai_predictions(prediction_type);
CREATE INDEX idx_ai_predictions_created_at ON ai_predictions(created_at DESC);
CREATE INDEX idx_ai_predictions_confidence ON ai_predictions(confidence_score DESC);
CREATE INDEX idx_ai_predictions_created_by ON ai_predictions(created_by);

-- 複合インデックス（精度分析用）
CREATE INDEX idx_ai_predictions_type_accepted ON ai_predictions(prediction_type, was_accepted)
  WHERE was_accepted IS NOT NULL;

-- GIN インデックス（rationale JSONB検索用）
CREATE INDEX idx_ai_predictions_rationale ON ai_predictions USING GIN(rationale);

-- 追記専用テーブルの保護トリガー
-- 注意: actual_value と was_accepted のみ更新可能（フィードバック用）
CREATE OR REPLACE FUNCTION prevent_ai_predictions_modification()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    RAISE EXCEPTION 'ai_predictions テーブルは削除禁止です。監査証跡を維持するため、DELETE操作はできません。';
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- 更新禁止フィールドのチェック
    IF (OLD.prediction_id <> NEW.prediction_id OR
        OLD.ticket_id <> NEW.ticket_id OR
        OLD.prediction_type <> NEW.prediction_type OR
        OLD.predicted_value <> NEW.predicted_value OR
        OLD.confidence_score <> NEW.confidence_score OR
        OLD.model_version <> NEW.model_version OR
        OLD.created_at <> NEW.created_at OR
        OLD.created_by <> NEW.created_by OR
        (OLD.rationale IS DISTINCT FROM NEW.rationale) OR
        (OLD.processing_time_ms IS DISTINCT FROM NEW.processing_time_ms)
    ) THEN
      RAISE EXCEPTION 'ai_predictions テーブルの予測結果フィールドは変更不可です。actual_value と was_accepted のみ更新できます。';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_ai_predictions_immutable
BEFORE UPDATE OR DELETE ON ai_predictions
FOR EACH ROW
EXECUTE FUNCTION prevent_ai_predictions_modification();

-- 自動評価トリガー（チケット値確定時にAI予測を評価）
CREATE OR REPLACE FUNCTION update_ai_prediction_evaluation()
RETURNS TRIGGER AS $$
BEGIN
  -- カテゴリ評価
  IF (OLD.category_id IS DISTINCT FROM NEW.category_id) AND (NEW.category_id IS NOT NULL) THEN
    UPDATE ai_predictions
    SET actual_value = NEW.category_id::TEXT,
        was_accepted = (predicted_value = NEW.category_id::TEXT)
    WHERE ticket_id = NEW.ticket_id
      AND prediction_type = 'category'
      AND actual_value IS NULL;
  END IF;

  -- 優先度評価
  IF (OLD.priority IS DISTINCT FROM NEW.priority) AND (NEW.priority IS NOT NULL) THEN
    UPDATE ai_predictions
    SET actual_value = NEW.priority,
        was_accepted = (predicted_value = NEW.priority)
    WHERE ticket_id = NEW.ticket_id
      AND prediction_type = 'priority'
      AND actual_value IS NULL;
  END IF;

  -- 担当者評価
  IF (OLD.assignee_id IS DISTINCT FROM NEW.assignee_id) AND (NEW.assignee_id IS NOT NULL) THEN
    UPDATE ai_predictions
    SET actual_value = NEW.assignee_id::TEXT,
        was_accepted = (predicted_value = NEW.assignee_id::TEXT)
    WHERE ticket_id = NEW.ticket_id
      AND prediction_type = 'assignee'
      AND actual_value IS NULL;
  END IF;

  -- 影響度評価
  IF (OLD.impact IS DISTINCT FROM NEW.impact) AND (NEW.impact IS NOT NULL) THEN
    UPDATE ai_predictions
    SET actual_value = NEW.impact,
        was_accepted = (predicted_value = NEW.impact)
    WHERE ticket_id = NEW.ticket_id
      AND prediction_type = 'impact'
      AND actual_value IS NULL;
  END IF;

  -- 緊急度評価
  IF (OLD.urgency IS DISTINCT FROM NEW.urgency) AND (NEW.urgency IS NOT NULL) THEN
    UPDATE ai_predictions
    SET actual_value = NEW.urgency,
        was_accepted = (predicted_value = NEW.urgency)
    WHERE ticket_id = NEW.ticket_id
      AND prediction_type = 'urgency'
      AND actual_value IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_ai_prediction_evaluation
AFTER UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION update_ai_prediction_evaluation();

-- コメント（ドキュメント）
COMMENT ON TABLE ai_predictions IS 'AI分類予測の履歴（追記専用・監査証跡）。actual_value/was_accepted のみ更新可能。';
COMMENT ON COLUMN ai_predictions.prediction_type IS '予測種別: category（カテゴリ）, priority（優先度）, assignee（担当者）, impact（影響度）, urgency（緊急度）';
COMMENT ON COLUMN ai_predictions.confidence_score IS '信頼度スコア（0.0-1.0）。0.8以上を高信頼度とする。';
COMMENT ON COLUMN ai_predictions.rationale IS 'AI判断の根拠（JSON形式）。例: {"reasoning": "...", "keywords": ["Outlook", "添付ファイル"], "similar_tickets": ["ticket-123"]}';
COMMENT ON COLUMN ai_predictions.was_accepted IS 'NULL=未決定, TRUE=採用, FALSE=却下。チケット更新時に自動評価される。';
