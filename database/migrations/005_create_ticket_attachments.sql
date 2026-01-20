-- チケット添付ファイルテーブル
CREATE TABLE ticket_attachments (
  attachment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,

  -- アップロード者
  uploader_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,

  -- ファイル情報
  filename VARCHAR(500) NOT NULL,
  original_filename VARCHAR(500) NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type VARCHAR(255) NOT NULL,

  -- ストレージ情報
  storage_path VARCHAR(1000) NOT NULL, -- ファイルシステムまたはオブジェクトストレージのパス
  storage_type VARCHAR(50) NOT NULL DEFAULT 'filesystem', -- 'filesystem', 's3', 'azure_blob'

  -- 整合性確保
  hash VARCHAR(128) NOT NULL, -- SHA-256ハッシュ

  -- エビデンス用フラグ（M365実施ログの証跡など）
  is_evidence BOOLEAN NOT NULL DEFAULT FALSE,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 制約
  CONSTRAINT valid_file_size CHECK (file_size > 0 AND file_size <= 10485760) -- 最大10MB
);

-- インデックス
CREATE INDEX idx_ticket_attachments_ticket ON ticket_attachments(ticket_id);
CREATE INDEX idx_ticket_attachments_uploader ON ticket_attachments(uploader_id);
CREATE INDEX idx_ticket_attachments_created_at ON ticket_attachments(created_at DESC);
CREATE INDEX idx_ticket_attachments_hash ON ticket_attachments(hash);
CREATE INDEX idx_ticket_attachments_evidence ON ticket_attachments(is_evidence);

-- コメント
COMMENT ON TABLE ticket_attachments IS 'チケット添付ファイル - エビデンス、ログ、スクリーンショット';
COMMENT ON COLUMN ticket_attachments.hash IS 'SHA-256ハッシュ（整合性確保）';
COMMENT ON COLUMN ticket_attachments.is_evidence IS 'M365実施ログの証跡フラグ';
