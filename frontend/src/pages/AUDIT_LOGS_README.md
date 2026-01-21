# 監査ログUI実装ドキュメント

## 概要

Mirai HelpDesk Management System の監査ログUI画面です。システム内のすべての操作を監査証跡として記録・閲覧できる管理者専用ページです。

## 実装ファイル

### 1. サービス層

**ファイル**: `src/services/auditService.ts`

#### 主要な型定義

```typescript
interface AuditLog {
  audit_id: string;
  actor_id: string;
  actor_name: string;
  actor_email?: string;
  action: string;
  resource_type: string;
  resource_id?: string;
  resource_name?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}
```

#### API関数

- `getAuditLogs(params)` - 監査ログ一覧取得（フィルター、ページネーション対応）
- `getAuditLog(auditId)` - 監査ログ詳細取得
- `getAuditStatistics(params)` - 監査統計情報取得
- `exportAuditLogsCSV(params)` - CSV形式でエクスポート
- `exportAuditLogsJSON(params)` - JSON形式でエクスポート
- `getUserActivity(userId, params)` - ユーザー別アクティビティ取得
- `getResourceActivity(resourceType, resourceId, params)` - リソース別アクティビティ取得

#### アクション種別

以下のアクション種別を定義:

- **認証関連**: login, logout, login_failed, password_reset
- **チケット関連**: ticket_create, ticket_update, ticket_delete, ticket_status_change, ticket_assign, ticket_comment, ticket_attachment
- **M365関連**: m365_task_create, m365_task_execute, m365_task_approve, m365_task_reject
- **ユーザー管理**: user_create, user_update, user_delete, user_role_change
- **ナレッジ**: knowledge_create, knowledge_update, knowledge_delete
- **設定変更**: settings_update, sla_policy_update
- **その他**: export_data, bulk_operation

#### リソース種別

- ticket, user, m365_task, knowledge, approval, settings, sla_policy, auth

### 2. UIコンポーネント

**ファイル**: `src/pages/AuditLogs.tsx`

#### 主要機能

##### フィルタリング機能

- **期間指定**: DateRangePickerで開始日〜終了日を指定
- **アクション種別**: ドロップダウンでアクション種別を選択
- **リソース種別**: ドロップダウンでリソース種別を選択
- **検索**: ユーザー名、リソース名、IPアドレスなどで検索

##### テーブル表示

以下のカラムを持つテーブル:

- 日時 (ソート可能)
- ユーザー (名前とメールアドレス)
- アクション (色分けされたタグ)
- リソース種別 (タグ)
- リソース (名前またはID)
- IPアドレス
- 操作 (詳細表示ボタン)

##### ページネーション

- ページサイズ: 20/50/100/200件から選択可能
- ページジャンプ機能
- 総件数表示

##### エクスポート機能

- **CSV形式**: カンマ区切りでダウンロード
- **JSON形式**: JSON配列でダウンロード
- 現在のフィルター条件に基づいてエクスポート
- ファイル名: `audit-logs-YYYY-MM-DD.csv/json`

##### 詳細表示

右側のDrawerで以下の詳細情報を表示:

- ログID
- 日時（詳細表示）
- ユーザー情報（ID、名前、メールアドレス）
- アクション種別
- リソース種別
- リソースID・名前
- IPアドレス
- User Agent
- 詳細情報（JSON形式）

##### 統計サマリー

ページ上部に以下の統計情報を表示:

- 総ログ数
- アクティブユーザー数
- 最近のアクティビティ数
- 監査ログ記録ステータス

#### 権限チェック

- ManagerまたはAuditorロールのみアクセス可能
- それ以外のユーザーがアクセスした場合はエラーメッセージを表示してリダイレクト

```typescript
useEffect(() => {
  if (user && !['manager', 'auditor'].includes(user.role)) {
    message.error('このページにアクセスする権限がありません');
    window.location.href = '/';
  }
}, [user]);
```

### 3. スタイリング

**ファイル**: `src/pages/AuditLogs.css`

#### デザインコンセプト

- **Microsoft Fluent Design準拠**: Fluent Design Systemの原則に従ったスタイリング
- **カラーパレット**: Microsoft 365の配色を採用
  - プライマリ: `#0078d4`
  - グレースケール: `#faf9f8`, `#f3f2f1`, `#edebe9`
  - テキスト: `#323130`, `#605e5c`

#### 主要スタイル

- **カードデザイン**: 角丸8px、Fluent Designの影
- **フィルターセクション**: 薄いグレー背景、明確な視覚的グループ化
- **テーブル**: ホバー効果、選択状態、ボーダーの色分け
- **タグ**: 角丸2px、太字、境界線なし
- **ボタン**: 角丸2px、太字、ホバー効果
- **ドロワー**: 右側スライドイン、600px幅

#### レスポンシブ対応

- タブレット・モバイルでパディングを調整
- ドロワーは小画面で全幅表示
- テーブルはスクロール可能

#### プリント対応

- フィルター、アクションバー、ページネーションは非表示
- テーブルのフォントサイズを縮小
- 影を削除し、境界線のみ表示

### 4. ルーティング

**ファイル**: `src/App.tsx`

ルートパス: `/audit-logs`

```typescript
<Route path="/audit-logs" element={<AuditLogs />} />
```

### 5. ナビゲーション

**ファイル**: `src/components/layouts/DashboardLayout.tsx`

サイドバーメニューにManagerとAuditorロール向けに表示:

```typescript
if (user?.role === 'manager' || user?.role === 'auditor') {
  menuItems.push({
    key: '/audit-logs',
    icon: <AuditOutlined />,
    label: '監査ログ',
  });
}
```

## API統合

### エンドポイント

以下のAPIエンドポイントと統合:

#### 1. 監査ログ一覧取得

```
GET /api/audit/logs
```

**クエリパラメータ**:
- `page` - ページ番号 (デフォルト: 1)
- `page_size` - ページサイズ (デフォルト: 50)
- `action` - アクション種別フィルター
- `resource_type` - リソース種別フィルター
- `actor_id` - ユーザーIDフィルター
- `start_date` - 開始日 (YYYY-MM-DD)
- `end_date` - 終了日 (YYYY-MM-DD)
- `search` - 検索キーワード

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 1000,
    "page": 1,
    "page_size": 50,
    "total_pages": 20
  }
}
```

#### 2. 監査統計取得

```
GET /api/audit/statistics
```

**クエリパラメータ**:
- `start_date` - 開始日 (オプション)
- `end_date` - 終了日 (オプション)

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "statistics": {
      "total_logs": 10000,
      "unique_users": 150,
      "action_breakdown": {...},
      "resource_type_breakdown": {...},
      "recent_activity_count": 50
    }
  }
}
```

#### 3. CSVエクスポート

```
GET /api/audit/export?format=csv&[filters]
```

**レスポンス**: CSV形式のBlobデータ

#### 4. JSONエクスポート

```
GET /api/audit/export?format=json&[filters]
```

**レスポンス**: JSON形式のBlobデータ

## 使用方法

### 基本操作

1. **ページアクセス**:
   - サイドバーの「監査ログ」メニューをクリック
   - または直接 `/audit-logs` にアクセス

2. **フィルタリング**:
   - 期間指定: DateRangePickerで日付範囲を選択
   - アクション種別: ドロップダウンから選択
   - リソース種別: ドロップダウンから選択
   - 検索: テキスト入力して検索ボタンをクリック
   - クリア: フィルタークリアボタンで全フィルターをリセット

3. **ソート**:
   - テーブルヘッダーの「日時」列をクリックして昇順/降順切り替え

4. **詳細表示**:
   - 各行の「詳細」ボタンをクリックしてDrawerを開く
   - JSON形式の詳細情報を確認

5. **エクスポート**:
   - 「CSV エクスポート」または「JSON エクスポート」ボタンをクリック
   - 現在のフィルター条件でエクスポート
   - ブラウザでダウンロード

### ユースケース

#### ケース1: 特定ユーザーの操作履歴を確認

1. 検索フィールドにユーザー名を入力
2. 検索ボタンをクリック
3. 該当ユーザーの操作履歴が表示される
4. 詳細ボタンをクリックして詳細情報を確認

#### ケース2: 期間内のM365操作を監査

1. 期間指定で日付範囲を選択
2. アクション種別で「M365タスク実行」を選択
3. リソース種別で「M365タスク」を選択
4. 検索ボタンをクリック
5. 該当期間内のM365操作が表示される
6. CSVエクスポートで監査レポート作成

#### ケース3: ログイン失敗の調査

1. アクション種別で「ログイン失敗」を選択
2. 検索ボタンをクリック
3. 失敗したログイン試行が表示される
4. 詳細ボタンをクリックしてIPアドレスやUser Agentを確認

#### ケース4: 月次監査レポート作成

1. 期間指定で当月の範囲を選択
2. フィルターなしで全操作を取得
3. CSV エクスポートでファイルをダウンロード
4. Excelなどで開いて分析

## セキュリティ要件

### アクセス制御

- **ロールベース認証**: ManagerまたはAuditorロールのみアクセス可能
- **トークン認証**: すべてのAPI呼び出しにBearerトークンを含める
- **セッション管理**: トークン有効期限切れの場合は自動ログアウト

### 監査証跡

- **追記専用ログ**: フロントエンドでは表示のみ、編集・削除は不可
- **完全性保護**: バックエンドでハッシュチェーンまたはデジタル署名で保護
- **タイムスタンプ**: すべてのログエントリに変更不可のタイムスタンプ

### プライバシー

- **個人情報**: メールアドレスなどの個人情報は適切に表示
- **データ保持**: 法規制に準拠した期間（最低2年）保持
- **エクスポート制限**: 大量エクスポートは権限チェック

## パフォーマンス最適化

### フロントエンド

- **ページネーション**: 大量データを効率的に表示
- **遅延ロード**: 詳細情報はDrawer表示時に読み込み
- **キャッシング**: React Queryで自動キャッシング
- **仮想スクロール**: 将来的に大量行の表示最適化

### バックエンド

- **インデックス**: 日時、ユーザーID、アクション種別、リソース種別にインデックス
- **クエリ最適化**: 複雑な検索クエリの最適化
- **ページネーション**: LIMIT/OFFSETまたはカーソルベース
- **キャッシング**: 統計情報などの重い計算結果をキャッシュ

## トラブルシューティング

### よくある問題

#### 1. 「このページにアクセスする権限がありません」エラー

**原因**: ユーザーがManagerまたはAuditorロールでない

**解決策**:
- ユーザーの役割を確認
- 管理者に役割変更を依頼

#### 2. エクスポートが失敗する

**原因**:
- データ量が多すぎる
- トークンが無効
- ネットワークエラー

**解決策**:
- フィルターで範囲を絞る
- 再ログインしてトークンを更新
- ネットワーク接続を確認

#### 3. テーブルが空

**原因**:
- 該当データがない
- フィルター条件が厳しすぎる
- APIエラー

**解決策**:
- フィルタークリアして再検索
- ブラウザコンソールでエラー確認
- ネットワークタブでAPIレスポンス確認

## 今後の拡張

### Phase 2 機能

- **リアルタイム更新**: WebSocketで新規ログをリアルタイム表示
- **高度な検索**: Elasticsearchベースの全文検索
- **可視化**: グラフやチャートで統計表示
- **アラート**: 異常なアクティビティを検知して通知
- **カスタムレポート**: ユーザー定義のレポートテンプレート

### Phase 3 機能

- **機械学習**: 異常検知と予測分析
- **統合**: SIEM (Security Information and Event Management) システムと統合
- **コンプライアンスレポート**: GDPR、SOX、HIPAAなどの規制に準拠したレポート自動生成
- **ブロックチェーン**: 不変性を保証するためのブロックチェーン統合

## 参考資料

- [Microsoft Fluent Design System](https://www.microsoft.com/design/fluent/)
- [Ant Design Documentation](https://ant.design/)
- [React Query Documentation](https://tanstack.com/query/latest)
- [NIST SP 800-92: Guide to Computer Security Log Management](https://csrc.nist.gov/publications/detail/sp/800-92/final)

## 変更履歴

| バージョン | 日付 | 変更内容 |
|-----------|------|---------|
| 1.0.0 | 2026-01-20 | 初版リリース - 基本的な監査ログUI実装 |

---

**作成者**: Claude (Anthropic)
**最終更新**: 2026-01-20
