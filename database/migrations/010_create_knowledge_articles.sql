-- ナレッジ記事テーブル
CREATE TYPE article_type AS ENUM (
  'faq',              -- よくある質問
  'how_to',           -- 手順書
  'known_error',      -- 既知の問題
  'workaround',       -- 回避策
  'policy',           -- ポリシー・ガイドライン
  'announcement'      -- お知らせ
);

CREATE TYPE article_visibility AS ENUM (
  'public',           -- 全社公開
  'department',       -- 部署限定
  'it_only'           -- IT部門のみ
);

CREATE TABLE knowledge_articles (
  article_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 基本情報
  title VARCHAR(500) NOT NULL,
  body TEXT NOT NULL,
  type article_type NOT NULL DEFAULT 'faq',

  -- 分類
  category_id UUID REFERENCES categories(category_id) ON DELETE SET NULL,
  tags VARCHAR(100)[],

  -- 公開範囲
  visibility article_visibility NOT NULL DEFAULT 'public',

  -- 所有者
  owner_id UUID NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,

  -- 承認状態（公開前レビュー）
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at TIMESTAMP WITH TIME ZONE,

  -- 統計
  view_count INTEGER NOT NULL DEFAULT 0,
  helpful_count INTEGER NOT NULL DEFAULT 0,
  not_helpful_count INTEGER NOT NULL DEFAULT 0,

  -- 関連チケット（どのチケットから作成されたか）
  source_ticket_id UUID REFERENCES tickets(ticket_id) ON DELETE SET NULL,

  -- タイムスタンプ
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- 検索用
  search_vector tsvector
);

-- 全文検索インデックス（日本語対応）
CREATE INDEX idx_knowledge_articles_search ON knowledge_articles USING gin(search_vector);

-- 全文検索ベクトルの自動更新
CREATE OR REPLACE FUNCTION update_knowledge_articles_search_vector()
RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('simple', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('simple', COALESCE(NEW.body, '')), 'B') ||
    setweight(to_tsvector('simple', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_knowledge_articles_search_vector_trigger
BEFORE INSERT OR UPDATE ON knowledge_articles
FOR EACH ROW
EXECUTE FUNCTION update_knowledge_articles_search_vector();

-- インデックス
CREATE INDEX idx_knowledge_articles_category ON knowledge_articles(category_id);
CREATE INDEX idx_knowledge_articles_owner ON knowledge_articles(owner_id);
CREATE INDEX idx_knowledge_articles_type ON knowledge_articles(type);
CREATE INDEX idx_knowledge_articles_visibility ON knowledge_articles(visibility);
CREATE INDEX idx_knowledge_articles_published ON knowledge_articles(is_published);
CREATE INDEX idx_knowledge_articles_tags ON knowledge_articles USING gin(tags);
CREATE INDEX idx_knowledge_articles_created_at ON knowledge_articles(created_at DESC);

-- 更新日時トリガー
CREATE TRIGGER update_knowledge_articles_updated_at
BEFORE UPDATE ON knowledge_articles
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- コメント
COMMENT ON TABLE knowledge_articles IS 'ナレッジ記事 - FAQ、手順書、既知の問題、回避策';
COMMENT ON COLUMN knowledge_articles.tags IS 'タグ（検索用）';
COMMENT ON COLUMN knowledge_articles.search_vector IS '全文検索用ベクトル（自動生成）';
COMMENT ON COLUMN knowledge_articles.source_ticket_id IS '元となったチケット（チケットからナレッジ化）';
