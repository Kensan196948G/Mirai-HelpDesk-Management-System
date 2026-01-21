-- チケットコメントテーブル
CREATE TYPE comment_visibility AS ENUM (
  'public',   -- 利用者向け（公開）
  'internal'  -- 内部メモ（非公開）
);

CREATE TABLE ticket_comments (
  comment_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(ticket_id) ON DELETE CASCADE,

  -- 作成者
  author_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,

  -- コメント内容
  body TEXT NOT NULL,
  visibility comment_visibility NOT NULL DEFAULT 'public',

  -- メンション機能（将来拡張用）
  mentioned_user_ids UUID[],

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 制約
  CONSTRAINT body_not_empty CHECK (LENGTH(TRIM(body)) > 0)
);

-- インデックス
CREATE INDEX idx_ticket_comments_ticket ON ticket_comments(ticket_id);
CREATE INDEX idx_ticket_comments_author ON ticket_comments(author_id);
CREATE INDEX idx_ticket_comments_created_at ON ticket_comments(created_at DESC);
CREATE INDEX idx_ticket_comments_visibility ON ticket_comments(visibility);

-- 更新日時トリガー
CREATE TRIGGER update_ticket_comments_updated_at
BEFORE UPDATE ON ticket_comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE ticket_comments IS 'チケットコメント - 公開（利用者向け）と非公開（内部メモ）';
COMMENT ON COLUMN ticket_comments.visibility IS '公開範囲: public=利用者向け, internal=内部メモ';
