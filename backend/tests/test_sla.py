"""
Test SLA Module

SLA関連のテスト:
- SLAポリシーCRUD
- 期限計算ロジック
- 優先度別ポリシー取得
"""

import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sla_policy import SLAPolicy
from app.models.ticket import TicketPriority
from app.models.user import User
from tests.helpers import create_test_sla_policy, create_auth_headers


@pytest.mark.sla
class TestSLAPolicyModel:
    """SLAポリシーモデルのテスト"""

    @pytest.mark.asyncio
    async def test_sla_policy_creation(
        self,
        db_session: AsyncSession,
    ):
        """SLAポリシーが正しく作成されることを確認"""
        policy = await create_test_sla_policy(
            db_session,
            priority=TicketPriority.P1,
            response_time_hours=0.25,  # 15分
            resolution_time_hours=2.0,
        )

        assert policy.id is not None
        assert policy.priority == TicketPriority.P1
        assert policy.response_time_hours == 0.25
        assert policy.resolution_time_hours == 2.0
        assert policy.is_active is True

    def test_response_time_minutes_property(self):
        """初動対応時間を分単位で取得できることを確認"""
        policy = SLAPolicy(
            name="Test",
            priority=TicketPriority.P1,
            response_time_hours=1.5,
            resolution_time_hours=8.0,
        )

        # 1.5時間 = 90分
        assert policy.response_time_minutes == 90.0

    def test_resolution_time_minutes_property(self):
        """解決時間を分単位で取得できることを確認"""
        policy = SLAPolicy(
            name="Test",
            priority=TicketPriority.P2,
            response_time_hours=2.0,
            resolution_time_hours=24.0,
        )

        # 24時間 = 1440分
        assert policy.resolution_time_minutes == 1440.0


@pytest.mark.sla
class TestSLAPolicyCRUD:
    """SLAポリシーCRUD操作のテスト"""

    @pytest.mark.asyncio
    async def test_list_sla_policies(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        test_sla_policies: list[SLAPolicy],
        create_auth_headers,
    ):
        """SLAポリシー一覧取得が成功することを確認"""
        headers = create_auth_headers(test_user_requester.id)

        response = await client.get("/api/sla/policies", headers=headers)

        # ステータスコード200
        assert response.status_code == 200

        data = response.json()

        # 4つのポリシーが返される（P1〜P4）
        assert len(data) == 4

        # 優先度順にソートされている
        priorities = [item["priority"] for item in data]
        assert priorities == ["p1", "p2", "p3", "p4"]

    @pytest.mark.asyncio
    async def test_get_sla_policy_by_id(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        test_sla_policies: list[SLAPolicy],
        create_auth_headers,
    ):
        """SLAポリシー詳細取得が成功することを確認"""
        policy = test_sla_policies[0]  # P1ポリシー
        headers = create_auth_headers(test_user_requester.id)

        response = await client.get(f"/api/sla/policies/{policy.id}", headers=headers)

        # ステータスコード200
        assert response.status_code == 200

        data = response.json()

        # ポリシー情報が正しい
        assert data["id"] == policy.id
        assert data["priority"] == policy.priority.value
        assert data["response_time_hours"] == policy.response_time_hours
        assert data["resolution_time_hours"] == policy.resolution_time_hours

    @pytest.mark.asyncio
    async def test_create_sla_policy_as_manager(
        self,
        client: AsyncClient,
        test_user_manager: User,
        create_auth_headers,
    ):
        """マネージャーがSLAポリシーを作成できることを確認"""
        headers = create_auth_headers(test_user_manager.id)

        policy_data = {
            "name": "新しいP1ポリシー",
            "description": "テスト用のポリシー",
            "priority": "p1",
            "response_time_hours": 0.5,
            "resolution_time_hours": 4.0,
            "is_active": True,
        }

        response = await client.post(
            "/api/sla/policies",
            json=policy_data,
            headers=headers,
        )

        # ステータスコード201
        assert response.status_code == 201

        data = response.json()

        # ポリシーが作成されている
        assert data["name"] == policy_data["name"]
        assert data["priority"] == policy_data["priority"]
        assert data["response_time_hours"] == policy_data["response_time_hours"]

    @pytest.mark.asyncio
    async def test_create_sla_policy_as_requester_fails(
        self,
        client: AsyncClient,
        test_user_requester: User,
        create_auth_headers,
    ):
        """一般ユーザーがSLAポリシーを作成できないことを確認"""
        headers = create_auth_headers(test_user_requester.id)

        policy_data = {
            "name": "新しいP1ポリシー",
            "priority": "p1",
            "response_time_hours": 0.5,
            "resolution_time_hours": 4.0,
        }

        response = await client.post(
            "/api/sla/policies",
            json=policy_data,
            headers=headers,
        )

        # ステータスコード403（権限なし）
        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_create_duplicate_priority_fails(
        self,
        client: AsyncClient,
        test_user_manager: User,
        test_sla_policies: list[SLAPolicy],
        create_auth_headers,
    ):
        """同じ優先度のポリシーを重複作成できないことを確認"""
        headers = create_auth_headers(test_user_manager.id)

        # 既にP1ポリシーが存在する状態で、もう一つP1を作成しようとする
        policy_data = {
            "name": "重複するP1ポリシー",
            "priority": "p1",
            "response_time_hours": 1.0,
            "resolution_time_hours": 8.0,
        }

        response = await client.post(
            "/api/sla/policies",
            json=policy_data,
            headers=headers,
        )

        # ステータスコード409（競合）
        assert response.status_code == 409

    @pytest.mark.asyncio
    async def test_update_sla_policy(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_manager: User,
        test_sla_policies: list[SLAPolicy],
        create_auth_headers,
    ):
        """SLAポリシーを更新できることを確認"""
        policy = test_sla_policies[0]  # P1ポリシー
        headers = create_auth_headers(test_user_manager.id)

        update_data = {
            "name": "更新されたP1ポリシー",
            "response_time_hours": 1.0,  # 0.25から1.0に変更
        }

        response = await client.patch(
            f"/api/sla/policies/{policy.id}",
            json=update_data,
            headers=headers,
        )

        # ステータスコード200
        assert response.status_code == 200

        data = response.json()

        # 更新が反映されている
        assert data["name"] == update_data["name"]
        assert data["response_time_hours"] == update_data["response_time_hours"]

    @pytest.mark.asyncio
    async def test_delete_sla_policy(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_manager: User,
        create_auth_headers,
    ):
        """SLAポリシーを削除できることを確認"""
        # テスト用のポリシーを作成
        policy = await create_test_sla_policy(
            db_session,
            priority=TicketPriority.P1,
        )

        headers = create_auth_headers(test_user_manager.id)

        response = await client.delete(
            f"/api/sla/policies/{policy.id}",
            headers=headers,
        )

        # ステータスコード204
        assert response.status_code == 204

        # ポリシーが削除されている
        from sqlalchemy import select
        result = await db_session.execute(
            select(SLAPolicy).where(SLAPolicy.id == policy.id)
        )
        deleted_policy = result.scalar_one_or_none()
        assert deleted_policy is None


@pytest.mark.sla
class TestDeadlineCalculation:
    """期限計算のテスト"""

    @pytest.mark.asyncio
    async def test_calculate_deadline(
        self,
        client: AsyncClient,
        test_user_requester: User,
        test_sla_policies: list[SLAPolicy],
        create_auth_headers,
    ):
        """期限計算が正しく動作することを確認"""
        headers = create_auth_headers(test_user_requester.id)

        # P1ポリシー（初動15分、解決2時間）で期限を計算
        request_data = {
            "priority": "p1",
        }

        response = await client.post(
            "/api/sla/calculate-deadline",
            json=request_data,
            headers=headers,
        )

        # ステータスコード200
        assert response.status_code == 200

        data = response.json()

        # レスポンスフィールドが正しい
        assert data["priority"] == "p1"
        assert "created_at" in data
        assert "response_deadline" in data
        assert "resolution_deadline" in data
        assert data["response_time_hours"] == 0.25
        assert data["resolution_time_hours"] == 2.0

    @pytest.mark.asyncio
    async def test_calculate_deadline_with_custom_created_at(
        self,
        client: AsyncClient,
        test_user_requester: User,
        test_sla_policies: list[SLAPolicy],
        create_auth_headers,
    ):
        """カスタム作成日時で期限計算が正しく動作することを確認"""
        headers = create_auth_headers(test_user_requester.id)

        # カスタムの作成日時を指定
        created_at = datetime(2024, 1, 1, 9, 0, 0, tzinfo=timezone.utc)

        request_data = {
            "priority": "p2",
            "created_at": created_at.isoformat(),
        }

        response = await client.post(
            "/api/sla/calculate-deadline",
            json=request_data,
            headers=headers,
        )

        # ステータスコード200
        assert response.status_code == 200

        data = response.json()

        # 指定した作成日時が使われている
        response_created_at = datetime.fromisoformat(data["created_at"].replace('Z', '+00:00'))
        assert response_created_at.year == 2024
        assert response_created_at.month == 1
        assert response_created_at.day == 1

        # P2ポリシー（初動1時間、解決8時間）
        response_deadline = datetime.fromisoformat(data["response_deadline"].replace('Z', '+00:00'))
        resolution_deadline = datetime.fromisoformat(data["resolution_deadline"].replace('Z', '+00:00'))

        # 期限が正しく計算されている
        expected_response = created_at + timedelta(hours=1.0)
        expected_resolution = created_at + timedelta(hours=8.0)

        assert abs((response_deadline - expected_response).total_seconds()) < 1
        assert abs((resolution_deadline - expected_resolution).total_seconds()) < 1

    @pytest.mark.asyncio
    async def test_get_sla_policy_by_priority(
        self,
        client: AsyncClient,
        test_user_requester: User,
        test_sla_policies: list[SLAPolicy],
        create_auth_headers,
    ):
        """優先度からSLAポリシーを取得できることを確認"""
        headers = create_auth_headers(test_user_requester.id)

        response = await client.get(
            "/api/sla/policies/by-priority/p3",
            headers=headers,
        )

        # ステータスコード200
        assert response.status_code == 200

        data = response.json()

        # P3ポリシーが返される
        assert data["priority"] == "p3"
        assert data["is_active"] is True

    @pytest.mark.asyncio
    async def test_get_nonexistent_priority_fails(
        self,
        client: AsyncClient,
        test_user_requester: User,
        create_auth_headers,
    ):
        """存在しない優先度のポリシー取得が失敗することを確認"""
        headers = create_auth_headers(test_user_requester.id)

        # SLAポリシーが登録されていない状態で取得を試みる
        response = await client.get(
            "/api/sla/policies/by-priority/p1",
            headers=headers,
        )

        # ステータスコード404
        assert response.status_code == 404


@pytest.mark.sla
class TestSLAPolicyFilters:
    """SLAポリシーフィルタのテスト"""

    @pytest.mark.asyncio
    async def test_filter_active_policies(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        create_auth_headers,
    ):
        """アクティブなポリシーのみを取得できることを確認"""
        # アクティブなポリシーと非アクティブなポリシーを作成
        await create_test_sla_policy(
            db_session,
            priority=TicketPriority.P1,
            is_active=True,
        )
        await create_test_sla_policy(
            db_session,
            priority=TicketPriority.P2,
            is_active=False,
        )

        headers = create_auth_headers(test_user_requester.id)

        response = await client.get(
            "/api/sla/policies?is_active=true",
            headers=headers,
        )

        # ステータスコード200
        assert response.status_code == 200

        data = response.json()

        # アクティブなポリシーのみ返される
        assert all(item["is_active"] is True for item in data)

    @pytest.mark.asyncio
    async def test_filter_inactive_policies(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        create_auth_headers,
    ):
        """非アクティブなポリシーのみを取得できることを確認"""
        # アクティブなポリシーと非アクティブなポリシーを作成
        await create_test_sla_policy(
            db_session,
            priority=TicketPriority.P1,
            is_active=True,
        )
        await create_test_sla_policy(
            db_session,
            priority=TicketPriority.P2,
            is_active=False,
        )

        headers = create_auth_headers(test_user_requester.id)

        response = await client.get(
            "/api/sla/policies?is_active=false",
            headers=headers,
        )

        # ステータスコード200
        assert response.status_code == 200

        data = response.json()

        # 非アクティブなポリシーのみ返される
        assert all(item["is_active"] is False for item in data)
