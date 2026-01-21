"""
Test Authentication Module

認証関連のテスト:
- ログイン成功/失敗
- トークン生成/検証
- パスワードハッシュ化
- リフレッシュトークン
"""

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import (
    verify_password,
    get_password_hash,
    create_access_token,
    create_refresh_token,
    verify_token,
)
from app.models.user import User


class TestPasswordHashing:
    """パスワードハッシュ化のテスト"""

    def test_password_hash(self):
        """パスワードがハッシュ化されることを確認"""
        password = "test_password_123"
        hashed = get_password_hash(password)

        # ハッシュ化されたパスワードは元のパスワードと異なる
        assert hashed != password

        # ハッシュ化されたパスワードは文字列
        assert isinstance(hashed, str)

        # 同じパスワードでも毎回異なるハッシュが生成される（ソルト付き）
        hashed2 = get_password_hash(password)
        assert hashed != hashed2

    def test_password_verification_success(self):
        """正しいパスワードの検証が成功することを確認"""
        password = "test_password_123"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_password_verification_failure(self):
        """間違ったパスワードの検証が失敗することを確認"""
        password = "test_password_123"
        wrong_password = "wrong_password"
        hashed = get_password_hash(password)

        assert verify_password(wrong_password, hashed) is False


class TestJWTTokens:
    """JWTトークンのテスト"""

    def test_create_access_token(self):
        """アクセストークンが生成されることを確認"""
        user_id = "123"
        token = create_access_token(subject=user_id)

        # トークンは文字列
        assert isinstance(token, str)

        # トークンは空でない
        assert len(token) > 0

    def test_create_refresh_token(self):
        """リフレッシュトークンが生成されることを確認"""
        user_id = "123"
        token = create_refresh_token(subject=user_id)

        # トークンは文字列
        assert isinstance(token, str)

        # トークンは空でない
        assert len(token) > 0

    def test_verify_valid_token(self):
        """有効なトークンの検証が成功することを確認"""
        user_id = "123"
        token = create_access_token(subject=user_id)

        payload = verify_token(token)

        # ペイロードが返される
        assert payload is not None

        # ユーザーIDが含まれる
        assert payload["sub"] == user_id

        # トークンタイプが含まれる
        assert payload["type"] == "access"

    def test_verify_invalid_token(self):
        """無効なトークンの検証が失敗することを確認"""
        invalid_token = "invalid.token.here"

        payload = verify_token(invalid_token)

        # Noneが返される
        assert payload is None

    def test_verify_refresh_token(self):
        """リフレッシュトークンの検証が成功することを確認"""
        user_id = "456"
        token = create_refresh_token(subject=user_id)

        payload = verify_token(token)

        # ペイロードが返される
        assert payload is not None

        # ユーザーIDが含まれる
        assert payload["sub"] == user_id

        # トークンタイプが含まれる
        assert payload["type"] == "refresh"


@pytest.mark.auth
class TestLoginAPI:
    """ログインAPIのテスト"""

    @pytest.mark.asyncio
    async def test_login_success(
        self,
        client: AsyncClient,
        test_user_requester: User,
    ):
        """正しい認証情報でログインが成功することを確認"""
        response = await client.post(
            "/api/auth/login",
            json={
                "email": test_user_requester.email,
                "password": "password123",
            },
        )

        # ステータスコード200
        assert response.status_code == 200

        data = response.json()

        # アクセストークンが含まれる
        assert "access_token" in data
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0

        # リフレッシュトークンが含まれる
        assert "refresh_token" in data
        assert isinstance(data["refresh_token"], str)
        assert len(data["refresh_token"]) > 0

        # トークンタイプがbearer
        assert data["token_type"] == "bearer"

        # 有効期限が含まれる
        assert "expires_in" in data
        assert data["expires_in"] > 0

    @pytest.mark.asyncio
    async def test_login_wrong_password(
        self,
        client: AsyncClient,
        test_user_requester: User,
    ):
        """間違ったパスワードでログインが失敗することを確認"""
        response = await client.post(
            "/api/auth/login",
            json={
                "email": test_user_requester.email,
                "password": "wrong_password",
            },
        )

        # ステータスコード401
        assert response.status_code == 401

        data = response.json()

        # エラーメッセージが含まれる
        assert "detail" in data

    @pytest.mark.asyncio
    async def test_login_nonexistent_user(
        self,
        client: AsyncClient,
    ):
        """存在しないユーザーでログインが失敗することを確認"""
        response = await client.post(
            "/api/auth/login",
            json={
                "email": "nonexistent@example.com",
                "password": "password123",
            },
        )

        # ステータスコード401
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_login_inactive_user(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ):
        """非アクティブなユーザーでログインが失敗することを確認"""
        from tests.helpers import create_test_user
        from app.models.user import UserRole

        # 非アクティブなユーザーを作成
        inactive_user = await create_test_user(
            db_session,
            email="inactive@example.com",
            role=UserRole.REQUESTER,
            is_active=False,
        )

        response = await client.post(
            "/api/auth/login",
            json={
                "email": inactive_user.email,
                "password": "password123",
            },
        )

        # ステータスコード403
        assert response.status_code == 403

        data = response.json()
        assert "deactivated" in data["detail"].lower()


@pytest.mark.auth
class TestAuthenticatedEndpoints:
    """認証が必要なエンドポイントのテスト"""

    @pytest.mark.asyncio
    async def test_get_current_user(
        self,
        client: AsyncClient,
        test_user_requester: User,
        create_auth_headers,
    ):
        """/me エンドポイントで現在のユーザー情報を取得できることを確認"""
        headers = create_auth_headers(test_user_requester.id)

        response = await client.get("/api/auth/me", headers=headers)

        # ステータスコード200
        assert response.status_code == 200

        data = response.json()

        # ユーザー情報が含まれる
        assert data["id"] == test_user_requester.id
        assert data["email"] == test_user_requester.email
        assert data["display_name"] == test_user_requester.display_name
        assert data["role"] == test_user_requester.role.value

    @pytest.mark.asyncio
    async def test_get_current_user_without_token(
        self,
        client: AsyncClient,
    ):
        """トークンなしで/meエンドポイントにアクセスすると401が返ることを確認"""
        response = await client.get("/api/auth/me")

        # ステータスコード401（HTTPBearerがトークンなしを拒否）
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_get_current_user_with_invalid_token(
        self,
        client: AsyncClient,
    ):
        """無効なトークンで/meエンドポイントにアクセスすると401が返ることを確認"""
        headers = {"Authorization": "Bearer invalid_token_here"}

        response = await client.get("/api/auth/me", headers=headers)

        # ステータスコード401
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_logout(
        self,
        client: AsyncClient,
        test_user_requester: User,
        create_auth_headers,
    ):
        """ログアウトが成功することを確認"""
        headers = create_auth_headers(test_user_requester.id)

        response = await client.post("/api/auth/logout", headers=headers)

        # ステータスコード200
        assert response.status_code == 200

        data = response.json()
        assert "message" in data


@pytest.mark.auth
class TestRefreshToken:
    """リフレッシュトークンのテスト"""

    @pytest.mark.asyncio
    async def test_refresh_token_success(
        self,
        client: AsyncClient,
        test_user_requester: User,
    ):
        """リフレッシュトークンで新しいアクセストークンを取得できることを確認"""
        # リフレッシュトークンを生成
        refresh_token = create_refresh_token(subject=str(test_user_requester.id))

        response = await client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        # ステータスコード200
        assert response.status_code == 200

        data = response.json()

        # 新しいアクセストークンが含まれる
        assert "access_token" in data
        assert isinstance(data["access_token"], str)
        assert len(data["access_token"]) > 0

        # 新しいリフレッシュトークンが含まれる
        assert "refresh_token" in data
        assert isinstance(data["refresh_token"], str)
        assert len(data["refresh_token"]) > 0

    @pytest.mark.asyncio
    async def test_refresh_token_invalid(
        self,
        client: AsyncClient,
    ):
        """無効なリフレッシュトークンでエラーが返ることを確認"""
        response = await client.post(
            "/api/auth/refresh",
            json={"refresh_token": "invalid_refresh_token"},
        )

        # ステータスコード401
        assert response.status_code == 401

    @pytest.mark.asyncio
    async def test_refresh_token_for_inactive_user(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
    ):
        """非アクティブユーザーのリフレッシュトークンでエラーが返ることを確認"""
        from tests.helpers import create_test_user
        from app.models.user import UserRole

        # アクティブなユーザーを作成してリフレッシュトークンを生成
        user = await create_test_user(
            db_session,
            email="tobedeactivated@example.com",
            role=UserRole.REQUESTER,
            is_active=True,
        )

        refresh_token = create_refresh_token(subject=str(user.id))

        # ユーザーを非アクティブにする
        user.is_active = False
        await db_session.commit()

        response = await client.post(
            "/api/auth/refresh",
            json={"refresh_token": refresh_token},
        )

        # ステータスコード401
        assert response.status_code == 401
