# M365 UI クイックリファレンス

## 🚀 クイックスタート

### 開発サーバー起動
```bash
cd frontend
npm run dev
# http://localhost:8080/#/m365/users
```

### デモページを開く
```bash
# ブラウザで以下のファイルを開く
frontend/m365-demo.html
```

## 📁 ファイル構造

```
frontend/
├── js/
│   ├── pages/
│   │   ├── m365-users.js          # ユーザー検索ページ
│   │   ├── m365-licenses.js       # ライセンス管理ページ
│   │   └── m365-tasks.js          # タスク管理ページ（拡張）
│   ├── components/
│   │   ├── modal.js               # モーダルコンポーネント
│   │   ├── toast.js               # トースト通知
│   │   └── sidebar.js             # サイドバーナビゲーション
│   ├── api.js                     # API クライアント
│   ├── auth.js                    # 認証処理
│   ├── router.js                  # SPA ルーター
│   └── app.js                     # アプリケーションエントリー
├── css/
│   ├── common.css                 # 共通スタイル
│   ├── components.css             # コンポーネントスタイル
│   └── m365.css                   # M365専用スタイル ⭐NEW
├── m365-demo.html                 # スタンドアロンデモ ⭐NEW
└── M365_UI_README.md              # 詳細ドキュメント ⭐NEW
```

## 🎨 主要コンポーネント

### 1. M365UsersPage（ユーザー検索）

```javascript
// ページをレンダリング
M365UsersPage.render();

// ユーザー検索
await API.searchM365Users({
    query: '山田',
    page: 1,
    page_size: 20
});

// ユーザー詳細を表示
M365UsersPage.showUserDetail('user@example.com');

// M365操作メニューを表示
M365UsersPage.showActionsMenu('user@example.com');
```

### 2. M365LicensesPage（ライセンス管理）

```javascript
// ページをレンダリング
M365LicensesPage.render();

// ライセンス一覧を取得
await API.getM365Licenses();

// ライセンス別ユーザーを表示
M365LicensesPage.showLicenseUsers('sku-id');
```

### 3. M365TasksPage（タスク管理）

```javascript
// ページをレンダリング
M365TasksPage.render();

// タスク実行確認モーダルを表示
M365TasksPage.showExecuteModal(taskId);

// 実施ログ記録モーダルを表示
M365TasksPage.showExecutionLogModal(taskId, method, task);
```

## 🔌 API エンドポイント

### ユーザー検索
```javascript
// 検索
GET /api/m365/users/search?query=山田&page=1&page_size=20

// 詳細取得
GET /api/m365/users/user@example.com

// ライセンス取得
GET /api/m365/users/user@example.com/licenses
```

### ライセンス管理
```javascript
// 利用可能なライセンス
GET /api/m365/licenses/available

// ライセンス別ユーザー
GET /api/m365/licenses/{skuId}/users

// ライセンス詳細
GET /api/m365/licenses/{skuId}
```

### タスク管理
```javascript
// タスク作成
POST /api/m365/tasks
{
  "task_type": "license_assign",
  "target_upn": "user@example.com",
  "ticket_id": "TKT-2026-0001",
  "description": "ライセンス付与",
  "parameters": { "license_sku": "SPE_E3" }
}

// 実行ログ記録
POST /api/m365/tasks/{id}/execute
{
  "method": "graph_api",
  "command_or_screen": "PATCH /users/{id}",
  "result": "success",
  "result_details": "成功しました"
}
```

## 🎨 スタイルクラス

### バッジ
```html
<span class="badge badge-success">有効</span>
<span class="badge badge-error">無効</span>
<span class="badge badge-warning">警告</span>
<span class="badge badge-info">情報</span>
<span class="badge badge-primary">プライマリ</span>
```

### ボタン
```html
<button class="btn btn-primary">プライマリ</button>
<button class="btn btn-secondary">セカンダリ</button>
<button class="btn btn-ghost">ゴースト</button>
<button class="btn btn-sm">小サイズ</button>
```

### カード
```html
<div class="user-card">
    <div class="user-card-header">...</div>
    <div class="user-card-body">...</div>
    <div class="user-card-footer">...</div>
</div>

<div class="license-card">
    <div class="license-card-header">...</div>
    <div class="license-usage">...</div>
    <div class="license-card-footer">...</div>
</div>
```

### アバター
```html
<div class="user-avatar">YT</div>
<div class="user-avatar-large">YT</div>
<div class="user-avatar-sm">YT</div>
```

### プログレスバー
```html
<div class="usage-bar normal">
    <div class="usage-bar-fill" style="width: 60%"></div>
</div>
<div class="usage-bar warning">...</div>
<div class="usage-bar critical">...</div>
```

## 🔧 ユーティリティ関数

### HTML エスケープ
```javascript
escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
```

### 日付フォーマット
```javascript
formatDate(isoString) {
    if (!isoString) return '-';
    const date = new Date(isoString);
    return date.toLocaleString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}
```

### イニシャル取得
```javascript
getUserInitials(displayName) {
    if (!displayName) return '??';
    const parts = displayName.split(' ').filter(p => p);
    if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return displayName.substring(0, 2).toUpperCase();
}
```

## 🎭 モーダルの使用

### 基本的なモーダル
```javascript
Modal.create({
    title: 'タイトル',
    content: '<p>コンテンツ</p>',
    footer: '<button class="btn btn-primary">OK</button>',
    size: 'medium' // small, medium, large, full
});
```

### 確認ダイアログ
```javascript
Modal.confirm(
    '本当に削除しますか？',
    () => { /* 確認時の処理 */ },
    () => { /* キャンセル時の処理 */ }
);
```

### モーダルを閉じる
```javascript
Modal.hide();
```

## 📢 トースト通知

```javascript
// 成功メッセージ
Toast.success('操作が完了しました');

// エラーメッセージ
Toast.error('エラーが発生しました');

// 情報メッセージ
Toast.info('情報メッセージ');

// 警告メッセージ
Toast.warning('警告メッセージ');
```

## 🎨 Fluent Design カラー

```css
/* Primary */
--primary: #0078d4;
--primary-hover: #106ebe;

/* Success */
--success: #107c10;
--success-bg: #dff6dd;

/* Warning */
--warning: #ffaa44;
--warning-bg: #fff4e5;

/* Error */
--error: #a4262c;
--error-bg: #fde7e9;

/* Neutral */
--text-primary: #323130;
--text-secondary: #605e5c;
--border: #e1e4e8;
--background: #f8f9fa;
```

## 📱 レスポンシブブレイクポイント

```css
/* Mobile */
@media (max-width: 768px) {
    .users-grid {
        grid-template-columns: 1fr;
    }
}

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
    .users-grid {
        grid-template-columns: repeat(2, 1fr);
    }
}

/* Desktop */
@media (min-width: 1025px) {
    .users-grid {
        grid-template-columns: repeat(3, 1fr);
    }
}
```

## 🔍 デバッグ Tips

### コンソールでAPIをテスト
```javascript
// ユーザー検索
await API.searchM365Users({ query: '山田' });

// ライセンス一覧
await API.getM365Licenses();

// タスク一覧
await API.getM365Tasks();
```

### 現在のページを確認
```javascript
Router.getCurrentPath(); // "/m365/users"
```

### 認証情報を確認
```javascript
Auth.isAuthenticated(); // true/false
Auth.getUser(); // ユーザー情報
```

## 🐛 よくある問題と解決策

### Q: アイコンが表示されない
```javascript
// ページレンダリング後にアイコンを再初期化
setTimeout(() => lucide.createIcons(), 100);
```

### Q: モーダルが閉じない
```javascript
// モーダルを強制的に閉じる
Modal.hide();
// または
document.querySelector('.modal.active')?.classList.remove('active');
```

### Q: スタイルが適用されない
```html
<!-- CSSファイルの読み込み順を確認 -->
<link rel="stylesheet" href="css/common.css">
<link rel="stylesheet" href="css/components.css">
<link rel="stylesheet" href="css/m365.css"> <!-- 最後に読み込む -->
```

### Q: API エラーが発生する
```javascript
// エラーハンドリングを追加
try {
    const data = await API.searchM365Users({ query });
} catch (error) {
    console.error('API Error:', error);
    Toast.error(error.message);
}
```

## 📚 関連ドキュメント

- [M365_UI_README.md](./M365_UI_README.md) - 詳細実装ドキュメント
- [M365_UI_IMPLEMENTATION_SUMMARY.md](../M365_UI_IMPLEMENTATION_SUMMARY.md) - 実装サマリー
- [CLAUDE.md](../CLAUDE.md) - プロジェクト全体のガイドライン

## 🔗 便利なリンク

- [Lucide Icons](https://lucide.dev/) - アイコンライブラリ
- [Microsoft Fluent UI](https://fluent2.microsoft.design/) - デザインシステム
- [Graph API Documentation](https://learn.microsoft.com/en-us/graph/) - Microsoft Graph API

## 💡 開発のヒント

### パフォーマンス最適化
```javascript
// デバウンスを使用して検索APIの呼び出しを制限
let debounceTimer;
searchInput.addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        searchUsers(e.target.value);
    }, 300);
});
```

### メモリリーク対策
```javascript
// イベントリスナーのクリーンアップ
const button = document.getElementById('my-button');
const handler = () => console.log('clicked');
button.addEventListener('click', handler);

// ページ離脱時にクリーンアップ
window.addEventListener('beforeunload', () => {
    button.removeEventListener('click', handler);
});
```

### エラーバウンダリ
```javascript
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    Toast.error('予期しないエラーが発生しました');
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    Toast.error('処理に失敗しました');
});
```

---

**最終更新**: 2026-01-20
**バージョン**: 1.0.0
