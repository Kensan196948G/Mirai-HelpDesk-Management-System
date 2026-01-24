# ナレッジ編集UI アーキテクチャ

## コンポーネント構成図

```
┌─────────────────────────────────────────────────────────────┐
│                         App.tsx                              │
│                    (React Router)                            │
└──────────────────┬──────────────────────────────────────────┘
                   │
         ┌─────────┴─────────┐
         │                   │
         ▼                   ▼
┌─────────────────┐  ┌─────────────────┐
│ KnowledgeList   │  │ KnowledgeDetail │
│                 │  │                 │
│ - 一覧表示     │  │ - 詳細表示     │
│ - 検索         │  │ - Markdown表示 │
│ - フィルター   │  │ - フィードバック│
│ - ページング   │  │                 │
└────────┬────────┘  └─────────────────┘
         │
         │ [新規作成/編集]
         │
         ▼
┌─────────────────────────────────────────┐
│         KnowledgeEditor                  │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Form Component (Ant Design)        │ │
│  │                                    │ │
│  │  ┌──────────────────────────────┐ │ │
│  │  │ 基本情報セクション           │ │ │
│  │  │ - Input (タイトル)          │ │ │
│  │  │ - TextArea (サマリー)       │ │ │
│  │  └──────────────────────────────┘ │ │
│  │                                    │ │
│  │  ┌──────────────────────────────┐ │ │
│  │  │ MarkdownEditor              │ │ │
│  │  │                              │ │ │
│  │  │  ┌────────────────────────┐ │ │ │
│  │  │  │ Tabs (編集/プレビュー) │ │ │ │
│  │  │  └────────────────────────┘ │ │ │
│  │  │                              │ │ │
│  │  │  ┌────────────────────────┐ │ │ │
│  │  │  │ Toolbar                │ │ │ │
│  │  │  │ [B][I][H][List][Link] │ │ │ │
│  │  │  └────────────────────────┘ │ │ │
│  │  │                              │ │ │
│  │  │  ┌────────────────────────┐ │ │ │
│  │  │  │ TextArea / Preview     │ │ │ │
│  │  │  │ (marked + DOMPurify)  │ │ │ │
│  │  │  └────────────────────────┘ │ │ │
│  │  └──────────────────────────────┘ │ │
│  │                                    │ │
│  │  ┌──────────────────────────────┐ │ │
│  │  │ メタデータセクション         │ │ │
│  │  │ - Select (記事種別)         │ │ │
│  │  │ - Select (カテゴリ)         │ │ │
│  │  │ - TagInput (タグ)           │ │ │
│  │  │ - Select (公開範囲)         │ │ │
│  │  └──────────────────────────────┘ │ │
│  │                                    │ │
│  │  ┌──────────────────────────────┐ │ │
│  │  │ 公開設定セクション           │ │ │
│  │  │ - Switch (公開/下書き)      │ │ │
│  │  │ - Switch (おすすめ記事)     │ │ │
│  │  └──────────────────────────────┘ │ │
│  │                                    │ │
│  │  [キャンセル][プレビュー]         │ │
│  │  [下書き保存][作成/更新]         │ │
│  └────────────────────────────────────┘ │
│                                          │
│  ┌────────────────────────────────────┐ │
│  │ Preview Modal                      │ │
│  │ - Markdown Rendered HTML           │ │
│  └────────────────────────────────────┘ │
└──────────────────────────────────────────┘
```

## データフロー図

```
┌──────────────────┐
│    User Input    │
│   (Keyboard)     │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────────┐
│    KnowledgeEditor.tsx           │
│                                  │
│  - Form State Management         │
│  - Validation                    │
│  - Event Handlers                │
└────────┬────────────┬────────────┘
         │            │
         │            └─────────────┐
         ▼                          ▼
┌──────────────────┐    ┌──────────────────┐
│ MarkdownEditor   │    │  Form Fields     │
│                  │    │                  │
│ - onChange()     │    │ - title          │
│ - Toolbar        │    │ - summary        │
│ - Preview        │    │ - type           │
│                  │    │ - category       │
│ marked.parse()   │    │ - tags           │
│      ▼           │    │ - visibility     │
│ DOMPurify        │    │ - is_published   │
│      ▼           │    │ - is_featured    │
│ Safe HTML        │    └──────────────────┘
└──────────────────┘
         │
         └──────────────┐
                        ▼
              ┌─────────────────────┐
              │   Save Button       │
              │   [作成/更新]       │
              └──────────┬──────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │ knowledgeService.ts      │
              │                          │
              │ - createKnowledgeArticle │
              │ - updateKnowledgeArticle │
              └──────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │     api.ts               │
              │   (Axios Instance)       │
              │                          │
              │ - Request Interceptor    │
              │   (Add Auth Token)       │
              │ - Response Interceptor   │
              │   (Handle Errors)        │
              └──────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │  Backend API             │
              │  POST /api/knowledge     │
              │  PATCH /api/knowledge/:id│
              └──────────┬───────────────┘
                         │
                         ▼
              ┌──────────────────────────┐
              │    Database              │
              │  knowledge_articles      │
              └──────────────────────────┘
```

## 状態管理

### Component State (React useState)

```typescript
// KnowledgeEditor.tsx
const [loading, setLoading] = useState(false);
const [saving, setSaving] = useState(false);
const [categories, setCategories] = useState<string[]>([]);
const [tags, setTags] = useState<string[]>([]);
const [tagInput, setTagInput] = useState('');
const [previewVisible, setPreviewVisible] = useState(false);
const [articleContent, setArticleContent] = useState('');

// MarkdownEditor.tsx
const [activeTab, setActiveTab] = useState<string>('edit');
```

### Form State (Ant Design Form)

```typescript
const [form] = Form.useForm();

// Form values
{
  title: string;
  summary?: string;
  type: string;
  category?: string;
  visibility: string;
  is_published: boolean;
  is_featured?: boolean;
}
```

### Global State (Zustand)

```typescript
// authStore.ts
interface AuthState {
  token: string | null;
  user: User | null;
  setAuth: (token, user) => void;
  clearAuth: () => void;
}
```

## APIクライアント構造

```
┌─────────────────────────────────────────────┐
│           knowledgeService.ts                │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ getKnowledgeArticles()                 │ │
│  │ ├─ パラメータ構築                      │ │
│  │ └─ apiRequest<KnowledgeListResponse>  │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ getKnowledgeArticle(id)                │ │
│  │ └─ apiRequest<KnowledgeArticle>       │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ createKnowledgeArticle(data)           │ │
│  │ ├─ POST /api/knowledge                │ │
│  │ └─ apiRequest<KnowledgeArticle>       │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ updateKnowledgeArticle(id, data)       │ │
│  │ ├─ PATCH /api/knowledge/:id           │ │
│  │ └─ apiRequest<KnowledgeArticle>       │ │
│  └────────────────────────────────────────┘ │
│                                              │
│  ┌────────────────────────────────────────┐ │
│  │ deleteKnowledgeArticle(id)             │ │
│  │ ├─ DELETE /api/knowledge/:id          │ │
│  │ └─ apiRequest<void>                   │ │
│  └────────────────────────────────────────┘ │
└──────────────────┬──────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────┐
│                 api.ts                        │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ apiRequest<T>(config)                   │ │
│  │ ├─ try                                  │ │
│  │ │  └─ apiClient.request(config)       │ │
│  │ └─ catch                                │ │
│  │    └─ error handling                   │ │
│  └─────────────────────────────────────────┘ │
│                                               │
│  ┌─────────────────────────────────────────┐ │
│  │ apiClient (Axios Instance)              │ │
│  │ ├─ baseURL: /api                       │ │
│  │ ├─ timeout: 30000                      │ │
│  │ ├─ Request Interceptor                 │ │
│  │ │  └─ Add Authorization header         │ │
│  │ └─ Response Interceptor                │ │
│  │    └─ Handle 401 (Logout)              │ │
│  └─────────────────────────────────────────┘ │
└───────────────────────────────────────────────┘
```

## Markdown処理フロー

```
┌──────────────────┐
│  User Input      │
│  (Markdown Text) │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│  MarkdownEditor.tsx          │
│  - onChange(value)           │
│  - setState(value)           │
└────────┬─────────────────────┘
         │
         │ [プレビュータブ選択]
         │
         ▼
┌──────────────────────────────┐
│  renderMarkdown()            │
│                              │
│  ┌────────────────────────┐ │
│  │ marked.parse()         │ │
│  │ Markdown → Raw HTML    │ │
│  └────────┬───────────────┘ │
│           │                  │
│           ▼                  │
│  ┌────────────────────────┐ │
│  │ DOMPurify.sanitize()   │ │
│  │ XSS対策                │ │
│  │ - <script>除去         │ │
│  │ - on*属性除去          │ │
│  │ - 危険なタグ除去       │ │
│  └────────┬───────────────┘ │
│           │                  │
│           ▼                  │
│  ┌────────────────────────┐ │
│  │ Safe HTML              │ │
│  └────────────────────────┘ │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  dangerouslySetInnerHTML     │
│  { __html: safeHtml }        │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│  Rendered Preview            │
│  (HTML + CSS Styling)        │
└──────────────────────────────┘
```

## 権限チェックフロー

```
┌──────────────────┐
│   User Action    │
│  (Create/Edit)   │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│  useAuthStore                │
│  - user.role                 │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────────────────────────────┐
│  権限チェック                                 │
│                                               │
│  const canCreate = user?.role &&              │
│    ['agent', 'm365_operator',                 │
│     'approver', 'manager']                    │
│    .includes(user.role);                      │
│                                               │
│  const canEdit = (article) =>                 │
│    user.role === 'manager' ||                 │
│    article.owner_id === user.user_id;         │
│                                               │
│  const canDelete = user?.role === 'manager';  │
└────────┬─────────────────────────────────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌───────┐ ┌────────┐
│ Allow │ │ Deny   │
└───┬───┘ └───┬────┘
    │         │
    │         ▼
    │    ┌────────────────┐
    │    │ Error Message  │
    │    │ "権限なし"     │
    │    └────────────────┘
    │
    ▼
┌──────────────────┐
│  API Request     │
└────────┬─────────┘
         │
         ▼
┌──────────────────────────────┐
│  Backend                      │
│  - 権限再チェック（必須）    │
│  - データベース更新           │
└───────────────────────────────┘
```

## ファイル構造

```
frontend/src/
├── pages/
│   └── knowledge/
│       ├── KnowledgeList.tsx          # 一覧ページ
│       ├── KnowledgeDetail.tsx        # 詳細ページ
│       ├── KnowledgeEditor.tsx        # 編集ページ
│       ├── KnowledgeEditor.css        # 編集ページスタイル
│       ├── README.md                  # 実装ガイド
│       └── ARCHITECTURE.md            # このファイル
│
├── components/
│   ├── MarkdownEditor.tsx             # Markdownエディタ
│   └── MarkdownEditor.css             # エディタスタイル
│
├── services/
│   ├── api.ts                         # Axiosクライアント
│   └── knowledgeService.ts            # ナレッジAPI
│
├── types/
│   └── index.ts                       # 型定義
│
├── store/
│   └── authStore.ts                   # 認証ストア
│
└── App.tsx                            # ルーティング
```

## レンダリングフロー

### 初期レンダリング（編集モード）

```
1. KnowledgeEditor マウント
   ↓
2. useEffect (id依存)
   ↓
3. getKnowledgeArticle(id)
   ↓
4. API Request
   ↓
5. Response受信
   ↓
6. setState (article, tags, content)
   ↓
7. Form.setFieldsValue()
   ↓
8. Re-render (データ反映)
```

### ユーザー入力

```
1. User types in MarkdownEditor
   ↓
2. onChange(value)
   ↓
3. setState(articleContent)
   ↓
4. Re-render (Editor only)
   ↓
5. User switches to Preview tab
   ↓
6. renderMarkdown(articleContent)
   ↓
7. marked.parse() → DOMPurify.sanitize()
   ↓
8. Re-render (Preview with Safe HTML)
```

### 保存処理

```
1. User clicks [作成/更新]
   ↓
2. form.validateFields()
   ↓
3. Validation OK?
   │
   ├─ NO → Show error messages
   │
   └─ YES
      ↓
4. setSaving(true)
   ↓
5. Build articleData
   ↓
6. createKnowledgeArticle(data)
   or
   updateKnowledgeArticle(id, data)
   ↓
7. API Request
   ↓
8. Response
   │
   ├─ Success
   │  ↓
   │  message.success()
   │  ↓
   │  navigate('/knowledge')
   │
   └─ Error
      ↓
      message.error()
      ↓
      setSaving(false)
```

## パフォーマンス最適化

### React.memo の使用候補

```typescript
// MarkdownEditor.tsx
export default React.memo(MarkdownEditor, (prevProps, nextProps) => {
  return prevProps.value === nextProps.value;
});
```

### useCallback の使用

```typescript
const renderMarkdown = useCallback((markdown: string): string => {
  // Markdown rendering logic
}, []);

const insertText = useCallback(
  (before: string, after: string = '', placeholder: string = '') => {
    // Insert text logic
  },
  [value, onChange]
);
```

### Debounce の検討

```typescript
// 検索入力のDebounce
const debouncedSearch = useMemo(
  () =>
    debounce((value: string) => {
      setSearchText(value);
    }, 300),
  []
);
```

## セキュリティ層

```
┌──────────────────────────────────────┐
│         User Input (Untrusted)       │
└────────────────┬─────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  Frontend Validation                 │
│  - Required fields                   │
│  - Max length                        │
│  - Format check                      │
└────────────────┬─────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  XSS Protection (DOMPurify)          │
│  - Remove <script> tags              │
│  - Remove on* attributes             │
│  - Whitelist safe HTML tags          │
└────────────────┬─────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  API Request with Auth Token         │
└────────────────┬─────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  Backend (Must Implement)            │
│  - Authentication                    │
│  - Authorization                     │
│  - Input validation                  │
│  - SQL injection prevention          │
│  - Rate limiting                     │
└────────────────┬─────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────┐
│  Database (Sanitized Data)           │
└──────────────────────────────────────┘
```

## まとめ

このアーキテクチャドキュメントは、ナレッジ編集UIの内部構造を詳細に説明しています。

### 主要な設計原則

1. **関心の分離**: UI、ロジック、APIを分離
2. **再利用性**: MarkdownEditorは独立したコンポーネント
3. **型安全性**: TypeScriptで型定義
4. **セキュリティ**: XSS対策、権限チェック
5. **パフォーマンス**: 適切な最適化

### 拡張性

- 新しい記事種別の追加: types/index.ts を更新
- 新しいMarkdown機能: MarkdownEditor.tsx を拡張
- 新しいAPI機能: knowledgeService.ts に追加

### メンテナンス性

- 明確なファイル構造
- 詳細なコメント
- 型定義の充実
- ドキュメントの整備
