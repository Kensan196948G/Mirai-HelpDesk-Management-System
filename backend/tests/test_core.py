"""
Test Core Security Module

セキュリティ機能のテスト:
- パスワードハッシュ
- JWTトークン生成/検証
"""

import pytest
from datetime import datetime, timedelta, timezone

from app.core.security import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    verify_token,
)


@pytest.mark.security
class TestPasswordHashing:
    """パスワードハッシュのテスト"""

    def test_get_password_hash(self):
        """パスワードがハッシュ化されることを確認"""
        password = "mypassword123"
        hashed = get_password_hash(password)

        assert hashed != password
        assert len(hashed) > 0

    def test_verify_password_correct(self):
        """正しいパスワードが検証されることを確認"""
        password = "mypassword123"
        hashed = get_password_hash(password)

        assert verify_password(password, hashed) is True

    def test_verify_password_incorrect(self):
        """誤ったパスワードが拒否されることを確認"""
        password = "mypassword123"
        wrong_password = "wrongpassword"
        hashed = get_password_hash(password)

        assert verify_password(wrong_password, hashed) is False

    def test_same_password_different_hashes(self):
        """同じパスワードでも異なるハッシュが生成されることを確認（salt使用）"""
        password = "mypassword123"
        hash1 = get_password_hash(password)
        hash2 = get_password_hash(password)

        assert hash1 != hash2
        assert verify_password(password, hash1) is True
        assert verify_password(password, hash2) is True


@pytest.mark.security
class TestJWTTokens:
    """JWTトークンのテスト"""

    def test_create_access_token_with_defaults(self):
        """デフォルト設定でアクセストークンが生成されることを確認"""
        subject = "123"
        token = create_access_token(subject=subject)

        assert token is not None
        assert len(token) > 0

    def test_create_access_token_with_custom_expiry(self):
        """カスタム有効期限でトークンが生成されることを確認"""
        subject = "123"
        expires_delta = timedelta(hours=1)
        token = create_access_token(subject=subject, expires_delta=expires_delta)

        assert token is not None

        # トークンを検証して有効期限を確認
        payload = verify_token(token)
        assert payload is not None
        assert "exp" in payload

    def test_create_refresh_token(self):
        """リフレッシュトークンが生成されることを確認"""
        subject = "123"
        token = create_refresh_token(subject=subject)

        assert token is not None
        assert len(token) > 0

    def test_verify_token_valid(self):
        """有効なトークンが検証されることを確認"""
        subject = "123"
        token = create_access_token(subject=subject)

        payload = verify_token(token)

        assert payload is not None
        assert payload["sub"] == subject
        assert "exp" in payload

    def test_verify_token_invalid(self):
        """無効なトークンが拒否されることを確認"""
        invalid_token = "invalid.token.here"

        payload = verify_token(invalid_token)

        assert payload is None

    def test_verify_token_expired(self):
        """期限切れトークンが拒否されることを確認"""
        subject = "123"
        # 過去の時刻で有効期限を設定
        expires_delta = timedelta(seconds=-10)
        token = create_access_token(subject=subject, expires_delta=expires_delta)

        payload = verify_token(token)

        assert payload is None

    def test_token_contains_standard_claims(self):
        """トークンに標準クレームが含まれることを確認"""
        subject = "123"
        token = create_access_token(subject=subject)

        payload = verify_token(token)

        assert payload is not None
        assert "sub" in payload  # subject
        assert "exp" in payload  # expiration time
        assert "iat" in payload  # issued at time

    def test_different_subjects_different_tokens(self):
        """異なる subject で異なるトークンが生成されることを確認"""
        token1 = create_access_token(subject="123")
        token2 = create_access_token(subject="456")

        assert token1 != token2

        payload1 = verify_token(token1)
        payload2 = verify_token(token2)

        assert payload1["sub"] == "123"
        assert payload2["sub"] == "456"
