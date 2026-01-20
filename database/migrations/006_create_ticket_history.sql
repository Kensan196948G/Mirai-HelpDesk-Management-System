-- チケット履歴テーブル（追記専用・監査証跡）
-- 重要: このテーブルは追記専用で、UPDATE/DELETE禁止
CREATE TABLE ticket_history (
  history_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE RESTRICT,

  -- 操作者（監査用）
  actor_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  actor_name VARCHAR(255) NOT NULL, -- 操作時点の表示名（履歴保存のため）

  -- 操作内容
  action VARCHAR(100) NOT NULL, -- 例: 'status_change', 'assigned', 'commented', 'closed'

  -- 変更内容（JSON形式）
  before_value JSONB,
  after_value JSONB,

  -- 説明
  description TEXT,

  -- タイムスタンプ（追記専用のため updated_at なし）
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- IP アドレス（監査用）
  ip_address INET,
  user_agent TEXT
);

-- インデックス
CREATE INDEX idx_ticket_history_ticket ON ticket_history(ticket_id);
CREATE INDEX idx_ticket_history_actor ON ticket_history(actor_id);
CREATE INDEX idx_ticket_history_action ON ticket_history(action);
CREATE INDEX idx_ticket_history_created_at ON ticket_history(created_at DESC);

-- 追記専用テーブルの保護（UPDATE/DELETE禁止）
CREATE OR REPLACE FUNCTION prevent_ticket_history_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'ticket_history テーブルは追記専用です。UPDATE/DELETEは禁止されています。';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_ticket_history_update
BEFORE UPDATE ON ticket_history
FOR EACH ROW
EXECUTE FUNCTION prevent_ticket_history_modification();

CREATE TRIGGER prevent_ticket_history_delete
BEFORE DELETE ON ticket_history
FOR EACH ROW
EXECUTE FUNCTION prevent_ticket_history_modification();

-- 自動履歴記録トリガー（チケット更新時）
CREATE OR REPLACE FUNCTION log_ticket_changes()
RETURNS TRIGGER AS $$
DECLARE
  change_description TEXT;
  actor_display_name VARCHAR(255);
BEGIN
  -- 操作者の表示名を取得
  SELECT display_name INTO actor_display_name
  FROM users
  WHERE user_id = NEW.updated_by_user_id; -- このカラムは後で追加する必要がある

  -- ステータス変更の記録
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ticket_history (
      ticket_id, actor_id, actor_name, action,
      before_value, after_value, description
    ) VALUES (
      NEW.ticket_id,
      NEW.updated_by_user_id,
      COALESCE(actor_display_name, 'System'),
      'status_change',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      'ステータスを ' || OLD.status || ' から ' || NEW.status || ' に変更'
    );
  END IF;

  -- 担当者変更の記録
  IF OLD.assignee_id IS DISTINCT FROM NEW.assignee_id THEN
    INSERT INTO ticket_history (
      ticket_id, actor_id, actor_name, action,
      before_value, after_value, description
    ) VALUES (
      NEW.ticket_id,
      NEW.updated_by_user_id,
      COALESCE(actor_display_name, 'System'),
      'assignee_change',
      jsonb_build_object('assignee_id', OLD.assignee_id),
      jsonb_build_object('assignee_id', NEW.assignee_id),
      '担当者を変更'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 注: このトリガーは tickets テーブルに updated_by_user_id カラムを追加した後に有効化する

-- コメント
COMMENT ON TABLE ticket_history IS '【追記専用】チケット履歴 - 変更不可の監査証跡（UPDATE/DELETE禁止）';
COMMENT ON COLUMN ticket_history.action IS '操作種別: status_change, assigned, commented, closed等';
COMMENT ON COLUMN ticket_history.before_value IS '変更前の値（JSON形式）';
COMMENT ON COLUMN ticket_history.after_value IS '変更後の値（JSON形式）';
