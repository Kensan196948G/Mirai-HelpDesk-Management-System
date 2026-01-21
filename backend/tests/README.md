# Mirai HelpDesk Management System - Test Suite

pytestベースのユニットテストと統合テストスイート

## セットアップ

### 開発用依存関係のインストール

```bash
cd backend
pip install -r requirements-dev.txt
```

## テストの実行

### 全テスト実行

```bash
# 詳細出力
pytest tests/ -v

# 簡易出力
pytest tests/ -q

# カバレッジレポート付き
pytest tests/ --cov=app --cov-report=html
```

### 特定のテストファイルを実行

```bash
# 認証テストのみ
pytest tests/test_auth.py -v

# チケットテストのみ
pytest tests/test_tickets.py -v

# SLAテストのみ
pytest tests/test_sla.py -v

# モデルテストのみ
pytest tests/test_models.py -v

# APIエンドポイントテストのみ
pytest tests/test_api_endpoints.py -v
```

### 特定のテストクラスを実行

```bash
# パスワードハッシュテストのみ
pytest tests/test_auth.py::TestPasswordHashing -v

# チケットCRUDテストのみ
pytest tests/test_tickets.py::TestTicketCRUD -v
```

### マーカーを使用したフィルタリング

```bash
# 認証関連のテストのみ
pytest tests/ -m auth -v

# チケット関連のテストのみ
pytest tests/ -m tickets -v

# SLA関連のテストのみ
pytest tests/ -m sla -v

# ユニットテストのみ
pytest tests/ -m unit -v

# 統合テストのみ
pytest tests/ -m integration -v
```

### カバレッジレポート

```bash
# HTMLレポート生成
pytest tests/ --cov=app --cov-report=html

# ターミナルで詳細表示
pytest tests/ --cov=app --cov-report=term-missing

# XMLレポート生成（CI用）
pytest tests/ --cov=app --cov-report=xml
```

HTMLレポートは `htmlcov/index.html` に生成されます。

## テストファイル構成

```
tests/
├── __init__.py                 # テストパッケージ初期化
├── conftest.py                 # 共通フィクスチャ（データベース、テストユーザーなど）
├── helpers.py                  # テストヘルパー関数
├── test_auth.py                # 認証・JWT・ログイン関連のテスト
├── test_tickets.py             # チケットCRUD、ステータス遷移、履歴のテスト
├── test_sla.py                 # SLAポリシー、期限計算のテスト
├── test_models.py              # モデルバリデーション、リレーションシップのテスト
└── test_api_endpoints.py       # APIエンドポイント、認証・認可、レスポンス形式のテスト
```

## 主要なフィクスチャ

### データベース関連

- `test_engine` - テスト用インメモリSQLiteエンジン
- `test_session_factory` - テスト用セッションファクトリ
- `db_session` - テスト用データベースセッション
- `client` - FastAPIテスト用HTTPクライアント

### テストユーザー

- `test_user_requester` - 一般ユーザー（Requester）
- `test_user_agent` - エージェント（Agent）
- `test_user_m365_operator` - M365オペレーター
- `test_user_approver` - 承認者（Approver）
- `test_user_manager` - 管理者（Manager）

### その他

- `test_sla_policies` - テスト用SLAポリシー（P1-P4）
- `create_auth_headers` - 認証ヘッダー生成関数

## ヘルパー関数

`tests/helpers.py` には以下のヘルパー関数が含まれています:

- `create_test_user()` - テストユーザー作成
- `create_test_ticket()` - テストチケット作成
- `create_test_comment()` - テストコメント作成
- `create_test_sla_policy()` - テストSLAポリシー作成
- `create_auth_token()` - 認証トークン生成
- `create_auth_headers()` - 認証ヘッダー生成
- `assert_datetime_close()` - datetime比較アサーション
- `assert_ticket_response()` - チケットレスポンスアサーション

## テストデータベース

- テストでは **インメモリSQLite** (`sqlite+aiosqlite:///:memory:`) を使用
- 各テスト関数で独立したデータベースセッションを使用
- テスト終了後は自動的にロールバックされ、データは削除される

## カバレッジ目標

- **全体カバレッジ目標**: 60%以上
- **コアモデル**: 90%以上
- **APIルート**: 60%以上
- **セキュリティ機能**: 80%以上

## トラブルシューティング

### テストが失敗する場合

```bash
# より詳細なエラー情報を表示
pytest tests/ -vv --tb=long

# 特定のテストのみをデバッグモードで実行
pytest tests/test_auth.py::test_login_success -vv -s
```

### データベースエラーが発生する場合

- インメモリSQLiteを使用しているため、データベースファイルは不要
- 各テストで独立したセッションを使用
- エラーが発生した場合は、`conftest.py` のフィクスチャを確認

### 非同期テストのエラー

- `pytest-asyncio` が正しくインストールされているか確認
- `pytest.ini` の `asyncio_mode = auto` が設定されているか確認

## CI/CD統合

### GitHub Actions 例

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Set up Python
        uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - name: Install dependencies
        run: |
          cd backend
          pip install -r requirements-dev.txt
      - name: Run tests
        run: |
          cd backend
          pytest tests/ --cov=app --cov-report=xml
      - name: Upload coverage
        uses: codecov/codecov-action@v2
        with:
          file: ./backend/coverage.xml
```

## ベストプラクティス

1. **テストの独立性**: 各テストは他のテストに依存せず、独立して実行可能にする
2. **テストデータ**: Fakerを使用してリアルなテストデータを生成する
3. **アサーション**: 明確で読みやすいアサーションメッセージを使用する
4. **モック**: 外部APIやサービスはモックを使用する
5. **カバレッジ**: 新機能追加時は必ずテストも追加する

## 参考リンク

- [pytest公式ドキュメント](https://docs.pytest.org/)
- [pytest-asyncio](https://github.com/pytest-dev/pytest-asyncio)
- [pytest-cov](https://pytest-cov.readthedocs.io/)
- [FastAPI Testing](https://fastapi.tiangolo.com/tutorial/testing/)
