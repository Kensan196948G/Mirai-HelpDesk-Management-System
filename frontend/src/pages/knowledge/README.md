# ナレッジ編集UI実装ガイド

## 概要

Mirai-HelpDesk-Management-System のナレッジ編集UIを実装しました。このドキュメントでは実装の詳細と使用方法を説明します。

## 実装したファイル

### 1. 型定義
**ファイル**: `frontend/src/types/index.ts`

ナレッジ記事関連の型定義を追加:
- `KnowledgeArticleType`: 記事種別（FAQ、手順書、既知の問題など）
- `KnowledgeVisibility`: 公開範囲（公開、スタッフのみ、非公開）
- `KnowledgeArticle`: ナレッジ記事の型
- `KnowledgeArticleInput`: 作成・更新用のDTO
- `KnowledgeListResponse`: 一覧取得レスポンス

### 2. APIサービス
**ファイル**: `frontend/src/services/knowledgeService.ts`

以下のAPIメソッドを実装:
- `getKnowledgeArticles()`: 記事一覧取得（フィルター、ページング対応）
- `getKnowledgeArticle()`: 記事詳細取得
- `createKnowledgeArticle()`: 記事作成
- `updateKnowledgeArticle()`: 記事更新
- `deleteKnowledgeArticle()`: 記事削除
- `submitKnowledgeFeedback()`: フィードバック送信
- `incrementKnowledgeViewCount()`: 閲覧数カウント
- `getKnowledgeCategories()`: カテゴリ一覧取得
- `getPopularTags()`: 人気タグ取得

### 3. Markdownエディタコンポーネント
**ファイル**:
- `frontend/src/components/MarkdownEditor.tsx`
- `frontend/src/components/MarkdownEditor.css`

機能:
- リアルタイムプレビュー（編集タブとプレビュータブ）
- ツールバー（太字、斜体、見出し、リスト、リンク、コード、画像）
- XSS対策（DOMPurifyによるサニタイゼーション）
- Markdownレンダリング（marked.js使用）
- Fluent Designに準拠したスタイル

### 4. ナレッジ編集ページ
**ファイル**:
- `frontend/src/pages/knowledge/KnowledgeEditor.tsx`
- `frontend/src/pages/knowledge/KnowledgeEditor.css`

機能:
- 新規作成・編集の両方に対応
- 基本情報（タイトル、サマリー）
- Markdown本文編集
- メタデータ（記事種別、カテゴリ、タグ、公開範囲）
- 公開設定（公開/下書き、おすすめ記事）
- タグの動的追加・削除（Enter/カンマで追加）
- プレビューモーダル
- ドラフト保存機能
- 権限チェック（Agent以上で編集可能）

### 5. ナレッジ一覧ページ（更新）
**ファイル**: `frontend/src/pages/knowledge/KnowledgeList.tsx`

追加機能:
- 新規作成ボタン（Agent以上で表示）
- 編集ボタン（著者またはManager）
- 削除ボタン（Manager権限）
- フィルター（記事種別、公開範囲）
- 検索機能強化
- 公開ステータス表示（下書き、おすすめ）
- APIとの統合
- ページング対応

### 6. ナレッジ詳細ページ（更新）
**ファイル**: `frontend/src/pages/knowledge/KnowledgeDetail.tsx`

追加機能:
- Markdownレンダリング
- 編集ボタン（権限あり）
- APIとの統合
- 閲覧数カウント
- フィードバック機能実装

### 7. ルーティング
**ファイル**: `frontend/src/App.tsx`

追加ルート:
- `/knowledge/new`: 新規作成
- `/knowledge/edit/:id`: 編集
- `/knowledge/:id`: 詳細表示（既存）

## 使用ライブラリ

### インストールしたパッケージ
```bash
npm install marked dompurify @types/dompurify
```

- **marked**: Markdownパーサー（軽量で高速）
- **dompurify**: XSS対策のHTMLサニタイザー
- **@types/dompurify**: TypeScript型定義

## 画面構成

### ナレッジ編集画面

```
┌─────────────────────────────────────┐
│ [← 一覧に戻る]                       │
├─────────────────────────────────────┤
│ ナレッジ記事編集                     │
├─────────────────────────────────────┤
│ ┌───────────────────────────────┐   │
│ │ 基本情報                       │   │
│ │ タイトル: [入力フィールド]    │   │
│ │ サマリー: [テキストエリア]    │   │
│ └───────────────────────────────┘   │
│                                     │
│ ┌───────────────────────────────┐   │
│ │ 本文                           │   │
│ │ [Markdownエディタ]            │   │
│ │ - [編集] [プレビュー] タブ    │   │
│ │ - ツールバー                   │   │
│ └───────────────────────────────┘   │
│                                     │
│ ┌───────────────────────────────┐   │
│ │ メタデータ                     │   │
│ │ 記事種別: [Select]            │   │
│ │ カテゴリ: [Select]            │   │
│ │ タグ: [タグ入力]              │   │
│ │ 公開範囲: [Select]            │   │
│ └───────────────────────────────┘   │
│                                     │
│ ┌───────────────────────────────┐   │
│ │ 公開設定                       │   │
│ │ □ 公開する                     │   │
│ │ □ おすすめ記事として表示       │   │
│ └───────────────────────────────┘   │
│                                     │
│ [キャンセル][プレビュー]            │
│ [下書き保存][更新/作成]            │
└─────────────────────────────────────┘
```

## 権限管理

### 閲覧
- **全ユーザー**: 公開記事を閲覧可能
- **Staff**: スタッフのみの記事も閲覧可能

### 作成
- **Agent以上**: 記事を作成可能（Agent、M365 Operator、Approver、Manager）

### 編集
- **著者**: 自分が作成した記事を編集可能
- **Manager**: すべての記事を編集可能

### 削除
- **Manager**: すべての記事を削除可能

## API仕様

### GET /api/knowledge
記事一覧取得

**クエリパラメータ**:
```typescript
{
  search?: string;
  type?: string;
  category?: string;
  tags?: string[];
  visibility?: string;
  is_published?: boolean;
  page?: number;
  pageSize?: number;
}
```

### POST /api/knowledge
記事作成

**リクエストボディ**:
```json
{
  "title": "記事タイトル",
  "body": "Markdown本文",
  "summary": "概要",
  "type": "faq",
  "category": "アカウント",
  "tags": ["パスワード", "リセット"],
  "visibility": "public",
  "is_published": true,
  "is_featured": false
}
```

### PATCH /api/knowledge/{id}
記事更新

**リクエストボディ**: 同上（部分更新可能）

### DELETE /api/knowledge/{id}
記事削除

### POST /api/knowledge/{id}/feedback
フィードバック送信

**リクエストボディ**:
```json
{
  "is_helpful": true
}
```

### POST /api/knowledge/{id}/view
閲覧数カウント

## セキュリティ対策

### XSS対策
- DOMPurifyによるHTMLサニタイゼーション
- `dangerouslySetInnerHTML`使用時は必ずサニタイズ済みHTMLを使用

### 権限チェック
- フロントエンドで権限チェック実施
- バックエンドでも必ず権限チェックを実装すること

### 入力検証
- 必須項目チェック
- 文字数制限
- 適切なバリデーション

## スタイル

### Fluent Design準拠
- Microsoft Fluent Designのカラーパレット使用
- 適切なシャドウ、ボーダーラウンド
- Segoe UIフォントファミリー
- 統一された余白、高さ

### レスポンシブ対応
- モバイルデバイスでも使いやすい設計
- 適切なブレイクポイント

## 開発時の注意点

### Markdown編集
- 保存前に必ずプレビューで確認
- 改行は2つ連続で入力（Markdown仕様）
- コードブロックは```で囲む

### タグ入力
- Enterキーまたはカンマで追加
- 重複チェック実施済み
- 空白タグは追加不可

### 画像アップロード
- 現状はURL指定のみ
- 将来的にファイルアップロード機能を追加予定

## テスト項目

### 機能テスト
- [ ] 記事新規作成
- [ ] 記事編集
- [ ] 記事削除
- [ ] Markdown編集とプレビュー
- [ ] タグ追加・削除
- [ ] 下書き保存
- [ ] 公開設定変更
- [ ] 検索・フィルター
- [ ] ページング

### 権限テスト
- [ ] Requesterは作成不可
- [ ] Agentは作成可能
- [ ] 著者は自分の記事を編集可能
- [ ] Managerはすべての記事を編集・削除可能

### セキュリティテスト
- [ ] XSS攻撃の防御（スクリプトタグなど）
- [ ] HTMLインジェクションの防御
- [ ] 不正な権限昇格の防止

## 今後の拡張予定

1. **画像アップロード機能**
   - ドラッグ&ドロップでの画像アップロード
   - 画像プレビュー

2. **バージョン管理**
   - 記事の変更履歴
   - 以前のバージョンへの復元

3. **高度な検索**
   - 全文検索エンジン統合
   - ファセット検索

4. **テンプレート機能**
   - よく使う記事のテンプレート
   - カテゴリ別テンプレート

5. **承認ワークフロー**
   - 記事公開前の承認フロー
   - レビュー機能

## トラブルシューティング

### マークダウンが正しく表示されない
- ブラウザのコンソールでエラーを確認
- DOMPurifyのサニタイズ設定を確認
- markedのパース設定を確認

### 権限エラーが発生する
- ユーザーのロールを確認
- authStoreの状態を確認
- APIのレスポンスを確認

### 画像が表示されない
- 画像URLが正しいか確認
- CORS設定を確認
- 画像サーバーのアクセス権限を確認

## まとめ

このナレッジ編集UIは、Fluent Designに準拠し、セキュアで使いやすいインターフェースを提供します。Agent以上の権限を持つユーザーは、Markdown形式でナレッジ記事を作成・編集でき、適切な権限管理により安全に運用できます。
