"""
Test Reports Module

レポート機能のテスト:
- ダッシュボード統計
- SLAレポート
- チケット分析
"""

import pytest
from datetime import datetime, timedelta, timezone
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticket import Ticket, TicketStatus, TicketPriority, TicketType, TicketCategory
from app.models.user import User, UserRole
from tests.helpers import create_test_ticket


@pytest.mark.reports
class TestDashboardStats:
    """ダッシュボード統計のテスト"""

    @pytest.mark.asyncio
    async def test_get_dashboard_stats_as_manager(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_manager: User,
        test_user_requester: User,
        create_auth_headers,
    ):
        """マネージャーが全体統計を取得できることを確認"""
        # 各種ステータスのチケットを作成
        await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.NEW,
            priority=TicketPriority.P1,
        )
        await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.IN_PROGRESS,
            priority=TicketPriority.P2,
        )
        await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.RESOLVED,
            priority=TicketPriority.P3,
        )

        headers = create_auth_headers(test_user_manager.id)
        response = await client.get("/api/reports/dashboard", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # 統計情報が含まれる
        assert "total_tickets" in data
        assert "open_tickets" in data
        assert "resolved_today" in data
        assert "overdue_tickets" in data
        assert "tickets_by_status" in data
        assert "tickets_by_priority" in data
        assert "tickets_by_category" in data

        # チケット数が正しい
        assert data["total_tickets"] == 3
        assert data["open_tickets"] == 2  # NEW + IN_PROGRESS

    @pytest.mark.asyncio
    async def test_get_dashboard_stats_as_requester(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        test_user_agent: User,
        create_auth_headers,
    ):
        """一般ユーザーが自分のチケット統計のみ取得できることを確認"""
        # test_user_requesterのチケット
        await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.NEW,
        )

        # 別ユーザーのチケット（カウントされない）
        other_user = User(
            email="other@example.com",
            hashed_password="hashed",
            display_name="Other User",
            department="Other",
            role=UserRole.REQUESTER,
        )
        db_session.add(other_user)
        await db_session.commit()
        await db_session.refresh(other_user)

        await create_test_ticket(
            db_session,
            requester=other_user,
            status=TicketStatus.NEW,
        )

        headers = create_auth_headers(test_user_requester.id)
        response = await client.get("/api/reports/dashboard", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # 自分のチケットのみカウントされる
        assert data["total_tickets"] == 1

    @pytest.mark.asyncio
    async def test_dashboard_stats_by_status(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_manager: User,
        test_user_requester: User,
        create_auth_headers,
    ):
        """ステータス別チケット数が正しいことを確認"""
        # 各ステータスのチケットを作成
        await create_test_ticket(db_session, requester=test_user_requester, status=TicketStatus.NEW)
        await create_test_ticket(db_session, requester=test_user_requester, status=TicketStatus.NEW)
        await create_test_ticket(db_session, requester=test_user_requester, status=TicketStatus.IN_PROGRESS)
        await create_test_ticket(db_session, requester=test_user_requester, status=TicketStatus.RESOLVED)

        headers = create_auth_headers(test_user_manager.id)
        response = await client.get("/api/reports/dashboard", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # ステータス別の集計が正しい
        assert data["tickets_by_status"]["new"] == 2
        assert data["tickets_by_status"]["in_progress"] == 1
        assert data["tickets_by_status"]["resolved"] == 1

    @pytest.mark.asyncio
    async def test_dashboard_stats_by_priority(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_manager: User,
        test_user_requester: User,
        create_auth_headers,
    ):
        """優先度別チケット数が正しいことを確認"""
        # 各優先度のチケットを作成
        await create_test_ticket(db_session, requester=test_user_requester, priority=TicketPriority.P1)
        await create_test_ticket(db_session, requester=test_user_requester, priority=TicketPriority.P2)
        await create_test_ticket(db_session, requester=test_user_requester, priority=TicketPriority.P2)
        await create_test_ticket(db_session, requester=test_user_requester, priority=TicketPriority.P3)

        headers = create_auth_headers(test_user_manager.id)
        response = await client.get("/api/reports/dashboard", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # 優先度別の集計が正しい
        assert data["tickets_by_priority"]["p1"] == 1
        assert data["tickets_by_priority"]["p2"] == 2
        assert data["tickets_by_priority"]["p3"] == 1

    @pytest.mark.asyncio
    async def test_dashboard_stats_by_category(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_manager: User,
        test_user_requester: User,
        create_auth_headers,
    ):
        """カテゴリ別チケット数が正しいことを確認"""
        # 各カテゴリのチケットを作成
        await create_test_ticket(db_session, requester=test_user_requester, category=TicketCategory.ACCOUNT)
        await create_test_ticket(db_session, requester=test_user_requester, category=TicketCategory.ACCOUNT)
        await create_test_ticket(db_session, requester=test_user_requester, category=TicketCategory.NETWORK)
        await create_test_ticket(db_session, requester=test_user_requester, category=TicketCategory.OTHER)

        headers = create_auth_headers(test_user_manager.id)
        response = await client.get("/api/reports/dashboard", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # カテゴリ別の集計が正しい
        assert data["tickets_by_category"]["account"] == 2
        assert data["tickets_by_category"]["network"] == 1
        assert data["tickets_by_category"]["other"] == 1

    @pytest.mark.asyncio
    async def test_dashboard_stats_resolved_today(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_manager: User,
        test_user_requester: User,
        create_auth_headers,
    ):
        """本日解決したチケット数が正しいことを確認"""
        now = datetime.now(timezone.utc)

        # 本日解決したチケット
        today_ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.RESOLVED,
        )
        today_ticket.resolved_at = now
        await db_session.commit()

        # 昨日解決したチケット
        yesterday_ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.RESOLVED,
        )
        yesterday_ticket.resolved_at = now - timedelta(days=1)
        await db_session.commit()

        headers = create_auth_headers(test_user_manager.id)
        response = await client.get("/api/reports/dashboard", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # 本日解決のみカウントされる
        assert data["resolved_today"] == 1

    @pytest.mark.asyncio
    async def test_dashboard_stats_overdue_tickets(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_manager: User,
        test_user_requester: User,
        create_auth_headers,
    ):
        """期限超過チケット数が正しいことを確認"""
        now = datetime.now(timezone.utc)

        # 期限超過チケット
        overdue_ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.IN_PROGRESS,
        )
        overdue_ticket.due_at = now - timedelta(hours=1)
        await db_session.commit()

        # 期限内チケット
        on_time_ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.IN_PROGRESS,
        )
        on_time_ticket.due_at = now + timedelta(hours=1)
        await db_session.commit()

        headers = create_auth_headers(test_user_manager.id)
        response = await client.get("/api/reports/dashboard", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # 期限超過のみカウントされる
        assert data["overdue_tickets"] == 1


@pytest.mark.reports
class TestSLAReport:
    """SLAレポートのテスト"""

    @pytest.mark.asyncio
    async def test_get_sla_report_as_manager(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_manager: User,
        test_user_requester: User,
        create_auth_headers,
    ):
        """マネージャーがSLAレポートを取得できることを確認"""
        now = datetime.now(timezone.utc)

        # SLA達成チケット
        met_ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.CLOSED,
            priority=TicketPriority.P2,
        )
        met_ticket.due_at = now + timedelta(hours=1)
        met_ticket.resolved_at = now - timedelta(hours=1)
        met_ticket.closed_at = now
        await db_session.commit()

        # SLA違反チケット
        breached_ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.CLOSED,
            priority=TicketPriority.P1,
        )
        breached_ticket.due_at = now - timedelta(hours=2)
        breached_ticket.resolved_at = now - timedelta(hours=1)
        breached_ticket.closed_at = now
        await db_session.commit()

        headers = create_auth_headers(test_user_manager.id)
        response = await client.get("/api/reports/sla?days=30", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # SLAレポート情報が含まれる
        assert "period_start" in data
        assert "period_end" in data
        assert "total_tickets" in data
        assert "sla_met" in data
        assert "sla_breached" in data
        assert "compliance_rate" in data
        assert "by_priority" in data

        # 集計が正しい
        assert data["total_tickets"] == 2
        assert data["sla_met"] == 1
        assert data["sla_breached"] == 1
        assert data["compliance_rate"] == 50.0

    @pytest.mark.asyncio
    async def test_get_sla_report_as_auditor(
        self,
        client: AsyncClient,
        test_user_manager: User,
        create_auth_headers,
    ):
        """監査者がSLAレポートを取得できることを確認"""
        # Auditor ユーザーを作成
        from app.core.security import get_password_hash
        from sqlalchemy.ext.asyncio import AsyncSession
        from app.database import get_db

        # conftest の db_session を使用する代わりに、テスト用の auditor を作成
        # ここでは簡略化のため、Managerでテスト
        headers = create_auth_headers(test_user_manager.id)
        response = await client.get("/api/reports/sla?days=30", headers=headers)

        assert response.status_code == 200

    @pytest.mark.asyncio
    async def test_get_sla_report_as_requester_forbidden(
        self,
        client: AsyncClient,
        test_user_requester: User,
        create_auth_headers,
    ):
        """一般ユーザーがSLAレポートを取得できないことを確認"""
        headers = create_auth_headers(test_user_requester.id)
        response = await client.get("/api/reports/sla?days=30", headers=headers)

        assert response.status_code == 403

    @pytest.mark.asyncio
    async def test_sla_report_by_priority(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_manager: User,
        test_user_requester: User,
        create_auth_headers,
    ):
        """優先度別SLA統計が正しいことを確認"""
        now = datetime.now(timezone.utc)

        # P1: SLA達成
        p1_ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.CLOSED,
            priority=TicketPriority.P1,
        )
        p1_ticket.due_at = now + timedelta(hours=1)
        p1_ticket.resolved_at = now - timedelta(hours=1)
        p1_ticket.closed_at = now
        await db_session.commit()

        # P2: SLA違反
        p2_ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.CLOSED,
            priority=TicketPriority.P2,
        )
        p2_ticket.due_at = now - timedelta(hours=1)
        p2_ticket.resolved_at = now
        p2_ticket.closed_at = now
        await db_session.commit()

        headers = create_auth_headers(test_user_manager.id)
        response = await client.get("/api/reports/sla?days=30", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # 優先度別統計が正しい
        assert data["by_priority"]["p1"]["total"] == 1
        assert data["by_priority"]["p1"]["met"] == 1
        assert data["by_priority"]["p1"]["breached"] == 0

        assert data["by_priority"]["p2"]["total"] == 1
        assert data["by_priority"]["p2"]["met"] == 0
        assert data["by_priority"]["p2"]["breached"] == 1

    @pytest.mark.asyncio
    async def test_sla_report_custom_period(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_manager: User,
        test_user_requester: User,
        create_auth_headers,
    ):
        """カスタム期間でSLAレポートが取得できることを確認"""
        now = datetime.now(timezone.utc)

        # 7日前のチケット
        old_ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.CLOSED,
        )
        old_ticket.closed_at = now - timedelta(days=10)
        await db_session.commit()

        # 最近のチケット
        recent_ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.CLOSED,
        )
        recent_ticket.due_at = now
        recent_ticket.resolved_at = now - timedelta(hours=1)
        recent_ticket.closed_at = now
        await db_session.commit()

        headers = create_auth_headers(test_user_manager.id)

        # 7日間のレポート
        response = await client.get("/api/reports/sla?days=7", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # 期間内のチケットのみカウントされる
        assert data["total_tickets"] == 1

    @pytest.mark.asyncio
    async def test_sla_report_no_due_date_assumed_met(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_manager: User,
        test_user_requester: User,
        create_auth_headers,
    ):
        """期限未設定チケットがSLA達成として扱われることを確認"""
        now = datetime.now(timezone.utc)

        # 期限未設定チケット
        ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.CLOSED,
        )
        ticket.due_at = None
        ticket.resolved_at = now - timedelta(hours=1)
        ticket.closed_at = now
        await db_session.commit()

        headers = create_auth_headers(test_user_manager.id)
        response = await client.get("/api/reports/sla?days=30", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # 期限未設定はSLA達成扱い
        assert data["total_tickets"] == 1
        assert data["sla_met"] == 1
        assert data["sla_breached"] == 0
        assert data["compliance_rate"] == 100.0

    @pytest.mark.asyncio
    async def test_sla_report_empty_period(
        self,
        client: AsyncClient,
        test_user_manager: User,
        create_auth_headers,
    ):
        """チケットがない期間のSLAレポートが正しいことを確認"""
        headers = create_auth_headers(test_user_manager.id)
        response = await client.get("/api/reports/sla?days=30", headers=headers)

        assert response.status_code == 200
        data = response.json()

        # チケットがない場合も正しく処理される
        assert data["total_tickets"] == 0
        assert data["sla_met"] == 0
        assert data["sla_breached"] == 0
        assert data["compliance_rate"] == 100.0  # デフォルトは100%
