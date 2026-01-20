"""
Test Audit Middleware

監査ログミドルウェアのテスト:
- API操作の自動記録
- 除外パス確認
- ユーザー情報抽出
- 処理時間計測
"""

import pytest
from unittest.mock import MagicMock, patch, AsyncMock
from fastapi import Request, Response
from starlette.datastructures import Headers

from app.middleware.audit import AuditMiddleware
from app.core.security import create_access_token


@pytest.mark.middleware
class TestAuditMiddlewareInit:
    """AuditMiddleware 初期化のテスト"""

    def test_init(self):
        """ミドルウェアが正しく初期化されることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        assert middleware.app == app
        assert isinstance(middleware.EXCLUDED_PATHS, set)


@pytest.mark.middleware
class TestExcludedPaths:
    """除外パスのテスト"""

    def test_should_exclude_health(self):
        """ヘルスチェックパスが除外されることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        assert middleware._should_exclude("/health") is True

    def test_should_exclude_root(self):
        """ルートパスが除外されることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        assert middleware._should_exclude("/") is True

    def test_should_exclude_api_docs(self):
        """APIドキュメントパスが除外されることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        assert middleware._should_exclude("/api/docs") is True
        assert middleware._should_exclude("/api/redoc") is True
        assert middleware._should_exclude("/openapi.json") is True

    def test_should_exclude_static_files(self):
        """静的ファイルパスが除外されることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        assert middleware._should_exclude("/static/css/style.css") is True
        assert middleware._should_exclude("/static/js/app.js") is True

    def test_should_not_exclude_api_endpoints(self):
        """APIエンドポイントが除外されないことを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        assert middleware._should_exclude("/api/tickets") is False
        assert middleware._should_exclude("/api/auth/login") is False
        assert middleware._should_exclude("/api/users") is False


@pytest.mark.middleware
class TestGetUserInfo:
    """ユーザー情報抽出のテスト"""

    @pytest.mark.asyncio
    async def test_get_user_info_with_valid_token(self):
        """有効なトークンからユーザー情報を抽出できることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        # テストトークンを作成
        user_id = 123
        token = create_access_token(subject=str(user_id))

        # モックリクエストを作成
        request = MagicMock(spec=Request)
        request.headers = {"authorization": f"Bearer {token}"}

        user_id_result, email = await middleware._get_user_info(request)

        assert user_id_result == user_id

    @pytest.mark.asyncio
    async def test_get_user_info_without_token(self):
        """トークンがない場合にNoneを返すことを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        request = MagicMock(spec=Request)
        request.headers = {}

        user_id, email = await middleware._get_user_info(request)

        assert user_id is None
        assert email == ""

    @pytest.mark.asyncio
    async def test_get_user_info_with_invalid_token(self):
        """無効なトークンの場合にNoneを返すことを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        request = MagicMock(spec=Request)
        request.headers = {"authorization": "Bearer invalid_token"}

        user_id, email = await middleware._get_user_info(request)

        assert user_id is None


@pytest.mark.middleware
class TestGetClientIP:
    """クライアントIP取得のテスト"""

    def test_get_client_ip_from_x_forwarded_for(self):
        """X-Forwarded-ForヘッダーからIPを取得できることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        request = MagicMock(spec=Request)
        request.headers = {"x-forwarded-for": "192.168.1.100, 10.0.0.1"}

        ip = middleware._get_client_ip(request)

        assert ip == "192.168.1.100"

    def test_get_client_ip_from_x_real_ip(self):
        """X-Real-IPヘッダーからIPを取得できることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        request = MagicMock(spec=Request)
        request.headers = {"x-real-ip": "192.168.1.200"}

        ip = middleware._get_client_ip(request)

        assert ip == "192.168.1.200"

    def test_get_client_ip_from_client_host(self):
        """クライアントホストからIPを取得できることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        request = MagicMock(spec=Request)
        request.headers = {}
        request.client = MagicMock()
        request.client.host = "192.168.1.50"

        ip = middleware._get_client_ip(request)

        assert ip == "192.168.1.50"

    def test_get_client_ip_unknown(self):
        """クライアント情報がない場合にunknownを返すことを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        request = MagicMock(spec=Request)
        request.headers = {}
        request.client = None

        ip = middleware._get_client_ip(request)

        assert ip == "unknown"


@pytest.mark.middleware
class TestDetermineAction:
    """アクション名決定のテスト"""

    def test_determine_action_get(self):
        """GETメソッドがREADアクションにマッピングされることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        action = middleware._determine_action("GET", "/api/tickets", 200)

        assert action == "READ"

    def test_determine_action_post(self):
        """POSTメソッドがCREATEアクションにマッピングされることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        action = middleware._determine_action("POST", "/api/tickets", 201)

        assert action == "CREATE"

    def test_determine_action_patch(self):
        """PATCHメソッドがUPDATEアクションにマッピングされることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        action = middleware._determine_action("PATCH", "/api/tickets/123", 200)

        assert action == "UPDATE"

    def test_determine_action_delete(self):
        """DELETEメソッドがDELETEアクションにマッピングされることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        action = middleware._determine_action("DELETE", "/api/tickets/123", 200)

        assert action == "DELETE"

    def test_determine_action_login(self):
        """ログインパスがLOGINアクションにマッピングされることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        action = middleware._determine_action("POST", "/api/auth/login", 200)

        assert action == "LOGIN"

    def test_determine_action_logout(self):
        """ログアウトパスがLOGOUTアクションにマッピングされることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        action = middleware._determine_action("POST", "/api/auth/logout", 200)

        assert action == "LOGOUT"

    def test_determine_action_approve(self):
        """承認パスがAPPROVEアクションにマッピングされることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        action = middleware._determine_action("POST", "/api/approvals/123/approve", 200)

        assert action == "APPROVE"

    def test_determine_action_error(self):
        """エラーレスポンスの場合にFAILEDアクションにマッピングされることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        action = middleware._determine_action("GET", "/api/tickets", 404)

        assert action == "GET_FAILED"


@pytest.mark.middleware
class TestExtractResourceType:
    """リソースタイプ抽出のテスト"""

    def test_extract_resource_type_tickets(self):
        """ticketsリソースタイプが抽出されることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        resource_type = middleware._extract_resource_type("/api/tickets")

        assert resource_type == "tickets"

    def test_extract_resource_type_users(self):
        """usersリソースタイプが抽出されることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        resource_type = middleware._extract_resource_type("/api/users")

        assert resource_type == "users"

    def test_extract_resource_type_with_id(self):
        """IDを含むパスからリソースタイプが抽出されることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        resource_type = middleware._extract_resource_type("/api/tickets/123")

        assert resource_type == "tickets"

    def test_extract_resource_type_nested(self):
        """ネストされたパスからリソースタイプが抽出されることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        resource_type = middleware._extract_resource_type("/api/tickets/123/comments")

        assert resource_type == "tickets"


@pytest.mark.middleware
class TestExtractResourceId:
    """リソースID抽出のテスト"""

    def test_extract_resource_id_single(self):
        """単一のリソースIDが抽出されることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        resource_id = middleware._extract_resource_id("/api/tickets/123")

        assert resource_id == 123

    def test_extract_resource_id_nested(self):
        """ネストされたパスから最初のIDが抽出されることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        resource_id = middleware._extract_resource_id("/api/tickets/123/comments")

        assert resource_id == 123

    def test_extract_resource_id_none(self):
        """IDがない場合にNoneが返されることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        resource_id = middleware._extract_resource_id("/api/tickets")

        assert resource_id is None


@pytest.mark.middleware
class TestLogRequest:
    """リクエストログ記録のテスト"""

    def test_log_request_success(self):
        """リクエストログが正しく記録されることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        with patch('app.middleware.audit.log_api_operation') as mock_log:
            middleware._log_request(
                user_id=123,
                user_email="test@example.com",
                method="GET",
                path="/api/tickets/456",
                status_code=200,
                ip_address="192.168.1.100",
                user_agent="Mozilla/5.0",
                process_time=0.123,
            )

            mock_log.assert_called_once()
            args = mock_log.call_args[1]
            assert args["user_id"] == 123
            assert args["user_email"] == "test@example.com"
            assert args["action"] == "READ"
            assert args["resource_type"] == "tickets"
            assert args["resource_id"] == 456
            assert args["ip_address"] == "192.168.1.100"

    def test_log_request_error_handling(self):
        """ログ記録エラーが処理を止めないことを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        with patch('app.middleware.audit.log_api_operation', side_effect=Exception("Log error")):
            # エラーが発生しても例外が発生しない
            middleware._log_request(
                user_id=123,
                user_email="test@example.com",
                method="GET",
                path="/api/tickets",
                status_code=200,
                ip_address="192.168.1.100",
                user_agent="Mozilla/5.0",
                process_time=0.1,
            )


@pytest.mark.middleware
class TestDispatch:
    """ディスパッチメソッドのテスト"""

    @pytest.mark.asyncio
    async def test_dispatch_excluded_path(self):
        """除外パスではログが記録されないことを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        request = MagicMock(spec=Request)
        request.url.path = "/health"

        call_next = AsyncMock(return_value=Response(content=b"OK", status_code=200))

        with patch.object(middleware, '_log_request') as mock_log:
            response = await middleware.dispatch(request, call_next)

            assert response.status_code == 200
            mock_log.assert_not_called()

    @pytest.mark.asyncio
    async def test_dispatch_with_auth(self):
        """認証付きリクエストでログが記録されることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        user_id = 123
        token = create_access_token(subject=str(user_id))

        request = MagicMock(spec=Request)
        request.url.path = "/api/tickets"
        request.headers = {"authorization": f"Bearer {token}"}
        request.method = "GET"
        request.client.host = "192.168.1.100"

        call_next = AsyncMock(return_value=Response(content=b"[]", status_code=200))

        with patch.object(middleware, '_log_request') as mock_log:
            response = await middleware.dispatch(request, call_next)

            assert response.status_code == 200
            mock_log.assert_called_once()
            assert "X-Process-Time" in response.headers

    @pytest.mark.asyncio
    async def test_dispatch_without_auth(self):
        """認証なしリクエストではログが記録されないことを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        request = MagicMock(spec=Request)
        request.url.path = "/api/tickets"
        request.headers = {}
        request.method = "GET"

        call_next = AsyncMock(return_value=Response(content=b"Unauthorized", status_code=401))

        with patch.object(middleware, '_log_request') as mock_log:
            response = await middleware.dispatch(request, call_next)

            assert response.status_code == 401
            mock_log.assert_not_called()

    @pytest.mark.asyncio
    async def test_dispatch_process_time_header(self):
        """処理時間がレスポンスヘッダーに追加されることを確認"""
        app = MagicMock()
        middleware = AuditMiddleware(app)

        request = MagicMock(spec=Request)
        request.url.path = "/api/tickets"
        request.headers = {}

        call_next = AsyncMock(return_value=Response(content=b"OK", status_code=200))

        response = await middleware.dispatch(request, call_next)

        assert "X-Process-Time" in response.headers
        process_time = float(response.headers["X-Process-Time"])
        assert process_time >= 0
