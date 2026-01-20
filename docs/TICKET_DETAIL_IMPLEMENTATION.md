# チケット詳細画面実装ドキュメント

## 概要

Mirai-HelpDesk-Management-Systemのチケット詳細画面を完全に実装しました。
タブベースのUIを採用し、コメント、添付ファイル、履歴、M365タスクを管理できる統合ビューを提供します。

## 実装内容

### 1. バックエンド API

#### 1.1 統合チケット詳細エンドポイント

**エンドポイント:** `GET /api/tickets/{ticket_id}/detail`

チケット詳細、コメント、添付ファイル、履歴を1回のリクエストで取得します。

**レスポンス構造:**
```json
{
  "ticket": {
    "id": 1,
    "ticket_number": "TKT-0001",
    "subject": "メール送信エラー",
    "status": "in_progress",
    "priority": "P2",
    ...
  },
  "comments": [
    {
      "id": 1,
      "ticket_id": 1,
      "author_name": "山田太郎",
      "content": "調査中です",
      "visibility": "public",
      "created_at": "2026-01-20T10:00:00Z"
    }
  ],
  "attachments": [
    {
      "id": 1,
      "ticket_id": 1,
      "filename": "abc123.png",
      "original_filename": "error_screenshot.png",
      "size": 102400,
      ...
    }
  ],
  "history": [
    {
      "id": 1,
      "ticket_id": 1,
      "actor_name": "山田太郎",
      "action": "status_changed",
      "before": "new",
      "after": "in_progress",
      "created_at": "2026-01-20T10:00:00Z"
    }
  ]
}
```

#### 1.2 ステータス更新専用エンドポイント

**エンドポイント:** `PATCH /api/tickets/{ticket_id}/status`

**リクエストボディ:**
```json
{
  "status": "resolved",
  "reason": "問題を解決しました"
}
```

このエンドポイントは自動的に履歴を記録し、ステータス遷移時の自動処理（resolved_at、closed_atの設定）を実行します。

#### 1.3 添付ファイルダウンロードエンドポイント

**エンドポイント:** `GET /api/tickets/{ticket_id}/attachments/{attachment_id}/download`

添付ファイルを直接ダウンロードできます。

**セキュリティ:**
- ユーザーがチケットへのアクセス権を持っているか確認
- ファイルの存在確認
- 元のファイル名でダウンロード

### 2. フロントエンド

#### 2.1 チケット詳細画面 (TicketDetail.tsx)

**画面構成:**

```
┌─────────────────────────────────────────────────────────────┐
│ [← 戻る]                                                     │
├─────────────────────────────────────────────────────────────┤
│ 左カラム (16/24)                   │ 右カラム (8/24)         │
│                                    │                         │
│ ┌─────────────────────────────┐   │ ┌─────────────────────┐│
│ │ 基本情報カード               │   │ │ ステータス更新      ││
│ │ - チケット番号、件名         │   │ │ - 現在のステータス  ││
│ │ - ステータス、優先度タグ     │   │ │ - 変更可能ステータス││
│ │ - 詳細情報テーブル           │   │ └─────────────────────┘│
│ │ - 説明、解決サマリー         │   │                         │
│ └─────────────────────────────┘   │ ┌─────────────────────┐│
│                                    │ │ SLA情報             ││
│ ┌─────────────────────────────┐   │ │ - 解決期限          ││
│ │ タブナビゲーション           │   │ │ - 初動対応期限      ││
│ ├─────┬─────┬─────┬─────┤   │ └─────────────────────┘│
│ │コメント│添付 │履歴 │M365 │   │                         │
│ └─────┴─────┴─────┴─────┘   │ ┌─────────────────────┐│
│                                    │ │ 主要イベント        ││
│ [タブコンテンツ表示領域]           │ │ - タイムライン      ││
│                                    │ └─────────────────────┘│
└────────────────────────────────────┴─────────────────────────┘
```

#### 2.2 タブ構成

##### コメントタブ
- コメント一覧（公開/内部メモを区別）
- アバターとユーザー名
- 作成日時（相対時間表示）
- 新規コメント追加フォーム
  - テキストエリア
  - 公開/内部メモ切替（スタッフのみ）

##### 添付ファイルタブ
- ファイルアップロードセクション
  - ファイル選択ボタン
  - 対応フォーマット表示
  - アップロードボタン
- 添付ファイル一覧
  - ファイル名、サイズ、アップロード者
  - ダウンロードボタン

##### 履歴タブ
- タイムライン形式で履歴を表示
- 各エントリの表示内容:
  - 操作者名
  - アクション（日本語表示）
  - 変更内容（変更前→変更後）
  - 変更理由（任意）
  - 日時（秒単位）

##### M365タブ
- 現在は開発中メッセージを表示
- 将来的にM365タスクと実施ログを表示予定

#### 2.3 右カラムの機能

##### ステータス更新カード
- 現在のステータスを色付きタグで表示
- 変更可能なステータスをボタンで表示
- ワンクリックでステータス変更
- ステータスフロー制御により不正な遷移を防止

##### SLA情報カード
- 解決期限の表示
- 初動対応期限の表示
- 期限超過時は赤色でハイライト
- 相対時間表示（例: 2時間後、3日前）

##### 主要イベントカード
- 簡易タイムライン
- チケット作成、解決、完了の主要イベントのみ表示

### 3. サービス層 (ticketService.ts)

新しく追加されたAPI関数:

```typescript
// チケット詳細取得（統合）
getTicketDetail(id: string): Promise<ApiResponse<TicketDetailWithRelations>>

// 添付ファイル一覧取得
getTicketAttachments(ticketId: string): Promise<ApiResponse<{attachments: TicketAttachment[]}>>

// 添付ファイルアップロード
uploadAttachment(ticketId: string, file: File): Promise<ApiResponse<{attachment: TicketAttachment}>>

// チケット履歴取得
getTicketHistory(ticketId: string, params?: {page?: number, page_size?: number}): Promise<ApiResponse<HistoryListResponse>>
```

### 4. データモデル

新しく追加された型定義:

```typescript
interface TicketAttachment {
  id: number;
  ticket_id: number;
  filename: string;
  original_filename: string;
  content_type: string;
  size: number;
  hash: string;
  uploader_id: number;
  uploader_name?: string;
  created_at: string;
}

interface TicketHistoryEntry {
  id: number;
  ticket_id: number;
  actor_id: number | null;
  actor_name: string | null;
  action: string;
  field_name: string | null;
  before: string | null;
  after: string | null;
  reason: string | null;
  created_at: string;
}

interface TicketDetailWithRelations {
  ticket: TicketDetail;
  comments: TicketComment[];
  attachments: TicketAttachment[];
  history: TicketHistoryEntry[];
}
```

## セキュリティ機能

### 1. アクセス制御
- Requesterは自分のチケットのみ閲覧可能
- スタッフ（Agent以上）は全チケットへアクセス可能
- Requesterは公開コメントのみ閲覧可能
- スタッフは内部メモも閲覧可能

### 2. ファイルアップロード
- 許可された拡張子のみアップロード可能
  - ドキュメント: .txt, .pdf, .doc, .docx, .xls, .xlsx, .ppt, .pptx
  - 画像: .png, .jpg, .jpeg, .gif, .bmp, .webp
  - その他: .csv, .json, .xml, .zip, .7z, .log
- 最大ファイルサイズ: 10MB
- SHA-256ハッシュによる整合性確認
- ユニークなファイル名生成

### 3. ステータス遷移制御
- 定義されたフローに従った遷移のみ許可
- 不正な遷移を防止
- 履歴への自動記録

## 監査証跡

すべての操作は自動的に履歴として記録されます:

- チケット作成
- ステータス変更
- 優先度変更
- カテゴリ変更
- 担当者割当/変更
- 解決/完了/再開

各履歴エントリには以下が含まれます:
- 操作者ID・名前
- アクション種別
- 変更対象フィールド
- 変更前の値
- 変更後の値
- 変更理由（任意）
- 実行日時

## UI/UX特徴

### Ant Design コンポーネント活用
- Card: セクション分割
- Tabs: 機能別タブ
- Timeline: 履歴表示
- List: コメント・添付ファイル一覧
- Upload: ドラッグ&ドロップ対応
- Tag: ステータス・優先度の視覚化
- Descriptions: 詳細情報テーブル

### レスポンシブデザイン
- Col/Row グリッドシステム
- xs/lg ブレークポイント
- モバイル対応

### インタラクティブ機能
- リアルタイム更新（React Query）
- 楽観的UI更新
- ローディング状態表示
- エラーハンドリング
- 成功・エラーメッセージ（Toast通知）

### 日本語対応
- dayjs 日本語ロケール
- 相対時間表示（例: "3時間前"）
- すべてのラベルとメッセージを日本語化

## 使用例

### チケット詳細の閲覧
1. チケット一覧からチケットをクリック
2. 基本情報、コメント、添付ファイル、履歴を確認

### コメント追加
1. コメントタブを開く
2. テキストエリアにコメントを入力
3. 公開/内部メモを選択（スタッフのみ）
4. 「コメントを追加」ボタンをクリック

### ファイルアップロード
1. 添付ファイルタブを開く
2. 「ファイルを選択」ボタンをクリック
3. ファイルを選択
4. 「アップロード」ボタンをクリック

### ステータス変更
1. 右カラムの「ステータス更新」カードを確認
2. 変更可能なステータスボタンをクリック
3. 自動的にステータスが更新され、履歴に記録される

## 今後の拡張

### M365タスク表示
- M365操作タスクの一覧表示
- 実施ログの表示
- 承認状態の表示
- エビデンス添付ファイルの表示

### 追加機能候補
- チケット編集（件名、説明、カテゴリ）
- 担当者変更
- 優先度変更
- タグ付け
- 関連チケットのリンク
- ウォッチャー機能
- メール通知設定

## テスト推奨事項

### 機能テスト
- [ ] チケット詳細の表示
- [ ] コメントの追加（公開/内部）
- [ ] ファイルのアップロード
- [ ] ファイルのダウンロード
- [ ] ステータス変更
- [ ] 履歴の表示
- [ ] タブの切り替え

### セキュリティテスト
- [ ] Requesterが他人のチケットにアクセスできないこと
- [ ] Requesterが内部メモを閲覧できないこと
- [ ] 不正なファイル拡張子がアップロードできないこと
- [ ] ファイルサイズ制限が機能すること
- [ ] 不正なステータス遷移が拒否されること

### E2Eテスト
- [ ] チケット作成からコメント追加、ファイルアップロード、ステータス変更、完了までの一連の流れ
- [ ] 複数ユーザーによる同時編集
- [ ] 履歴の整合性確認

## 関連ファイル

### バックエンド
- `backend/app/api/routes/tickets.py` - チケットAPIルート
- `backend/app/models/ticket.py` - チケットモデル
- `backend/app/models/comment.py` - コメントモデル
- `backend/app/models/attachment.py` - 添付ファイルモデル
- `backend/app/models/ticket_history.py` - 履歴モデル

### フロントエンド
- `frontend/src/pages/tickets/TicketDetail.tsx` - チケット詳細画面
- `frontend/src/services/ticketService.ts` - チケットサービス
- `frontend/src/types/index.ts` - 型定義

## まとめ

チケット詳細画面は、Mirai-HelpDesk-Management-Systemの中核機能として、以下の要件を満たしています:

- 包括的な情報表示（チケット情報、コメント、添付ファイル、履歴）
- インタラクティブな操作（コメント追加、ファイルアップロード、ステータス変更）
- 完全な監査証跡（すべての操作を履歴に記録）
- ロールベースのアクセス制御
- 使いやすいタブベースUI
- レスポンシブデザイン

この実装により、IT部門はインシデント、サービス要求、Microsoft 365 運用を効率的に管理できるようになります。
