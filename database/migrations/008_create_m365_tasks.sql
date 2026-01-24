-- Microsoft 365 タスクテーブル
CREATE TYPE m365_task_type AS ENUM (
  'license_assign',       -- ライセンス付与
  'license_remove',       -- ライセンス剥奪
  'password_reset',       -- パスワードリセット
  'mfa_reset',            -- MFA/認証方法リセット
  'mailbox_permission',   -- メールボックス権限（フルアクセス/送信代理）
  'group_membership',     -- グループ/配布リスト追加
  'teams_create',         -- Teams作成
  'teams_owner_change',   -- Teams所有者変更
  'onedrive_restore',     -- OneDriveリストア
  'onedrive_share_remove',-- OneDrive共有解除
  'offboarding'           -- 退職者処理
);

CREATE TYPE m365_task_state AS ENUM (
  'pending',              -- 承認待ち
  'approved',             -- 承認済み・実施待ち
  'in_progress',          -- 実施中
  'completed',            -- 完了
  'failed',               -- 失敗
  'canceled'              -- 取消
);

CREATE TABLE m365_tasks (
  task_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,

  -- タスク種別
  task_type m365_task_type NOT NULL,
  state m365_task_state NOT NULL DEFAULT 'pending',

  -- 対象（ユーザー・リソース）
  target_upn VARCHAR(255), -- User Principal Name（メールアドレス）
  target_resource_id VARCHAR(500), -- グループID、TeamsID等
  target_resource_name VARCHAR(500),

  -- タスク詳細（JSON形式で柔軟に対応）
  task_details JSONB NOT NULL,

  -- 承認情報
  approval_id UUID REFERENCES approvals(approval_id) ON DELETE SET NULL,

  -- 実施予定・実施者
  scheduled_at TIMESTAMP WITH TIME ZONE,
  operator_id UUID REFERENCES users(user_id) ON DELETE SET NULL,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE,

  -- 制約
  CONSTRAINT approval_required CHECK (
    state != 'approved' OR approval_id IS NOT NULL
  )
);

-- インデックス
CREATE INDEX idx_m365_tasks_ticket ON m365_tasks(ticket_id);
CREATE INDEX idx_m365_tasks_type ON m365_tasks(task_type);
CREATE INDEX idx_m365_tasks_state ON m365_tasks(state);
CREATE INDEX idx_m365_tasks_target_upn ON m365_tasks(target_upn);
CREATE INDEX idx_m365_tasks_operator ON m365_tasks(operator_id);
CREATE INDEX idx_m365_tasks_scheduled_at ON m365_tasks(scheduled_at);

-- 更新日時トリガー
CREATE TRIGGER update_m365_tasks_updated_at
BEFORE UPDATE ON m365_tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE m365_tasks IS 'Microsoft 365 操作タスク - 承認フローと実施管理';
COMMENT ON COLUMN m365_tasks.target_upn IS '対象ユーザーのUPN（メールアドレス）';
COMMENT ON COLUMN m365_tasks.task_details IS 'タスク詳細（JSON）- ライセンスSKU、権限種別等';
COMMENT ON CONSTRAINT approval_required ON m365_tasks IS '承認済み状態には approval_id が必須';
