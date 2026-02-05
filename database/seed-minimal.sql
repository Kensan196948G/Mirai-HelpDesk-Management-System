-- 最小限のサンプルデータ投入

-- チケット1: Exchange Online - 添付ファイル問題（P2）
INSERT INTO tickets (
  ticket_number, type, subject, description,
  status, priority, impact, urgency,
  category_id, requester_id, assignee_id,
  created_at, updated_at
) VALUES (
  'TKT-2026-0001', 'incident',
  'Outlookで添付ファイルが送信できない',
  '昨日から、Outlookで10MB以上の添付ファイルを送信しようとするとエラーが発生します。',
  'in_progress', 'P2', '個人', '高',
  'ed149b4f-56ee-4609-996d-f33fa29931b0',
  'a393aa23-57b5-4af6-9bfb-e399540fccb8',
  '9057e96f-7dd1-45c1-b4a0-e757bb18a7a3',
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '1 hour'
);

-- チケット2: Teams - 画面共有問題
INSERT INTO tickets (
  ticket_number, type, subject, description,
  status, priority, impact, urgency,
  category_id, requester_id,
  created_at, updated_at
) VALUES (
  'TKT-2026-0002', 'incident',
  'Teamsで画面共有ができない',
  'Teams会議中に画面共有をしようとすると、エラーが出ます。',
  'new', 'P3', '個人', '中',
  '4d310ff6-6741-438e-892e-11203ad4dc43',
  'a393aa23-57b5-4af6-9bfb-e399540fccb8',
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '30 minutes'
);

-- チケット3: OneDrive - 同期エラー
INSERT INTO tickets (
  ticket_number, type, subject, description,
  status, priority, impact, urgency,
  category_id, requester_id, assignee_id,
  created_at, updated_at
) VALUES (
  'TKT-2026-0003', 'incident',
  'OneDriveの同期が止まっている',
  'OneDriveのアイコンに赤い×マークが表示され、ファイルが同期されません。',
  'assigned', 'P2', '個人', '高',
  'bf064fc0-b257-4385-8f28-862278145741',
  'a393aa23-57b5-4af6-9bfb-e399540fccb8',
  '61bf014f-c6eb-4b85-b720-d3cd56a48c42',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '6 hours'
);

-- ナレッジ1: メール添付ファイルFAQ
INSERT INTO knowledge_articles (
  title, body, type, tags, visibility, is_published, view_count, owner_id,
  created_at, updated_at, published_at
) VALUES (
  'メール添付ファイルのサイズ制限について',
  '# メール添付ファイルのサイズ制限について

## 問題の概要
Outlookでメールを送信する際、大容量のファイルを添付すると「ファイルサイズが大きすぎます」というエラーが表示されます。

## 原因
Exchange Onlineでは、メールの添付ファイルサイズに**10MB**の上限が設定されています。

## 解決方法

### OneDriveを使用する場合
1. OneDriveにファイルをアップロードする
2. 右クリック→「共有」を選択
3. 共有リンクをメールに貼り付けて送信',
  'faq',
  ARRAY['Exchange Online', 'OneDrive', 'メール']::text[],
  'public', true, 42,
  'a3f182d0-d492-4bd0-bc1b-b6bb37bb43ae',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '28 days'
);

-- ナレッジ2: Teams画面共有トラブルシューティング
INSERT INTO knowledge_articles (
  title, body, type, tags, visibility, is_published, view_count, owner_id,
  created_at, updated_at, published_at
) VALUES (
  'Teamsで画面共有ができない場合のトラブルシューティング',
  '# Teamsで画面共有ができない場合のトラブルシューティング

## よくある原因と解決方法

### 1. アプリケーション権限の問題
1. Teamsアプリを完全に終了する
2. Windowsの「設定」→「プライバシー」→「画面録画」を開く
3. Teamsが有効になっていることを確認
4. Teamsを再起動する',
  'how_to',
  ARRAY['Teams', '画面共有']::text[],
  'public', true, 68,
  'a3f182d0-d492-4bd0-bc1b-b6bb37bb43ae',
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '18 days'
);

-- コメント追加
INSERT INTO ticket_comments (ticket_id, author_id, body, visibility, created_at)
SELECT ticket_id, '9057e96f-7dd1-45c1-b4a0-e757bb18a7a3',
'Exchange Onlineの添付ファイルサイズ上限は10MBです。OneDriveで共有してください。',
'public', NOW() - INTERVAL '90 minutes'
FROM tickets WHERE ticket_number = 'TKT-2026-0001';

-- データ確認
SELECT 'チケット' AS データ種別, COUNT(*) AS 件数 FROM tickets
UNION ALL
SELECT 'ナレッジ記事', COUNT(*) FROM knowledge_articles
UNION ALL
SELECT 'コメント', COUNT(*) FROM ticket_comments;
