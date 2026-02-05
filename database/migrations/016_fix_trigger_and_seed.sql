-- 016: tickets テーブルに updated_by_user_id カラムを追加し、
--      log_ticket_changes トリガーを有効化する

-- 1. tickets テーブルに updated_by_user_id カラムを追加
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS updated_by_user_id UUID REFERENCES users(user_id) ON DELETE SET NULL;

COMMENT ON COLUMN tickets.updated_by_user_id IS '最終更新者（トリガーによる履歴記録で使用）';

-- 2. log_ticket_changes トリガー関数を再定義（NULL安全版）
CREATE OR REPLACE FUNCTION log_ticket_changes()
RETURNS TRIGGER AS $$
DECLARE
  change_description TEXT;
  actor_display_name VARCHAR(255);
  actor_uuid UUID;
BEGIN
  -- 操作者IDを取得（updated_by_user_id が NULL の場合は requester_id をフォールバック）
  actor_uuid := COALESCE(NEW.updated_by_user_id, NEW.requester_id);

  -- 操作者の表示名を取得
  SELECT display_name INTO actor_display_name
  FROM users
  WHERE user_id = actor_uuid;

  -- ステータス変更の記録
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO ticket_history (
      ticket_id, actor_id, actor_name, action,
      before_value, after_value, description
    ) VALUES (
      NEW.ticket_id,
      actor_uuid,
      COALESCE(actor_display_name, 'System'),
      'status_change',
      jsonb_build_object('status', OLD.status::text),
      jsonb_build_object('status', NEW.status::text),
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
      actor_uuid,
      COALESCE(actor_display_name, 'System'),
      'assignee_change',
      jsonb_build_object('assignee_id', OLD.assignee_id::text),
      jsonb_build_object('assignee_id', NEW.assignee_id::text),
      '担当者を変更'
    );
  END IF;

  -- 優先度変更の記録
  IF OLD.priority IS DISTINCT FROM NEW.priority THEN
    INSERT INTO ticket_history (
      ticket_id, actor_id, actor_name, action,
      before_value, after_value, description
    ) VALUES (
      NEW.ticket_id,
      actor_uuid,
      COALESCE(actor_display_name, 'System'),
      'priority_change',
      jsonb_build_object('priority', OLD.priority::text),
      jsonb_build_object('priority', NEW.priority::text),
      '優先度を ' || OLD.priority || ' から ' || NEW.priority || ' に変更'
    );
  END IF;

  -- updated_by_user_id をリセット（次回の更新で正しく設定されるようにする）
  NEW.updated_by_user_id := NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. トリガーを有効化（既存のトリガーがあれば削除してから再作成）
DROP TRIGGER IF EXISTS log_ticket_changes_trigger ON tickets;

CREATE TRIGGER log_ticket_changes_trigger
AFTER UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION log_ticket_changes();

-- コメント
COMMENT ON FUNCTION log_ticket_changes() IS 'チケット更新時に自動的に履歴を記録するトリガー関数';
