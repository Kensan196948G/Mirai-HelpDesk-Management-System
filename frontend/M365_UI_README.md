# M365操作UI画面 実装ドキュメント

## 概要

Mirai-HelpDesk-Management-System のMicrosoft 365管理機能向けのUI画面を実装しました。Fluent Designに準拠し、M365 Operatorが効率的に作業できるインターフェースを提供します。

## 実装したファイル

### 1. JavaScript ページコンポーネント

#### `frontend/js/pages/m365-users.js`
**M365ユーザー検索ページ**

主な機能:
- リアルタイム検索（debounce付き、300ms遅延）
- Graph API経由でのユーザー検索
- カード形式でのユーザー表示
- ユーザー詳細モーダル
  - 基本情報（名前、メール、部署、役職）
  - ライセンス情報
  - アカウント情報（UPN、オブジェクトID、作成日時、最終サインイン）
- M365操作メニュー
  - ライセンス付与/削除
  - パスワードリセット
  - MFAリセット
  - グループメンバーシップ管理
  - メールボックス権限設定

画面構成:
```
┌─────────────────────────────────────┐
│ [検索バー]                           │
│ ユーザー名、メール、部署で検索       │
│                                     │
│ [ユーザーカード Grid]               │
│ ┌──────────┐ ┌──────────┐          │
│ │ Avatar   │ │ Avatar   │          │
│ │ Name     │ │ Name     │          │
│ │ Email    │ │ Email    │          │
│ │ 部署・役職│ │ 部署・役職│          │
│ │ ライセンス│ │ ライセンス│          │
│ │ [詳細][操作]│ │ [詳細][操作]│      │
│ └──────────┘ └──────────┘          │
└─────────────────────────────────────┘
```

#### `frontend/js/pages/m365-licenses.js`
**M365ライセンス管理ページ**

主な機能:
- 利用可能なライセンスSKU一覧表示
- 使用状況の可視化
  - 消費数 / 準備数
  - 使用率プログレスバー（色分け: 通常/警告/危機的）
- ライセンス別ユーザー一覧
- ライセンス名の日本語表示

画面構成:
```
┌─────────────────────────────────────┐
│ [ライセンスカード Grid]             │
│ ┌──────────────────┐                │
│ │ Microsoft 365 E3 │                │
│ │ 使用中: 45 | 利用可能: 5 | 合計: 50│
│ │ [■■■■■■■■■□] 90%        │
│ │ [割り当て済みユーザー]           │
│ └──────────────────┘                │
└─────────────────────────────────────┘
```

#### `frontend/js/pages/m365-tasks.js` (拡張)
**M365タスク管理ページ - 実行確認モーダル追加**

追加機能:
- **2段階の実行確認フロー**
  1. 操作確認モーダル
     - タスク詳細の表示
     - 実施方法の選択（Graph API / 管理センター / PowerShell）
  2. 実施ログ記録モーダル
     - コマンド/操作内容の記録
     - 結果（成功/失敗）の記録
     - 結果詳細・エビデンスの記録
     - 監査証跡の重要性を明示

画面フロー:
```
タスク一覧 → [実行]ボタン
    ↓
操作確認モーダル
    - タスク情報表示
    - 実施方法選択
    ↓
[実行]ボタン
    ↓
実施ログ記録モーダル
    - コマンド/操作内容入力
    - 結果入力
    - エビデンス添付
    ↓
[記録]ボタン → API送信
```

### 2. CSS スタイル

#### `frontend/css/m365.css`
**M365専用スタイルシート**

Fluent Design準拠の実装:
- **カラーパレット**
  - Primary: #0078d4 (Microsoft Blue)
  - Success: #107c10
  - Warning: #ffaa44
  - Error: #a4262c
  - Background: #f8f9fa
  - Border: #e1e4e8

- **コンポーネント**
  - 検索バー（大型、アイコン付き）
  - ユーザーカード（ホバーエフェクト付き）
  - ライセンスカード（使用率バー付き）
  - モーダル（2段階フロー対応）
  - バッジ（ステータス表示）
  - ラジオカード（実施方法選択）

- **レスポンシブデザイン**
  - 768px以下でグリッドが1カラムに変更
  - モバイルフレンドリーなタッチターゲット

### 3. API統合

#### `frontend/js/api.js` (追加エンドポイント)

```javascript
// M365 ユーザー検索
API.searchM365Users({ query, page, page_size })
API.getM365User(upn)
API.getM365UserLicenses(upn)

// M365 ライセンス管理
API.getM365Licenses()
API.getM365LicenseUsers(skuId)
API.getM365LicenseDetails(skuId)

// M365 タスク実行
API.logExecution(taskId, { method, command_or_screen, result, result_details })
```

### 4. ルーティング

#### `frontend/js/app.js` (ルート追加)

```javascript
Router.register('/m365/users', () => M365UsersPage.render());
Router.register('/m365/licenses', () => M365LicensesPage.render());
```

#### `frontend/js/components/sidebar.js` (ナビゲーション追加)

```javascript
{
    section: 'M365 管理',
    items: [
        { path: '/m365/users', icon: 'lucide-user-search', label: 'ユーザー検索' },
        { path: '/m365/licenses', icon: 'lucide-key', label: 'ライセンス管理' },
        { path: '/m365/tasks', icon: 'lucide-cloud', label: 'M365 タスク' },
        { path: '/m365/approvals', icon: 'lucide-check-square', label: '承認待ち' },
    ],
}
```

### 5. デモページ

#### `frontend/m365-demo.html`
スタンドアロンのデモHTML

特徴:
- 外部依存なしで動作
- Lucide Icons CDN使用
- すべてのM365ページにアクセス可能
- モックデータでの動作確認が可能

## 使用方法

### 開発環境での起動

```bash
# フロントエンドディレクトリに移動
cd frontend

# 開発サーバー起動（Viteを使用）
npm run dev

# ブラウザで以下のURLにアクセス
# http://localhost:8080/#/m365/users
# http://localhost:8080/#/m365/licenses
# http://localhost:8080/#/m365/tasks
```

### デモページの使用

```bash
# Webサーバーで m365-demo.html を開く
# 例: Live Server (VS Code Extension) や Python SimpleHTTPServer

# Python 3の場合
python -m http.server 8000

# ブラウザで以下のURLにアクセス
# http://localhost:8000/m365-demo.html
```

## バックエンドAPI要件

実装したUIが正しく動作するために、以下のバックエンドAPIエンドポイントが必要です:

### 1. M365ユーザー検索
```
GET /api/m365/users/search?query={keyword}&page={page}&page_size={size}

レスポンス:
{
  "items": [
    {
      "userPrincipalName": "user@example.com",
      "displayName": "山田太郎",
      "mail": "user@example.com",
      "department": "IT部",
      "jobTitle": "エンジニア",
      "officeLocation": "東京オフィス",
      "mobilePhone": "090-1234-5678",
      "accountEnabled": true,
      "assignedLicenses": ["SPE_E3", "SPE_E5"],
      "id": "user-object-id",
      "createdDateTime": "2020-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "page_size": 20
}
```

### 2. M365ユーザー詳細
```
GET /api/m365/users/{upn}

レスポンス: 上記と同じユーザーオブジェクト + 追加情報
```

### 3. ユーザーのライセンス情報
```
GET /api/m365/users/{upn}/licenses

レスポンス:
{
  "value": [
    {
      "skuId": "sku-guid",
      "skuPartNumber": "SPE_E3"
    }
  ]
}
```

### 4. 利用可能なライセンス一覧
```
GET /api/m365/licenses/available

レスポンス:
{
  "value": [
    {
      "skuId": "sku-guid",
      "skuPartNumber": "SPE_E3",
      "consumedUnits": 45,
      "prepaidUnits": {
        "enabled": 50,
        "suspended": 0,
        "warning": 0
      }
    }
  ]
}
```

### 5. ライセンス別ユーザー一覧
```
GET /api/m365/licenses/{skuId}/users

レスポンス:
{
  "value": [ユーザーオブジェクトの配列]
}
```

### 6. M365タスク作成
```
POST /api/m365/tasks
Content-Type: application/json

リクエスト:
{
  "task_type": "license_assign",
  "target_upn": "user@example.com",
  "ticket_id": "TKT-2026-0001",
  "description": "Microsoft 365 E3ライセンスの付与",
  "parameters": {
    "license_sku": "SPE_E3"
  }
}

レスポンス:
{
  "id": 123,
  "status": "pending",
  "created_at": "2026-01-20T12:00:00Z"
}
```

### 7. M365タスク実行ログ記録
```
POST /api/m365/tasks/{id}/execute
Content-Type: application/json

リクエスト:
{
  "method": "graph_api",
  "command_or_screen": "PATCH /users/{id}/assignLicense",
  "result": "success",
  "result_details": "ライセンスが正常に付与されました"
}

レスポンス:
{
  "execution_log_id": 456,
  "task_id": 123,
  "status": "completed"
}
```

## セキュリティ考慮事項

### 1. 認証・認可
- すべてのAPIリクエストにBearer tokenを使用
- M365 Operator権限の検証
- SOD（職務分離）原則の遵守

### 2. 入力バリデーション
- XSS対策: `escapeHtml()` 関数の使用
- SQLインジェクション対策（バックエンド側）
- パラメータの型チェック

### 3. 監査証跡
- すべてのM365操作をログに記録
- ログの変更・削除を禁止
- 誰が・いつ・何を・どのように実行したかを追跡可能

### 4. エラーハンドリング
- ユーザーフレンドリーなエラーメッセージ
- 詳細なエラーログ（コンソール）
- APIエラーの適切な処理

## パフォーマンス最適化

### 1. 検索のデバウンス
- 300msの遅延でAPI呼び出し回数を削減
- ユーザー入力中の不要なリクエストを防止

### 2. ページネーション
- 1ページあたり20件のユーザー表示
- 大量データの効率的な読み込み

### 3. 遅延ロード
- Lucide Iconsの再初期化を最小限に
- モーダルは必要時のみDOM生成

## アクセシビリティ

- セマンティックHTML要素の使用
- キーボードナビゲーション対応
- ARIA属性の適切な使用
- コントラスト比の確保（WCAG AA準拠）
- フォーカスインジケーターの表示

## ブラウザ互換性

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 今後の拡張予定

### フェーズ2: Graph API自動実行
- 承認済みタスクの自動実行
- エビデンスの自動収集
- エラーハンドリングと自動リトライ

### フェーズ3: 高度な検索
- フィルター機能（部署、ライセンス、状態）
- ソート機能
- 保存された検索条件

### フェーズ4: バルク操作
- 複数ユーザーへの一括操作
- CSVインポート/エクスポート
- 操作テンプレート

## トラブルシューティング

### 検索結果が表示されない
1. バックエンドAPIが起動しているか確認
2. ブラウザのコンソールでAPIエラーを確認
3. ネットワークタブでリクエスト/レスポンスを確認

### スタイルが適用されない
1. `m365.css` が正しく読み込まれているか確認
2. ブラウザのキャッシュをクリア
3. 開発者ツールでCSSファイルのパスを確認

### アイコンが表示されない
1. Lucide Icons CDNが読み込まれているか確認
2. `lucide.createIcons()` が呼ばれているか確認
3. インターネット接続を確認

## 開発者向け情報

### コーディング規約
- ES6+の機能を使用
- インデント: スペース4つ
- 命名規則: camelCase (変数・関数), PascalCase (コンポーネント)
- コメント: JSDoc形式

### Git コミットメッセージ
```
feat: M365ユーザー検索ページを実装
feat: M365ライセンス管理ページを実装
feat: M365タスク実行確認モーダルを追加
style: Fluent Design準拠のCSSを追加
docs: M365 UI実装ドキュメントを作成
```

## ライセンス

MIT License

## 連絡先

質問や問題報告は、プロジェクトのIssueトラッカーに投稿してください。

---

**最終更新日**: 2026-01-20
**バージョン**: 1.0.0
**作成者**: Claude Code
