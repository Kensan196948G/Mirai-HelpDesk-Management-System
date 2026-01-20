-- 承認テーブル
CREATE TYPE approval_state AS ENUM (
  'requested',  -- 承認依頼中
  'approved',   -- 承認済み
  'rejected'    -- 却下
);

CREATE TABLE approvals (
  approval_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,

  -- 承認者
  approver_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,

  -- 依頼者（誰が承認依頼を出したか）
  requester_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,

  -- 承認状態
  state approval_state NOT NULL DEFAULT 'requested',

  -- 承認/却下のコメント
  comment TEXT,

  -- 承認/却下理由（必須）
  reason TEXT,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP WITH TIME ZONE, -- 承認/却下された日時

  -- 制約
  CONSTRAINT comment_required_on_rejection CHECK (
    state != 'rejected' OR (reason IS NOT NULL AND LENGTH(TRIM(reason)) > 0)
  ),
  CONSTRAINT no_self_approval CHECK (approver_id != requester_id)
);

-- インデックス
CREATE INDEX idx_approvals_ticket ON approvals(ticket_id);
CREATE INDEX idx_approvals_approver ON approvals(approver_id);
CREATE INDEX idx_approvals_state ON approvals(state);
CREATE INDEX idx_approvals_created_at ON approvals(created_at DESC);

-- 更新日時トリガー
CREATE TRIGGER update_approvals_updated_at
BEFORE UPDATE ON approvals
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 承認/却下時に responded_at を自動設定
CREATE OR REPLACE FUNCTION set_approval_responded_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.state IN ('approved', 'rejected') AND OLD.state = 'requested' THEN
    NEW.responded_at := CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_approval_responded_at_trigger
BEFORE UPDATE ON approvals
FOR EACH ROW
EXECUTE FUNCTION set_approval_responded_at();

-- コメント
COMMENT ON TABLE approvals IS '承認テーブル - 特権操作の承認フロー';
COMMENT ON CONSTRAINT no_self_approval ON approvals IS 'SOD原則: 自己承認禁止';
COMMENT ON COLUMN approvals.reason IS '承認/却下理由（監査用）';
