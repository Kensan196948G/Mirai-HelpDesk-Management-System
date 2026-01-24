"""
Test Helper Functions

テストで共通して使用するヘルパー関数を提供する。
"""

from datetime import datetime, timezone
from typing import Any

from faker import Faker
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketType, TicketStatus, TicketCategory, TicketPriority
from app.models.comment import Comment, CommentVisibility
from app.models.sla_policy import SLAPolicy
from app.core.security import get_password_hash


# Fakerインスタンス（日本語対応）
fake = Faker(["ja_JP"])


# ============================================================================
# ユーザー生成ヘルパー
# ============================================================================

async def create_test_user(
    db: AsyncSession,
    email: str | None = None,
    role: UserRole = UserRole.REQUESTER,
    is_active: bool = True,
    **kwargs: Any,
) -> User:
    """
    テストユーザーを作成する。

    Args:
        db: データベースセッション
        email: メールアドレス（省略時は自動生成）
        role: ユーザーロール
        is_active: アクティブ状態
        **kwargs: その他のUser属性

    Returns:
        作成されたユーザー
    """
    user_data = {
        "email": email or fake.email(),
        "hashed_password": get_password_hash("password123"),
        "display_name": fake.name(),
        "department": fake.company(),
        "role": role,
        "is_active": is_active,
    }
    user_data.update(kwargs)

    user = User(**user_data)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


# ============================================================================
# チケット生成ヘルパー
# ============================================================================

async def create_test_ticket(
    db: AsyncSession,
    requester: User,
    assignee: User | None = None,
    ticket_type: TicketType = TicketType.INCIDENT,
    status: TicketStatus = TicketStatus.NEW,
    priority: TicketPriority = TicketPriority.P3,
    category: TicketCategory = TicketCategory.OTHER,
    **kwargs: Any,
) -> Ticket:
    """
    テストチケットを作成する。

    Args:
        db: データベースセッション
        requester: 依頼者
        assignee: 担当者（省略可）
        ticket_type: チケットタイプ
        status: ステータス
        priority: 優先度
        category: カテゴリ
        **kwargs: その他のTicket属性

    Returns:
        作成されたチケット
    """
    ticket_data = {
        "subject": fake.sentence(nb_words=6),
        "description": fake.text(max_nb_chars=200),
        "type": ticket_type,
        "status": status,
        "priority": priority,
        "category": category,
        "impact": 2,
        "urgency": 2,
        "requester_id": requester.id,
        "assignee_id": assignee.id if assignee else None,
    }
    ticket_data.update(kwargs)

    # チケット番号を一時的に設定（後で更新）
    ticket_data["ticket_number"] = "TEMP-00000"

    ticket = Ticket(**ticket_data)
    db.add(ticket)
    await db.flush()  # IDを取得

    # チケット番号を生成して更新
    ticket.ticket_number = Ticket.generate_ticket_number(ticket.id)

    await db.commit()
    await db.refresh(ticket)
    return ticket


# ============================================================================
# コメント生成ヘルパー
# ============================================================================

async def create_test_comment(
    db: AsyncSession,
    ticket: Ticket,
    author: User,
    content: str | None = None,
    visibility: CommentVisibility = CommentVisibility.PUBLIC,
    **kwargs: Any,
) -> Comment:
    """
    テストコメントを作成する。

    Args:
        db: データベースセッション
        ticket: チケット
        author: 作成者
        content: コメント本文（省略時は自動生成）
        visibility: 公開範囲
        **kwargs: その他のComment属性

    Returns:
        作成されたコメント
    """
    comment_data = {
        "ticket_id": ticket.id,
        "author_id": author.id,
        "content": content or fake.text(max_nb_chars=150),
        "visibility": visibility,
    }
    comment_data.update(kwargs)

    comment = Comment(**comment_data)
    db.add(comment)
    await db.commit()
    await db.refresh(comment)
    return comment


# ============================================================================
# SLAポリシー生成ヘルパー
# ============================================================================

async def create_test_sla_policy(
    db: AsyncSession,
    priority: TicketPriority,
    response_time_hours: float = 4.0,
    resolution_time_hours: float = 24.0,
    **kwargs: Any,
) -> SLAPolicy:
    """
    テストSLAポリシーを作成する。

    Args:
        db: データベースセッション
        priority: 優先度
        response_time_hours: 初動対応時間
        resolution_time_hours: 解決時間
        **kwargs: その他のSLAPolicy属性

    Returns:
        作成されたSLAポリシー
    """
    policy_data = {
        "name": f"{priority.value.upper()} SLA Policy",
        "description": f"Test SLA policy for {priority.value}",
        "priority": priority,
        "response_time_hours": response_time_hours,
        "resolution_time_hours": resolution_time_hours,
        "is_active": True,
    }
    policy_data.update(kwargs)

    policy = SLAPolicy(**policy_data)
    db.add(policy)
    await db.commit()
    await db.refresh(policy)
    return policy


# ============================================================================
# 認証トークン生成ヘルパー
# ============================================================================

def create_auth_token(user_id: int) -> str:
    """
    ユーザーIDからアクセストークンを生成する。

    Args:
        user_id: ユーザーID

    Returns:
        JWTアクセストークン
    """
    from app.core.security import create_access_token

    return create_access_token(subject=str(user_id))


def create_auth_headers(user_id: int) -> dict[str, str]:
    """
    認証ヘッダーを生成する。

    Args:
        user_id: ユーザーID

    Returns:
        認証ヘッダー辞書
    """
    token = create_auth_token(user_id)
    return {"Authorization": f"Bearer {token}"}


# ============================================================================
# アサーションヘルパー
# ============================================================================

def assert_datetime_close(dt1: datetime | None, dt2: datetime | None, tolerance_seconds: int = 5):
    """
    2つのdatetimeが許容範囲内で近いことをアサートする。

    タイムゾーン付きのdatetimeの比較に使用。

    Args:
        dt1: 1つ目のdatetime
        dt2: 2つ目のdatetime
        tolerance_seconds: 許容誤差（秒）
    """
    if dt1 is None and dt2 is None:
        return

    assert dt1 is not None and dt2 is not None, "Both datetimes must be non-None"

    # タイムゾーンを揃える
    if dt1.tzinfo is None:
        dt1 = dt1.replace(tzinfo=timezone.utc)
    if dt2.tzinfo is None:
        dt2 = dt2.replace(tzinfo=timezone.utc)

    diff = abs((dt1 - dt2).total_seconds())
    assert diff <= tolerance_seconds, f"Datetime difference {diff}s exceeds tolerance {tolerance_seconds}s"


def assert_ticket_response(data: dict[str, Any], ticket: Ticket):
    """
    APIレスポンスがチケットの内容と一致することをアサートする。

    Args:
        data: APIレスポンスデータ
        ticket: 期待されるチケット
    """
    assert data["id"] == ticket.id
    assert data["ticket_number"] == ticket.ticket_number
    assert data["subject"] == ticket.subject
    assert data["type"] == ticket.type.value
    assert data["status"] == ticket.status.value
    assert data["priority"] == ticket.priority.value
    assert data["requester_id"] == ticket.requester_id
