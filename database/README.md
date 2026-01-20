# データベース設計

このディレクトリには、Mirai ヘルプデスク管理システムのデータベーススキーマとマイグレーションスクリプトが含まれています。

## データベース: PostgreSQL 14+

## マイグレーション実行順序

```bash
# PostgreSQLデータベースに接続
psql -U postgres

# データベースを作成
CREATE DATABASE mirai_helpdesk;

# データベースに接続
\c mirai_helpdesk

# マイグレーションを順番に実行
\i migrations/001_create_users.sql
\i migrations/002_create_categories_and_sla.sql
\i migrations/003_create_tickets.sql
\i migrations/004_create_ticket_comments.sql
\i migrations/005_create_ticket_attachments.sql
\i migrations/006_create_ticket_history.sql
\i migrations/007_create_approvals.sql
\i migrations/008_create_m365_tasks.sql
\i migrations/009_create_m365_execution_logs.sql
\i migrations/010_create_knowledge_articles.sql
\i migrations/011_create_indexes_and_seeds.sql
```

または、統合スクリプトを使用：

```bash
psql -U postgres -d mirai_helpdesk -f database/migrate_all.sql
```

## 主要テーブル

### 1. users
- ユーザー情報（Entra ID連携）
- RBAC（役割ベースアクセス制御）

### 2. tickets
- チケット管理の中核テーブル
- 自動優先度計算（Impact × Urgency）
- SLA期限管理

### 3. ticket_comments
- 公開コメント（利用者向け）
- 内部メモ（非公開）

### 4. ticket_attachments
- 添付ファイル
- SHA-256ハッシュで整合性確保

### 5. ticket_history ⚠️
- **追記専用テーブル（UPDATE/DELETE禁止）**
- 監査証跡

### 6. approvals
- 承認フロー
- SOD（職務分離）チェック

### 7. m365_tasks
- Microsoft 365操作タスク
- 承認連携

### 8. m365_execution_logs ⚠️
- **追記専用テーブル（UPDATE/DELETE禁止）**
- M365操作の実施ログ
- エビデンス必須
- SOD違反チェック

### 9. knowledge_articles
- ナレッジベース
- 全文検索対応

### 10. categories
- カテゴリ（階層構造）

### 11. sla_policies
- SLAポリシー定義

## 重要な設計原則

### 1. 監査証跡必須
- `ticket_history` と `m365_execution_logs` は追記専用
- トリガーでUPDATE/DELETEを防止

### 2. SOD（職務分離）
- 承認者 ≠ 実施者をデータベースレベルで強制
- `m365_execution_logs` 挿入時にチェック

### 3. 自動計算
- 優先度: Impact × Urgency から自動計算
- チケット番号: HD-YYYY-00001 形式で自動生成

### 4. エビデンス必須
- M365操作には必ず `evidence_attachment_id` が必要

## 開発用シードデータ

`011_create_indexes_and_seeds.sql` に以下が含まれます：

### ユーザー（パスワード: Admin123!）
- admin@example.com (Manager)
- agent@example.com (Agent)
- operator@example.com (M365 Operator)
- approver@example.com (Approver)
- user@example.com (Requester)

### SLAポリシー
- P1: 15分/2時間
- P2: 1時間/8時間
- P3: 4時間/3日
- P4: 1日/5日

### カテゴリ
- Microsoft 365 (Exchange, Teams, OneDrive, SharePoint, Entra ID, ライセンス)
- PC・端末
- ネットワーク
- アプリケーション
- その他

## パフォーマンス最適化

### インデックス
- すべての外部キーにインデックス
- 検索頻度の高いカラムに複合インデックス
- 全文検索用のGINインデックス

### トリガー
- `updated_at` の自動更新
- 優先度の自動計算
- チケット番号の自動生成
- 履歴の自動記録
- SOD違反チェック

## セキュリティ

### 追記専用テーブルの保護
```sql
-- UPDATE/DELETEを防止
CREATE TRIGGER prevent_ticket_history_update
BEFORE UPDATE ON ticket_history
FOR EACH ROW
EXECUTE FUNCTION prevent_ticket_history_modification();
```

### SODチェック
```sql
-- 承認者と実施者が同一の場合はエラー
CREATE TRIGGER check_sod_violation_trigger
BEFORE INSERT ON m365_execution_logs
FOR EACH ROW
EXECUTE FUNCTION check_sod_violation();
```

## バックアップとリストア

```bash
# バックアップ
pg_dump -U postgres mirai_helpdesk > backup_$(date +%Y%m%d).sql

# リストア
psql -U postgres -d mirai_helpdesk < backup_20240120.sql
```

## トラブルシューティング

### マイグレーションエラー
```bash
# ロールバック（データベースを削除して再作成）
dropdb -U postgres mirai_helpdesk
createdb -U postgres mirai_helpdesk
```

### 追記専用テーブルのテスト
```sql
-- ticket_history への更新は失敗する（想定動作）
UPDATE ticket_history SET description = 'test' WHERE history_id = '...';
-- エラー: ticket_history テーブルは追記専用です。

-- m365_execution_logs への更新も失敗する（想定動作）
UPDATE m365_execution_logs SET result = 'success' WHERE exec_id = '...';
-- エラー: m365_execution_logs テーブルは追記専用です。
```
