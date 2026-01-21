-- チケットテーブル（メインエンティティ）
CREATE TYPE ticket_type AS ENUM (
  'incident',        -- インシデント（障害・不具合）
  'service_request', -- サービス要求（依頼）
  'change',          -- 変更管理
  'problem'          -- 問題管理（将来拡張）
);

CREATE TYPE ticket_status AS ENUM (
  'new',                    -- 新規
  'triage',                 -- 受付・分類中
  'assigned',               -- 担当割当済
  'in_progress',            -- 対応中
  'pending_customer',       -- 利用者回答待ち
  'pending_approval',       -- 承認待ち
  'pending_change_window',  -- 実施待ち（時間帯指定）
  'resolved',               -- 解決（クローズ待ち）
  'closed',                 -- 完了
  'canceled',               -- 取消
  'reopened'                -- 再開
);

CREATE TABLE tickets (
  ticket_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number VARCHAR(50) UNIQUE NOT NULL, -- 例: "HD-2024-00001"

  -- 基本情報
  type ticket_type NOT NULL,
  subject VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,

  -- ステータス
  status ticket_status NOT NULL DEFAULT 'new',

  -- 優先度（自動計算）
  priority priority_level NOT NULL,
  impact impact_level NOT NULL,
  urgency urgency_level NOT NULL,

  -- 関係者
  requester_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  assignee_id UUID REFERENCES users(user_id) ON DELETE SET NULL,

  -- カテゴリとSLA
  category_id UUID REFERENCES categories(category_id) ON DELETE SET NULL,
  sla_policy_id UUID REFERENCES sla_policies(sla_policy_id) ON DELETE SET NULL,

  -- 期限管理
  due_at TIMESTAMP WITH TIME ZONE, -- SLA期限
  response_due_at TIMESTAMP WITH TIME ZONE, -- 初動対応期限

  -- 解決情報
  resolution_summary TEXT,
  root_cause TEXT,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,
  closed_at TIMESTAMP WITH TIME ZONE,

  -- 制約
  CONSTRAINT valid_dates CHECK (
    (resolved_at IS NULL OR resolved_at >= created_at) AND
    (closed_at IS NULL OR closed_at >= created_at) AND
    (closed_at IS NULL OR resolved_at IS NULL OR closed_at >= resolved_at)
  )
);

-- チケット番号の自動生成関数
CREATE SEQUENCE ticket_number_seq START 1;

CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'HD-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' ||
                        LPAD(nextval('ticket_number_seq')::TEXT, 5, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_ticket_number_trigger
BEFORE INSERT ON tickets
FOR EACH ROW
EXECUTE FUNCTION generate_ticket_number();

-- 優先度自動計算関数（Impact × Urgency マトリクス）
CREATE OR REPLACE FUNCTION calculate_priority()
RETURNS TRIGGER AS $$
BEGIN
  -- Impact × Urgency の組み合わせで優先度を自動計算
  IF NEW.impact = '対外影響' OR NEW.urgency = '即時' THEN
    NEW.priority := 'P1';
  ELSIF NEW.impact = '全社' AND NEW.urgency IN ('高', '即時') THEN
    NEW.priority := 'P1';
  ELSIF NEW.impact IN ('全社', '部署') AND NEW.urgency = '高' THEN
    NEW.priority := 'P2';
  ELSIF NEW.impact = '部署' AND NEW.urgency = '中' THEN
    NEW.priority := 'P2';
  ELSIF NEW.impact IN ('部署', '個人') AND NEW.urgency IN ('中', '高') THEN
    NEW.priority := 'P3';
  ELSE
    NEW.priority := 'P4';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_priority_trigger
BEFORE INSERT OR UPDATE OF impact, urgency ON tickets
FOR EACH ROW
EXECUTE FUNCTION calculate_priority();

-- インデックス
CREATE INDEX idx_tickets_ticket_number ON tickets(ticket_number);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_requester ON tickets(requester_id);
CREATE INDEX idx_tickets_assignee ON tickets(assignee_id);
CREATE INDEX idx_tickets_category ON tickets(category_id);
CREATE INDEX idx_tickets_due_at ON tickets(due_at);
CREATE INDEX idx_tickets_created_at ON tickets(created_at DESC);

-- 更新日時トリガー
CREATE TRIGGER update_tickets_updated_at
BEFORE UPDATE ON tickets
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE tickets IS 'チケットテーブル - すべてのヘルプデスク要求の主要エンティティ';
COMMENT ON COLUMN tickets.ticket_number IS 'チケット番号（HD-YYYY-00001形式）';
COMMENT ON COLUMN tickets.priority IS '優先度（Impact × Urgencyから自動計算）';
COMMENT ON COLUMN tickets.due_at IS 'SLA期限（解決期限）';
COMMENT ON COLUMN tickets.response_due_at IS '初動対応期限';
