# 通知システム ドキュメント

## 概要

Mirai Helpdesk Management Systemの通知システムは、チケットのライフサイクルにおける重要なイベントをユーザーにメール通知します。このシステムは、依頼者、担当者、承認者、管理者が適切なタイミングで情報を受け取ることを保証します。

## アーキテクチャ

通知システムは以下の2つの主要コンポーネントで構成されています:

### 1. EmailService (`src/services/email.service.ts`)

**責務**: メール送信の基盤機能を提供

- nodemailerを使用したSMTPメール送信
- HTMLメールテンプレートの管理
- エラーハンドリング（メール送信失敗でも主要処理は継続）
- 各種イベント用のメールテンプレート

**主要メソッド**:
- `sendEmail(options)` - 基本的なメール送信
- `sendTicketCreated(ticket, requester, assignee)` - チケット作成通知
- `sendTicketAssigned(ticket, assignee, requester)` - チケット割り当て通知
- `sendApprovalRequest(approval, ticket, approver, requester)` - 承認依頼通知
- `sendSLAOverdue(ticket, assignee, managers)` - SLA期限超過警告
- `sendTicketResolved(ticket, requester, resolver)` - チケット解決通知
- `sendCommentAdded(ticket, comment, author, recipients)` - コメント追加通知

### 2. NotificationService (`src/services/notification.service.ts`)

**責務**: ビジネスロジックに基づいた通知の制御

- 通知対象ユーザーの判定
- ユーザー情報の取得
- EmailServiceの呼び出し
- 通知ログの記録

**主要メソッド**:
- `sendTicketCreated(ticket)` - チケット作成時の通知処理
- `sendTicketAssigned(ticket, assignee)` - チケット割り当て時の通知処理
- `sendApprovalRequest(approval, ticket)` - 承認依頼時の通知処理
- `sendSLAOverdue(ticket)` - SLA期限超過時の通知処理
- `sendTicketResolved(ticket)` - チケット解決時の通知処理
- `sendCommentAdded(ticket, comment, isPublic)` - コメント追加時の通知処理
- `sendApprovalCompleted(approval, ticket, approved)` - 承認完了時の通知処理
- `notifyOverdueTickets()` - バッチ処理用: 全期限超過チケットの通知

## 通知トリガーとルール

### 1. チケット作成時 (`sendTicketCreated`)

**通知対象**:
- 依頼者（Requester）: チケット受付確認
- 担当者（Assignee）: チケットが割り当てられている場合

**メール内容**:
- チケット番号
- 件名
- 種別（インシデント/サービス要求/変更/問題）
- 優先度
- ステータス
- 説明
- 期限（設定されている場合）
- チケット詳細へのリンク

### 2. チケット割り当て時 (`sendTicketAssigned`)

**通知対象**:
- 新しい担当者（Assignee）

**メール内容**:
- 割り当て通知
- チケット基本情報
- 依頼者情報
- 期限情報
- チケット詳細へのリンク

### 3. 承認依頼時 (`sendApprovalRequest`)

**通知対象**:
- 承認者（Approver）

**メール内容**:
- 承認依頼の旨
- チケット情報
- 承認依頼理由
- 承認/却下アクションリンク

**重要**: M365操作など特権操作には必ず承認が必要です。

### 4. SLA期限超過時 (`sendSLAOverdue`)

**通知対象**:
- 担当者（Assignee）: TO
- 全管理者（Manager）: BCC

**メール内容**:
- 警告メッセージ
- チケット情報
- 作成日時と期限（強調表示）
- チケット詳細へのリンク

**トリガー**: バッチ処理で定期的に実行（`notifyOverdueTickets`メソッド）

### 5. チケット解決時 (`sendTicketResolved`)

**通知対象**:
- 依頼者（Requester）

**メール内容**:
- 解決完了の通知
- 解決者情報
- 解決日時
- 解決内容サマリー
- チケット詳細へのリンク
- 再オープン可能である旨の案内

### 6. コメント追加時 (`sendCommentAdded`)

**通知対象**:
- 公開コメント: 依頼者
- 担当者（コメント投稿者以外）
- メンションされたユーザー

**通知対象外**:
- 内部コメント: 依頼者には送信しない
- コメント投稿者自身

**メール内容**:
- コメント本文
- コメント投稿者
- チケット情報
- チケット詳細へのリンク

### 7. 承認完了時 (`sendApprovalCompleted`)

**通知対象**:
- 依頼者（Requester）
- 担当者（Assignee）

**メール内容**:
- 承認/却下の結果
- 承認者情報
- コメント（ある場合）

## 環境変数設定

通知システムは以下の環境変数を必要とします（`.env`ファイル）:

```bash
# Email Configuration
SMTP_HOST=smtp.office365.com        # SMTPサーバーホスト
SMTP_PORT=587                       # SMTPポート（587=STARTTLS, 465=SSL）
SMTP_SECURE=false                   # true=SSL, false=STARTTLS
SMTP_USER=helpdesk@yourcompany.com  # SMTP認証ユーザー名
SMTP_PASSWORD=your_smtp_password    # SMTP認証パスワード
EMAIL_FROM=Mirai ヘルプデスク <helpdesk@yourcompany.com>  # 送信元アドレス

# Frontend URL (メール内のリンク生成用)
FRONTEND_URL=http://localhost:3001
```

### SMTP設定例

#### Microsoft 365 / Outlook.com
```bash
SMTP_HOST=smtp.office365.com
SMTP_PORT=587
SMTP_SECURE=false
```

#### Gmail
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
# 注意: Gmailの場合、アプリパスワードの使用が推奨されます
```

#### 社内SMTPサーバー
```bash
SMTP_HOST=mail.yourcompany.local
SMTP_PORT=25
SMTP_SECURE=false
# 認証不要の場合はSMTP_USERとSMTP_PASSWORDを空にする
```

## 使用方法

### 1. チケットコントローラーでの使用例

```typescript
import { NotificationService } from '../services/notification.service';

// チケット作成時
const ticket = await TicketModel.create(ticketData);
await NotificationService.sendTicketCreated(ticket);

// チケット割り当て時
const assignee = await UserModel.findById(assigneeId);
await TicketModel.assign(ticketId, assigneeId, actorId);
await NotificationService.sendTicketAssigned(ticket, assignee);

// チケット解決時
await TicketModel.updateStatus(ticketId, TicketStatus.RESOLVED, actorId);
await NotificationService.sendTicketResolved(ticket);
```

### 2. 承認フローでの使用例

```typescript
// 承認依頼時
const approval = await ApprovalModel.create(approvalData);
const ticket = await TicketModel.findById(ticketId);
await NotificationService.sendApprovalRequest(approval, ticket);

// 承認完了時
await ApprovalModel.approve(approvalId, comment);
await NotificationService.sendApprovalCompleted(approval, ticket, true);
```

### 3. バッチ処理での使用例

```typescript
// 定期的に実行（例: 毎時）
import { NotificationService } from './services/notification.service';

// SLA期限超過チケットの通知
await NotificationService.notifyOverdueTickets();
```

cronジョブの設定例:
```bash
# 毎時0分に実行
0 * * * * node -e "require('./dist/services/notification.service').NotificationService.notifyOverdueTickets()"
```

## エラーハンドリング

### 設計原則

**通知失敗は致命的エラーではない**: メール送信が失敗しても、チケット操作などの主要処理は成功させる必要があります。

### 実装

1. **EmailService**:
   - メール送信失敗時はログに記録するのみで例外を投げない
   - SMTPエラー、ネットワークエラーは静かに失敗

2. **NotificationService**:
   - try-catchブロックで全メソッドを保護
   - エラー時はloggerに記録するのみ
   - ユーザー情報取得失敗時は警告ログを出力して処理を中断

### ログ例

```javascript
// 成功時
logger.info('Ticket created notification sent', {
  ticket_id: 'xxx',
  ticket_number: 'INC-001',
  requester_email: 'user@example.com'
});

// 失敗時
logger.error('Failed to send ticket created notification', {
  error: err,
  ticket_id: 'xxx'
});
```

## HTMLメールテンプレート

すべてのメールはHTMLフォーマットで送信され、以下の特徴があります:

### デザイン仕様

- **カラースキーム**:
  - ヘッダー: イベントタイプに応じた色分け
    - 通常: `#0078d4` (青)
    - 承認依頼: `#d83b01` (オレンジ)
    - 警告: `#a4262c` (赤)
    - 解決: `#107c10` (緑)
  - 本文背景: `#f5f5f5` (薄いグレー)
  - 情報ボックス: 白背景、左ボーダーで強調

- **フォント**: Segoe UI, Tahoma, Geneva, Verdana, sans-serif

- **レスポンシブ**: 最大幅600pxで中央揃え

### カスタマイズ

テンプレートは`EmailService`内にインラインで定義されています。カスタマイズする場合は、以下のメソッドを編集してください:

- `sendTicketCreated()`
- `sendTicketAssigned()`
- `sendApprovalRequest()`
- `sendSLAOverdue()`
- `sendTicketResolved()`
- `sendCommentAdded()`

将来的には、テンプレートを外部ファイル（`backend/src/templates/email/`）に分離することも可能です。

## テスト

### 手動テスト

```typescript
// test-notification.ts
import { EmailService } from './services/email.service';

await EmailService.sendEmail({
  to: 'test@example.com',
  subject: 'テストメール',
  html: '<h1>テスト</h1><p>通知システムのテストです。</p>'
});
```

### 単体テスト（例）

```typescript
import { NotificationService } from './services/notification.service';
import { UserModel } from './models/user.model';
import { EmailService } from './services/email.service';

jest.mock('./services/email.service');
jest.mock('./models/user.model');

describe('NotificationService', () => {
  it('should send ticket created notification', async () => {
    const mockTicket = { /* ... */ };
    const mockUser = { /* ... */ };

    UserModel.findById.mockResolvedValue(mockUser);

    await NotificationService.sendTicketCreated(mockTicket);

    expect(EmailService.sendTicketCreated).toHaveBeenCalledWith(
      mockTicket,
      mockUser,
      undefined
    );
  });
});
```

## トラブルシューティング

### メールが送信されない

1. **環境変数を確認**:
   ```bash
   # .envファイルに正しい設定があるか確認
   SMTP_HOST=smtp.office365.com
   SMTP_PORT=587
   SMTP_USER=helpdesk@yourcompany.com
   SMTP_PASSWORD=***
   ```

2. **ログを確認**:
   ```bash
   # backend/logs/error.log を確認
   grep "Failed to send email" logs/error.log
   ```

3. **SMTP接続テスト**:
   ```bash
   # telnetで接続確認
   telnet smtp.office365.com 587
   ```

4. **認証情報を確認**:
   - パスワードが正しいか
   - 多要素認証が有効な場合はアプリパスワードを使用

### メールが受信トレイに届かない

1. **迷惑メールフォルダを確認**
2. **SPF/DKIM/DMARCレコードの設定** (本番環境)
3. **送信元アドレスが許可されているか確認**

### リンクが正しく動作しない

1. **FRONTEND_URL環境変数を確認**:
   ```bash
   FRONTEND_URL=https://helpdesk.yourcompany.com
   ```

2. **URLパスが正しいか確認**:
   - チケット詳細: `/tickets/{ticket_id}`
   - 承認画面: `/approvals/{approval_id}`

## セキュリティ考慮事項

### 情報漏洩防止

1. **内部コメントは非公開**: 依頼者には送信しない
2. **BCCの使用**: 管理者への一斉送信時は受信者が互いに見えないようにする
3. **センシティブ情報**: パスワード、秘密鍵などはメールに含めない

### メール経由の攻撃防止

1. **XSS対策**: HTMLテンプレート内でユーザー入力をエスケープ
2. **リンクの検証**: メール内のリンクは必ず自社ドメインに限定
3. **CSRF対策**: 承認/却下リンクはワンタイムトークンを使用（推奨）

## パフォーマンス

### 非同期処理

通知送信は非同期で実行されますが、エラーは無視されます。大量の通知を送信する場合は、キュー（例: Bull、RabbitMQ）の使用を検討してください。

### バッチ処理の最適化

```typescript
// SLA期限超過通知を並列処理
const overdueTickets = await TicketModel.findOverdueSLA();
await Promise.all(
  overdueTickets.map(ticket => NotificationService.sendSLAOverdue(ticket))
);
```

## 今後の拡張案

1. **通知設定のカスタマイズ**: ユーザーごとに通知のON/OFF設定
2. **通知チャネルの追加**:
   - Slack/Teams連携
   - SMS通知
   - プッシュ通知
3. **テンプレートエンジンの導入**: Handlebars、Pug等
4. **通知履歴の記録**: データベースに送信履歴を保存
5. **リトライメカニズム**: メール送信失敗時の自動再送
6. **通知の優先度**: P1チケットは即座に通知、P4は日次サマリー

## 関連ドキュメント

- [メールテンプレートガイド](./EMAIL_TEMPLATES.md) (TODO)
- [SLA設定ガイド](./SLA_CONFIGURATION.md) (TODO)
- [バッチ処理セットアップ](./BATCH_JOBS.md) (TODO)

## サポート

問題が発生した場合は、以下の情報と共にログを提供してください:

- エラーログ (`backend/logs/error.log`)
- 環境変数設定（機密情報を除く）
- チケットID、ユーザーID
- 期待される動作と実際の動作
