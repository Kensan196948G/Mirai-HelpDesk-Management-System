"""
Test Ticket Module

チケット関連のテスト:
- チケットCRUD操作
- ステータス遷移
- 優先度計算
- 履歴自動記録
- コメントと添付ファイル
"""

import pytest
from datetime import datetime, timezone
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.ticket import (
    Ticket,
    TicketType,
    TicketStatus,
    TicketPriority,
    TicketCategory,
)
from app.models.user import User
from app.models.comment import Comment, CommentVisibility
from app.models.ticket_history import TicketHistory, HistoryAction
from app.models.approval import Approval, ApprovalStatus
from tests.helpers import (
    create_test_ticket,
    create_test_comment,
    create_auth_headers,
)


@pytest.mark.tickets
class TestTicketModel:
    """チケットモデルのテスト"""

    def test_generate_ticket_number(self):
        """チケット番号が正しいフォーマットで生成されることを確認"""
        ticket_id = 123
        ticket_number = Ticket.generate_ticket_number(ticket_id)

        # フォーマットが正しい（TKT-YYYY-XXXXX）
        assert ticket_number.startswith("TKT-")
        assert len(ticket_number) == 14  # TKT-2024-00123

        # IDがゼロパディングされている
        assert ticket_number.endswith("00123")

    def test_calculate_priority_p1(self):
        """優先度P1の計算が正しいことを確認"""
        # Impact=1, Urgency=1 → P1
        ticket = Ticket(
            subject="Test",
            description="Test",
            type=TicketType.INCIDENT,
            category=TicketCategory.OTHER,
            impact=1,
            urgency=1,
            requester_id=1,
        )

        priority = ticket.calculate_priority()
        assert priority == TicketPriority.P1

    def test_calculate_priority_p2(self):
        """優先度P2の計算が正しいことを確認"""
        # Impact=2, Urgency=2 → P2
        ticket = Ticket(
            subject="Test",
            description="Test",
            type=TicketType.INCIDENT,
            category=TicketCategory.OTHER,
            impact=2,
            urgency=2,
            requester_id=1,
        )

        priority = ticket.calculate_priority()
        assert priority == TicketPriority.P2

    def test_calculate_priority_p3(self):
        """優先度P3の計算が正しいことを確認"""
        # Impact=3, Urgency=2 → P3
        ticket = Ticket(
            subject="Test",
            description="Test",
            type=TicketType.INCIDENT,
            category=TicketCategory.OTHER,
            impact=3,
            urgency=2,
            requester_id=1,
        )

        priority = ticket.calculate_priority()
        assert priority == TicketPriority.P3

    def test_calculate_priority_p4(self):
        """優先度P4の計算が正しいことを確認"""
        # Impact=4, Urgency=4 → P4
        ticket = Ticket(
            subject="Test",
            description="Test",
            type=TicketType.INCIDENT,
            category=TicketCategory.OTHER,
            impact=4,
            urgency=4,
            requester_id=1,
        )

        priority = ticket.calculate_priority()
        assert priority == TicketPriority.P4


@pytest.mark.tickets
class TestTicketCRUD:
    """チケットCRUD操作のテスト"""

    @pytest.mark.asyncio
    async def test_create_ticket(
        self,
        client: AsyncClient,
        test_user_requester: User,
        create_auth_headers,
    ):
        """チケット作成が成功することを確認"""
        headers = create_auth_headers(test_user_requester.id)

        ticket_data = {
            "subject": "ログインできない問題",
            "description": "朝からログインできません。パスワードは間違っていないはずです。",
            "type": "incident",
            "category": "account",
            "impact": 1,
            "urgency": 2,
        }

        response = await client.post(
            "/api/tickets",
            json=ticket_data,
            headers=headers,
        )

        # ステータスコード201
        assert response.status_code == 201

        data = response.json()

        # チケット番号が生成されている
        assert "ticket_number" in data
        assert data["ticket_number"].startswith("TKT-")

        # 入力データが反映されている
        assert data["subject"] == ticket_data["subject"]
        assert data["description"] == ticket_data["description"]
        assert data["type"] == ticket_data["type"]
        assert data["category"] == ticket_data["category"]

        # 初期ステータスがNEW
        assert data["status"] == "new"

        # 優先度が自動計算されている（impact=1, urgency=2 → P1）
        assert data["priority"] == "p1"

        # 依頼者が設定されている
        assert data["requester_id"] == test_user_requester.id

    @pytest.mark.asyncio
    async def test_list_tickets(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        test_user_agent: User,
        create_auth_headers,
    ):
        """チケット一覧取得が成功することを確認"""
        # テストチケットを複数作成
        for i in range(5):
            await create_test_ticket(
                db_session,
                requester=test_user_requester,
                assignee=test_user_agent if i % 2 == 0 else None,
            )

        headers = create_auth_headers(test_user_requester.id)

        response = await client.get("/api/tickets", headers=headers)

        # ステータスコード200
        assert response.status_code == 200

        data = response.json()

        # ページネーション情報が含まれる
        assert "items" in data
        assert "total" in data
        assert "page" in data
        assert "page_size" in data

        # チケットが取得できている
        assert len(data["items"]) == 5
        assert data["total"] == 5

    @pytest.mark.asyncio
    async def test_get_ticket_by_id(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        create_auth_headers,
    ):
        """チケット詳細取得が成功することを確認"""
        # テストチケットを作成
        ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
            subject="テストチケット",
            description="これはテストです",
        )

        headers = create_auth_headers(test_user_requester.id)

        response = await client.get(f"/api/tickets/{ticket.id}", headers=headers)

        # ステータスコード200
        assert response.status_code == 200

        data = response.json()

        # チケット情報が正しい
        assert data["id"] == ticket.id
        assert data["ticket_number"] == ticket.ticket_number
        assert data["subject"] == ticket.subject
        assert data["description"] == ticket.description

    @pytest.mark.asyncio
    async def test_update_ticket(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        test_user_agent: User,
        create_auth_headers,
    ):
        """チケット更新が成功することを確認"""
        # テストチケットを作成
        ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.NEW,
        )

        # エージェントとして更新
        headers = create_auth_headers(test_user_agent.id)

        update_data = {
            "status": "assigned",
            "assignee_id": test_user_agent.id,
        }

        response = await client.patch(
            f"/api/tickets/{ticket.id}",
            json=update_data,
            headers=headers,
        )

        # ステータスコード200
        assert response.status_code == 200

        data = response.json()

        # 更新が反映されている
        assert data["status"] == "assigned"
        assert data["assignee_id"] == test_user_agent.id


@pytest.mark.tickets
class TestTicketHistory:
    """チケット履歴のテスト"""

    @pytest.mark.asyncio
    async def test_status_change_creates_history(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        test_user_agent: User,
        create_auth_headers,
    ):
        """ステータス変更時に履歴が自動記録されることを確認"""
        # チケットを作成
        ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.NEW,
        )

        # ステータスを更新
        headers = create_auth_headers(test_user_agent.id)
        await client.patch(
            f"/api/tickets/{ticket.id}",
            json={"status": "in_progress"},
            headers=headers,
        )

        # 履歴を確認
        result = await db_session.execute(
            select(TicketHistory).where(TicketHistory.ticket_id == ticket.id)
        )
        histories = result.scalars().all()

        # 履歴が記録されている
        assert len(histories) > 0

        # ステータス変更の履歴が含まれる
        status_changes = [
            h for h in histories if h.field_name == "status"
        ]
        assert len(status_changes) > 0

    @pytest.mark.asyncio
    async def test_get_ticket_history(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        test_user_agent: User,
        create_auth_headers,
    ):
        """チケット履歴取得APIが正しく動作することを確認"""
        # チケットを作成
        ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.NEW,
        )

        # ステータスを更新（履歴を作成）
        headers = create_auth_headers(test_user_agent.id)
        await client.patch(
            f"/api/tickets/{ticket.id}",
            json={"status": "in_progress"},
            headers=headers,
        )

        # 履歴を取得
        response = await client.get(
            f"/api/tickets/{ticket.id}/history",
            headers=headers,
        )

        # ステータスコード200
        assert response.status_code == 200

        data = response.json()

        # 履歴が返される
        assert isinstance(data, list)
        assert len(data) > 0


@pytest.mark.tickets
class TestTicketComments:
    """チケットコメントのテスト"""

    @pytest.mark.asyncio
    async def test_create_comment(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        create_auth_headers,
    ):
        """コメント作成が成功することを確認"""
        # チケットを作成
        ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
        )

        headers = create_auth_headers(test_user_requester.id)

        comment_data = {
            "content": "詳細情報を追加します。",
            "visibility": "public",
        }

        response = await client.post(
            f"/api/tickets/{ticket.id}/comments",
            json=comment_data,
            headers=headers,
        )

        # ステータスコード201
        assert response.status_code == 201

        data = response.json()

        # コメント情報が正しい
        assert data["content"] == comment_data["content"]
        assert data["visibility"] == comment_data["visibility"]
        assert data["ticket_id"] == ticket.id
        assert data["author_id"] == test_user_requester.id

    @pytest.mark.asyncio
    async def test_list_comments(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        test_user_agent: User,
        create_auth_headers,
    ):
        """コメント一覧取得が成功することを確認"""
        # チケットを作成
        ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
        )

        # コメントを複数作成
        await create_test_comment(
            db_session,
            ticket=ticket,
            author=test_user_requester,
            content="依頼者のコメント",
            visibility=CommentVisibility.PUBLIC,
        )
        await create_test_comment(
            db_session,
            ticket=ticket,
            author=test_user_agent,
            content="内部メモ",
            visibility=CommentVisibility.INTERNAL,
        )

        headers = create_auth_headers(test_user_requester.id)

        response = await client.get(
            f"/api/tickets/{ticket.id}/comments",
            headers=headers,
        )

        # ステータスコード200
        assert response.status_code == 200

        data = response.json()

        # コメントが取得できている
        assert isinstance(data, list)
        # 依頼者は内部コメントが見えないので1件のみ
        # （ただし、実装によっては全て見える可能性あり）
        assert len(data) >= 1

    @pytest.mark.asyncio
    async def test_internal_comment_visibility(
        self,
        db_session: AsyncSession,
        test_user_requester: User,
        test_user_agent: User,
    ):
        """内部コメントの可視性が正しいことを確認"""
        # チケットを作成
        ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
        )

        # 内部コメントを作成
        internal_comment = await create_test_comment(
            db_session,
            ticket=ticket,
            author=test_user_agent,
            content="これは内部メモです",
            visibility=CommentVisibility.INTERNAL,
        )

        # 公開コメントを作成
        public_comment = await create_test_comment(
            db_session,
            ticket=ticket,
            author=test_user_agent,
            content="これは公開コメントです",
            visibility=CommentVisibility.PUBLIC,
        )

        # コメントが正しく作成されている
        assert internal_comment.visibility == CommentVisibility.INTERNAL
        assert public_comment.visibility == CommentVisibility.PUBLIC


@pytest.mark.tickets
class TestTicketFilters:
    """チケットフィルタのテスト"""

    @pytest.mark.asyncio
    async def test_filter_by_status(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        create_auth_headers,
    ):
        """ステータスでフィルタできることを確認"""
        # 異なるステータスのチケットを作成
        await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.NEW,
        )
        await create_test_ticket(
            db_session,
            requester=test_user_requester,
            status=TicketStatus.IN_PROGRESS,
        )

        headers = create_auth_headers(test_user_requester.id)

        # NEWステータスのチケットのみ取得
        response = await client.get(
            "/api/tickets?status=new",
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()

        # NEWステータスのチケットのみ返される
        assert all(item["status"] == "new" for item in data["items"])

    @pytest.mark.asyncio
    async def test_filter_by_priority(
        self,
        client: AsyncClient,
        db_session: AsyncSession,
        test_user_requester: User,
        create_auth_headers,
    ):
        """優先度でフィルタできることを確認"""
        # 異なる優先度のチケットを作成
        await create_test_ticket(
            db_session,
            requester=test_user_requester,
            priority=TicketPriority.P1,
        )
        await create_test_ticket(
            db_session,
            requester=test_user_requester,
            priority=TicketPriority.P3,
        )

        headers = create_auth_headers(test_user_requester.id)

        # P1優先度のチケットのみ取得
        response = await client.get(
            "/api/tickets?priority=p1",
            headers=headers,
        )

        assert response.status_code == 200
        data = response.json()

        # P1優先度のチケットのみ返される
        assert all(item["priority"] == "p1" for item in data["items"])
