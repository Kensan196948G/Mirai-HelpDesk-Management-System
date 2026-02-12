-- Microsoft 365 実施ログテーブル（追記専用・監査証跡）
-- 重要: このテーブルは追記専用で、UPDATE/DELETE禁止
CREATE TYPE m365_execution_method AS ENUM (
  'admin_center',     -- 管理センター（GUI）
  'powershell',       -- PowerShell
  'graph_api',        -- Graph API
  'manual'            -- 手動（その他）
);

CREATE TYPE m365_execution_result AS ENUM (
  'success',          -- 成功
  'partial_success',  -- 部分的成功
  'failed'            -- 失敗
);

CREATE TABLE m365_execution_logs (
  exec_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES m365_tasks(task_id) ON DELETE RESTRICT,
  ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE RESTRICT,

  -- 実施者（誰が）
  operator_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  operator_name VARCHAR(255) NOT NULL, -- 実施時点の表示名（履歴保存のため）

  -- 実施方法（どのように）
  method m365_execution_method NOT NULL,

  -- 実施内容（何を）
  command_or_screen TEXT NOT NULL, -- PowerShellコマンドまたは操作画面の説明

  -- 実施結果
  result m365_execution_result NOT NULL,
  result_message TEXT, -- 結果の詳細メッセージ

  -- エビデンス（必須）
  evidence_attachment_id UUID REFERENCES ticket_attachments(attachment_id) ON DELETE RESTRICT,

  -- ロールバック手順（変更操作の場合は必須）
  rollback_procedure TEXT,

  -- Graph API レスポンス（JSON）
  graph_api_response JSONB,

  -- タイムスタンプ（追記専用のため updated_at なし）
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 監査情報
  ip_address INET,
  user_agent TEXT,

  -- 制約
  CONSTRAINT evidence_required CHECK (evidence_attachment_id IS NOT NULL)
);

-- インデックス
CREATE INDEX idx_m365_execution_logs_task ON m365_execution_logs(task_id);
CREATE INDEX idx_m365_execution_logs_ticket ON m365_execution_logs(ticket_id);
CREATE INDEX idx_m365_execution_logs_operator ON m365_execution_logs(operator_id);
CREATE INDEX idx_m365_execution_logs_method ON m365_execution_logs(method);
CREATE INDEX idx_m365_execution_logs_result ON m365_execution_logs(result);
CREATE INDEX idx_m365_execution_logs_created_at ON m365_execution_logs(created_at DESC);

-- 追記専用テーブルの保護（UPDATE/DELETE禁止）
CREATE OR REPLACE FUNCTION prevent_m365_execution_logs_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'm365_execution_logs テーブルは追記専用です。UPDATE/DELETEは禁止されています。';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER prevent_m365_execution_logs_update
BEFORE UPDATE ON m365_execution_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_m365_execution_logs_modification();

CREATE TRIGGER prevent_m365_execution_logs_delete
BEFORE DELETE ON m365_execution_logs
FOR EACH ROW
EXECUTE FUNCTION prevent_m365_execution_logs_modification();

-- SOD（職務分離）チェック関数
-- 同一チケットで承認者 ≠ 実施者 を検証
CREATE OR REPLACE FUNCTION check_sod_violation()
RETURNS TRIGGER AS $$
DECLARE
  approval_approver_id UUID;
BEGIN
  -- 関連する承認の承認者を取得
  SELECT approver_id INTO approval_approver_id
  FROM approvals
  WHERE approval_id = (
    SELECT approval_id
    FROM m365_tasks
    WHERE task_id = NEW.task_id
  );

  -- approval_id が NULL の場合はSODチェックをスキップ（承認不要タスク）
  IF approval_approver_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- SOD違反チェック: 承認者 ≠ 実施者
  IF approval_approver_id = NEW.operator_id THEN
    RAISE EXCEPTION 'SOD違反: 承認者と実施者が同一です。承認者(%)と実施者(%)は異なるユーザーである必要があります。',
      approval_approver_id, NEW.operator_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_sod_violation_trigger
BEFORE INSERT ON m365_execution_logs
FOR EACH ROW
EXECUTE FUNCTION check_sod_violation();

-- コメント
COMMENT ON TABLE m365_execution_logs IS '【追記専用】M365実施ログ - 監査に必須（UPDATE/DELETE禁止）';
COMMENT ON COLUMN m365_execution_logs.operator_name IS '実施時点の表示名（削除されても履歴保持）';
COMMENT ON COLUMN m365_execution_logs.command_or_screen IS 'PowerShellコマンドまたは管理センター操作画面の説明';
COMMENT ON COLUMN m365_execution_logs.evidence_attachment_id IS 'エビデンス添付（スクショまたはコマンド出力）- 必須';
COMMENT ON CONSTRAINT evidence_required ON m365_execution_logs IS 'エビデンス添付は必須（監査用）';
