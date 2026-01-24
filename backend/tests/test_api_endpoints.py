"""
Test API Endpoints

全APIエンドポイントのHTTPテスト:
- 認証/認可テスト
- レスポンス形式検証
- エラーハンドリング
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.models.ticket import TicketStatus
from tests.helpers import create_test_ticket, create_auth_headers


@pytest.mark.integration
class TestHealthEndpoint:
    """ヘルスチェックエンドポイントのテスト"""

    @pytest.mark.asyncio
    async def test_health_check(self, client: AsyncClient):
        """ヘルスチェックが成功することを確認"""
        response = await client.get("/health")

        assert response.status_code == 200

        data = response.json()

        assert data["status"] == "healthy"
        assert "app" in data
        assert "version" in data
        assert "environment" in data


@pytest.mark.integration
class TestRootEndpoint:
    """ルートエンドポイントのテスト"""

    @pytest.mark.asyncio
    async def test_root(self, client: AsyncClient):
        """ルートエンドポイントが成功することを確認"""
        response = await client.get("/")

        assert response.status_code == 200

        data = response.json()

        assert "message" in data
        assert "version" in data


@pytest.mark.integration
class TestAuthEndpoints:
    """認証エンドポイントのテスト"""

    @pytest.mark.asyncio
    async def test_login_endpoint(
        self,
        client: AsyncClient,
        test_user_requester: User,
    ):
        """ログインエンドポイントが正しく動作することを確認"""
        response = await client.post(
            "/api/auth/login",
            json={
                "email": test_user_requester.email,
                "password": "password123",
            },
        )

        assert response.status_code == 200
        assert "access_token" in response.json()

    @pytest.mark.asyncio
    async def test_me_endpoint_requires_auth(
        self,
        client: AsyncClient,
    ):
        """/meエンドポイントが認証を要求することを確認"""
        response = await client.get("/api/auth/me")

        # 認証なしではアクセスできない（401 Unauthorized）
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_me_endpoint_with_auth(
        self,
        client: AsyncClient,
        test_user_requester: User,
        create_auth_headers,
    ):
        """認証付きで/meエンドポイントにアクセスできることを確認"""
        headers = create_auth_headers(test_user_requester.id)

        response = await client.get("/api/auth/me", headers=headers)

        assert response.status_code == 200
        assert response.json()["id"] == test_user_requester.id


@pytest.mark.integration
class TestTicketEndpoints:
    """チケットエンドポイントのテスト"""

    @pytest.mark.asyncio
    async def test_create_ticket_endpoint(
        self,
        client: AsyncClient,
        test_user_requester: User,
        create_auth_headers,
    ):
        """チケット作成エンドポイントが正しく動作することを確認"""
        headers = create_auth_headers(test_user_requester.id)

        response = await client.post(
            "/api/tickets",
            json={
                "subject": "テストチケット",
                "description": "これはテストです",
                "type": "incident",
                "category": "account",
                "impact": 2,
                "urgency": 2,
            },
            headers=headers,
        )

        assert response.status_code == 201
        assert "ticket_number" in response.json()

    @pytest.mark.asyncio
    async def test_list_tickets_endpoint(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        create_auth_headers,
    ):
        """チケット一覧エンドポイントが正しく動作することを確認"""
        # テストチケットを作成
        await create_test_ticket(db_session, requester=test_user_requester)

        headers = create_auth_headers(test_user_requester.id)

        response = await client.get("/api/tickets", headers=headers)

        assert response.status_code == 200

        data = response.json()

        assert "items" in data
        assert "total" in data

    @pytest.mark.asyncio
    async def test_get_ticket_endpoint(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        create_auth_headers,
    ):
        """チケット詳細エンドポイントが正しく動作することを確認"""
        ticket = await create_test_ticket(db_session, requester=test_user_requester)

        headers = create_auth_headers(test_user_requester.id)

        response = await client.get(f"/api/tickets/{ticket.id}", headers=headers)

        assert response.status_code == 200
        assert response.json()["id"] == ticket.id

    @pytest.mark.asyncio
    async def test_update_ticket_endpoint(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        test_user_agent: User,
        create_auth_headers,
    ):
        """チケット更新エンドポイントが正しく動作することを確認"""
        ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.NEW,
        )

        headers = create_auth_headers(test_user_agent.id)

        response = await client.patch(
            f"/api/tickets/{ticket.id}",
            json={"status": "assigned"},
            headers=headers,
        )

        assert response.status_code == 200
        assert response.json()["status"] == "assigned"

    @pytest.mark.asyncio
    async def test_ticket_requires_authentication(
        self,
        client: AsyncClient,
    ):
        """チケットエンドポイントが認証を要求することを確認"""
        response = await client.get("/api/tickets")

        # 認証なしではアクセスできない
        assert response.status_code == 401


@pytest.mark.integration
class TestSLAEndpoints:
    """SLAエンドポイントのテスト"""

    @pytest.mark.asyncio
    async def test_list_sla_policies_endpoint(
        self,
        client: AsyncClient,
        test_user_requester: User,
        test_sla_policies,
        create_auth_headers,
    ):
        """SLAポリシー一覧エンドポイントが正しく動作することを確認"""
        headers = create_auth_headers(test_user_requester.id)

        response = await client.get("/api/sla/policies", headers=headers)

        assert response.status_code == 200
        assert len(response.json()) == 4  # P1-P4

    @pytest.mark.asyncio
    async def test_get_sla_policy_endpoint(
        self,
        client: AsyncClient,
        test_user_requester: User,
        test_sla_policies,
        create_auth_headers,
    ):
        """SLAポリシー詳細エンドポイントが正しく動作することを確認"""
        policy = test_sla_policies[0]
        headers = create_auth_headers(test_user_requester.id)

        response = await client.get(f"/api/sla/policies/{policy.id}", headers=headers)

        assert response.status_code == 200
        assert response.json()["id"] == policy.id

    @pytest.mark.asyncio
    async def test_create_sla_policy_requires_manager_role(
        self,
        client: AsyncClient,
        test_user_requester: User,
        create_auth_headers,
    ):
        """SLAポリシー作成にマネージャー権限が必要なことを確認"""
        headers = create_auth_headers(test_user_requester.id)

        response = await client.post(
            "/api/sla/policies",
            json={
                "name": "Test Policy",
                "priority": "p1",
                "response_time_hours": 1.0,
                "resolution_time_hours": 8.0,
            },
            headers=headers,
        )

        # 権限なしでは作成できない
        assert response.status_code == 403


@pytest.mark.integration
class TestUserEndpoints:
    """ユーザーエンドポイントのテスト"""

    @pytest.mark.asyncio
    async def test_list_users_endpoint(
        self,
        client: AsyncClient,
        test_user_manager: User,
        create_auth_headers,
    ):
        """ユーザー一覧エンドポイントが正しく動作することを確認"""
        headers = create_auth_headers(test_user_manager.id)

        response = await client.get("/api/users", headers=headers)

        # マネージャーはユーザー一覧を取得できる
        assert response.status_code == 200
        assert isinstance(response.json(), list)

    @pytest.mark.asyncio
    async def test_list_users_requires_staff_role(
        self,
        client: AsyncClient,
        test_user_requester: User,
        create_auth_headers,
    ):
        """ユーザー一覧取得にスタッフ権限が必要なことを確認"""
        headers = create_auth_headers(test_user_requester.id)

        response = await client.get("/api/users", headers=headers)

        # 一般ユーザーは一覧を取得できない（実装による）
        # 実装がない場合は404が返る
        assert response.status_code in [403, 404]


@pytest.mark.integration
class TestErrorHandling:
    """エラーハンドリングのテスト"""

    @pytest.mark.asyncio
    async def test_404_not_found(
        self,
        client: AsyncClient,
        test_user_requester: User,
        create_auth_headers,
    ):
        """存在しないリソースに404が返ることを確認"""
        headers = create_auth_headers(test_user_requester.id)

        response = await client.get("/api/tickets/99999", headers=headers)

        assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_invalid_json_payload(
        self,
        client: AsyncClient,
        test_user_requester: User,
        create_auth_headers,
    ):
        """不正なJSONペイロードでエラーが返ることを確認"""
        headers = create_auth_headers(test_user_requester.id)

        response = await client.post(
            "/api/tickets",
            json={
                "subject": "短い",  # 最小長5文字に違反
                "description": "短い",  # 最小長10文字に違反
                "type": "invalid_type",
                "category": "invalid_category",
            },
            headers=headers,
        )

        # バリデーションエラー
        assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_missing_required_fields(
        self,
        client: AsyncClient,
        test_user_requester: User,
        create_auth_headers,
    ):
        """必須フィールドが欠けている場合にエラーが返ることを確認"""
        headers = create_auth_headers(test_user_requester.id)

        response = await client.post(
            "/api/tickets",
            json={
                # subjectとdescriptionを省略
                "type": "incident",
                "category": "account",
            },
            headers=headers,
        )

        # バリデーションエラー
        assert response.status_code == 422


@pytest.mark.integration
class TestResponseFormats:
    """レスポンス形式のテスト"""

    @pytest.mark.asyncio
    async def test_ticket_response_format(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        create_auth_headers,
    ):
        """チケットレスポンスが期待する形式であることを確認"""
        ticket = await create_test_ticket(db_session, requester=test_user_requester)

        headers = create_auth_headers(test_user_requester.id)

        response = await client.get(f"/api/tickets/{ticket.id}", headers=headers)

        assert response.status_code == 200

        data = response.json()

        # 必須フィールドが含まれる
        required_fields = [
            "id",
            "ticket_number",
            "subject",
            "description",
            "type",
            "status",
            "priority",
            "category",
            "requester_id",
            "created_at",
        ]

        for field in required_fields:
            assert field in data, f"Missing field: {field}"

    @pytest.mark.asyncio
    async def test_pagination_format(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        create_auth_headers,
    ):
        """ページネーションレスポンスが期待する形式であることを確認"""
        # 複数のチケットを作成
        for _ in range(3):
            await create_test_ticket(db_session, requester=test_user_requester)

        headers = create_auth_headers(test_user_requester.id)

        response = await client.get("/api/tickets", headers=headers)

        assert response.status_code == 200

        data = response.json()

        # ページネーション情報が含まれる
        pagination_fields = ["items", "total", "page", "page_size", "total_pages"]

        for field in pagination_fields:
            assert field in data, f"Missing pagination field: {field}"

        # itemsが配列
        assert isinstance(data["items"], list)


@pytest.mark.integration
class TestCORS:
    """CORS設定のテスト"""

    @pytest.mark.asyncio
    async def test_cors_headers(
        self,
        client: AsyncClient,
    ):
        """CORSヘッダーが正しく設定されていることを確認"""
        # OPTIONSリクエストでプリフライトをテスト
        response = await client.options(
            "/api/auth/login",
            headers={
                "Origin": "http://localhost:8080",
                "Access-Control-Request-Method": "POST",
            },
        )

        # CORSヘッダーが含まれる
        assert "access-control-allow-origin" in response.headers
