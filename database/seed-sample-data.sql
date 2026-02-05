-- サンプルデータ投入スクリプト
-- Mirai ヘルプデスク管理システム

-- ====================
-- サンプルチケット
-- ====================

-- チケット1: Exchange Online - 添付ファイル問題（P2）
INSERT INTO tickets (
  ticket_id,
  ticket_number,
  type,
  subject,
  description,
  status,
  priority,
  impact,
  urgency,
  category_id,
  requester_id,
  assignee_id,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'TKT-2026-0001',
  'incident',
  'Outlookで添付ファイルが送信できない',
  '昨日から、Outlookで10MB以上の添付ファイルを送信しようとするとエラーが発生します。エラーメッセージは「ファイルサイズが大きすぎます」と表示されます。急ぎで大きなファイルを送る必要があるので、早急に対応してほしいです。',
  'in_progress',
  'P2',
  '個人',
  '高',
  'ed149b4f-56ee-4609-996d-f33fa29931b0', -- Exchange Online
  'a393aa23-57b5-4af6-9bfb-e399540fccb8', -- user@example.com
  '9057e96f-7dd1-45c1-b4a0-e757bb18a7a3', -- agent@example.com
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '1 hour'
);

-- チケット2: Teams - 画面共有問題（P3）
INSERT INTO tickets (
  ticket_id,
  ticket_number,
  type,
  subject,
  description,
  status,
  priority,
  impact,
  urgency,
  category_id,
  requester_id,
  assignee_id,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'TKT-2026-0002',
  'incident',
  'Teamsで画面共有ができない',
  'Teams会議中に画面共有をしようとすると、「画面共有を開始できません」というエラーが出ます。他の参加者は問題なく共有できているようです。',
  'new',
  'P3',
  '個人',
  '中',
  '4d310ff6-6741-438e-892e-11203ad4dc43', -- Teams
  'a393aa23-57b5-4af6-9bfb-e399540fccb8', -- user@example.com
  NULL,
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '30 minutes'
);

-- チケット3: OneDrive - 同期エラー（P2）
INSERT INTO tickets (
  ticket_id,
  ticket_number,
  type,
  subject,
  description,
  status,
  priority,
  impact,
  urgency,
  category_id,
  requester_id,
  assignee_id,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'TKT-2026-0003',
  'incident',
  'OneDriveの同期が止まっている',
  'OneDriveのアイコンに赤い×マークが表示され、ファイルが同期されません。「同期エラー」と表示されています。重要なファイルを共有する必要があるので、至急解決したいです。',
  'assigned',
  'P2',
  '個人',
  '高',
  'bf064fc0-b257-4385-8f28-862278145741', -- OneDrive
  'a393aa23-57b5-4af6-9bfb-e399540fccb8', -- user@example.com
  '61bf014f-c6eb-4b85-b720-d3cd56a48c42', -- M365オペレーター
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '6 hours'
);

-- チケット4: ライセンス - Office 365 E3 追加要求（サービスリクエスト）
INSERT INTO tickets (
  ticket_id,
  ticket_number,
  type,
  subject,
  description,
  status,
  priority,
  impact,
  urgency,
  category_id,
  requester_id,
  assignee_id,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'TKT-2026-0004',
  'service_request',
  '新入社員にOffice 365 E3ライセンスを付与したい',
  '来週入社する新入社員（yamada.taro@example.com）にOffice 365 E3ライセンスを付与してください。入社日は2026年2月10日です。',
  'pending_approval',
  'P3',
  '個人',
  '低',
  'a380bc97-469c-4522-a3b6-56248048a3b0', -- ライセンス
  'a393aa23-57b5-4af6-9bfb-e399540fccb8', -- user@example.com
  '61bf014f-c6eb-4b85-b720-d3cd56a48c42', -- M365オペレーター
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '1 day'
);

-- チケット5: SharePoint - アクセス権限問題（P2）
INSERT INTO tickets (
  ticket_id,
  ticket_number,
  type,
  subject,
  description,
  status,
  priority,
  impact,
  urgency,
  category_id,
  requester_id,
  assignee_id,
  created_at,
  updated_at
) VALUES (
  gen_random_uuid(),
  'TKT-2026-0005',
  'service_request',
  'SharePointサイトへのアクセス権限を付与したい',
  'プロジェクトメンバー3名（sato@example.com, suzuki@example.com, tanaka@example.com）に、「営業部プロジェクト」SharePointサイトへの編集権限を付与してください。',
  'in_progress',
  'P3',
  '部署',
  '中',
  '368dbbac-9c98-472c-8891-f2a4ea374b6e', -- SharePoint
  'a393aa23-57b5-4af6-9bfb-e399540fccb8', -- user@example.com
  '61bf014f-c6eb-4b85-b720-d3cd56a48c42', -- M365オペレーター
  NOW() - INTERVAL '5 hours',
  NOW() - INTERVAL '2 hours'
);

-- ====================
-- サンプルナレッジ記事
-- ====================

-- ナレッジ1: メール添付ファイルサイズ制限FAQ
INSERT INTO knowledge_articles (
  article_id,
  title,
  body,
  type,
  tags,
  visibility,
  is_published,
  view_count,
  owner_id,
  created_at,
  updated_at,
  published_at
) VALUES (
  gen_random_uuid(),
  'メール添付ファイルのサイズ制限について',
  '# メール添付ファイルのサイズ制限について

## 問題の概要
Outlookでメールを送信する際、大容量のファイルを添付すると「ファイルサイズが大きすぎます」というエラーが表示されます。

## 原因
Exchange Onlineでは、メールの添付ファイルサイズに**10MB**の上限が設定されています。この制限を超えるファイルは直接添付して送信することができません。

## 解決方法

### OneDriveを使用する場合
1. OneDriveにファイルをアップロードする
2. アップロードしたファイルを右クリックし、「共有」を選択
3. 共有リンクを生成する
4. 生成されたリンクをメール本文にコピー＆ペーストして送信

### SharePointを使用する場合
1. SharePointのドキュメントライブラリにファイルをアップロードする
2. ファイルを選択し、「共有」ボタンをクリック
3. 共有リンクを生成し、必要に応じてアクセス権限を設定
4. 生成されたリンクをメール本文に貼り付けて送信

## 回避策
- 圧縮ファイル（ZIP）にすることでサイズを削減できる場合があります
- ファイルを分割して複数のメールで送信することも可能です（非推奨）

## 関連情報
- [Microsoft公式ドキュメント: Exchange Onlineの制限](https://learn.microsoft.com/ja-jp/office365/servicedescriptions/exchange-online-service-description/exchange-online-limits)
- OneDrive共有方法: KB-002
- SharePoint共有方法: KB-003',
  ARRAY['Exchange Online', 'OneDrive', 'SharePoint', 'メール', '添付ファイル']::text[],
  'public',
  true,
  42,
  'a3f182d0-d492-4bd0-bc1b-b6bb37bb43ae', -- admin@example.com
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '15 days',
  NOW() - INTERVAL '28 days'
);

-- ナレッジ2: Teams画面共有トラブルシューティング
INSERT INTO knowledge_articles (
  article_id,
  title,
  body,
  type,
  tags,
  visibility,
  is_published,
  view_count,
  owner_id,
  created_at,
  updated_at,
  published_at
) VALUES (
  gen_random_uuid(),
  'Teamsで画面共有ができない場合のトラブルシューティング',
  '# Teamsで画面共有ができない場合のトラブルシューティング

## よくある原因と解決方法

### 1. アプリケーション権限の問題
**症状**: 「画面共有を開始できません」というエラーが表示される

**解決方法**:
1. Teamsアプリを完全に終了する
2. Windowsの「設定」→「プライバシー」→「画面録画」を開く
3. Teamsが有効になっていることを確認
4. Teamsを再起動する

### 2. グラフィックドライバーの問題
**症状**: 画面共有ボタンがグレーアウトしている

**解決方法**:
1. グラフィックドライバーを最新版に更新する
2. PCを再起動する

### 3. ネットワーク帯域幅の問題
**症状**: 画面共有が開始されるが、すぐに切断される

**解決方法**:
1. 不要なアプリケーションを閉じる
2. VPN接続を一時的に切断する（社内ポリシーに従ってください）
3. Wi-Fiから有線LANに切り替える

### 4. Teamsアプリのキャッシュクリア
**症状**: 上記の方法で解決しない場合

**解決方法**:
1. Teamsを完全に終了する
2. 以下のフォルダを削除:
   - `%appdata%\\Microsoft\\Teams\\Cache`
   - `%appdata%\\Microsoft\\Teams\\blob_storage`
   - `%appdata%\\Microsoft\\Teams\\databases`
3. Teamsを再起動する

## それでも解決しない場合
IT部門にチケットを起票してください。その際、以下の情報を含めてください:
- エラーメッセージのスクリーンショット
- Teamsのバージョン（「ヘルプ」→「バージョン情報」で確認）
- OSのバージョン',
  'how_to',
  ARRAY['Teams', '画面共有', 'トラブルシューティング']::text[],
  'public',
  true,
  68,
  'a3f182d0-d492-4bd0-bc1b-b6bb37bb43ae', -- admin@example.com
  NOW() - INTERVAL '20 days',
  NOW() - INTERVAL '5 days',
  NOW() - INTERVAL '18 days'
);

-- ナレッジ3: OneDrive同期エラー解決方法
INSERT INTO knowledge_articles (
  article_id,
  title,
  body,
  type,
  tags,
  visibility,
  is_published,
  view_count,
  owner_id,
  created_at,
  updated_at,
  published_at
) VALUES (
  gen_random_uuid(),
  'OneDrive同期エラーの解決方法',
  '# OneDrive同期エラーの解決方法

## 主な原因と解決方法

### 1. ファイル名・パスの長さ制限超過
**原因**: ファイル名やパスが長すぎる（400文字制限）

**解決方法**:
- ファイル名を短くする
- フォルダ階層を浅くする

### 2. 使用できない文字の使用
**原因**: ファイル名に以下の文字が含まれている: `< > : " | ? * /`

**解決方法**:
- 該当するファイル名を変更する
- アンダースコア（_）やハイフン（-）に置き換える

### 3. ストレージ容量不足
**原因**: OneDriveの保存容量が不足している

**解決方法**:
1. OneDriveアイコンを右クリック→「設定」
2. 「アカウント」タブで使用容量を確認
3. 不要なファイルを削除するか、容量追加を申請

### 4. OneDriveのリセット
**症状**: 上記で解決しない場合

**解決方法**:
1. Windowsキー + R を押す
2. 以下のコマンドを入力:
   ```
   %localappdata%\\Microsoft\\OneDrive\\onedrive.exe /reset
   ```
3. 数分待ってもOneDriveが起動しない場合:
   ```
   %localappdata%\\Microsoft\\OneDrive\\onedrive.exe
   ```

### 5. 再リンク
**症状**: リセットでも解決しない場合

**解決方法**:
1. OneDriveアイコン→「設定」→「アカウント」
2. 「このPCのリンク解除」をクリック
3. OneDriveを再起動してサインインし直す

**注意**: 再リンク前に重要なファイルがクラウドに同期されていることを確認してください。

## トラブルシューティングのヒント
- 同期状態アイコンの意味:
  - 青い雲: クラウドのみ
  - 緑のチェック: 同期完了
  - 赤い×: 同期エラー
  - オレンジの矢印: 同期中

## それでも解決しない場合
IT部門にチケットを起票してください。',
  'known_error',
  ARRAY['OneDrive', '同期エラー', 'トラブルシューティング']::text[],
  'public',
  true,
  91,
  'a3f182d0-d492-4bd0-bc1b-b6bb37bb43ae', -- admin@example.com
  NOW() - INTERVAL '25 days',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '23 days'
);

-- ====================
-- サンプルコメント
-- ====================

-- チケット1のコメント
DO $$
DECLARE
  v_ticket_id UUID;
BEGIN
  SELECT ticket_id INTO v_ticket_id FROM tickets WHERE ticket_number = 'TKT-2026-0001';

  INSERT INTO ticket_comments (
    comment_id,
    ticket_id,
    author_id,
    body,
    visibility,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_ticket_id,
    '9057e96f-7dd1-45c1-b4a0-e757bb18a7a3', -- agent@example.com
    'ご連絡ありがとうございます。Exchange Onlineの添付ファイルサイズ上限は10MBです。10MBを超えるファイルはOneDriveまたはSharePointで共有することをお勧めします。',
    'public',
    NOW() - INTERVAL '90 minutes'
  );

  INSERT INTO ticket_comments (
    comment_id,
    ticket_id,
    author_id,
    body,
    visibility,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_ticket_id,
    'a393aa23-57b5-4af6-9bfb-e399540fccb8', -- user@example.com
    'OneDriveでの共有方法を教えていただけますか？',
    'public',
    NOW() - INTERVAL '60 minutes'
  );

  INSERT INTO ticket_comments (
    comment_id,
    ticket_id,
    author_id,
    body,
    visibility,
    created_at
  ) VALUES (
    gen_random_uuid(),
    v_ticket_id,
    '9057e96f-7dd1-45c1-b4a0-e757bb18a7a3', -- agent@example.com
    '以下のナレッジ記事をご参照ください: KB-001「メール添付ファイルのサイズ制限について」\n\n簡単な手順:\n1. ファイルをOneDriveにアップロード\n2. 右クリック→「共有」\n3. リンクをメールに貼り付け',
    'public',
    NOW() - INTERVAL '30 minutes'
  );
END $$;

COMMIT;

-- データ投入完了メッセージ
SELECT
  'チケット' AS データ種別, COUNT(*) AS 件数 FROM tickets
UNION ALL
SELECT 'ナレッジ記事', COUNT(*) FROM knowledge_articles
UNION ALL
SELECT 'コメント', COUNT(*) FROM ticket_comments;
