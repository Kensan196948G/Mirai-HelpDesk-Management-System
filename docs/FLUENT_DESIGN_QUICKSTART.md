# Microsoft Fluent Design クイックスタートガイド

## 5分で始めるFluent Design

このガイドでは、Mirai ヘルプデスク管理システムでMicrosoft Fluent Designを使用する基本的な方法を説明します。

---

## 前提条件

プロジェクトには以下がすでに設定されています:

- ✅ Fluent Design CSSファイル
- ✅ Ant Designテーマカスタマイズ
- ✅ 日本語フォント設定
- ✅ レスポンシブグリッド

---

## ステップ1: 開発環境の起動

```bash
cd frontend
npm install
npm run dev
```

ブラウザで `http://localhost:5173` を開くと、Fluent Designが適用されたUIが表示されます。

---

## ステップ2: よく使うコンポーネント

### 統計カード（最も使う）

```tsx
<div className="stats-card">
  <div className="stats-icon stats-icon--primary">
    📊
  </div>
  <div className="stats-content">
    <div className="stats-label">ラベル</div>
    <div className="stats-value">123</div>
    <div className="stats-change positive">+10%</div>
  </div>
</div>
```

**アイコンカラー:**
- `stats-icon--primary` (青)
- `stats-icon--success` (緑)
- `stats-icon--warning` (オレンジ)
- `stats-icon--error` (赤)

### ボタン

```tsx
// プライマリーボタン
<button className="ms-Button ms-Button--primary">
  保存
</button>

// セカンダリーボタン
<button className="ms-Button ms-Button--secondary">
  キャンセル
</button>
```

### カード

```tsx
<div className="ms-Card">
  <div className="ms-Card-header">
    <h3 className="ms-Card-title">タイトル</h3>
  </div>
  <div className="ms-Card-body">
    内容
  </div>
</div>
```

---

## ステップ3: カラーの使用

### CSS変数で色を指定

```tsx
// ✅ Good
<div style={{ color: 'var(--ms-blue)' }}>テキスト</div>

// ❌ Bad
<div style={{ color: '#0078d4' }}>テキスト</div>
```

### よく使う色

```css
--ms-blue           /* プライマリーカラー */
--text-primary      /* メインテキスト */
--text-secondary    /* サブテキスト */
--success           /* 成功 */
--warning           /* 警告 */
--error             /* エラー */
```

---

## ステップ4: タグの使用

### 優先度タグ

```tsx
<span className="ms-Tag ms-Tag--priority-p1">P1</span>
<span className="ms-Tag ms-Tag--priority-p2">P2</span>
<span className="ms-Tag ms-Tag--priority-p3">P3</span>
<span className="ms-Tag ms-Tag--priority-p4">P4</span>
```

### ステータスタグ

```tsx
<span className="ms-Tag ms-Tag--success">完了</span>
<span className="ms-Tag ms-Tag--warning">保留</span>
<span className="ms-Tag ms-Tag--error">期限超過</span>
<span className="ms-Tag ms-Tag--info">進行中</span>
```

---

## ステップ5: グリッドレイアウト

### 4列グリッド（自動レスポンシブ）

```tsx
<div className="grid-container grid-4-cols">
  <div className="stats-card">カード1</div>
  <div className="stats-card">カード2</div>
  <div className="stats-card">カード3</div>
  <div className="stats-card">カード4</div>
</div>
```

**自動調整:**
- PC: 4列
- タブレット: 2列
- モバイル: 1列

---

## ステップ6: Ant Designコンポーネント

既存のAnt Designコンポーネントは**そのまま**使用できます（自動的にFluent Designスタイルが適用されます）:

```tsx
import { Card, Button, Table, Tag } from 'antd';

<Card title="タイトル">
  <Button type="primary">ボタン</Button>
  <Tag color="blue">タグ</Tag>
</Card>
```

---

## コードテンプレート

### ダッシュボードページ

```tsx
import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  return (
    <div className="dashboard-container">
      {/* ページタイトル */}
      <h1 className="ms-font-xxl">ダッシュボード</h1>

      {/* 統計カードグリッド */}
      <div className="grid-container grid-4-cols">
        <div className="stats-card">
          <div className="stats-icon stats-icon--primary">📊</div>
          <div className="stats-content">
            <div className="stats-label">総チケット数</div>
            <div className="stats-value">125</div>
            <div className="stats-change positive">+12%</div>
          </div>
        </div>
        {/* 他のカード... */}
      </div>

      {/* カードコンポーネント */}
      <div className="ms-Card">
        <div className="ms-Card-header">
          <h3 className="ms-Card-title">最近のチケット</h3>
        </div>
        <div className="ms-Card-body">
          {/* テーブルやリスト */}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
```

### フォームページ

```tsx
import React from 'react';

const TicketForm = () => {
  return (
    <div className="ms-Card">
      <div className="ms-Card-header">
        <h2 className="ms-Card-title">新規チケット</h2>
      </div>
      <div className="ms-Card-body">
        <form>
          {/* 入力フィールド */}
          <div className="ms-TextField">
            <label className="ms-TextField-label">件名 *</label>
            <input
              type="text"
              className="ms-TextField-input"
              placeholder="件名を入力"
            />
          </div>

          {/* セレクト */}
          <div className="ms-TextField">
            <label className="ms-TextField-label">優先度</label>
            <select className="ms-TextField-input">
              <option>P1 - 全社停止</option>
              <option>P2 - 部門影響</option>
              <option>P3 - 個人</option>
              <option>P4 - 問い合わせ</option>
            </select>
          </div>
        </form>
      </div>
      <div className="ms-Card-footer">
        <button className="ms-Button ms-Button--secondary">
          キャンセル
        </button>
        <button className="ms-Button ms-Button--primary">
          作成
        </button>
      </div>
    </div>
  );
};

export default TicketForm;
```

---

## よくあるパターン

### 1. カードをクリック可能にする

```tsx
<div className="ms-Card ms-Card--interactive" onClick={handleClick}>
  {/* 内容 */}
</div>
```

### 2. ローディング表示

```tsx
{isLoading && (
  <div className="loading-container">
    <div className="loading-spinner" />
    <span className="loading-text">読み込み中...</span>
  </div>
)}
```

### 3. エラー表示

```tsx
{error && (
  <div className="error-container">
    <div className="error-icon">⚠️</div>
    <h3 className="error-title">エラー</h3>
    <p className="error-message">{error.message}</p>
  </div>
)}
```

### 4. 空の状態

```tsx
{items.length === 0 && (
  <div className="empty-state">
    <div className="empty-state-icon">📭</div>
    <h3 className="empty-state-title">データがありません</h3>
    <p className="empty-state-description">
      新しいアイテムを追加してください
    </p>
  </div>
)}
```

---

## チートシート

### カラー

| 変数 | 用途 | 色 |
|------|------|-----|
| `--ms-blue` | プライマリー | <span style="color:#0078d4">■</span> #0078d4 |
| `--success` | 成功 | <span style="color:#107c10">■</span> #107c10 |
| `--warning` | 警告 | <span style="color:#ff8c00">■</span> #ff8c00 |
| `--error` | エラー | <span style="color:#d13438">■</span> #d13438 |

### フォントサイズ

| クラス | サイズ | 用途 |
|--------|--------|------|
| `.ms-font-xxl` | 28px | ページタイトル |
| `.ms-font-xl` | 24px | セクション |
| `.ms-font-base` | 15px | 本文 |
| `.ms-font-sm` | 14px | 補足 |
| `.ms-font-xs` | 12px | キャプション |

### スペーシング

| クラス | サイズ |
|--------|--------|
| `.ms-p-sm` | padding: 8px |
| `.ms-p-lg` | padding: 16px |
| `.ms-p-xl` | padding: 20px |
| `.ms-p-xxl` | padding: 24px |

### シャドウ

| クラス | 用途 |
|--------|------|
| `.ms-depth-2` | カード |
| `.ms-depth-4` | ホバー |
| `.ms-depth-8` | ドロップダウン |
| `.ms-depth-16` | モーダル |

---

## トラブルシューティング

### スタイルが効かない

1. **ブラウザキャッシュをクリア**: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
2. **開発サーバーを再起動**: `npm run dev`
3. **クラス名のスペルチェック**: `ms-Button` ✅ / `ms-button` ❌

### カラーが表示されない

CSS変数は `var()` で囲む:

```tsx
// ✅ Correct
style={{ color: 'var(--ms-blue)' }}

// ❌ Wrong
style={{ color: '--ms-blue' }}
```

### グリッドが1列になる

ブラウザウィンドウのサイズを確認してください。768px以下では自動的に1列になります。

---

## 次のステップ

1. **詳細ガイド**: [FLUENT_DESIGN_GUIDE.md](./FLUENT_DESIGN_GUIDE.md)
2. **実装詳細**: [FLUENT_DESIGN_IMPLEMENTATION.md](./FLUENT_DESIGN_IMPLEMENTATION.md)
3. **コンポーネント一覧**: CSSファイルのコメントを参照

---

## サンプルファイル

### ダッシュボード統計カードの完全な例

```tsx
// frontend/src/pages/Dashboard.tsx
import React from 'react';
import './Dashboard.css';

const Dashboard = () => {
  // データ（実際にはAPIから取得）
  const stats = {
    total: 125,
    inProgress: 23,
    resolved: 102,
    overdue: 3,
  };

  return (
    <div className="dashboard-container">
      {/* ページヘッダー */}
      <div style={{ marginBottom: 'var(--spacing-xxl)' }}>
        <h1 className="ms-font-xxl" style={{ marginBottom: 'var(--spacing-xs)' }}>
          ダッシュボード
        </h1>
        <p className="ms-font-sm" style={{ color: 'var(--text-secondary)' }}>
          ヘルプデスクの概要と最新の状況
        </p>
      </div>

      {/* 統計カードグリッド */}
      <div className="grid-container grid-4-cols" style={{ marginBottom: 'var(--spacing-xxxl)' }}>
        {/* 総チケット数 */}
        <div className="stats-card">
          <div className="stats-icon stats-icon--primary">
            📊
          </div>
          <div className="stats-content">
            <div className="stats-label">総チケット数</div>
            <div className="stats-value">{stats.total}</div>
            <div className="stats-change positive">+12% 今月</div>
          </div>
        </div>

        {/* 対応中 */}
        <div className="stats-card">
          <div className="stats-icon stats-icon--warning">
            ⏰
          </div>
          <div className="stats-content">
            <div className="stats-label">対応中</div>
            <div className="stats-value">{stats.inProgress}</div>
            <div className="stats-change neutral">先月と同じ</div>
          </div>
        </div>

        {/* 解決済 */}
        <div className="stats-card">
          <div className="stats-icon stats-icon--success">
            ✅
          </div>
          <div className="stats-content">
            <div className="stats-label">解決済</div>
            <div className="stats-value">{stats.resolved}</div>
            <div className="stats-change positive">+8% 今月</div>
          </div>
        </div>

        {/* SLA超過 */}
        <div className="stats-card">
          <div className="stats-icon stats-icon--error">
            ⚠️
          </div>
          <div className="stats-content">
            <div className="stats-label">SLA超過</div>
            <div className="stats-value">{stats.overdue}</div>
            <div className="stats-change negative">+2件 今週</div>
          </div>
        </div>
      </div>

      {/* 最近のチケット */}
      <div className="ms-Card">
        <div className="ms-Card-header">
          <h3 className="ms-Card-title">最近のチケット</h3>
        </div>
        <div className="ms-Card-body">
          <p style={{ color: 'var(--text-secondary)' }}>
            チケットデータを表示...
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
```

---

## ヘルプ

質問がある場合:

1. [デザインガイド](./FLUENT_DESIGN_GUIDE.md)を確認
2. [実装ドキュメント](./FLUENT_DESIGN_IMPLEMENTATION.md)を確認
3. CSSファイルのコメントを確認
4. プロジェクトのIssueを作成

---

**Happy Coding with Fluent Design! 🎨**
