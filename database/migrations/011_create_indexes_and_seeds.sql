-- 追加のインデックスとパフォーマンス最適化

-- チケット検索用の複合インデックス
CREATE INDEX idx_tickets_status_priority ON tickets(status, priority);
CREATE INDEX idx_tickets_assignee_status ON tickets(assignee_id, status);
CREATE INDEX idx_tickets_requester_status ON tickets(requester_id, status);

-- M365タスクの検索用複合インデックス
CREATE INDEX idx_m365_tasks_state_scheduled ON m365_tasks(state, scheduled_at);
CREATE INDEX idx_m365_tasks_operator_state ON m365_tasks(operator_id, state);

-- パフォーマンス統計の有効化
ANALYZE users;
ANALYZE categories;
ANALYZE sla_policies;
ANALYZE tickets;
ANALYZE ticket_comments;
ANALYZE ticket_attachments;
ANALYZE ticket_history;
ANALYZE approvals;
ANALYZE m365_tasks;
ANALYZE m365_execution_logs;
ANALYZE knowledge_articles;

-- シードデータの準備
-- デフォルトSLAポリシー
INSERT INTO sla_policies (name, description, priority, impact, urgency, response_time_minutes, resolution_time_minutes, is_default)
VALUES
  ('P1 - 全社停止', 'P1: 全社に影響する障害・即時対応が必要', 'P1', '全社', '即時', 15, 120, FALSE),
  ('P1 - 対外影響', 'P1: 対外影響のある障害', 'P1', '対外影響', '高', 15, 120, FALSE),
  ('P2 - 部門影響', 'P2: 部門に影響する障害', 'P2', '部署', '高', 60, 480, FALSE),
  ('P3 - 個人影響', 'P3: 個人への影響', 'P3', '個人', '中', 240, 4320, TRUE),
  ('P4 - 問い合わせ', 'P4: 一般的な問い合わせ', 'P4', '個人', '低', 1440, 7200, FALSE)
ON CONFLICT DO NOTHING;

-- デフォルトカテゴリ
INSERT INTO categories (name, description, path, level, sort_order)
VALUES
  ('Microsoft 365', 'Microsoft 365 全般', '/Microsoft 365', 0, 10),
  ('Exchange Online', 'メール・メールボックス関連', '/Microsoft 365/Exchange Online', 1, 11),
  ('Teams', 'Microsoft Teams関連', '/Microsoft 365/Teams', 1, 12),
  ('OneDrive', 'OneDrive for Business関連', '/Microsoft 365/OneDrive', 1, 13),
  ('SharePoint', 'SharePoint Online関連', '/Microsoft 365/SharePoint', 1, 14),
  ('Entra ID', 'アカウント・認証関連', '/Microsoft 365/Entra ID', 1, 15),
  ('ライセンス', 'ライセンス管理', '/Microsoft 365/ライセンス', 1, 16),
  ('PC・端末', 'PC・端末関連', '/PC・端末', 0, 20),
  ('ネットワーク', 'ネットワーク・VPN', '/ネットワーク', 0, 30),
  ('アプリケーション', 'ソフトウェア・アプリ', '/アプリケーション', 0, 40),
  ('その他', 'その他の問い合わせ', '/その他', 0, 99)
ON CONFLICT DO NOTHING;

-- 管理者ユーザー（開発用）
-- パスワード: Admin123! （bcryptハッシュ: $2a$10$...）
INSERT INTO users (email, display_name, department, role, status, password_hash)
VALUES
  ('admin@example.com', '管理者', 'IT部門', 'manager', 'active', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa'),
  ('agent@example.com', 'エージェント', 'IT部門', 'agent', 'active', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa'),
  ('operator@example.com', 'M365オペレーター', 'IT部門', 'm365_operator', 'active', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa'),
  ('approver@example.com', '承認者', '総務部', 'approver', 'active', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa'),
  ('user@example.com', '一般ユーザー', '営業部', 'requester', 'active', '$2a$10$vI8aWBnW3fID.ZQ4/zo1G.q1lRps.9cGLcZEiGDMVr5yUP1KUOYTa')
ON CONFLICT (email) DO NOTHING;

-- コメント
COMMENT ON INDEX idx_tickets_status_priority IS 'チケット一覧検索の高速化';
COMMENT ON INDEX idx_m365_tasks_state_scheduled IS 'M365タスクのスケジュール検索の高速化';
