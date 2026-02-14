# Mirai HelpDesk 開発フェーズ別タスク一覧

**最終更新日**: 2026年2月14日
**現在の進捗**: Phase 1-2.5完了（88%）、Phase 3部分実装中

---

## 📋 フェーズ別タスク一覧

### Phase 1: 緊急セキュリティ対応（即時実施）

| タスク名 | 内容の概要 | 優先度 | ステータス | 備考 |
|---------|-----------|-------|-----------|------|
| **.envのGit履歴削除** | Git履歴から機密情報を完全削除し、すべてのシークレットをローテーション | 🔴 高 | 次回着手 | CRITICAL - 本番投入の前提条件 |
| **DB_PASSWORDの変更** | PostgreSQLのパスワードを強力な値に変更 | 🔴 高 | 次回着手 | `.env`削除後に実施 |
| **M365クライアントシークレット再発行** | Azure ADアプリのシークレットをローテーション | 🔴 高 | 次回着手 | `.env`削除後に実施 |
| **AIAPIキーの再発行** | Claude/Gemini/Perplexity APIキーをローテーション | 🔴 高 | 次回着手 | `.env`削除後に実施 |
| **.gitignoreの厳格化** | `.env`、`.env.*`の完全除外を確認 | 🔴 高 | 次回着手 | 再発防止 |

**実施コマンド**:
```bash
# Git履歴から.envを完全削除
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch backend/.env frontend/.env" \
  --prune-empty --tag-name-filter cat -- --all

# 強制プッシュ（注意: チーム開発の場合は全員に通知）
git push origin --force --all
git push origin --force --tags

# .envを完全に除外
echo ".env" >> .gitignore
echo ".env.*" >> .gitignore
echo "!.env.example" >> .gitignore
```

---

### Phase 2: npm脆弱性修正（1週間以内）

| タスク名 | 内容の概要 | 優先度 | ステータス | 備考 |
|---------|-----------|-------|-----------|------|
| **axios更新** | axios脆弱性（DoS）を修正 | 🟠 高 | 次回着手 | `npm update axios` |
| **tar更新** | tar脆弱性（任意ファイル上書き）を修正 | 🟠 高 | 次回着手 | `npm update tar` |
| **nodemailer更新** | nodemailer 6.x → 8.x（Breaking change） | 🟠 高 | 次回着手 | メール機能テスト必須 |
| **Vite更新** | Vite 6.x → 7.x（Breaking change） | 🟡 中 | 保留 | 開発環境のみ影響 |
| **csurf代替検討** | csurfは非推奨、csrf-csrfへ移行 | 🟡 中 | 継続中 | 長期計画 |

**実施コマンド**:
```bash
# バックエンド
cd backend
npm update axios tar
npm install nodemailer@8.0.1  # テスト必須
npm test  # メール送信機能の確認

# フロントエンド（慎重に）
cd frontend
npm audit fix --force  # Vite更新含む
npm run build && npm run dev  # 動作確認
```

---

### Phase 3: データベースセットアップとテスト（1週間以内）

| タスク名 | 内容の概要 | 優先度 | ステータス | 備考 |
|---------|-----------|-------|-----------|------|
| **PostgreSQL起動確認** | PostgreSQLサービスが起動しているか確認 | 🟠 高 | 次回着手 | - |
| **データベース作成** | `mirai_helpdesk`データベースの作成 | 🟠 高 | 次回着手 | `database/setup-all.sh`実行 |
| **マイグレーション実行** | 全17マイグレーションファイルの実行 | 🟠 高 | 次回着手 | エラー確認必須 |
| **シードデータ投入** | デフォルトユーザー、カテゴリ、SLAポリシー | 🟠 高 | 次回着手 | パスワード: Admin123! |
| **pgvector拡張インストール** | AI機能用のベクトル検索拡張 | 🟠 高 | 次回着手 | PostgreSQL 14+必須 |
| **接続テスト** | バックエンドからDB接続確認 | 🟠 高 | 次回着手 | `npm run dev`で確認 |

**実施コマンド**:
```bash
# Windows環境の場合
# 1. PostgreSQLサービス起動（サービス管理から）
# 2. セットアップスクリプト実行
bash database/setup-all.sh

# または手動実行
psql -U postgres -c "CREATE DATABASE mirai_helpdesk;"
psql -U postgres -d mirai_helpdesk -c "CREATE EXTENSION IF NOT EXISTS vector;"
cd database
for file in migrations/*.sql; do
  psql -U postgres -d mirai_helpdesk -f "$file"
done
```

---

### Phase 4: サーバー起動とログイン機能テスト（1週間以内）

| タスク名 | 内容の概要 | 優先度 | ステータス | 備考 |
|---------|-----------|-------|-----------|------|
| **バックエンド起動** | Express.jsサーバーをポート3000で起動 | 🟠 高 | 次回着手 | `cd backend && npm run dev` |
| **フロントエンド起動** | Vite開発サーバーをポート3001で起動 | 🟠 高 | 次回着手 | `cd frontend && npm run dev` |
| **ログイン機能テスト** | デフォルトユーザーでログイン確認 | 🟠 高 | 次回着手 | admin@example.com / Admin123! |
| **JWT発行確認** | ログイン後のトークン発行を確認 | 🟠 高 | 次回着手 | DevToolsでCookie確認 |
| **Protected Route確認** | ログイン後のダッシュボード表示確認 | 🟠 高 | 次回着手 | / → Dashboard |
| **ログアウト確認** | ログアウト後の/loginへのリダイレクト確認 | 🟠 高 | 次回着手 | - |

**実施コマンド**:
```bash
# ターミナル1: バックエンド
cd backend
npm run dev

# ターミナル2: フロントエンド
cd frontend
npm run dev

# ブラウザで確認
# http://localhost:3001
# ログイン: admin@example.com / Admin123!
```

---

### Phase 5: E2Eテスト修正（1週間以内）

| タスク名 | 内容の概要 | 優先度 | ステータス | 備考 |
|---------|-----------|-------|-----------|------|
| **Viteビルドキャッシュクリア** | E2E失敗の原因となるキャッシュを削除 | 🟠 高 | 次回着手 | `rm -rf frontend/.vite` |
| **webServer設定最適化** | playwright.config.jsの設定調整 | 🟠 高 | 次回着手 | timeout延長など |
| **チケット詳細ページテスト修正** | 失敗している11件のテスト修正 | 🟠 高 | 次回着手 | `tests/e2e/tickets.spec.js` |
| **全E2Eテスト実行** | 234件すべてのテスト実行 | 🟠 高 | 次回着手 | 目標: 100%成功 |

**実施コマンド**:
```bash
# キャッシュクリア
rm -rf frontend/.vite frontend/node_modules/.vite

# テスト実行
npm run test:e2e
# または
npx playwright test
```

---

### Phase 6: フロントエンドChrome DevTools検証（1週間以内）

| タスク名 | 内容の概要 | 優先度 | ステータス | 備考 |
|---------|-----------|-------|-----------|------|
| **全ページのコンソールエラー確認** | 16ページすべてでJSエラーがないか確認 | 🟡 中 | 次回着手 | Chrome DevTools Console |
| **ネットワークタブ確認** | APIリクエストのエラー確認 | 🟡 中 | 次回着手 | 401/403/500エラー |
| **Lighthouseスコア測定** | パフォーマンス、アクセシビリティ、SEO | 🟡 中 | 次回着手 | 目標: 各90点以上 |
| **モバイルレスポンシブ確認** | スマホ/タブレット表示の確認 | 🟡 中 | 次回着手 | Ant Designのブレークポイント |

**確認対象ページ**:
- Login, Dashboard, Profile, NotFound
- TicketList, TicketDetail, TicketCreate
- KnowledgeList, KnowledgeDetail, KnowledgeEditor
- ApprovalList, M365TaskList
- AIChat, AISearchPage, AIAnalyze, AIRecommend
- KPIReportPage

---

### Phase 7: APIエンドポイント全体テスト（1週間以内）

| タスク名 | 内容の概要 | 優先度 | ステータス | 備考 |
|---------|-----------|-------|-----------|------|
| **認証APIテスト** | login, logout, me, refresh | 🟡 中 | 次回着手 | Postman/Thunder Client |
| **チケットAPIテスト** | CRUD、コメント、添付、履歴 | 🟡 中 | 次回着手 | - |
| **承認APIテスト** | 承認依頼、approve, reject | 🟡 中 | 次回着手 | - |
| **M365APIテスト** | タスク作成、実行、ログ記録 | 🟡 中 | 次回着手 | - |
| **AIAPIテスト** | chat, classify, search | 🟡 中 | 次回着手 | レート制限確認 |
| **CSRFトークンテスト** | POST/PUT/DELETEでのCSRF検証 | 🟡 中 | 次回着手 | 新規実装 |

---

### Phase 8: パフォーマンス最適化（1ヶ月以内）

| タスク名 | 内容の概要 | 優先度 | ステータス | 備考 |
|---------|-----------|-------|-----------|------|
| **N+1クエリ問題解決** | TicketModel.findAll()のJOIN最適化 | 🟡 中 | 次回着手 | `backend/src/models/ticket.model.ts` |
| **データベースインデックス確認** | 頻繁に検索されるカラムのインデックス追加 | 🟡 中 | 次回着手 | `EXPLAIN ANALYZE`で確認 |
| **Redisキャッシュ導入** | AIメトリクス、SLA計算結果のキャッシュ | 🟡 中 | 継続中 | 部分実装済み |
| **フロントエンドバンドルサイズ削減** | Code splittingとTree shaking | 🟡 中 | 次回着手 | Vite bundle analyzer |
| **画像最適化** | WebP形式、遅延読み込み | 🟢 低 | 保留 | 必要に応じて |

---

### Phase 9: ドキュメント完全化（1ヶ月以内）

| タスク名 | 内容の概要 | 優先度 | ステータス | 備考 |
|---------|-----------|-------|-----------|------|
| **OpenAPI/Swagger導入** | 全APIエンドポイントの仕様書自動生成 | 🟡 中 | 次回着手 | swagger-jsdoc |
| **トラブルシューティングガイド** | よくあるエラーと解決方法 | 🟡 中 | 次回着手 | `docs/troubleshooting.md` |
| **運用手順書** | バックアップ、リストア、監視、ログ管理 | 🟡 中 | 次回着手 | `docs/04_運用・保守/` |
| **セキュリティ運用手順書** | 脆弱性対応、インシデント対応、監査手順 | 🟡 中 | 次回着手 | `docs/security-operations.md` |
| **ユーザーマニュアル** | エンドユーザー向け操作マニュアル | 🟢 低 | 保留 | 必要に応じて |

---

### Phase 10: CI/CD整備（1ヶ月以内）

| タスク名 | 内容の概要 | 優先度 | ステータス | 備考 |
|---------|-----------|-------|-----------|------|
| **GitHub Actions設定** | lint, test, buildの自動実行 | 🟡 中 | 次回着手 | `.github/workflows/` |
| **セキュリティ監査自動化** | npm audit自動実行 | 🟡 中 | 次回着手 | 週次スケジュール |
| **Dependabot設定** | 依存関係の自動更新PR | 🟡 中 | 次回着手 | `.github/dependabot.yml` |
| **E2Eテスト自動実行** | PRごとにPlaywrightテスト実行 | 🟡 中 | 次回着手 | - |
| **デプロイメント自動化** | masterマージ時の自動デプロイ | 🟢 低 | 保留 | 本番環境準備後 |

---

### Phase 11: Phase 3機能実装（2-3ヶ月）

| タスク名 | 内容の概要 | 優先度 | ステータス | 備考 |
|---------|-----------|-------|-----------|------|
| **承認済み標準作業の自動実行** | 承認後のM365操作を自動化 | 🟡 中 | 保留 | ワークフローエンジン必要 |
| **ITIL Problem Management** | 問題管理テーブルとワークフロー | 🟢 低 | 保留 | Phase 3計画 |
| **CAB（変更諮問委員会）** | 変更承認プロセスの実装 | 🟢 低 | 保留 | Phase 3計画 |
| **AIチケット自動割当** | AI予測に基づく自動割当機能 | 🟡 中 | 継続中 | AI分類は実装済み |

---

### Phase 12: 本番環境準備（状況に応じて）

| タスク名 | 内容の概要 | 優先度 | ステータス | 備考 |
|---------|-----------|-------|-----------|------|
| **本番環境サーバー構築** | PostgreSQL、Redis、Webサーバー | - | 保留 | インフラ設計必要 |
| **SSL/TLS証明書取得** | HTTPS化 | - | 保留 | Let's Encrypt推奨 |
| **ドメイン設定** | DNS設定 | - | 保留 | - |
| **バックアップ戦略** | 日次/週次バックアップ設定 | - | 保留 | pg_dump自動化 |
| **監視設定** | サーバー監視、ログ集約 | - | 保留 | Prometheus/Grafana等 |
| **負荷テスト** | 同時接続数、レスポンスタイム測定 | - | 保留 | JMeter/k6等 |

---

## 📊 進捗サマリー

### 全体進捗: 88%

| Phase | 進捗率 | ステータス |
|-------|-------|-----------|
| Phase 1 (MVP) | 100% | ✅ 完了 |
| Phase 2 (M365連携) | 95% | ✅ ほぼ完了 |
| Phase 2.5 (AI拡張) | 100% | ✅ 完了 |
| Phase 3 (自動化) | 30% | 🔄 継続中 |

### 次回着手優先タスク（上位5件）

1. 🔴 **.envのGit履歴削除** - CRITICAL
2. 🔴 **全シークレットのローテーション** - CRITICAL
3. 🟠 **データベースセットアップ** - HIGH
4. 🟠 **サーバー起動とログインテスト** - HIGH
5. 🟠 **npm脆弱性修正** - HIGH

---

## 🎯 次回セッション開始時の手順

### 1. 現在の状態確認
```bash
cd Z:\Mirai-HelpDesk-Management-System
git status
git log --oneline -10
```

### 2. ドキュメント確認
```bash
# レビューレポート確認
cat FINAL_REVIEW_SUMMARY.md
cat COMPREHENSIVE_REVIEW_REPORT.md
cat NPM_VULNERABILITIES_REPORT.md
```

### 3. 次回タスク開始
```bash
# Phase 1から順番に実施
# 1. .envのGit履歴削除（最優先）
# 2. データベースセットアップ
# 3. サーバー起動テスト
```

---

## 📝 備考

### 完了した主要改善（2026年2月14日）

✅ JWT_SECRET強化（43文字ランダム値）
✅ bcryptラウンド数 10→12
✅ CSRF保護ミドルウェア実装
✅ ファイルアップロードのマジックバイト検証
✅ SODトリガーバグ修正
✅ データベースログのパラメータサニタイズ
✅ エラーハンドリング改善（本番環境で詳細隠蔽）
✅ 本番環境JWT検証追加
✅ 包括的ドキュメント作成（65,000字超）

### 未完了の重要タスク

⚠️ .envファイルのGit履歴削除（CRITICAL）
⚠️ データベースセットアップとテスト
⚠️ サーバー起動とログイン機能テスト
⚠️ npm脆弱性修正
⚠️ E2Eテスト失敗11件の修正

---

**最終更新**: 2026年2月14日
**次回レビュー推奨日**: 2026年2月21日（1週間後）
**本番投入目標日**: Phase 1-5完了後（約2-3週間後）
