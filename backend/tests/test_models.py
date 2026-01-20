"""
Test Models

モデルのテスト:
- モデルバリデーション
- リレーションシップ
- Enumの整合性
"""

import pytest
from datetime import datetime, timezone
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.models.ticket import (
    Ticket,
    TicketType,
    TicketStatus,
    TicketPriority,
    TicketCategory,
)
from app.models.comment import Comment, CommentVisibility
from app.models.sla_policy import SLAPolicy
from app.models.ticket_history import TicketHistory, HistoryAction
from app.models.approval import Approval, ApprovalStatus
from app.models.attachment import Attachment
from tests.helpers import (
    create_test_user,
    create_test_ticket,
    create_test_comment,
)


@pytest.mark.unit
class TestUserModel:
    """ユーザーモデルのテスト"""

    @pytest.mark.asyncio
    async def test_create_user(
        self,
        db_session: AsyncSession,
    ):
        """ユーザーが正しく作成されることを確認"""
        user = await create_test_user(
            db_session,
            email="test@example.com",
            role=UserRole.REQUESTER,
        )

        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.role == UserRole.REQUESTER
        assert user.is_active is True

    @pytest.mark.asyncio
    async def test_user_email_unique(
        self,
        db_session: AsyncSession,
    ):
        """メールアドレスがユニークであることを確認"""
        email = "duplicate@example.com"

        # 1人目のユーザーを作成
        await create_test_user(db_session, email=email)

        # 同じメールアドレスで2人目を作成しようとする
        with pytest.raises(Exception):  # IntegrityError
            await create_test_user(db_session, email=email)

    def test_user_has_permission(self):
        """権限チェックが正しく動作することを確認"""
        agent = User(
            email="agent@example.com",
            hashed_password="hashed",
            display_name="Agent",
            role=UserRole.AGENT,
        )

        # エージェントはAGENT権限を持つ
        assert agent.has_permission([UserRole.AGENT]) is True

        # エージェントはMANAGER権限を持たない
        assert agent.has_permission([UserRole.MANAGER]) is False

        # 複数の権限のいずれかを持つ場合
        assert agent.has_permission([UserRole.AGENT, UserRole.MANAGER]) is True

    def test_user_is_staff(self):
        """スタッフ判定が正しく動作することを確認"""
        requester = User(
            email="requester@example.com",
            hashed_password="hashed",
            display_name="Requester",
            role=UserRole.REQUESTER,
        )

        agent = User(
            email="agent@example.com",
            hashed_password="hashed",
            display_name="Agent",
            role=UserRole.AGENT,
        )

        # 一般ユーザーはスタッフではない
        assert requester.is_staff is False

        # エージェントはスタッフ
        assert agent.is_staff is True


@pytest.mark.unit
class TestTicketModel:
    """チケットモデルのテスト"""

    @pytest.mark.asyncio
    async def test_create_ticket(
        self,
        db_session: AsyncSession,
        test_user_requester: User,
    ):
        """チケットが正しく作成されることを確認"""
        ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
            subject="テストチケット",
            description="テストの説明",
        )

        assert ticket.id is not None
        assert ticket.ticket_number is not None
        assert ticket.subject == "テストチケット"
        assert ticket.requester_id == test_user_requester.id

    def test_ticket_type_enum(self):
        """チケットタイプEnumが正しいことを確認"""
        assert TicketType.INCIDENT.value == "incident"
        assert TicketType.SERVICE_REQUEST.value == "service_request"
        assert TicketType.M365_REQUEST.value == "m365_request"

    def test_ticket_status_enum(self):
        """チケットステータスEnumが正しいことを確認"""
        assert TicketStatus.NEW.value == "new"
        assert TicketStatus.TRIAGE.value == "triage"
        assert TicketStatus.ASSIGNED.value == "assigned"
        assert TicketStatus.IN_PROGRESS.value == "in_progress"
        assert TicketStatus.RESOLVED.value == "resolved"
        assert TicketStatus.CLOSED.value == "closed"

    def test_ticket_priority_enum(self):
        """チケット優先度Enumが正しいことを確認"""
        assert TicketPriority.P1.value == "p1"
        assert TicketPriority.P2.value == "p2"
        assert TicketPriority.P3.value == "p3"
        assert TicketPriority.P4.value == "p4"

    @pytest.mark.asyncio
    async def test_ticket_requester_relationship(
        self,
        db_session: AsyncSession,
        test_user_requester: User,
    ):
        """チケットと依頼者のリレーションシップが正しいことを確認"""
        ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
        )

        # リレーションシップを読み込み
        await db_session.refresh(ticket, ["requester"])

        # 依頼者情報が取得できる
        assert ticket.requester is not None
        assert ticket.requester.id == test_user_requester.id

    @pytest.mark.asyncio
    async def test_ticket_assignee_relationship(
        self,
        db_session: AsyncSession,
        test_user_requester: User,
        test_user_agent: User,
    ):
        """チケットと担当者のリレーションシップが正しいことを確認"""
        ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
            assignee=test_user_agent,
        )

        # リレーションシップを読み込み
        await db_session.refresh(ticket, ["assignee"])

        # 担当者情報が取得できる
        assert ticket.assignee is not None
        assert ticket.assignee.id == test_user_agent.id


@pytest.mark.unit
class TestCommentModel:
    """コメントモデルのテスト"""

    @pytest.mark.asyncio
    async def test_create_comment(
        self,
        db_session: AsyncSession,
        test_user_requester: User,
    ):
        """コメントが正しく作成されることを確認"""
        # チケットを作成
        ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
        )

        # コメントを作成
        comment = await create_test_comment(
            db_session,
            ticket=ticket,
            author=test_user_requester,
            content="テストコメント",
        )

        assert comment.id is not None
        assert comment.ticket_id == ticket.id
        assert comment.author_id == test_user_requester.id
        assert comment.content == "テストコメント"

    def test_comment_visibility_enum(self):
        """コメント可視性Enumが正しいことを確認"""
        assert CommentVisibility.PUBLIC.value == "public"
        assert CommentVisibility.INTERNAL.value == "internal"

    @pytest.mark.asyncio
    async def test_comment_ticket_relationship(
        self,
        db_session: AsyncSession,
        test_user_requester: User,
    ):
        """コメントとチケットのリレーションシップが正しいことを確認"""
        ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
        )

        comment = await create_test_comment(
            db_session,
            ticket=ticket,
            author=test_user_requester,
        )

        # リレーションシップを読み込み
        await db_session.refresh(comment, ["ticket"])

        # チケット情報が取得できる
        assert comment.ticket is not None
        assert comment.ticket.id == ticket.id


@pytest.mark.unit
class TestSLAPolicyModel:
    """SLAポリシーモデルのテスト"""

    @pytest.mark.asyncio
    async def test_create_sla_policy(
        self,
        db_session: AsyncSession,
    ):
        """SLAポリシーが正しく作成されることを確認"""
        from tests.helpers import create_test_sla_policy

        policy = await create_test_sla_policy(
            db_session,
            priority=TicketPriority.P1,
            response_time_hours=0.25,
            resolution_time_hours=2.0,
        )

        assert policy.id is not None
        assert policy.priority == TicketPriority.P1
        assert policy.response_time_hours == 0.25
        assert policy.resolution_time_hours == 2.0

    @pytest.mark.asyncio
    async def test_sla_policy_priority_unique(
        self,
        db_session: AsyncSession,
    ):
        """優先度がユニークであることを確認"""
        from tests.helpers import create_test_sla_policy

        # P1ポリシーを作成
        await create_test_sla_policy(
            db_session,
            priority=TicketPriority.P1,
        )

        # 同じ優先度でもう一つ作成しようとする
        with pytest.raises(Exception):  # IntegrityError
            await create_test_sla_policy(
                db_session,
                priority=TicketPriority.P1,
            )


@pytest.mark.unit
class TestTicketHistoryModel:
    """チケット履歴モデルのテスト"""

    @pytest.mark.asyncio
    async def test_create_ticket_history(
        self,
        db_session: AsyncSession,
        test_user_requester: User,
        test_user_agent: User,
    ):
        """チケット履歴が正しく作成されることを確認"""
        # チケットを作成
        ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
        )

        # 履歴を作成
        history = TicketHistory(
            ticket_id=ticket.id,
            actor_id=test_user_agent.id,
            action=HistoryAction.STATUS_CHANGED,
            field_name="status",
            before="new",
            after="in_progress",
        )

        db_session.add(history)
        await db_session.commit()
        await db_session.refresh(history)

        assert history.id is not None
        assert history.ticket_id == ticket.id
        assert history.actor_id == test_user_agent.id
        assert history.action == HistoryAction.STATUS_CHANGED

    def test_history_action_enum(self):
        """履歴アクションEnumが正しいことを確認"""
        assert HistoryAction.CREATED.value == "created"
        assert HistoryAction.UPDATED.value == "updated"
        assert HistoryAction.STATUS_CHANGED.value == "status_changed"
        assert HistoryAction.ASSIGNED.value == "assigned"
        assert HistoryAction.COMMENT_ADDED.value == "comment_added"


@pytest.mark.unit
class TestApprovalModel:
    """承認モデルのテスト"""

    @pytest.mark.asyncio
    async def test_create_approval(
        self,
        db_session: AsyncSession,
        test_user_requester: User,
        test_user_approver: User,
    ):
        """承認が正しく作成されることを確認"""
        # チケットを作成
        ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
        )

        # 承認を作成
        approval = Approval(
            ticket_id=ticket.id,
            approver_id=test_user_approver.id,
            status=ApprovalStatus.PENDING,
            request_reason="ライセンス付与の承認依頼",
        )

        db_session.add(approval)
        await db_session.commit()
        await db_session.refresh(approval)

        assert approval.id is not None
        assert approval.ticket_id == ticket.id
        assert approval.approver_id == test_user_approver.id
        assert approval.status == ApprovalStatus.PENDING

    def test_approval_status_enum(self):
        """承認ステータスEnumが正しいことを確認"""
        assert ApprovalStatus.PENDING.value == "pending"
        assert ApprovalStatus.APPROVED.value == "approved"
        assert ApprovalStatus.REJECTED.value == "rejected"


@pytest.mark.unit
class TestModelRelationships:
    """モデル間のリレーションシップのテスト"""

    @pytest.mark.asyncio
    async def test_user_requested_tickets_relationship(
        self,
        db_session: AsyncSession,
        test_user_requester: User,
    ):
        """ユーザーと依頼チケットのリレーションシップが正しいことを確認"""
        # チケットを複数作成
        for _ in range(3):
            await create_test_ticket(
                db_session,
                requester=test_user_requester,
            )

        # ユーザーをリフレッシュ
        await db_session.refresh(test_user_requester, ["requested_tickets"])

        # 依頼チケットが取得できる
        assert len(test_user_requester.requested_tickets) == 3

    @pytest.mark.asyncio
    async def test_ticket_comments_relationship(
        self,
        db_session: AsyncSession,
        test_user_requester: User,
    ):
        """チケットとコメントのリレーションシップが正しいことを確認"""
        # チケットを作成
        ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
        )

        # コメントを複数作成
        for _ in range(5):
            await create_test_comment(
                db_session,
                ticket=ticket,
                author=test_user_requester,
            )

        # チケットをリフレッシュ
        await db_session.refresh(ticket, ["comments"])

        # コメントが取得できる
        assert len(ticket.comments) == 5

    @pytest.mark.asyncio
    async def test_cascade_delete_ticket_comments(
        self,
        db_session: AsyncSession,
        test_user_requester: User,
    ):
        """チケット削除時にコメントがカスケード削除されることを確認"""
        # チケットを作成
        ticket = await create_test_ticket(
            db_session,
            requester=test_user_requester,
        )

        # コメントを作成
        await create_test_comment(
            db_session,
            ticket=ticket,
            author=test_user_requester,
        )

        ticket_id = ticket.id

        # チケットを削除
        await db_session.delete(ticket)
        await db_session.commit()

        # コメントも削除されていることを確認
        result = await db_session.execute(
            select(Comment).where(Comment.ticket_id == ticket_id)
        )
        comments = result.scalars().all()

        assert len(comments) == 0
