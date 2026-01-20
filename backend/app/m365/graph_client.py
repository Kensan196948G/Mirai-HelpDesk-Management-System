"""
Microsoft Graph API クライアント

Microsoft Graph APIへのHTTPリクエストを抽象化したクライアントクラス。
トークン管理、リトライ、エラーハンドリングを提供します。
"""

import asyncio
import logging
from typing import Any, Optional
import httpx

from .auth import M365AuthConfig
from .exceptions import (
    M365APIError,
    M365AuthenticationError,
    M365AuthorizationError,
)

logger = logging.getLogger(__name__)


class GraphClient:
    """Microsoft Graph API クライアント

    主要な機能:
    - 自動トークン管理
    - リトライとレート制限対応
    - エラーハンドリング
    - 標準的なCRUD操作
    """

    def __init__(self, auth_config: Optional[M365AuthConfig] = None):
        """GraphClientの初期化

        Args:
            auth_config: 認証設定（省略時は設定ファイルから取得）
        """
        self.auth_config = auth_config or M365AuthConfig.from_settings()
        self._access_token: Optional[str] = None
        self._client = httpx.AsyncClient(timeout=30.0)

    async def __aenter__(self):
        """非同期コンテキストマネージャー入口"""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """非同期コンテキストマネージャー出口"""
        await self.close()

    async def close(self):
        """クライアントのクローズ"""
        await self._client.aclose()

    async def _ensure_token(self):
        """アクセストークンの確保

        トークンがない場合は取得します。
        """
        if not self._access_token:
            self._access_token = await self.auth_config.get_access_token()

    async def _request(
        self,
        method: str,
        endpoint: str,
        *,
        json_data: Optional[dict[str, Any]] = None,
        params: Optional[dict[str, Any]] = None,
        retry_count: int = 0,
        max_retries: int = 3,
    ) -> dict[str, Any]:
        """Graph APIへのHTTPリクエスト

        Args:
            method: HTTPメソッド (GET, POST, PATCH, DELETE)
            endpoint: APIエンドポイント (/users, /groups など)
            json_data: リクエストボディ（JSON）
            params: クエリパラメータ
            retry_count: 現在のリトライ回数
            max_retries: 最大リトライ回数

        Returns:
            APIレスポンス（JSON）

        Raises:
            M365AuthenticationError: 認証エラー
            M365AuthorizationError: 認可エラー
            M365APIError: その他のAPIエラー
        """
        await self._ensure_token()

        # エンドポイントのフルURL構築
        if not endpoint.startswith("http"):
            url = f"{self.auth_config.graph_endpoint}{endpoint}"
        else:
            url = endpoint

        headers = {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json",
        }

        try:
            logger.info(f"Graph API Request: {method} {url}")

            response = await self._client.request(
                method=method,
                url=url,
                headers=headers,
                json=json_data,
                params=params,
            )

            # ステータスコードによる処理
            if response.status_code == 401:
                # トークン期限切れの可能性 → リトライ
                if retry_count < max_retries:
                    logger.warning("Token expired, refreshing and retrying...")
                    self._access_token = None
                    await asyncio.sleep(1)
                    return await self._request(
                        method, endpoint,
                        json_data=json_data,
                        params=params,
                        retry_count=retry_count + 1,
                        max_retries=max_retries
                    )
                else:
                    raise M365AuthenticationError(
                        "Authentication failed after retries",
                        details={"status_code": 401}
                    )

            elif response.status_code == 403:
                error_detail = self._parse_error_response(response)
                raise M365AuthorizationError(
                    "Insufficient permissions for this operation",
                    details={"status_code": 403, "error": error_detail}
                )

            elif response.status_code == 429:
                # レート制限 → リトライ
                if retry_count < max_retries:
                    retry_after = int(response.headers.get("Retry-After", 5))
                    logger.warning(f"Rate limited, retrying after {retry_after} seconds...")
                    await asyncio.sleep(retry_after)
                    return await self._request(
                        method, endpoint,
                        json_data=json_data,
                        params=params,
                        retry_count=retry_count + 1,
                        max_retries=max_retries
                    )
                else:
                    raise M365APIError(
                        "Rate limit exceeded",
                        status_code=429,
                        details={"retry_after": response.headers.get("Retry-After")}
                    )

            elif 500 <= response.status_code < 600:
                # サーバーエラー → リトライ
                if retry_count < max_retries:
                    logger.warning(f"Server error {response.status_code}, retrying...")
                    await asyncio.sleep(2 ** retry_count)  # Exponential backoff
                    return await self._request(
                        method, endpoint,
                        json_data=json_data,
                        params=params,
                        retry_count=retry_count + 1,
                        max_retries=max_retries
                    )
                else:
                    error_detail = self._parse_error_response(response)
                    raise M365APIError(
                        f"Server error: {response.status_code}",
                        status_code=response.status_code,
                        details={"error": error_detail}
                    )

            # 成功以外のステータスコード
            response.raise_for_status()

            # 204 No Content
            if response.status_code == 204:
                return {}

            # JSONレスポンスのパース
            return response.json()

        except httpx.HTTPStatusError as e:
            error_detail = self._parse_error_response(e.response)
            raise M365APIError(
                f"Graph API error: {e.response.status_code}",
                status_code=e.response.status_code,
                details={"error": error_detail}
            ) from e

        except httpx.RequestError as e:
            raise M365APIError(
                f"Network error: {str(e)}",
                details={"error": str(e)}
            ) from e

    def _parse_error_response(self, response: httpx.Response) -> dict[str, Any]:
        """エラーレスポンスのパース"""
        try:
            return response.json()
        except Exception:
            return {"raw_response": response.text}

    # ============== 基本的なCRUD操作 ==============

    async def get(self, endpoint: str, params: Optional[dict[str, Any]] = None) -> dict[str, Any]:
        """GETリクエスト"""
        return await self._request("GET", endpoint, params=params)

    async def post(self, endpoint: str, data: dict[str, Any]) -> dict[str, Any]:
        """POSTリクエスト"""
        return await self._request("POST", endpoint, json_data=data)

    async def patch(self, endpoint: str, data: dict[str, Any]) -> dict[str, Any]:
        """PATCHリクエスト"""
        return await self._request("PATCH", endpoint, json_data=data)

    async def delete(self, endpoint: str) -> dict[str, Any]:
        """DELETEリクエスト"""
        return await self._request("DELETE", endpoint)

    # ============== ユーザー操作 ==============

    async def get_user(self, user_id: str) -> dict[str, Any]:
        """ユーザー情報取得

        Args:
            user_id: ユーザーID (UPN or Object ID)

        Returns:
            ユーザー情報
        """
        return await self.get(f"/users/{user_id}")

    async def list_users(self, select: Optional[list[str]] = None, filter_query: Optional[str] = None) -> list[dict[str, Any]]:
        """ユーザー一覧取得

        Args:
            select: 取得するフィールド一覧
            filter_query: ODataフィルタ

        Returns:
            ユーザー一覧
        """
        params = {}
        if select:
            params["$select"] = ",".join(select)
        if filter_query:
            params["$filter"] = filter_query

        response = await self.get("/users", params=params)
        return response.get("value", [])

    async def search_users(self, query: str, top: int = 10) -> list[dict[str, Any]]:
        """ユーザー検索

        Args:
            query: 検索クエリ（displayName, mail, userPrincipalNameで検索）
            top: 最大取得件数

        Returns:
            検索結果（ユーザー一覧）
        """
        filter_query = (
            f"startswith(displayName,'{query}') or "
            f"startswith(mail,'{query}') or "
            f"startswith(userPrincipalName,'{query}')"
        )

        params = {
            "$filter": filter_query,
            "$top": str(top),
            "$select": "id,userPrincipalName,displayName,mail,jobTitle,department"
        }

        response = await self.get("/users", params=params)
        return response.get("value", [])

    async def update_user(self, user_id: str, data: dict[str, Any]) -> dict[str, Any]:
        """ユーザー情報更新

        Args:
            user_id: ユーザーID
            data: 更新データ

        Returns:
            更新後のユーザー情報
        """
        await self.patch(f"/users/{user_id}", data)
        return await self.get_user(user_id)

    # ============== ライセンス操作 ==============

    async def get_user_licenses(self, user_id: str) -> list[dict[str, Any]]:
        """ユーザーのライセンス取得

        Args:
            user_id: ユーザーID

        Returns:
            ライセンス一覧
        """
        user = await self.get(f"/users/{user_id}", params={"$select": "assignedLicenses,licenseAssignmentStates"})
        return user.get("assignedLicenses", [])

    async def assign_license(self, user_id: str, sku_id: str) -> dict[str, Any]:
        """ライセンス付与

        Args:
            user_id: ユーザーID
            sku_id: ライセンスSKU ID

        Returns:
            更新後のユーザー情報
        """
        data = {
            "addLicenses": [{"skuId": sku_id}],
            "removeLicenses": []
        }
        return await self.post(f"/users/{user_id}/assignLicense", data)

    async def remove_license(self, user_id: str, sku_id: str) -> dict[str, Any]:
        """ライセンス剥奪

        Args:
            user_id: ユーザーID
            sku_id: ライセンスSKU ID

        Returns:
            更新後のユーザー情報
        """
        data = {
            "addLicenses": [],
            "removeLicenses": [sku_id]
        }
        return await self.post(f"/users/{user_id}/assignLicense", data)

    async def list_available_licenses(self) -> list[dict[str, Any]]:
        """利用可能なライセンス一覧取得

        Returns:
            ライセンスSKU一覧
        """
        response = await self.get("/subscribedSkus")
        return response.get("value", [])

    # ============== グループ操作 ==============

    async def get_group(self, group_id: str) -> dict[str, Any]:
        """グループ情報取得"""
        return await self.get(f"/groups/{group_id}")

    async def list_group_members(self, group_id: str) -> list[dict[str, Any]]:
        """グループメンバー一覧取得"""
        response = await self.get(f"/groups/{group_id}/members")
        return response.get("value", [])

    async def add_group_member(self, group_id: str, user_id: str) -> dict[str, Any]:
        """グループにメンバー追加"""
        data = {
            "@odata.id": f"{self.auth_config.graph_endpoint}/users/{user_id}"
        }
        return await self.post(f"/groups/{group_id}/members/$ref", data)

    async def remove_group_member(self, group_id: str, user_id: str) -> dict[str, Any]:
        """グループからメンバー削除"""
        return await self.delete(f"/groups/{group_id}/members/{user_id}/$ref")

    # ============== パスワード操作 ==============

    async def reset_password(self, user_id: str, new_password: str, force_change: bool = True) -> dict[str, Any]:
        """パスワードリセット

        Args:
            user_id: ユーザーID
            new_password: 新しいパスワード
            force_change: 次回ログイン時にパスワード変更を強制

        Returns:
            更新後のユーザー情報
        """
        data = {
            "passwordProfile": {
                "forceChangePasswordNextSignIn": force_change,
                "password": new_password
            }
        }
        return await self.patch(f"/users/{user_id}", data)

    # ============== 認証方法操作（MFA） ==============

    async def list_authentication_methods(self, user_id: str) -> list[dict[str, Any]]:
        """ユーザーの認証方法一覧取得"""
        response = await self.get(f"/users/{user_id}/authentication/methods")
        return response.get("value", [])

    async def delete_authentication_method(self, user_id: str, method_id: str) -> dict[str, Any]:
        """認証方法削除（MFAリセット）"""
        return await self.delete(f"/users/{user_id}/authentication/methods/{method_id}")
