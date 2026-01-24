"""
Microsoft 365 高レベル操作

M365タスクタイプに対応した高レベルな操作を提供します。
GraphClientをラップし、ビジネスロジックを実装します。
"""

import logging
import secrets
import string
from typing import Any, Optional

from .graph_client import GraphClient
from .auth import M365AuthConfig
from .exceptions import M365ValidationError, M365APIError

logger = logging.getLogger(__name__)


class M365Operations:
    """Microsoft 365 操作クラス

    M365タスクの各種操作を実装します。
    すべての操作は承認とログ記録が前提です。
    """

    def __init__(self, auth_config: Optional[M365AuthConfig] = None):
        """M365Operationsの初期化

        Args:
            auth_config: 認証設定（省略時は設定ファイルから取得）
        """
        self.auth_config = auth_config or M365AuthConfig.from_settings()
        self._client: Optional[GraphClient] = None

    async def __aenter__(self):
        """非同期コンテキストマネージャー入口"""
        self._client = GraphClient(self.auth_config)
        await self._client.__aenter__()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """非同期コンテキストマネージャー出口"""
        if self._client:
            await self._client.__aexit__(exc_type, exc_val, exc_tb)

    def _get_client(self) -> GraphClient:
        """GraphClientインスタンス取得"""
        if not self._client:
            self._client = GraphClient(self.auth_config)
        return self._client

    # ============== ユーザー検索 ==============

    async def search_users(self, query: str, top: int = 10) -> list[dict[str, Any]]:
        """ユーザー検索

        Args:
            query: 検索クエリ
            top: 最大取得件数

        Returns:
            ユーザー一覧
        """
        client = self._get_client()
        return await client.search_users(query, top)

    async def get_user(self, user_id: str) -> dict[str, Any]:
        """ユーザー情報取得

        Args:
            user_id: ユーザーID (UPN or Object ID)

        Returns:
            ユーザー情報
        """
        client = self._get_client()
        return await client.get_user(user_id)

    # ============== ライセンス操作 ==============

    async def list_available_licenses(self) -> list[dict[str, Any]]:
        """利用可能なライセンス一覧取得

        Returns:
            ライセンス情報（SKU ID、製品名、利用状況含む）
        """
        client = self._get_client()
        skus = await client.list_available_licenses()

        # 必要な情報を整形して返す
        return [
            {
                "sku_id": sku["skuId"],
                "sku_part_number": sku["skuPartNumber"],
                "consumed_units": sku.get("consumedUnits", 0),
                "enabled_units": sku.get("prepaidUnits", {}).get("enabled", 0),
                "available_units": (
                    sku.get("prepaidUnits", {}).get("enabled", 0)
                    - sku.get("consumedUnits", 0)
                ),
            }
            for sku in skus
        ]

    async def get_user_licenses(self, user_id: str) -> list[dict[str, Any]]:
        """ユーザーのライセンス取得

        Args:
            user_id: ユーザーID

        Returns:
            ライセンス一覧
        """
        client = self._get_client()
        return await client.get_user_licenses(user_id)

    async def assign_license(
        self,
        user_id: str,
        sku_id: str,
        operator_comment: Optional[str] = None
    ) -> dict[str, Any]:
        """ライセンス付与

        Args:
            user_id: ユーザーID
            sku_id: ライセンスSKU ID
            operator_comment: オペレータコメント（監査用）

        Returns:
            実行結果
        """
        if not user_id or not sku_id:
            raise M365ValidationError("user_id and sku_id are required")

        client = self._get_client()

        # 現在のライセンスを確認
        current_licenses = await client.get_user_licenses(user_id)
        already_assigned = any(lic.get("skuId") == sku_id for lic in current_licenses)

        if already_assigned:
            logger.warning(f"License {sku_id} already assigned to user {user_id}")
            return {
                "status": "success",
                "message": "License already assigned",
                "user_id": user_id,
                "sku_id": sku_id,
            }

        # ライセンス付与実行
        result = await client.assign_license(user_id, sku_id)

        logger.info(f"License assigned: user={user_id}, sku={sku_id}, comment={operator_comment}")

        return {
            "status": "success",
            "message": "License assigned successfully",
            "user_id": user_id,
            "sku_id": sku_id,
            "graph_response": result,
        }

    async def remove_license(
        self,
        user_id: str,
        sku_id: str,
        operator_comment: Optional[str] = None
    ) -> dict[str, Any]:
        """ライセンス剥奪

        Args:
            user_id: ユーザーID
            sku_id: ライセンスSKU ID
            operator_comment: オペレータコメント（監査用）

        Returns:
            実行結果
        """
        if not user_id or not sku_id:
            raise M365ValidationError("user_id and sku_id are required")

        client = self._get_client()

        # ライセンス剥奪実行
        result = await client.remove_license(user_id, sku_id)

        logger.info(f"License removed: user={user_id}, sku={sku_id}, comment={operator_comment}")

        return {
            "status": "success",
            "message": "License removed successfully",
            "user_id": user_id,
            "sku_id": sku_id,
            "graph_response": result,
        }

    # ============== パスワード操作 ==============

    def generate_temporary_password(self, length: int = 16) -> str:
        """一時パスワード生成

        Args:
            length: パスワード長

        Returns:
            ランダムな一時パスワード
        """
        alphabet = string.ascii_letters + string.digits + "!@#$%^&*"
        password = "".join(secrets.choice(alphabet) for _ in range(length))
        return password

    async def reset_password(
        self,
        user_id: str,
        new_password: Optional[str] = None,
        force_change: bool = True,
        operator_comment: Optional[str] = None
    ) -> dict[str, Any]:
        """パスワードリセット

        Args:
            user_id: ユーザーID
            new_password: 新しいパスワード（省略時は自動生成）
            force_change: 次回ログイン時にパスワード変更を強制
            operator_comment: オペレータコメント（監査用）

        Returns:
            実行結果（パスワード含む）
        """
        if not user_id:
            raise M365ValidationError("user_id is required")

        if not new_password:
            new_password = self.generate_temporary_password()

        client = self._get_client()
        result = await client.reset_password(user_id, new_password, force_change)

        logger.info(f"Password reset: user={user_id}, force_change={force_change}, comment={operator_comment}")

        return {
            "status": "success",
            "message": "Password reset successfully",
            "user_id": user_id,
            "temporary_password": new_password,
            "force_change_on_next_login": force_change,
            "graph_response": result,
        }

    # ============== MFA操作 ==============

    async def reset_mfa(
        self,
        user_id: str,
        operator_comment: Optional[str] = None
    ) -> dict[str, Any]:
        """MFAリセット

        ユーザーの全認証方法を削除します。

        Args:
            user_id: ユーザーID
            operator_comment: オペレータコメント（監査用）

        Returns:
            実行結果
        """
        if not user_id:
            raise M365ValidationError("user_id is required")

        client = self._get_client()

        # 現在の認証方法を取得
        methods = await client.list_authentication_methods(user_id)

        deleted_methods = []
        for method in methods:
            method_id = method.get("id")
            method_type = method.get("@odata.type", "unknown")

            # パスワードは削除しない
            if "password" in method_type.lower():
                continue

            try:
                await client.delete_authentication_method(user_id, method_id)
                deleted_methods.append(method_type)
                logger.info(f"Deleted authentication method: {method_type} for user {user_id}")
            except M365APIError as e:
                logger.warning(f"Failed to delete method {method_type}: {e}")

        logger.info(f"MFA reset: user={user_id}, methods_deleted={len(deleted_methods)}, comment={operator_comment}")

        return {
            "status": "success",
            "message": "MFA reset successfully",
            "user_id": user_id,
            "deleted_methods": deleted_methods,
        }

    # ============== グループ操作 ==============

    async def add_user_to_group(
        self,
        group_id: str,
        user_id: str,
        operator_comment: Optional[str] = None
    ) -> dict[str, Any]:
        """グループにユーザー追加

        Args:
            group_id: グループID
            user_id: ユーザーID
            operator_comment: オペレータコメント（監査用）

        Returns:
            実行結果
        """
        if not group_id or not user_id:
            raise M365ValidationError("group_id and user_id are required")

        client = self._get_client()

        # グループ存在確認
        await client.get_group(group_id)

        # メンバー追加
        result = await client.add_group_member(group_id, user_id)

        logger.info(f"User added to group: group={group_id}, user={user_id}, comment={operator_comment}")

        return {
            "status": "success",
            "message": "User added to group successfully",
            "group_id": group_id,
            "user_id": user_id,
            "graph_response": result,
        }

    async def remove_user_from_group(
        self,
        group_id: str,
        user_id: str,
        operator_comment: Optional[str] = None
    ) -> dict[str, Any]:
        """グループからユーザー削除

        Args:
            group_id: グループID
            user_id: ユーザーID
            operator_comment: オペレータコメント（監査用）

        Returns:
            実行結果
        """
        if not group_id or not user_id:
            raise M365ValidationError("group_id and user_id are required")

        client = self._get_client()

        # メンバー削除
        result = await client.remove_group_member(group_id, user_id)

        logger.info(f"User removed from group: group={group_id}, user={user_id}, comment={operator_comment}")

        return {
            "status": "success",
            "message": "User removed from group successfully",
            "group_id": group_id,
            "user_id": user_id,
            "graph_response": result,
        }

    async def list_group_members(self, group_id: str) -> list[dict[str, Any]]:
        """グループメンバー一覧取得

        Args:
            group_id: グループID

        Returns:
            メンバー一覧
        """
        client = self._get_client()
        return await client.list_group_members(group_id)

    # ============== その他のユーティリティ ==============

    async def validate_upn(self, upn: str) -> bool:
        """UPN（User Principal Name）の検証

        Args:
            upn: ユーザープリンシパル名

        Returns:
            有効な場合True
        """
        try:
            client = self._get_client()
            await client.get_user(upn)
            return True
        except M365APIError:
            return False

    async def get_operation_summary(self, task_type: str, target_upn: str) -> dict[str, Any]:
        """操作サマリー取得

        タスク実行前の確認用情報を取得します。

        Args:
            task_type: タスクタイプ
            target_upn: 対象ユーザーUPN

        Returns:
            サマリー情報
        """
        client = self._get_client()

        try:
            user = await client.get_user(target_upn)

            summary = {
                "user_id": user.get("id"),
                "upn": user.get("userPrincipalName"),
                "display_name": user.get("displayName"),
                "mail": user.get("mail"),
                "job_title": user.get("jobTitle"),
                "department": user.get("department"),
                "account_enabled": user.get("accountEnabled"),
            }

            # タスクタイプに応じた追加情報
            if "license" in task_type.lower():
                licenses = await client.get_user_licenses(target_upn)
                summary["current_licenses"] = licenses

            return summary

        except M365APIError as e:
            logger.error(f"Failed to get operation summary: {e}")
            raise
