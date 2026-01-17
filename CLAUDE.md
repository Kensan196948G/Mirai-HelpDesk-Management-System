# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## プロジェクト概要

**Mirai-HelpDesk-Management-System** は、社内IT部門がインシデント、サービス要求、Microsoft 365 運用を管理するためのヘルプデスク管理システムです。監査証跡の適切な記録、承認ワークフロー、SOD（職務分離）の遵守を重視しています。

### コアビジネスドメイン

- **インシデント管理**: 障害・不具合の対応
- **サービス要求管理**: アカウント、権限、PC、ソフトウェア、M365設定の依頼
- **変更管理**: M365設定やポリシーの標準的な変更
- **ナレッジ管理**: FAQ、手順書、既知の問題、回避策
- **Microsoft 365 運用**: Graph/Exchange/Teams/SharePoint/OneDrive/Entra ID の管理

### 重要な設計原則

1. **監査証跡必須**: すべての操作で「誰が/いつ/何を/なぜ」を記録
2. **SOD（職務分離）**: 同一チケットにおいて:
   - 承認者 ≠ 実施者（M365 Operator）
   - 実施者 ≠ 最終承認者
3. **承認なしのM365操作禁止**: すべてのM365操作には承認フロー + 実施ログが必須
4. **ステータスフロー強制**: Resolved → Closed には利用者確認またはタイムアウトが必須

## 役割（RBAC）

- **Requester（依頼者）**: 一般社員 - チケット登録、状況確認
- **Agent（一次対応）**: 受付、分類、回答、エスカレーション
- **M365 Operator（特権作業者）**: M365操作の実施（実施ログ必須）
- **Approver（承認者）**: 権限付与・ライセンス変更等の承認
- **Manager（運用管理者）**: SLA/KPI、テンプレート、監査閲覧
- **Auditor（監査閲覧）**: 閲覧専用アクセス

## データモデル（主要テーブル）

### tickets（チケット）
- すべてのヘルプデスク要求の主要エンティティ
- 主要フィールド: `ticket_id`, `type`, `subject`, `status`, `priority`, `impact`, `urgency`
- 追跡情報: `requester_id`, `assignee_id`, `created_at`, `resolved_at`, `closed_at`
- リンク先: `category_id`, `sla_policy_id`, `due_at`

### ticket_comments（コメント）
- 公開（利用者向け）と非公開（内部メモ）のコメント
- フィールド: `comment_id`, `ticket_id`, `author_id`, `visibility`, `body`

### ticket_attachments（添付ファイル）
- エビデンス、ログ、スクリーンショット
- 必須項目: `hash`（整合性確保）、`storage_path`（取得用）

### ticket_history（履歴）
- 変更不可の監査証跡
- 記録内容: `actor_id`, `action`, `before`, `after`, `created_at`
- **追記専用、削除禁止**

### approvals（承認）
- 特権操作の承認フロー
- 状態: `requested`, `approved`, `rejected`
- チケットに `approver_id` を紐付け

### m365_tasks（M365タスク）
- M365操作の定義
- フィールド: `task_type`, `target_upn`, `target_resource_id`, `state`

### m365_execution_logs（M365実施ログ）
- **監査に必須**: すべてのM365操作実施を記録
- 必須項目: `operator_id`, `method`, `command_or_screen`, `result`, `evidence_attachment_id`
- **このログなしでは完了不可**

### knowledge_articles（ナレッジ記事）
- FAQ、手順書、既知の問題
- タグ、公開範囲、検索機能をサポート

## チケットステータスフロー

```
New → Triage → Assigned → In Progress
                           ↓
           ← Pending Customer (利用者回答待ち)
                           ↓
           ← Pending Approval (承認待ち)
                           ↓
           ← Pending Change Window (実施待ち)
                           ↓
                      Resolved → Closed
```

**重要ルール**: Resolved → Closed には利用者確認または自動クローズタイムアウトが必須

## 優先度計算

- **Impact（影響度）**: 個人 / 部署 / 全社 / 対外影響
- **Urgency（緊急度）**: 低 / 中 / 高 / 即時
- Impact × Urgency から **Priority（優先度）** (P1-P4) を自動計算

### SLA例
- **P1**（全社停止）: 初動 15分 / 暫定復旧 2h / 恒久対応 24h
- **P2**（部門影響）: 初動 1h / 復旧 8h
- **P3**（個人）: 初動 4h / 解決 3営業日
- **P4**（問い合わせ）: 初動 1営業日 / 解決 5営業日

## Microsoft 365 連携

### 認証・認可
- **Microsoft Graph API** を主要な連携方式として使用
- 認証: 適切な権限を持つサービスプリンシパル
- すべてのGraph操作は承認済みチケットに紐付け必須

### M365操作テンプレート（例）
- ライセンス付与/剥奪
- パスワードリセット（オンプレAD連携含む）
- MFA/認証方法リセット
- メールボックス権限（フルアクセス、送信代理、代理送信）
- 配布リスト/グループメンバーシップ
- Teams作成/所有者変更
- OneDriveリストア/共有解除
- 退職者処理（アカウント無効化、メール転送、データ保持）

### 実施ログ要件
各M365操作で以下を記録:
- **誰が**: `operator_id`
- **いつ**: `created_at`
- **何を**: `task_type`, `target_upn` またはリソース識別子
- **どのように**: `method`（管理センター / PowerShell / Graph API）
- **結果**: 成功/失敗と詳細
- **エビデンス**: スクリーンショットまたはコマンド出力の添付
- **ロールバック手順**: 変更操作の場合は必須

## API構造（REST）

### チケット
- `POST /api/tickets` - チケット作成
- `GET /api/tickets?status=&assignee=&priority=` - フィルタ付き一覧取得
- `GET /api/tickets/{id}` - 詳細取得
- `PATCH /api/tickets/{id}` - 更新（ステータス、担当者、カテゴリ）
- `POST /api/tickets/{id}/comments` - コメント追加
- `POST /api/tickets/{id}/attachments` - 添付ファイルアップロード

### 承認
- `POST /api/tickets/{id}/approvals/request` - 承認依頼
- `POST /api/approvals/{approval_id}/approve` - 承認
- `POST /api/approvals/{approval_id}/reject` - 却下

### M365操作
- `POST /api/tickets/{id}/m365_tasks` - M365タスク生成
- `POST /api/m365_tasks/{id}/execute_log` - 実施ログ記録

## セキュリティ要件

### 認証
- Entra IDによるSSO（推奨）または社内認証システム

### 認可
- RBACベース: 役割 × 機能 × データ範囲
- 重要操作には承認ワークフロー必須

### 監査・コンプライアンス
- **追記専用ログ**: 管理者でも削除不可
- **操作監査**: すべてのM365操作をトレース可能にする
- **ログ保持期間**: 最低2年
- **エクスポート機能**: 監査用の月次CSV/PDFエクスポート

### ファイルアップロードセキュリティ
- ファイル拡張子制限
- 整合性確保のためのハッシュ計算
- マルウェアスキャン（可能な場合）

## 非機能要件

### パフォーマンス
- 目標稼働率: 業務時間中99.5%
- 同時アクセスユーザー数: ピーク時数十〜数百
- RPO: 24時間 / RTO: 4時間

### 運用設計

#### 受付チャネル
1. ポータル（主要）
2. メール連携（次点）
3. Teamsボット/フォーム（オプション）

#### チーム構成
- **Agent（一次対応）**: トリアージと初期対応
- **M365 Operator（特権作業者）**: 特権操作の実施
- **Manager（管理者）**: KPI/品質/監査管理

#### 定例業務
- **週次**: バックログレビュー（期限超過ゼロ目標）
- **月次**: KPIレビュー、テンプレート改善、ナレッジ棚卸し

## MVP実装フェーズ

### Phase 1（最小限の製品）
- チケット管理（起票/分類/割当/コメント/添付/履歴）
- 基本的なSLA + 期限通知
- ナレッジベース（FAQ）
- M365操作: テンプレート + 承認 + 手動実施ログ

### Phase 2（M365連携強化）
- Graph API: ユーザー/ライセンス情報取得
- PowerShell出力からの自動ログ収集

### Phase 3（自動化）
- 承認済み標準作業の自動実行（例: グループメンバーシップ）
- 承認要件と監査証跡の維持必須

## 受入基準

- 必須項目なしでチケット作成不可
- 優先度がルール通りに自動計算される
- 承認なしでM365操作完了不可
- 実施ログ（誰が/いつ/何を/結果）が必ず記録される
- 履歴（ステータス変更）が削除不可でトレース可能
- SLA期限超過の検知と通知
- 月次KPIレポート生成

## 開発時の制約事項

### チケットシステム実装時
- ステータス遷移ルールをコードレベルで強制
- SOD原則に違反するステータス変更を防止
- SLAポリシーに基づいて期限を自動計算

### M365操作実装時
- 承認状態を確認せずに操作実行禁止
- タスク完了前に必ず実施ログエントリを作成
- 同一チケット上で 実施者 ≠ 承認者 を検証
- すべての変更操作でロールバック手順を保存

### 監査機能実装時
- `ticket_history` と `m365_execution_logs` は追記専用テーブル設計を使用
- 監査テーブルのUPDATE/DELETEを防ぐデータベーストリガーを含める
- 必要に応じてハッシュチェーンなどの整合性保護を実装

## 将来の拡張

- 完全なITIL Problem ManagementとRelease Management
- CAB（変更諮問委員会）を含む高度な変更管理
- 標準リクエストのセルフサービス自動化
- AIによるチケット分類と自動割当
- 高度な分析とトレンド分析
