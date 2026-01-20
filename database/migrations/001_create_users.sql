-- ユーザーテーブル
-- 認証は Entra ID SSO を想定しているが、ローカルキャッシュとして管理

CREATE TYPE user_role AS ENUM (
  'requester',      -- 一般社員（依頼者）
  'agent',          -- 一次対応
  'm365_operator',  -- M365特権作業者
  'approver',       -- 承認者
  'manager',        -- 運用管理者
  'auditor'         -- 監査閲覧
);

CREATE TYPE user_status AS ENUM (
  'active',
  'inactive',
  'suspended'
);

CREATE TABLE users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  display_name VARCHAR(255) NOT NULL,
  department VARCHAR(255),
  role user_role NOT NULL DEFAULT 'requester',
  status user_status NOT NULL DEFAULT 'active',

  -- Entra ID連携
  azure_object_id VARCHAR(255) UNIQUE,

  -- 認証情報（SSO使用時は不要だが、開発環境用に用意）
  password_hash VARCHAR(255),

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP WITH TIME ZONE,

  -- インデックス
  CONSTRAINT email_format CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- インデックス
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_azure_object_id ON users(azure_object_id);

-- 更新日時の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE users IS 'ユーザー情報テーブル - Entra ID連携を想定したローカルキャッシュ';
COMMENT ON COLUMN users.azure_object_id IS 'Entra IDのオブジェクトID（SSO連携用）';
COMMENT ON COLUMN users.role IS 'ユーザーロール（RBAC）';
