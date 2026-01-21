"""
Ticket Routes

CRUD operations for tickets, comments, attachments, and history.
"""

import hashlib
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, status
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.models.ticket import Ticket, TicketStatus, TicketType, TicketPriority, TicketCategory
from app.models.comment import Comment, CommentVisibility
from app.models.attachment import Attachment
from app.models.user import User, UserRole
from app.models.ticket_history import TicketHistory, HistoryAction
from app.models.sla_policy import SLAPolicy
from app.api.deps import CurrentUser, DbSession, require_roles
from app.config import settings
from utils.masking import mask_pii, preview_pii


logger = logging.getLogger(__name__)


router = APIRouter()


# ============== Schemas ==============

class TicketCreate(BaseModel):
    """Schema for creating a ticket."""
    subject: str = Field(..., min_length=5, max_length=255)
    description: str = Field(..., min_length=10)
    type: TicketType
    category: TicketCategory
    impact: int = Field(default=2, ge=1, le=4)
    urgency: int = Field(default=2, ge=1, le=4)


class TicketUpdate(BaseModel):
    """Schema for updating a ticket."""
    subject: str | None = None
    description: str | None = None
    status: TicketStatus | None = None
    priority: TicketPriority | None = None
    category: TicketCategory | None = None
    assignee_id: int | None = None
    resolution_summary: str | None = None


class TicketStatusUpdate(BaseModel):
    """Schema for updating ticket status."""
    status: TicketStatus
    reason: str | None = None


class TicketResponse(BaseModel):
    """Schema for ticket response."""
    id: int
    ticket_number: str
    subject: str
    description: str
    type: str
    status: str
    priority: str
    category: str
    impact: int
    urgency: int
    requester_id: int
    requester_name: str | None = None
    assignee_id: int | None
    assignee_name: str | None = None
    due_at: datetime | None
    created_at: datetime
    updated_at: datetime
    resolved_at: datetime | None
    closed_at: datetime | None
    
    class Config:
        from_attributes = True


class TicketListResponse(BaseModel):
    """Schema for paginated ticket list."""
    items: list[TicketResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class CommentCreate(BaseModel):
    """Schema for creating a comment."""
    content: str = Field(..., min_length=1)
    visibility: CommentVisibility = CommentVisibility.PUBLIC


class CommentResponse(BaseModel):
    """Schema for comment response."""
    id: int
    ticket_id: int
    author_id: int
    author_name: str | None = None
    content: str
    visibility: str
    created_at: datetime

    class Config:
        from_attributes = True


class AttachmentResponse(BaseModel):
    """Schema for attachment response."""
    id: int
    ticket_id: int
    filename: str
    original_filename: str
    content_type: str
    size: int
    hash: str
    uploader_id: int
    uploader_name: str | None = None
    created_at: datetime

    class Config:
        from_attributes = True


class TicketHistoryResponse(BaseModel):
    """
    チケット履歴レスポンススキーマ

    監査証跡として、変更の詳細を返す。
    """
    id: int
    ticket_id: int
    actor_id: int | None
    actor_name: str | None = None
    action: str
    field_name: str | None
    before: str | None
    after: str | None
    reason: str | None
    created_at: datetime

    class Config:
        from_attributes = True


class TicketHistoryListResponse(BaseModel):
    """ページネーション付きチケット履歴レスポンス"""
    items: list[TicketHistoryResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# Allowed file extensions for security
ALLOWED_EXTENSIONS = {
    '.txt', '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp',
    '.csv', '.json', '.xml', '.zip', '.7z', '.log',
}

# Max file size: 10MB
MAX_FILE_SIZE = 10 * 1024 * 1024


# ============== Helper Functions ==============

def _serialize_value(value: Any) -> str | None:
    """
    値をJSON文字列にシリアライズする

    Enum値は.valueを使用して文字列に変換する。
    """
    if value is None:
        return None
    if hasattr(value, "value"):  # Enum
        return json.dumps(value.value)
    if isinstance(value, datetime):
        return json.dumps(value.isoformat())
    return json.dumps(value)


def _determine_action(field_name: str, old_value: Any, new_value: Any) -> HistoryAction:
    """
    変更されたフィールドに基づいて適切なHistoryActionを決定する
    """
    action_map = {
        "status": HistoryAction.STATUS_CHANGED,
        "priority": HistoryAction.PRIORITY_CHANGED,
        "category": HistoryAction.CATEGORY_CHANGED,
        "assignee_id": HistoryAction.ASSIGNED if old_value is None else HistoryAction.REASSIGNED,
    }

    # ステータスが特定の値に変更された場合の特別処理
    if field_name == "status" and new_value:
        status_value = new_value.value if hasattr(new_value, "value") else new_value
        if status_value == "resolved":
            return HistoryAction.RESOLVED
        elif status_value == "closed":
            return HistoryAction.CLOSED
        elif status_value == "reopened":
            return HistoryAction.REOPENED

    return action_map.get(field_name, HistoryAction.UPDATED)


async def record_ticket_history(
    db: AsyncSession,
    ticket_id: int,
    actor_id: int | None,
    action: HistoryAction,
    field_name: str | None = None,
    before: Any = None,
    after: Any = None,
    reason: str | None = None,
) -> TicketHistory:
    """
    チケット履歴を記録するヘルパー関数

    この関数は追記専用の監査証跡を作成する。
    全ての変更操作（ステータス、担当者、優先度など）はこの関数を通して記録される。

    Args:
        db: データベースセッション
        ticket_id: 対象チケットID
        actor_id: 操作者ID（システム操作の場合はNone）
        action: アクション種別
        field_name: 変更対象フィールド名
        before: 変更前の値
        after: 変更後の値
        reason: 変更理由（任意）

    Returns:
        TicketHistory: 作成された履歴エントリ
    """
    history_entry = TicketHistory.create_entry(
        ticket_id=ticket_id,
        actor_id=actor_id,
        action=action,
        field_name=field_name,
        before=_serialize_value(before),
        after=_serialize_value(after),
        reason=reason,
    )

    db.add(history_entry)
    return history_entry


async def record_ticket_changes(
    db: AsyncSession,
    ticket: Ticket,
    update_data: dict[str, Any],
    actor_id: int,
    reason: str | None = None,
) -> list[TicketHistory]:
    """
    チケットの複数フィールド変更を履歴に記録する

    Args:
        db: データベースセッション
        ticket: 更新前のチケットオブジェクト
        update_data: 更新データ辞書
        actor_id: 操作者ID
        reason: 変更理由（任意）

    Returns:
        list[TicketHistory]: 作成された履歴エントリのリスト
    """
    history_entries = []

    for field_name, new_value in update_data.items():
        old_value = getattr(ticket, field_name, None)

        # 値が変わっていない場合はスキップ
        if old_value == new_value:
            continue

        action = _determine_action(field_name, old_value, new_value)

        entry = await record_ticket_history(
            db=db,
            ticket_id=ticket.id,
            actor_id=actor_id,
            action=action,
            field_name=field_name,
            before=old_value,
            after=new_value,
            reason=reason,
        )
        history_entries.append(entry)

    return history_entries


async def calculate_ticket_deadline(
    db: AsyncSession,
    priority: TicketPriority,
    created_at: datetime | None = None,
) -> datetime | None:
    """
    チケットの期限を計算する

    SLAポリシーに基づいて、チケットの解決期限を計算する。

    Args:
        db: データベースセッション
        priority: チケット優先度
        created_at: チケット作成日時（Noneの場合は現在時刻）

    Returns:
        datetime | None: 解決期限（SLAポリシーがない場合はNone）
    """
    # アクティブなSLAポリシーを取得
    result = await db.execute(
        select(SLAPolicy).where(
            SLAPolicy.priority == priority,
            SLAPolicy.is_active == True,
        )
    )
    policy = result.scalar_one_or_none()

    if policy is None:
        return None

    # 基準時刻
    base_time = created_at if created_at else datetime.now(timezone.utc)

    # 解決期限を計算
    from datetime import timedelta
    deadline = base_time + timedelta(hours=policy.resolution_time_hours)

    return deadline


# ============== Routes ==============

@router.get("", response_model=TicketListResponse)
async def list_tickets(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    status: TicketStatus | None = None,
    priority: TicketPriority | None = None,
    category: TicketCategory | None = None,
    assignee_id: int | None = None,
):
    """
    List tickets with filtering and pagination.
    
    - Requesters can only see their own tickets
    - Agents/Operators/Managers can see all tickets
    """
    query = select(Ticket).options(
        selectinload(Ticket.requester),
        selectinload(Ticket.assignee),
    )
    
    # Filter by role
    if current_user.role == UserRole.REQUESTER:
        query = query.where(Ticket.requester_id == current_user.id)
    
    # Apply filters
    if status:
        query = query.where(Ticket.status == status)
    if priority:
        query = query.where(Ticket.priority == priority)
    if category:
        query = query.where(Ticket.category == category)
    if assignee_id:
        query = query.where(Ticket.assignee_id == assignee_id)
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    
    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(Ticket.created_at.desc()).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    tickets = result.scalars().all()
    
    # Build response
    items = []
    for ticket in tickets:
        items.append(TicketResponse(
            id=ticket.id,
            ticket_number=ticket.ticket_number,
            subject=ticket.subject,
            description=ticket.description,
            type=ticket.type.value,
            status=ticket.status.value,
            priority=ticket.priority.value,
            category=ticket.category.value,
            impact=ticket.impact,
            urgency=ticket.urgency,
            requester_id=ticket.requester_id,
            requester_name=ticket.requester.display_name if ticket.requester else None,
            assignee_id=ticket.assignee_id,
            assignee_name=ticket.assignee.display_name if ticket.assignee else None,
            due_at=ticket.due_at,
            created_at=ticket.created_at,
            updated_at=ticket.updated_at,
            resolved_at=ticket.resolved_at,
            closed_at=ticket.closed_at,
        ))
    
    total_pages = (total + page_size - 1) // page_size
    
    return TicketListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("", response_model=TicketResponse, status_code=status.HTTP_201_CREATED)
async def create_ticket(
    ticket_data: TicketCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    新しいチケットを作成する

    作成時に自動的に履歴（監査証跡）を記録する。
    """
    # Create ticket
    ticket = Ticket(
        subject=ticket_data.subject,
        description=ticket_data.description,
        type=ticket_data.type,
        category=ticket_data.category,
        impact=ticket_data.impact,
        urgency=ticket_data.urgency,
        requester_id=current_user.id,
        status=TicketStatus.NEW,
    )

    # Calculate priority
    ticket.priority = ticket.calculate_priority()

    # Generate ticket number (temporary, will be updated after insert)
    ticket.ticket_number = "TKT-TEMP"

    db.add(ticket)
    await db.flush()  # Get the ID

    # Update ticket number with actual ID
    ticket.ticket_number = Ticket.generate_ticket_number(ticket.id)

    # SLAポリシーに基づいて期限を計算
    ticket.due_at = await calculate_ticket_deadline(db, ticket.priority, ticket.created_at)

    # チケット作成の履歴を記録
    await record_ticket_history(
        db=db,
        ticket_id=ticket.id,
        actor_id=current_user.id,
        action=HistoryAction.CREATED,
        field_name=None,
        before=None,
        after=json.dumps({
            "ticket_number": ticket.ticket_number,
            "subject": ticket.subject,
            "type": ticket.type.value,
            "status": ticket.status.value,
            "priority": ticket.priority.value,
            "category": ticket.category.value,
        }),
    )

    await db.commit()
    await db.refresh(ticket)
    
    # Load relationships
    result = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.requester))
        .where(Ticket.id == ticket.id)
    )
    ticket = result.scalar_one()
    
    return TicketResponse(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        subject=ticket.subject,
        description=ticket.description,
        type=ticket.type.value,
        status=ticket.status.value,
        priority=ticket.priority.value,
        category=ticket.category.value,
        impact=ticket.impact,
        urgency=ticket.urgency,
        requester_id=ticket.requester_id,
        requester_name=ticket.requester.display_name,
        assignee_id=ticket.assignee_id,
        assignee_name=None,
        due_at=ticket.due_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        resolved_at=ticket.resolved_at,
        closed_at=ticket.closed_at,
    )


class TicketDetailResponse(BaseModel):
    """Schema for detailed ticket response with related data."""
    ticket: TicketResponse
    comments: list[CommentResponse]
    attachments: list[AttachmentResponse]
    history: list[TicketHistoryResponse]

    class Config:
        from_attributes = True


@router.get("/{ticket_id}", response_model=TicketResponse)
async def get_ticket(
    ticket_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get a single ticket by ID."""
    result = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.requester), selectinload(Ticket.assignee))
        .where(Ticket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    # Check access
    if current_user.role == UserRole.REQUESTER and ticket.requester_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    return TicketResponse(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        subject=ticket.subject,
        description=ticket.description,
        type=ticket.type.value,
        status=ticket.status.value,
        priority=ticket.priority.value,
        category=ticket.category.value,
        impact=ticket.impact,
        urgency=ticket.urgency,
        requester_id=ticket.requester_id,
        requester_name=ticket.requester.display_name if ticket.requester else None,
        assignee_id=ticket.assignee_id,
        assignee_name=ticket.assignee.display_name if ticket.assignee else None,
        due_at=ticket.due_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        resolved_at=ticket.resolved_at,
        closed_at=ticket.closed_at,
    )


@router.get("/{ticket_id}/detail", response_model=TicketDetailResponse)
async def get_ticket_detail(
    ticket_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    Get comprehensive ticket details including comments, attachments, and history.

    This endpoint returns all related data in a single request for better performance.
    """
    # Get ticket
    result = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.requester), selectinload(Ticket.assignee))
        .where(Ticket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    # Check access
    if current_user.role == UserRole.REQUESTER and ticket.requester_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # Get comments
    comments_query = (
        select(Comment)
        .options(selectinload(Comment.author))
        .where(Comment.ticket_id == ticket_id)
    )
    if current_user.role == UserRole.REQUESTER:
        comments_query = comments_query.where(Comment.visibility == CommentVisibility.PUBLIC)
    comments_query = comments_query.order_by(Comment.created_at.asc())

    comments_result = await db.execute(comments_query)
    comments = comments_result.scalars().all()

    # Get attachments
    attachments_query = (
        select(Attachment)
        .options(selectinload(Attachment.uploader))
        .where(Attachment.ticket_id == ticket_id)
        .order_by(Attachment.created_at.desc())
    )
    attachments_result = await db.execute(attachments_query)
    attachments = attachments_result.scalars().all()

    # Get history (last 50 entries)
    history_query = (
        select(TicketHistory)
        .options(selectinload(TicketHistory.actor))
        .where(TicketHistory.ticket_id == ticket_id)
        .order_by(TicketHistory.created_at.desc())
        .limit(50)
    )
    history_result = await db.execute(history_query)
    history_entries = history_result.scalars().all()

    # Build ticket response
    ticket_response = TicketResponse(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        subject=ticket.subject,
        description=ticket.description,
        type=ticket.type.value,
        status=ticket.status.value,
        priority=ticket.priority.value,
        category=ticket.category.value,
        impact=ticket.impact,
        urgency=ticket.urgency,
        requester_id=ticket.requester_id,
        requester_name=ticket.requester.display_name if ticket.requester else None,
        assignee_id=ticket.assignee_id,
        assignee_name=ticket.assignee.display_name if ticket.assignee else None,
        due_at=ticket.due_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        resolved_at=ticket.resolved_at,
        closed_at=ticket.closed_at,
    )

    # Build comments response
    comments_response = [
        CommentResponse(
            id=c.id,
            ticket_id=c.ticket_id,
            author_id=c.author_id,
            author_name=c.author.display_name if c.author else None,
            content=c.content,
            visibility=c.visibility.value,
            created_at=c.created_at,
        )
        for c in comments
    ]

    # Build attachments response
    attachments_response = [
        AttachmentResponse(
            id=a.id,
            ticket_id=a.ticket_id,
            filename=a.filename,
            original_filename=a.original_filename,
            content_type=a.content_type,
            size=a.size,
            hash=a.hash,
            uploader_id=a.uploader_id,
            uploader_name=a.uploader.display_name if a.uploader else None,
            created_at=a.created_at,
        )
        for a in attachments
    ]

    # Build history response
    history_response = [
        TicketHistoryResponse(
            id=h.id,
            ticket_id=h.ticket_id,
            actor_id=h.actor_id,
            actor_name=h.actor.display_name if h.actor else None,
            action=h.action.value,
            field_name=h.field_name,
            before=h.before,
            after=h.after,
            reason=h.reason,
            created_at=h.created_at,
        )
        for h in history_entries
    ]

    return TicketDetailResponse(
        ticket=ticket_response,
        comments=comments_response,
        attachments=attachments_response,
        history=history_response,
    )


@router.patch("/{ticket_id}", response_model=TicketResponse)
async def update_ticket(
    ticket_id: int,
    ticket_data: TicketUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    チケットを更新する

    更新時に自動的に履歴（監査証跡）を記録する。
    """
    result = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.requester), selectinload(Ticket.assignee))
        .where(Ticket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    # Only staff can update tickets
    if current_user.role == UserRole.REQUESTER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff can update tickets",
        )

    # Update fields
    update_data = ticket_data.model_dump(exclude_unset=True)

    # 履歴を記録（変更を適用する前に）
    await record_ticket_changes(
        db=db,
        ticket=ticket,
        update_data=update_data,
        actor_id=current_user.id,
    )

    # 変更を適用
    for field, value in update_data.items():
        setattr(ticket, field, value)

    # 優先度が変更された場合、期限を再計算
    if ticket_data.priority is not None:
        ticket.due_at = await calculate_ticket_deadline(db, ticket.priority, ticket.created_at)

    # Handle status transitions
    if ticket_data.status == TicketStatus.RESOLVED:
        ticket.resolved_at = datetime.now(timezone.utc)
    elif ticket_data.status == TicketStatus.CLOSED:
        ticket.closed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(ticket)

    return TicketResponse(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        subject=ticket.subject,
        description=ticket.description,
        type=ticket.type.value,
        status=ticket.status.value,
        priority=ticket.priority.value,
        category=ticket.category.value,
        impact=ticket.impact,
        urgency=ticket.urgency,
        requester_id=ticket.requester_id,
        requester_name=ticket.requester.display_name if ticket.requester else None,
        assignee_id=ticket.assignee_id,
        assignee_name=ticket.assignee.display_name if ticket.assignee else None,
        due_at=ticket.due_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        resolved_at=ticket.resolved_at,
        closed_at=ticket.closed_at,
    )


@router.patch("/{ticket_id}/status", response_model=TicketResponse)
async def update_ticket_status_endpoint(
    ticket_id: int,
    status_data: TicketStatusUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    チケットのステータスを更新する専用エンドポイント

    ステータス変更時に自動的に履歴を記録する。
    """
    result = await db.execute(
        select(Ticket)
        .options(selectinload(Ticket.requester), selectinload(Ticket.assignee))
        .where(Ticket.id == ticket_id)
    )
    ticket = result.scalar_one_or_none()

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    # Only staff can update ticket status
    if current_user.role == UserRole.REQUESTER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff can update ticket status",
        )

    # Record status change in history
    old_status = ticket.status
    new_status = status_data.status

    if old_status != new_status:
        action = _determine_action("status", old_status, new_status)

        await record_ticket_history(
            db=db,
            ticket_id=ticket.id,
            actor_id=current_user.id,
            action=action,
            field_name="status",
            before=old_status,
            after=new_status,
            reason=status_data.reason,
        )

        # Update status
        ticket.status = new_status

        # Handle status transitions
        if new_status == TicketStatus.RESOLVED:
            ticket.resolved_at = datetime.now(timezone.utc)
        elif new_status == TicketStatus.CLOSED:
            ticket.closed_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(ticket)

    return TicketResponse(
        id=ticket.id,
        ticket_number=ticket.ticket_number,
        subject=ticket.subject,
        description=ticket.description,
        type=ticket.type.value,
        status=ticket.status.value,
        priority=ticket.priority.value,
        category=ticket.category.value,
        impact=ticket.impact,
        urgency=ticket.urgency,
        requester_id=ticket.requester_id,
        requester_name=ticket.requester.display_name if ticket.requester else None,
        assignee_id=ticket.assignee_id,
        assignee_name=ticket.assignee.display_name if ticket.assignee else None,
        due_at=ticket.due_at,
        created_at=ticket.created_at,
        updated_at=ticket.updated_at,
        resolved_at=ticket.resolved_at,
        closed_at=ticket.closed_at,
    )


@router.get("/{ticket_id}/comments", response_model=list[CommentResponse])
async def list_comments(
    ticket_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    """List comments for a ticket."""
    # Verify ticket exists and user has access
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()
    
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    
    if current_user.role == UserRole.REQUESTER and ticket.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Build query
    query = select(Comment).options(selectinload(Comment.author)).where(Comment.ticket_id == ticket_id)
    
    # Requesters can only see public comments
    if current_user.role == UserRole.REQUESTER:
        query = query.where(Comment.visibility == CommentVisibility.PUBLIC)
    
    query = query.order_by(Comment.created_at.asc())
    
    result = await db.execute(query)
    comments = result.scalars().all()
    
    return [
        CommentResponse(
            id=c.id,
            ticket_id=c.ticket_id,
            author_id=c.author_id,
            author_name=c.author.display_name if c.author else None,
            content=c.content,
            visibility=c.visibility.value,
            created_at=c.created_at,
        )
        for c in comments
    ]


@router.post("/{ticket_id}/comments", response_model=CommentResponse, status_code=201)
async def create_comment(
    ticket_id: int,
    comment_data: CommentCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Add a comment to a ticket."""
    # Verify ticket exists
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Requesters can only comment on their own tickets
    if current_user.role == UserRole.REQUESTER:
        if ticket.requester_id != current_user.id:
            raise HTTPException(status_code=403, detail="Access denied")
        # Requesters can only create public comments
        comment_data.visibility = CommentVisibility.PUBLIC

    # Log comment creation with PII masking
    logger.info(
        f"Creating comment on ticket #{ticket.ticket_number} by user {current_user.id}: "
        f"{preview_pii(comment_data.content, max_length=80)}"
    )

    comment = Comment(
        ticket_id=ticket_id,
        author_id=current_user.id,
        content=comment_data.content,
        visibility=comment_data.visibility,
    )

    db.add(comment)
    await db.commit()
    await db.refresh(comment)

    logger.info(f"Comment {comment.id} created successfully on ticket #{ticket.ticket_number}")

    return CommentResponse(
        id=comment.id,
        ticket_id=comment.ticket_id,
        author_id=comment.author_id,
        author_name=current_user.display_name,
        content=comment.content,
        visibility=comment.visibility.value,
        created_at=comment.created_at,
    )


# ============== Attachments ==============

@router.get("/{ticket_id}/attachments", response_model=list[AttachmentResponse])
async def list_attachments(
    ticket_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    """List attachments for a ticket."""
    # Verify ticket exists and user has access
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if current_user.role == UserRole.REQUESTER and ticket.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get attachments
    query = (
        select(Attachment)
        .options(selectinload(Attachment.uploader))
        .where(Attachment.ticket_id == ticket_id)
        .order_by(Attachment.created_at.desc())
    )

    result = await db.execute(query)
    attachments = result.scalars().all()

    return [
        AttachmentResponse(
            id=a.id,
            ticket_id=a.ticket_id,
            filename=a.filename,
            original_filename=a.original_filename,
            content_type=a.content_type,
            size=a.size,
            hash=a.hash,
            uploader_id=a.uploader_id,
            uploader_name=a.uploader.display_name if a.uploader else None,
            created_at=a.created_at,
        )
        for a in attachments
    ]


@router.post("/{ticket_id}/attachments", response_model=AttachmentResponse, status_code=201)
async def upload_attachment(
    ticket_id: int,
    current_user: CurrentUser,
    db: DbSession,
    file: UploadFile = File(...),
):
    """Upload an attachment to a ticket."""
    # Verify ticket exists
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    # Requesters can only upload to their own tickets
    if current_user.role == UserRole.REQUESTER and ticket.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Validate file extension
    original_filename = file.filename or "unknown"
    file_ext = Path(original_filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type '{file_ext}' is not allowed. Allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}"
        )

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=400,
            detail=f"File size exceeds maximum of {MAX_FILE_SIZE // (1024 * 1024)}MB"
        )

    # Calculate SHA-256 hash for integrity
    file_hash = hashlib.sha256(content).hexdigest()

    # Generate unique filename
    unique_id = uuid.uuid4().hex[:12]
    safe_filename = f"{unique_id}{file_ext}"

    # Ensure upload directory exists
    upload_dir = Path("data/uploads") / str(ticket_id)
    upload_dir.mkdir(parents=True, exist_ok=True)

    # Save file
    file_path = upload_dir / safe_filename
    with open(file_path, "wb") as f:
        f.write(content)

    # Create attachment record
    attachment = Attachment(
        ticket_id=ticket_id,
        filename=safe_filename,
        original_filename=original_filename,
        content_type=file.content_type or "application/octet-stream",
        size=len(content),
        hash=file_hash,
        storage_path=str(file_path),
        uploader_id=current_user.id,
    )

    db.add(attachment)
    await db.commit()
    await db.refresh(attachment)

    return AttachmentResponse(
        id=attachment.id,
        ticket_id=attachment.ticket_id,
        filename=attachment.filename,
        original_filename=attachment.original_filename,
        content_type=attachment.content_type,
        size=attachment.size,
        hash=attachment.hash,
        uploader_id=attachment.uploader_id,
        uploader_name=current_user.display_name,
        created_at=attachment.created_at,
    )


@router.get("/{ticket_id}/attachments/{attachment_id}/download")
async def download_attachment(
    ticket_id: int,
    attachment_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    """Download an attachment file."""
    # Verify ticket exists and user has access
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()

    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")

    if current_user.role == UserRole.REQUESTER and ticket.requester_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")

    # Get attachment
    result = await db.execute(
        select(Attachment).where(
            Attachment.id == attachment_id,
            Attachment.ticket_id == ticket_id,
        )
    )
    attachment = result.scalar_one_or_none()

    if attachment is None:
        raise HTTPException(status_code=404, detail="Attachment not found")

    # Check if file exists
    file_path = Path(attachment.storage_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on storage")

    # Return file
    return FileResponse(
        path=str(file_path),
        filename=attachment.original_filename,
        media_type=attachment.content_type,
    )


# ============== History ==============

@router.get("/{ticket_id}/history", response_model=TicketHistoryListResponse)
async def get_ticket_history(
    ticket_id: int,
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
    action: HistoryAction | None = None,
):
    """
    チケットの変更履歴を取得する

    変更不可の監査証跡として、チケットに対する全ての変更を時系列で返す。
    記録内容: 誰が(actor_id)、いつ(created_at)、何を(action)、変更前(before)、変更後(after)

    - 依頼者は自分のチケットの履歴のみ閲覧可能
    - スタッフ（Agent/Operator/Manager/Auditor）は全チケットの履歴を閲覧可能

    Args:
        ticket_id: チケットID
        page: ページ番号（1始まり）
        page_size: ページサイズ（デフォルト50、最大200）
        action: アクション種別でフィルタ（任意）

    Returns:
        TicketHistoryListResponse: ページネーション付き履歴リスト
    """
    # チケットの存在確認
    result = await db.execute(select(Ticket).where(Ticket.id == ticket_id))
    ticket = result.scalar_one_or_none()

    if ticket is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Ticket not found",
        )

    # アクセス権限チェック
    if current_user.role == UserRole.REQUESTER and ticket.requester_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied",
        )

    # クエリ構築
    query = (
        select(TicketHistory)
        .options(selectinload(TicketHistory.actor))
        .where(TicketHistory.ticket_id == ticket_id)
    )

    # アクションでフィルタ
    if action:
        query = query.where(TicketHistory.action == action)

    # 総件数取得
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # ページネーション（新しい順に取得）
    offset = (page - 1) * page_size
    query = query.order_by(TicketHistory.created_at.desc()).offset(offset).limit(page_size)

    result = await db.execute(query)
    history_entries = result.scalars().all()

    # レスポンス構築
    items = [
        TicketHistoryResponse(
            id=h.id,
            ticket_id=h.ticket_id,
            actor_id=h.actor_id,
            actor_name=h.actor.display_name if h.actor else None,
            action=h.action.value,
            field_name=h.field_name,
            before=h.before,
            after=h.after,
            reason=h.reason,
            created_at=h.created_at,
        )
        for h in history_entries
    ]

    total_pages = (total + page_size - 1) // page_size

    return TicketHistoryListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )
