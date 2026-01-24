"""
Microsoft Graph API Client

非対話型認証によるMicrosoft Graph API統合クライアント。
トークンキャッシュ、自動リトライ、エラーハンドリングを提供します。
"""

import asyncio
from datetime import datetime, timedelta
from typing import Any
import httpx
from msal import ConfidentialClientApplication

from app.config import settings


class GraphAPIError(Exception):
    """Graph API エラー"""

    pass


class GraphAuthError(GraphAPIError):
    """Graph API 認証エラー"""

    pass


class GraphClient:
    """Microsoft Graph API クライアント

    クライアントシークレット方式の非対話型認証を使用して
    Microsoft Graph APIと通信します。
    """

    def __init__(self):
        """GraphClient 初期化"""
        self.tenant_id = settings.MS_TENANT_ID
        self.client_id = settings.MS_CLIENT_ID
        self.client_secret = settings.MS_CLIENT_SECRET
        self.authority = settings.MS_AUTHORITY
        self.graph_endpoint = settings.MS_GRAPH_ENDPOINT
        self.scopes = [settings.MS_SCOPES]

        # MSALアプリケーション
        self.msal_app = ConfidentialClientApplication(
            self.client_id,
            authority=self.authority,
            client_credential=self.client_secret,
        )

        # トークンキャッシュ
        self._token: str | None = None
        self._token_expires_at: datetime | None = None

        # HTTPクライアント（非同期）
        self._http_client: httpx.AsyncClient | None = None

    async def _get_http_client(self) -> httpx.AsyncClient:
        """非同期HTTPクライアントを取得"""
        if self._http_client is None:
            self._http_client = httpx.AsyncClient(timeout=300.0)
        return self._http_client

    async def close(self):
        """HTTPクライアントをクローズ"""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None

    async def acquire_token(self, force_refresh: bool = False) -> str:
        """アクセストークンを取得

        キャッシュされたトークンを返すか、新しいトークンを取得します。

        Args:
            force_refresh: 強制的に新しいトークンを取得

        Returns:
            アクセストークン

        Raises:
            GraphAuthError: 認証に失敗した場合
        """
        # キャッシュチェック
        if (
            not force_refresh
            and self._token
            and self._token_expires_at
            and datetime.now() < self._token_expires_at
        ):
            return self._token

        # 新しいトークンを取得（同期処理）
        try:
            result = await asyncio.get_event_loop().run_in_executor(
                None, self.msal_app.acquire_token_for_client, self.scopes
            )

            if "access_token" in result:
                self._token = result["access_token"]
                # トークンの有効期限を設定（5分前にリフレッシュ）
                expires_in = result.get("expires_in", 3600)
                self._token_expires_at = datetime.now() + timedelta(
                    seconds=expires_in - 300
                )
                return self._token
            else:
                error_desc = result.get("error_description", "Unknown error")
                raise GraphAuthError(f"Failed to acquire token: {error_desc}")

        except Exception as e:
            raise GraphAuthError(f"Authentication error: {str(e)}")

    async def get(
        self, endpoint: str, params: dict[str, Any] | None = None
    ) -> dict[str, Any]:
        """GETリクエストを実行

        Args:
            endpoint: APIエンドポイント（例: /users, /groups/{id}）
            params: クエリパラメータ

        Returns:
            APIレスポンス（JSON）

        Raises:
            GraphAPIError: APIエラーが発生した場合
        """
        return await self._request("GET", endpoint, params=params)

    async def post(
        self,
        endpoint: str,
        data: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """POSTリクエストを実行

        Args:
            endpoint: APIエンドポイント
            data: リクエストボディ（JSON）
            params: クエリパラメータ

        Returns:
            APIレスポンス（JSON）

        Raises:
            GraphAPIError: APIエラーが発生した場合
        """
        return await self._request("POST", endpoint, data=data, params=params)

    async def patch(
        self,
        endpoint: str,
        data: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
    ) -> dict[str, Any]:
        """PATCHリクエストを実行

        Args:
            endpoint: APIエンドポイント
            data: リクエストボディ（JSON）
            params: クエリパラメータ

        Returns:
            APIレスポンス（JSON）

        Raises:
            GraphAPIError: APIエラーが発生した場合
        """
        return await self._request("PATCH", endpoint, data=data, params=params)

    async def delete(
        self, endpoint: str, params: dict[str, Any] | None = None
    ) -> dict[str, Any] | None:
        """DELETEリクエストを実行

        Args:
            endpoint: APIエンドポイント
            params: クエリパラメータ

        Returns:
            APIレスポンス（JSON）、または None（204 No Content）

        Raises:
            GraphAPIError: APIエラーが発生した場合
        """
        return await self._request("DELETE", endpoint, params=params)

    async def _request(
        self,
        method: str,
        endpoint: str,
        data: dict[str, Any] | None = None,
        params: dict[str, Any] | None = None,
        retry_count: int = 0,
    ) -> dict[str, Any] | None:
        """HTTPリクエストを実行（内部メソッド）

        自動リトライ、エラーハンドリング、トークンリフレッシュを実装。

        Args:
            method: HTTPメソッド
            endpoint: APIエンドポイント
            data: リクエストボディ
            params: クエリパラメータ
            retry_count: リトライ回数

        Returns:
            APIレスポンス（JSON）

        Raises:
            GraphAPIError: APIエラーが発生した場合
        """
        # トークン取得
        token = await self.acquire_token()

        # エンドポイントのURL構築
        if endpoint.startswith("http"):
            url = endpoint
        else:
            # 先頭の / を削除
            endpoint = endpoint.lstrip("/")
            url = f"{self.graph_endpoint}/{endpoint}"

        # ヘッダー
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        }

        # HTTPクライアント取得
        client = await self._get_http_client()

        try:
            # リクエスト実行
            if method == "GET":
                response = await client.get(url, headers=headers, params=params)
            elif method == "POST":
                response = await client.post(
                    url, headers=headers, json=data, params=params
                )
            elif method == "PATCH":
                response = await client.patch(
                    url, headers=headers, json=data, params=params
                )
            elif method == "DELETE":
                response = await client.delete(url, headers=headers, params=params)
            else:
                raise GraphAPIError(f"Unsupported HTTP method: {method}")

            # ステータスコードチェック
            if response.status_code == 204:
                # No Content
                return None

            if response.status_code == 401:
                # 認証エラー - トークンリフレッシュして再試行
                if retry_count < 2:
                    self._token = None
                    return await self._request(
                        method, endpoint, data, params, retry_count + 1
                    )
                else:
                    raise GraphAuthError("Authentication failed after retry")

            if response.status_code == 429:
                # レート制限 - Retry-Afterヘッダーを確認して待機
                retry_after = int(response.headers.get("Retry-After", 60))
                if retry_count < 3:
                    await asyncio.sleep(retry_after)
                    return await self._request(
                        method, endpoint, data, params, retry_count + 1
                    )
                else:
                    raise GraphAPIError("Rate limit exceeded after retries")

            if response.status_code >= 400:
                # エラーレスポンス
                try:
                    error_data = response.json()
                    error_message = error_data.get("error", {}).get(
                        "message", response.text
                    )
                except Exception:
                    error_message = response.text

                raise GraphAPIError(
                    f"Graph API error ({response.status_code}): {error_message}"
                )

            # 成功レスポンス
            if response.text:
                return response.json()
            else:
                return {}

        except httpx.TimeoutException:
            raise GraphAPIError("Request timeout")
        except httpx.RequestError as e:
            raise GraphAPIError(f"Request error: {str(e)}")

    async def get_all_pages(
        self, endpoint: str, params: dict[str, Any] | None = None
    ) -> list[dict[str, Any]]:
        """ページネーション対応の全データ取得

        @odata.nextLink を追跡して全ページのデータを取得します。

        Args:
            endpoint: APIエンドポイント
            params: クエリパラメータ

        Returns:
            全ページのデータリスト

        Raises:
            GraphAPIError: APIエラーが発生した場合
        """
        all_items: list[dict[str, Any]] = []
        next_link = None
        first_request = True

        while first_request or next_link:
            if first_request:
                response = await self.get(endpoint, params=params)
                first_request = False
            else:
                response = await self.get(next_link)

            # データを追加
            if "value" in response:
                all_items.extend(response["value"])

            # 次のページリンクを取得
            next_link = response.get("@odata.nextLink")

        return all_items

    async def get_user(self, user_id: str) -> dict[str, Any]:
        """ユーザー情報を取得

        Args:
            user_id: ユーザーID（UPN、ObjectId、またはuserPrincipalName）

        Returns:
            ユーザー情報
        """
        return await self.get(f"/users/{user_id}")

    async def list_users(
        self, filter_query: str | None = None, select: list[str] | None = None
    ) -> list[dict[str, Any]]:
        """ユーザー一覧を取得

        Args:
            filter_query: ODataフィルタークエリ
            select: 取得するフィールドのリスト

        Returns:
            ユーザーのリスト
        """
        params = {}
        if filter_query:
            params["$filter"] = filter_query
        if select:
            params["$select"] = ",".join(select)

        return await self.get_all_pages("/users", params=params)

    async def get_license_details(self, user_id: str) -> list[dict[str, Any]]:
        """ユーザーのライセンス詳細を取得

        Args:
            user_id: ユーザーID

        Returns:
            ライセンス詳細のリスト
        """
        response = await self.get(f"/users/{user_id}/licenseDetails")
        return response.get("value", [])

    async def list_available_licenses(self) -> list[dict[str, Any]]:
        """利用可能なライセンス一覧を取得

        Returns:
            利用可能なライセンスSKUのリスト
        """
        response = await self.get("/subscribedSkus")
        return response.get("value", [])
