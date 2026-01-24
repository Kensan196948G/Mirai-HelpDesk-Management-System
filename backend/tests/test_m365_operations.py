"""
Test M365 Operations

Microsoft 365操作のテスト:
- ライセンス管理
- パスワードリセット
- MFAリセット
- グループ管理
- エラーハンドリング
"""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from app.m365.operations import M365Operations
from app.m365.exceptions import M365ValidationError, M365APIError


@pytest.mark.m365
class TestM365OperationsInit:
    """M365Operations 初期化のテスト"""

    def test_init_with_default_config(self):
        """デフォルト設定で初期化できることを確認"""
        with patch('app.m365.operations.M365AuthConfig.from_settings') as mock_settings:
            mock_settings.return_value = MagicMock()
            ops = M365Operations()
            assert ops.auth_config is not None

    def test_init_with_custom_config(self):
        """カスタム設定で初期化できることを確認"""
        mock_config = MagicMock()
        ops = M365Operations(auth_config=mock_config)
        assert ops.auth_config == mock_config


@pytest.mark.m365
class TestUserSearch:
    """ユーザー検索のテスト"""

    @pytest.mark.asyncio
    async def test_search_users(self, mock_m365_operations, mock_graph_client):
        """ユーザー検索が正しく動作することを確認"""
        mock_graph_client.search_users.return_value = [
            {"id": "1", "userPrincipalName": "user1@example.com", "displayName": "User 1"},
            {"id": "2", "userPrincipalName": "user2@example.com", "displayName": "User 2"},
        ]

        ops = mock_m365_operations()
        result = await ops.search_users("test", top=10)

        assert len(result) == 2
        assert result[0]["userPrincipalName"] == "user1@example.com"
        mock_graph_client.search_users.assert_called_once_with("test", 10)

    @pytest.mark.asyncio
    async def test_get_user(self, mock_m365_operations, mock_graph_client):
        """ユーザー情報取得が正しく動作することを確認"""
        ops = mock_m365_operations()
        result = await ops.get_user("test@example.com")

        assert result["userPrincipalName"] == "test@example.com"
        assert result["displayName"] == "Test User"
        mock_graph_client.get_user.assert_called_once_with("test@example.com")


@pytest.mark.m365
class TestLicenseOperations:
    """ライセンス操作のテスト"""

    @pytest.mark.asyncio
    async def test_list_available_licenses(self, mock_m365_operations, mock_graph_client):
        """利用可能なライセンス一覧取得が正しく動作することを確認"""
        ops = mock_m365_operations()
        result = await ops.list_available_licenses()

        assert len(result) == 1
        assert result[0]["sku_part_number"] == "ENTERPRISEPACK"
        assert result[0]["available_units"] == 40  # 50 - 10
        mock_graph_client.list_available_licenses.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_user_licenses(self, mock_m365_operations, mock_graph_client):
        """ユーザーライセンス取得が正しく動作することを確認"""
        mock_graph_client.get_user_licenses.return_value = [
            {"skuId": "sku-1", "skuPartNumber": "ENTERPRISEPACK"}
        ]

        ops = mock_m365_operations()
        result = await ops.get_user_licenses("test@example.com")

        assert len(result) == 1
        assert result[0]["skuPartNumber"] == "ENTERPRISEPACK"
        mock_graph_client.get_user_licenses.assert_called_once_with("test@example.com")

    @pytest.mark.asyncio
    async def test_assign_license_success(self, mock_m365_operations, mock_graph_client):
        """ライセンス付与が正しく動作することを確認"""
        mock_graph_client.get_user_licenses.return_value = []

        ops = mock_m365_operations()
        result = await ops.assign_license("test@example.com", "sku-1", "Test comment")

        assert result["status"] == "success"
        assert result["user_id"] == "test@example.com"
        assert result["sku_id"] == "sku-1"
        mock_graph_client.assign_license.assert_called_once_with("test@example.com", "sku-1")

    @pytest.mark.asyncio
    async def test_assign_license_already_assigned(self, mock_m365_operations, mock_graph_client):
        """既に付与済みのライセンスを付与しようとした場合の動作を確認"""
        mock_graph_client.get_user_licenses.return_value = [
            {"skuId": "sku-1", "skuPartNumber": "ENTERPRISEPACK"}
        ]

        ops = mock_m365_operations()
        result = await ops.assign_license("test@example.com", "sku-1")

        assert result["status"] == "success"
        assert result["message"] == "License already assigned"
        # assign_license は呼ばれないはず
        mock_graph_client.assign_license.assert_not_called()

    @pytest.mark.asyncio
    async def test_assign_license_validation_error(self, mock_m365_operations):
        """ライセンス付与時のバリデーションエラーを確認"""
        ops = mock_m365_operations()

        with pytest.raises(M365ValidationError):
            await ops.assign_license("", "sku-1")

        with pytest.raises(M365ValidationError):
            await ops.assign_license("test@example.com", "")

    @pytest.mark.asyncio
    async def test_remove_license_success(self, mock_m365_operations, mock_graph_client):
        """ライセンス剥奪が正しく動作することを確認"""
        ops = mock_m365_operations()
        result = await ops.remove_license("test@example.com", "sku-1", "Remove comment")

        assert result["status"] == "success"
        assert result["message"] == "License removed successfully"
        assert result["user_id"] == "test@example.com"
        assert result["sku_id"] == "sku-1"
        mock_graph_client.remove_license.assert_called_once_with("test@example.com", "sku-1")

    @pytest.mark.asyncio
    async def test_remove_license_validation_error(self, mock_m365_operations):
        """ライセンス剥奪時のバリデーションエラーを確認"""
        ops = mock_m365_operations()

        with pytest.raises(M365ValidationError):
            await ops.remove_license("", "sku-1")

        with pytest.raises(M365ValidationError):
            await ops.remove_license("test@example.com", "")


@pytest.mark.m365
class TestPasswordOperations:
    """パスワード操作のテスト"""

    def test_generate_temporary_password(self, mock_m365_operations):
        """一時パスワード生成が正しく動作することを確認"""
        ops = mock_m365_operations()
        password = ops.generate_temporary_password(16)

        assert len(password) == 16
        assert all(c.isalnum() or c in "!@#$%^&*" for c in password)

    def test_generate_temporary_password_custom_length(self, mock_m365_operations):
        """カスタム長の一時パスワード生成を確認"""
        ops = mock_m365_operations()
        password = ops.generate_temporary_password(24)

        assert len(password) == 24

    @pytest.mark.asyncio
    async def test_reset_password_with_custom_password(self, mock_m365_operations, mock_graph_client):
        """カスタムパスワードでのパスワードリセットを確認"""
        ops = mock_m365_operations()
        result = await ops.reset_password(
            "test@example.com",
            new_password="CustomPass123!",
            force_change=True,
            operator_comment="Password reset request"
        )

        assert result["status"] == "success"
        assert result["user_id"] == "test@example.com"
        assert result["temporary_password"] == "CustomPass123!"
        assert result["force_change_on_next_login"] is True
        mock_graph_client.reset_password.assert_called_once_with(
            "test@example.com", "CustomPass123!", True
        )

    @pytest.mark.asyncio
    async def test_reset_password_auto_generate(self, mock_m365_operations, mock_graph_client):
        """自動生成パスワードでのパスワードリセットを確認"""
        ops = mock_m365_operations()
        result = await ops.reset_password("test@example.com")

        assert result["status"] == "success"
        assert result["user_id"] == "test@example.com"
        assert "temporary_password" in result
        assert len(result["temporary_password"]) == 16
        mock_graph_client.reset_password.assert_called_once()

    @pytest.mark.asyncio
    async def test_reset_password_validation_error(self, mock_m365_operations):
        """パスワードリセット時のバリデーションエラーを確認"""
        ops = mock_m365_operations()

        with pytest.raises(M365ValidationError):
            await ops.reset_password("")


@pytest.mark.m365
class TestMFAOperations:
    """MFA操作のテスト"""

    @pytest.mark.asyncio
    async def test_reset_mfa_success(self, mock_m365_operations, mock_graph_client):
        """MFAリセットが正しく動作することを確認"""
        mock_graph_client.list_authentication_methods.return_value = [
            {"id": "method-1", "@odata.type": "#microsoft.graph.phoneAuthenticationMethod"},
            {"id": "method-2", "@odata.type": "#microsoft.graph.emailAuthenticationMethod"},
            {"id": "method-3", "@odata.type": "#microsoft.graph.passwordAuthenticationMethod"},
        ]

        ops = mock_m365_operations()
        result = await ops.reset_mfa("test@example.com", "MFA reset request")

        assert result["status"] == "success"
        assert result["user_id"] == "test@example.com"
        # パスワード以外のメソッドが削除される
        assert "#microsoft.graph.phoneAuthenticationMethod" in result["deleted_methods"]
        assert "#microsoft.graph.emailAuthenticationMethod" in result["deleted_methods"]
        # パスワードメソッドは削除されない
        assert "#microsoft.graph.passwordAuthenticationMethod" not in result["deleted_methods"]

    @pytest.mark.asyncio
    async def test_reset_mfa_no_methods(self, mock_m365_operations, mock_graph_client):
        """認証方法がない場合のMFAリセットを確認"""
        mock_graph_client.list_authentication_methods.return_value = []

        ops = mock_m365_operations()
        result = await ops.reset_mfa("test@example.com")

        assert result["status"] == "success"
        assert len(result["deleted_methods"]) == 0

    @pytest.mark.asyncio
    async def test_reset_mfa_validation_error(self, mock_m365_operations):
        """MFAリセット時のバリデーションエラーを確認"""
        ops = mock_m365_operations()

        with pytest.raises(M365ValidationError):
            await ops.reset_mfa("")


@pytest.mark.m365
class TestGroupOperations:
    """グループ操作のテスト"""

    @pytest.mark.asyncio
    async def test_add_user_to_group_success(self, mock_m365_operations, mock_graph_client):
        """グループへのユーザー追加が正しく動作することを確認"""
        ops = mock_m365_operations()
        result = await ops.add_user_to_group("group-1", "user-1", "Add to group")

        assert result["status"] == "success"
        assert result["group_id"] == "group-1"
        assert result["user_id"] == "user-1"
        mock_graph_client.get_group.assert_called_once_with("group-1")
        mock_graph_client.add_group_member.assert_called_once_with("group-1", "user-1")

    @pytest.mark.asyncio
    async def test_add_user_to_group_validation_error(self, mock_m365_operations):
        """グループへのユーザー追加時のバリデーションエラーを確認"""
        ops = mock_m365_operations()

        with pytest.raises(M365ValidationError):
            await ops.add_user_to_group("", "user-1")

        with pytest.raises(M365ValidationError):
            await ops.add_user_to_group("group-1", "")

    @pytest.mark.asyncio
    async def test_remove_user_from_group_success(self, mock_m365_operations, mock_graph_client):
        """グループからのユーザー削除が正しく動作することを確認"""
        ops = mock_m365_operations()
        result = await ops.remove_user_from_group("group-1", "user-1", "Remove from group")

        assert result["status"] == "success"
        assert result["group_id"] == "group-1"
        assert result["user_id"] == "user-1"
        mock_graph_client.remove_group_member.assert_called_once_with("group-1", "user-1")

    @pytest.mark.asyncio
    async def test_remove_user_from_group_validation_error(self, mock_m365_operations):
        """グループからのユーザー削除時のバリデーションエラーを確認"""
        ops = mock_m365_operations()

        with pytest.raises(M365ValidationError):
            await ops.remove_user_from_group("", "user-1")

        with pytest.raises(M365ValidationError):
            await ops.remove_user_from_group("group-1", "")

    @pytest.mark.asyncio
    async def test_list_group_members(self, mock_m365_operations, mock_graph_client):
        """グループメンバー一覧取得が正しく動作することを確認"""
        mock_graph_client.list_group_members.return_value = [
            {"id": "user-1", "displayName": "User 1"},
            {"id": "user-2", "displayName": "User 2"},
        ]

        ops = mock_m365_operations()
        result = await ops.list_group_members("group-1")

        assert len(result) == 2
        assert result[0]["id"] == "user-1"
        mock_graph_client.list_group_members.assert_called_once_with("group-1")


@pytest.mark.m365
class TestUtilityOperations:
    """ユーティリティ操作のテスト"""

    @pytest.mark.asyncio
    async def test_validate_upn_valid(self, mock_m365_operations, mock_graph_client):
        """有効なUPNの検証を確認"""
        ops = mock_m365_operations()
        result = await ops.validate_upn("test@example.com")

        assert result is True
        mock_graph_client.get_user.assert_called_once_with("test@example.com")

    @pytest.mark.asyncio
    async def test_validate_upn_invalid(self, mock_m365_operations, mock_graph_client):
        """無効なUPNの検証を確認"""
        mock_graph_client.get_user.side_effect = M365APIError("User not found")

        ops = mock_m365_operations()
        result = await ops.validate_upn("invalid@example.com")

        assert result is False

    @pytest.mark.asyncio
    async def test_get_operation_summary(self, mock_m365_operations, mock_graph_client):
        """操作サマリー取得が正しく動作することを確認"""
        ops = mock_m365_operations()
        result = await ops.get_operation_summary("license_assign", "test@example.com")

        assert result["upn"] == "test@example.com"
        assert result["display_name"] == "Test User"
        assert "current_licenses" in result
        mock_graph_client.get_user.assert_called_once_with("test@example.com")
        mock_graph_client.get_user_licenses.assert_called_once_with("test@example.com")

    @pytest.mark.asyncio
    async def test_get_operation_summary_non_license(self, mock_m365_operations, mock_graph_client):
        """ライセンス以外の操作サマリー取得を確認"""
        ops = mock_m365_operations()
        result = await ops.get_operation_summary("password_reset", "test@example.com")

        assert result["upn"] == "test@example.com"
        assert result["display_name"] == "Test User"
        # ライセンス情報は取得されない
        assert "current_licenses" not in result
        mock_graph_client.get_user_licenses.assert_not_called()

    @pytest.mark.asyncio
    async def test_get_operation_summary_error(self, mock_m365_operations, mock_graph_client):
        """操作サマリー取得時のエラーハンドリングを確認"""
        mock_graph_client.get_user.side_effect = M365APIError("User not found")

        ops = mock_m365_operations()

        with pytest.raises(M365APIError):
            await ops.get_operation_summary("test_task", "invalid@example.com")


@pytest.mark.m365
class TestContextManager:
    """コンテキストマネージャーのテスト"""

    @pytest.mark.asyncio
    async def test_async_context_manager(self, mock_graph_client):
        """非同期コンテキストマネージャーが正しく動作することを確認"""
        with patch('app.m365.operations.M365AuthConfig.from_settings') as mock_settings:
            mock_settings.return_value = MagicMock()
            with patch('app.m365.operations.GraphClient', return_value=mock_graph_client):
                async with M365Operations() as ops:
                    assert ops._client is not None
                    mock_graph_client.__aenter__.assert_called_once()

                mock_graph_client.__aexit__.assert_called_once()
