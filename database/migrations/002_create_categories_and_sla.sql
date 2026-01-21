-- カテゴリテーブル
CREATE TABLE categories (
  category_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parent_category_id UUID REFERENCES categories(category_id) ON DELETE SET NULL,

  -- 階層構造用
  path VARCHAR(1000), -- 例: "/M365/Exchange/メールボックス"
  level INTEGER NOT NULL DEFAULT 0,

  -- 表示順
  sort_order INTEGER NOT NULL DEFAULT 0,

  -- 状態
  is_active BOOLEAN NOT NULL DEFAULT TRUE,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- インデックス
CREATE INDEX idx_categories_parent ON categories(parent_category_id);
CREATE INDEX idx_categories_path ON categories(path);
CREATE INDEX idx_categories_active ON categories(is_active);

-- 更新日時トリガー
CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- SLAポリシーテーブル
CREATE TYPE priority_level AS ENUM ('P1', 'P2', 'P3', 'P4');
CREATE TYPE impact_level AS ENUM ('個人', '部署', '全社', '対外影響');
CREATE TYPE urgency_level AS ENUM ('低', '中', '高', '即時');

CREATE TABLE sla_policies (
  sla_policy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- 優先度
  priority priority_level NOT NULL,

  -- Impact × Urgency マトリクス
  impact impact_level,
  urgency urgency_level,

  -- SLA時間（分単位）
  response_time_minutes INTEGER NOT NULL, -- 初動対応時間
  resolution_time_minutes INTEGER NOT NULL, -- 解決時間

  -- 営業時間考慮
  business_hours_only BOOLEAN NOT NULL DEFAULT FALSE,

  -- 状態
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 制約
  CONSTRAINT unique_priority_impact_urgency UNIQUE (priority, impact, urgency)
);

-- インデックス
CREATE INDEX idx_sla_priority ON sla_policies(priority);
CREATE INDEX idx_sla_active ON sla_policies(is_active);

-- 更新日時トリガー
CREATE TRIGGER update_sla_policies_updated_at
BEFORE UPDATE ON sla_policies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE categories IS 'チケットカテゴリ（階層構造）';
COMMENT ON TABLE sla_policies IS 'SLAポリシー - 優先度別の対応時間定義';
COMMENT ON COLUMN sla_policies.response_time_minutes IS '初動対応時間（分）';
COMMENT ON COLUMN sla_policies.resolution_time_minutes IS '解決時間（分）';
