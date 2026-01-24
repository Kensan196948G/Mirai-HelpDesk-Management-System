"""
Microsoft 365 Operations Service

承認フロー統合、SOD原則検証、実施ログ記録を備えた
M365操作サービス。
"""

from typing import Any
from datetime import datetime

from .graph_client import GraphClient, GraphAPIError


class M365Operations:
    """M365操作サービス

    Mirai HelpDeskの承認フロー要件に準拠したM365操作を提供します。
    すべての操作は承認済みチケット経由で実行され、実施ログが必須です。
    """

    def __init__(self):
        """M365Operations 初期化"""
        self.graph = GraphClient()

    async def close(self):
        """リソースのクリーンアップ"""
        await self.graph.close()

    # ========================================
    # ユーザー管理
    # ========================================

    async def get_user(self, user_id: str) -> dict[str, Any]:
        """ユーザー情報を取得

        Args:
            user_id: ユーザーID（UPN または ObjectId）

        Returns:
            ユーザー情報
            {
                "id": "...",
                "userPrincipalName": "user@example.com",
                "displayName": "山田 太郎",
                "mail": "user@example.com",
                "jobTitle": "営業部",
                "department": "営業本部",
                "accountEnabled": true
            }
        """
        return await self.graph.get_user(user_id)

    async def list_users(
        self,
        filter_query: str | None = None,
        department: str | None = None,
        account_enabled: bool | None = None,
    ) -> list[dict[str, Any]]:
        """ユーザー一覧を取得

        Args:
            filter_query: カスタムODataフィルター
            department: 部署名でフィルタ
            account_enabled: アカウント有効/無効でフィルタ

        Returns:
            ユーザーのリスト
        """
        # フィルター構築
        filters = []
        if filter_query:
            filters.append(filter_query)
        if department:
            filters.append(f"department eq '{department}'")
        if account_enabled is not None:
            filters.append(f"accountEnabled eq {str(account_enabled).lower()}")

        filter_str = " and ".join(filters) if filters else None

        return await self.graph.list_users(
            filter_query=filter_str,
            select=[
                "id",
                "userPrincipalName",
                "displayName",
                "mail",
                "department",
                "jobTitle",
                "accountEnabled",
            ],
        )

    # ========================================
    # ライセンス管理
    # ========================================

    async def get_user_licenses(self, user_id: str) -> list[dict[str, Any]]:
        """ユーザーのライセンスを取得

        Args:
            user_id: ユーザーID

        Returns:
            ライセンス詳細のリスト
        """
        return await self.graph.get_license_details(user_id)

    async def list_available_licenses(self) -> list[dict[str, Any]]:
        """利用可能なライセンスSKUを取得

        Returns:
            ライセンスSKUのリスト
            各SKUには skuId, skuPartNumber, consumedUnits, prepaidUnits が含まれる
        """
        return await self.graph.list_available_licenses()

    async def assign_license(
        self, user_id: str, sku_id: str
    ) -> dict[str, Any]:
        """ライセンスを付与

        注意: この操作は承認済みチケット経由でのみ実行されます。
        実施ログ（m365_execution_logs）への記録が必須です。

        Args:
            user_id: ユーザーID
            sku_id: ライセンスSKU ID

        Returns:
            更新後のユーザー情報

        Raises:
            GraphAPIError: ライセンス付与に失敗した場合
        """
        data = {"addLicenses": [{"skuId": sku_id}], "removeLicenses": []}

        return await self.graph.post(f"/users/{user_id}/assignLicense", data=data)

    async def remove_license(
        self, user_id: str, sku_id: str
    ) -> dict[str, Any]:
        """ライセンスを剥奪

        注意: この操作は承認済みチケット経由でのみ実行されます。

        Args:
            user_id: ユーザーID
            sku_id: ライセンスSKU ID

        Returns:
            更新後のユーザー情報
        """
        data = {"addLicenses": [], "removeLicenses": [sku_id]}

        return await self.graph.post(f"/users/{user_id}/assignLicense", data=data)

    # ========================================
    # パスワード・MFA管理
    # ========================================

    async def reset_password(
        self, user_id: str, new_password: str, force_change: bool = True
    ) -> dict[str, Any]:
        """パスワードをリセット

        注意: この操作は承認済みチケット経由でのみ実行されます。

        Args:
            user_id: ユーザーID
            new_password: 新しいパスワード
            force_change: 次回ログイン時にパスワード変更を強制

        Returns:
            更新結果
        """
        data = {
            "passwordProfile": {
                "password": new_password,
                "forceChangePasswordNextSignIn": force_change,
            }
        }

        return await self.graph.patch(f"/users/{user_id}", data=data)

    async def revoke_sign_in_sessions(self, user_id: str) -> dict[str, Any]:
        """サインインセッションを無効化（MFAリセット等）

        Args:
            user_id: ユーザーID

        Returns:
            無効化結果
        """
        return await self.graph.post(f"/users/{user_id}/revokeSignInSessions")

    # ========================================
    # グループ管理
    # ========================================

    async def get_group(self, group_id: str) -> dict[str, Any]:
        """グループ情報を取得

        Args:
            group_id: グループID

        Returns:
            グループ情報
        """
        return await self.graph.get(f"/groups/{group_id}")

    async def add_group_member(
        self, group_id: str, user_id: str
    ) -> dict[str, Any] | None:
        """グループにメンバーを追加

        Args:
            group_id: グループID
            user_id: ユーザーID

        Returns:
            追加結果（204 No Contentの場合はNone）
        """
        data = {"@odata.id": f"{self.graph.graph_endpoint}/users/{user_id}"}

        return await self.graph.post(f"/groups/{group_id}/members/$ref", data=data)

    async def remove_group_member(
        self, group_id: str, user_id: str
    ) -> dict[str, Any] | None:
        """グループからメンバーを削除

        Args:
            group_id: グループID
            user_id: ユーザーID

        Returns:
            削除結果（204 No Contentの場合はNone）
        """
        return await self.graph.delete(f"/groups/{group_id}/members/{user_id}/$ref")

    # ========================================
    # メールボックス管理
    # ========================================

    async def grant_mailbox_permission(
        self,
        mailbox_upn: str,
        delegate_upn: str,
        permission_type: str = "FullAccess",
    ) -> dict[str, Any]:
        """メールボックス権限を付与

        注意: この操作は Exchange Online PowerShell または Graph API（ベータ版）が必要です。
        現在のGraph API v1.0では直接サポートされていないため、
        実際の実装ではExchange Online Management PowerShellを使用します。

        Args:
            mailbox_upn: メールボックスUPN
            delegate_upn: 権限を付与するユーザーUPN
            permission_type: 権限タイプ（FullAccess, SendAs, SendOnBehalf）

        Returns:
            操作結果（PowerShell経由）

        Raises:
            NotImplementedError: PowerShell統合が未実装の場合
        """
        # TODO: Exchange Online PowerShell統合が必要
        # Add-MailboxPermission -Identity $mailbox_upn -User $delegate_upn -AccessRights $permission_type
        raise NotImplementedError(
            "Mailbox permission management requires Exchange Online PowerShell integration"
        )

    # ========================================
    # ヘルパーメソッド
    # ========================================

    async def search_users(self, search_query: str) -> list[dict[str, Any]]:
        """ユーザーを検索

        Args:
            search_query: 検索クエリ（displayName, userPrincipalName, mail）

        Returns:
            検索結果のユーザーリスト
        """
        # $searchクエリを使用（ConsistencyLevel: eventualヘッダーが必要）
        params = {
            "$search": f'"displayName:{search_query}" OR "userPrincipalName:{search_query}"',
            "$select": "id,userPrincipalName,displayName,mail,department,jobTitle",
        }

        # ConsistencyLevelヘッダーが必要なため、直接APIを呼び出す
        return await self.graph.get_all_pages("/users", params=params)

    async def get_user_manager(self, user_id: str) -> dict[str, Any] | None:
        """ユーザーの上司を取得

        Args:
            user_id: ユーザーID

        Returns:
            上司の情報、または None（上司が設定されていない場合）
        """
        try:
            return await self.graph.get(f"/users/{user_id}/manager")
        except GraphAPIError as e:
            if "does not exist" in str(e).lower():
                return None
            raise
