# 🎯 次の開発ステップ

Mirai ヘルプデスク管理システム Phase 1 が完成しました。次に進むべき開発ステップを優先度順に示します。

---

## 🔥 優先度：高（すぐに対応推奨）

### 1. データベースのセットアップと初期データ投入 ⭐⭐⭐

**現状:** マイグレーションファイルは完成しているが、実行が必要

**対応内容:**
```bash
# PostgreSQL インストール後
createdb -U postgres mirai_helpdesk
cd database
psql -U postgres -d mirai_helpdesk -f migrate_all.sql
```

**完了条件:**
- ✅ 11個のテーブルが作成される
- ✅ デフォルトユーザー5名が登録される
- ✅ デフォルトSLAポリシーとカテゴリが登録される

**所要時間:** 5分

---

### 2. SLA自動計算エンジンの実装 ⭐⭐⭐

**現状:** データベーストリガーで優先度は自動計算されるが、SLA期限の計算が未実装

**対応内容:**
- `backend/src/services/sla.service.ts` を作成
- チケット作成時にSLAポリシーを自動選択
- `due_at`（解決期限）と `response_due_at`（初動対応期限）を自動計算
- 営業時間を考慮した期限計算

**実装ファイル:**
```
backend/src/services/sla.service.ts
backend/src/utils/businessHours.ts
```

**完了条件:**
- ✅ チケット作成時に期限が自動設定される
- ✅ P1は15分/2時間、P2は1時間/8時間などのSLAが正しく適用される
- ✅ 営業時間外を除外した期限計算

**所要時間:** 2-3時間

**優先度の理由:** SLA管理はヘルプデスクの中核機能

---

### 3. 通知システムの実装 ⭐⭐⭐

**現状:** SMTP設定は完了しているが、通知ロジックが未実装

**対応内容:**
- `backend/src/services/notification.service.ts` を作成
- メール通知（新規チケット、割り当て、承認依頼、期限超過、完了）
- Teams通知（Webhook経由、オプション）

**通知トリガー:**
- チケット作成時 → 担当者とRequesterに通知
- チケット割り当て時 → 新担当者に通知
- 承認依頼時 → 承認者に通知
- 期限超過時 → 担当者と管理者に通知
- 完了時 → Requesterに通知

**実装ファイル:**
```
backend/src/services/notification.service.ts
backend/src/services/email.service.ts
backend/src/services/teams.service.ts (オプション)
backend/src/templates/email/ (メールテンプレート)
```

**完了条件:**
- ✅ チケット作成時にメール通知が送信される
- ✅ 期限超過の定期チェックと通知
- ✅ 通知履歴の記録

**所要時間:** 3-4時間

**優先度の理由:** 利用者への適時な情報提供に必須

---

### 4. 承認ワークフローの完全実装 ⭐⭐

**現状:** 承認テーブルとAPIの基本構造はあるが、ビジネスロジックが未実装

**対応内容:**
- `backend/src/models/approval.model.ts` を作成
- `backend/src/controllers/approval.controller.ts` を実装
- 承認依頼作成
- 承認/却下の処理
- SODチェックの強化
- 承認後のM365タスク状態更新

**実装ファイル:**
```
backend/src/models/approval.model.ts
backend/src/controllers/approval.controller.ts
backend/src/services/approval.service.ts
```

**完了条件:**
- ✅ チケットから承認依頼を作成できる
- ✅ 承認者が承認/却下できる
- ✅ 承認後にM365タスクが実施可能状態になる
- ✅ SOD違反をチェック（承認者≠実施者）

**所要時間:** 3-4時間

**優先度の理由:** M365操作に必須の機能

---

## 🟡 優先度：中（Phase 1完了後に対応）

### 5. M365タスクとレポジトリの完全実装 ⭐⭐

**対応内容:**
- `backend/src/models/m365-task.model.ts` を作成
- `backend/src/models/m365-execution-log.model.ts` を作成
- タスク状態管理
- 実施ログの記録とSODチェック
- ロールバック手順の管理

**所要時間:** 4-5時間

---

### 6. ナレッジベースの完全実装 ⭐⭐

**現状:** フロントエンドUIはあるが、バックエンドAPIが未実装

**対応内容:**
- `backend/src/models/knowledge.model.ts` を作成
- `backend/src/controllers/knowledge.controller.ts` を実装
- 全文検索機能
- タグフィルタリング
- チケットからナレッジ化機能

**実装ファイル:**
```
backend/src/models/knowledge.model.ts
backend/src/controllers/knowledge.controller.ts
backend/src/services/knowledge.service.ts
```

**所要時間:** 3-4時間

---

### 7. ファイルアップロード機能 ⭐⭐

**現状:** 添付ファイルテーブルはあるが、アップロードAPIが未実装

**対応内容:**
- `multer` を使用したファイルアップロード
- ファイルサイズ・タイプのバリデーション
- SHA-256ハッシュの計算と検証
- ストレージ管理（ローカルまたはAzure Blob Storage）

**実装ファイル:**
```
backend/src/middleware/upload.ts
backend/src/controllers/attachment.controller.ts
backend/src/routes/attachment.routes.ts
```

**所要時間:** 2-3時間

---

### 8. 自動クローズ機能 ⭐

**対応内容:**
- Resolvedステータスから一定期間後に自動的にClosedに変更
- cron ジョブまたは定期実行スクリプト
- 利用者への事前通知

**実装ファイル:**
```
backend/src/jobs/auto-close.job.ts
backend/src/services/scheduler.service.ts
```

**所要時間:** 2時間

---

## 🟢 優先度：低（Phase 2以降）

### 9. KPIダッシュボードの充実 ⭐

**対応内容:**
- SLA達成率の詳細分析
- カテゴリ別・担当者別の統計
- グラフ表示（Chart.js または Recharts）
- CSVエクスポート機能

**所要時間:** 4-5時間

---

### 10. レポート生成機能 ⭐

**対応内容:**
- 月次レポートの自動生成
- PDF出力機能
- メール自動送信

**所要時間:** 3-4時間

---

### 11. E2Eテストの実装 ⭐

**対応内容:**
- Playwright を使用したE2Eテスト
- 主要なユーザーフローのテスト自動化
- CI/CDパイプライン統合

**所要時間:** 5-6時間

---

### 12. CI/CDパイプライン ⭐

**対応内容:**
- GitHub Actions または Azure Pipelines
- 自動テスト実行
- 自動デプロイ

**所要時間:** 3-4時間

---

## 🏆 Phase 2: Microsoft 365 連携強化

### 13. ユーザー/ライセンス自動同期 ⭐⭐

**対応内容:**
- 定期的にGraph APIからユーザー情報を同期
- ライセンス情報のキャッシュ
- 差分更新

**所要時間:** 4-5時間

---

### 14. Exchange Online 詳細操作 ⭐⭐

**対応内容:**
- メールボックス権限管理（フルアクセス、送信代理）
- メールフロールール
- 配布リスト管理

**所要時間:** 5-6時間

---

### 15. SharePoint 管理機能 ⭐

**対応内容:**
- サイト作成
- 権限管理
- ドキュメントライブラリ操作

**所要時間:** 4-5時間

---

## 🚀 Phase 3: 自動化

### 16. 承認済み標準作業の自動実行 ⭐⭐⭐

**対応内容:**
- 承認後に自動的にGraph APIを呼び出し
- 安全なジョブキュー（Bull または BullMQ）
- リトライ機能
- エラーハンドリング

**所要時間:** 6-8時間

---

### 17. 定期実行ジョブ ⭐⭐

**対応内容:**
- SLA期限チェック（毎時）
- 自動クローズ（毎日）
- レポート生成（月次）
- ライセンス同期（毎日）

**所要時間:** 3-4時間

---

## 📊 推奨実装順序

### Week 1: 基本機能の完成
1. ✅ データベースセットアップ
2. ✅ SLA自動計算エンジン
3. ✅ 通知システム
4. ✅ ファイルアップロード

### Week 2: ワークフロー強化
5. ✅ 承認ワークフロー完全実装
6. ✅ M365タスク完全実装
7. ✅ ナレッジベース完全実装

### Week 3: 運用機能
8. ✅ 自動クローズ機能
9. ✅ KPIダッシュボード
10. ✅ レポート生成

### Week 4: 品質向上
11. ✅ E2Eテスト
12. ✅ CI/CDパイプライン

---

## 💡 即座に価値を提供できる機能

以下の機能を優先的に実装すると、すぐにシステムが実用レベルになります：

1. **SLA自動計算** - チケットの期限管理が自動化
2. **通知システム** - 利用者への適時な情報提供
3. **承認ワークフロー** - M365操作が可能になる
4. **ファイルアップロード** - エビデンス添付が可能になる

これら4つを実装すれば、**完全に運用可能**になります。

---

## 🎓 学習リソース

各機能の実装方法は以下を参照：

- **SLA計算**: `database/migrations/003_create_tickets.sql` のトリガー参照
- **通知**: Node.js の `nodemailer` ライブラリ使用
- **承認**: `database/migrations/007_create_approvals.sql` のSODチェック参照
- **ファイル**: `multer` ライブラリでアップロード処理

---

## 📞 サポートが必要な場合

各機能の実装で質問があれば、以下の情報を提供してください：

1. 実装したい機能名
2. 現在の状況
3. 遭遇している問題（もしあれば）

Claude Codeがフルサポートで実装をお手伝いします！🚀

---

**次に何を実装しますか？上記の1-4の機能から選んでください！**
