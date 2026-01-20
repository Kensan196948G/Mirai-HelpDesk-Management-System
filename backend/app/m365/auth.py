"""
Microsoft 365 認証設定

Microsoft Graph APIへの認証に必要な設定とトークン取得機能を提供します。
"""

from dataclasses import dataclass
from typing import Optional
import httpx
from app.config import settings


@dataclass
class M365AuthConfig:
    """Microsoft 365 認証設定

    Attributes:
        tenant_id: Azure AD テナントID
        client_id: アプリケーション（クライアント）ID
        client_secret: クライアントシークレット
        authority: 認証エンドポイント
        graph_endpoint: Microsoft Graph API エンドポイント
        scopes: APIスコープ
    """

    tenant_id: str
    client_id: str
    client_secret: str
    authority: str
    graph_endpoint: str
    scopes: list[str]

    @classmethod
    def from_settings(cls) -> "M365AuthConfig":
        """設定ファイルから認証設定を作成"""
        return cls(
            tenant_id=settings.MS_TENANT_ID,
            client_id=settings.MS_CLIENT_ID,
            client_secret=settings.MS_CLIENT_SECRET,
            authority=settings.MS_AUTHORITY or f"https://login.microsoftonline.com/{settings.MS_TENANT_ID}",
            graph_endpoint=settings.MS_GRAPH_ENDPOINT,
            scopes=[settings.MS_SCOPES],
        )

    def is_configured(self) -> bool:
        """認証設定が有効かチェック"""
        return bool(self.tenant_id and self.client_id and self.client_secret)

    async def get_access_token(self) -> str:
        """アクセストークン取得

        Client Credentials Flowを使用してアクセストークンを取得します。

        Returns:
            アクセストークン

        Raises:
            M365AuthenticationError: トークン取得失敗時
        """
        from .exceptions import M365AuthenticationError

        if not self.is_configured():
            raise M365AuthenticationError(
                "M365 authentication is not configured. Please set MS_TENANT_ID, MS_CLIENT_ID, and MS_CLIENT_SECRET in .env file."
            )

        token_url = f"{self.authority}/oauth2/v2.0/token"

        data = {
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "scope": " ".join(self.scopes),
            "grant_type": "client_credentials",
        }

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(token_url, data=data, timeout=30.0)
                response.raise_for_status()

                token_data = response.json()
                return token_data["access_token"]

        except httpx.HTTPStatusError as e:
            error_detail = {}
            try:
                error_detail = e.response.json()
            except Exception:
                pass

            raise M365AuthenticationError(
                f"Failed to acquire access token: {e.response.status_code}",
                details={"status_code": e.response.status_code, "error": error_detail}
            ) from e

        except httpx.RequestError as e:
            raise M365AuthenticationError(
                f"Network error while acquiring access token: {str(e)}",
                details={"error": str(e)}
            ) from e

        except KeyError as e:
            raise M365AuthenticationError(
                "Invalid token response format",
                details={"missing_key": str(e)}
            ) from e
