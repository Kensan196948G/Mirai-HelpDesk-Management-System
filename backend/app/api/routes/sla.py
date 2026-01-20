"""
SLA Policy Routes

SLAポリシーの管理エンドポイント
"""

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.sla_policy import SLAPolicy
from app.models.ticket import TicketPriority
from app.models.user import UserRole
from app.api.deps import CurrentUser, DbSession, require_roles


router = APIRouter()


# ============== Schemas ==============

class SLAPolicyCreate(BaseModel):
    """SLAポリシー作成スキーマ"""
    name: str = Field(..., min_length=1, max_length=100)
    description: str | None = None
    priority: TicketPriority
    response_time_hours: float = Field(..., gt=0)
    resolution_time_hours: float = Field(..., gt=0)
    is_active: bool = True


class SLAPolicyUpdate(BaseModel):
    """SLAポリシー更新スキーマ"""
    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    response_time_hours: float | None = Field(None, gt=0)
    resolution_time_hours: float | None = Field(None, gt=0)
    is_active: bool | None = None


class SLAPolicyResponse(BaseModel):
    """SLAポリシーレスポンススキーマ"""
    id: int
    name: str
    description: str | None
    priority: str
    response_time_hours: float
    resolution_time_hours: float
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class DeadlineCalculationRequest(BaseModel):
    """期限計算リクエストスキーマ"""
    priority: TicketPriority
    created_at: datetime | None = None  # Noneの場合は現在時刻を使用


class DeadlineCalculationResponse(BaseModel):
    """期限計算レスポンススキーマ"""
    priority: str
    created_at: datetime
    response_deadline: datetime  # 初動対応期限
    resolution_deadline: datetime  # 解決期限
    response_time_hours: float
    resolution_time_hours: float


# ============== Routes ==============

@router.get("/policies", response_model=list[SLAPolicyResponse])
async def list_sla_policies(
    current_user: CurrentUser,
    db: DbSession,
    is_active: bool | None = Query(None, description="アクティブなポリシーのみ取得"),
):
    """
    SLAポリシー一覧を取得

    全ユーザーがアクセス可能。
    """
    query = select(SLAPolicy).order_by(SLAPolicy.priority)

    if is_active is not None:
        query = query.where(SLAPolicy.is_active == is_active)

    result = await db.execute(query)
    policies = result.scalars().all()

    return [
        SLAPolicyResponse(
            id=p.id,
            name=p.name,
            description=p.description,
            priority=p.priority.value,
            response_time_hours=p.response_time_hours,
            resolution_time_hours=p.resolution_time_hours,
            is_active=p.is_active,
            created_at=p.created_at,
            updated_at=p.updated_at,
        )
        for p in policies
    ]


@router.get("/policies/{policy_id}", response_model=SLAPolicyResponse)
async def get_sla_policy(
    policy_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    特定のSLAポリシーを取得

    全ユーザーがアクセス可能。
    """
    result = await db.execute(select(SLAPolicy).where(SLAPolicy.id == policy_id))
    policy = result.scalar_one_or_none()

    if policy is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SLA policy not found",
        )

    return SLAPolicyResponse(
        id=policy.id,
        name=policy.name,
        description=policy.description,
        priority=policy.priority.value,
        response_time_hours=policy.response_time_hours,
        resolution_time_hours=policy.resolution_time_hours,
        is_active=policy.is_active,
        created_at=policy.created_at,
        updated_at=policy.updated_at,
    )


@router.post("/policies", response_model=SLAPolicyResponse, status_code=status.HTTP_201_CREATED)
async def create_sla_policy(
    policy_data: SLAPolicyCreate,
    current_user: Annotated[CurrentUser, Depends(require_roles([UserRole.MANAGER]))],
    db: DbSession,
):
    """
    新しいSLAポリシーを作成

    Manager権限が必要。
    同じ優先度のポリシーが既に存在する場合はエラー。
    """
    # 同じ優先度のポリシーが既に存在するかチェック
    result = await db.execute(
        select(SLAPolicy).where(SLAPolicy.priority == policy_data.priority)
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"SLA policy for priority {policy_data.priority.value} already exists",
        )

    policy = SLAPolicy(
        name=policy_data.name,
        description=policy_data.description,
        priority=policy_data.priority,
        response_time_hours=policy_data.response_time_hours,
        resolution_time_hours=policy_data.resolution_time_hours,
        is_active=policy_data.is_active,
    )

    db.add(policy)
    await db.commit()
    await db.refresh(policy)

    return SLAPolicyResponse(
        id=policy.id,
        name=policy.name,
        description=policy.description,
        priority=policy.priority.value,
        response_time_hours=policy.response_time_hours,
        resolution_time_hours=policy.resolution_time_hours,
        is_active=policy.is_active,
        created_at=policy.created_at,
        updated_at=policy.updated_at,
    )


@router.patch("/policies/{policy_id}", response_model=SLAPolicyResponse)
async def update_sla_policy(
    policy_id: int,
    policy_data: SLAPolicyUpdate,
    current_user: Annotated[CurrentUser, Depends(require_roles([UserRole.MANAGER]))],
    db: DbSession,
):
    """
    SLAポリシーを更新

    Manager権限が必要。
    """
    result = await db.execute(select(SLAPolicy).where(SLAPolicy.id == policy_id))
    policy = result.scalar_one_or_none()

    if policy is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SLA policy not found",
        )

    # 更新データを適用
    update_data = policy_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(policy, field, value)

    await db.commit()
    await db.refresh(policy)

    return SLAPolicyResponse(
        id=policy.id,
        name=policy.name,
        description=policy.description,
        priority=policy.priority.value,
        response_time_hours=policy.response_time_hours,
        resolution_time_hours=policy.resolution_time_hours,
        is_active=policy.is_active,
        created_at=policy.created_at,
        updated_at=policy.updated_at,
    )


@router.delete("/policies/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_sla_policy(
    policy_id: int,
    current_user: Annotated[CurrentUser, Depends(require_roles([UserRole.MANAGER]))],
    db: DbSession,
):
    """
    SLAポリシーを削除

    Manager権限が必要。

    注意: 実運用では論理削除（is_active=False）を推奨。
    """
    result = await db.execute(select(SLAPolicy).where(SLAPolicy.id == policy_id))
    policy = result.scalar_one_or_none()

    if policy is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="SLA policy not found",
        )

    await db.delete(policy)
    await db.commit()

    return None


@router.post("/calculate-deadline", response_model=DeadlineCalculationResponse)
async def calculate_deadline(
    request: DeadlineCalculationRequest,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    チケットの期限を計算

    指定された優先度とSLAポリシーに基づいて、初動対応期限と解決期限を計算する。

    使用例:
    - チケット作成時の自動期限設定
    - 優先度変更時の期限再計算
    """
    # SLAポリシーを取得
    result = await db.execute(
        select(SLAPolicy).where(
            SLAPolicy.priority == request.priority,
            SLAPolicy.is_active == True,
        )
    )
    policy = result.scalar_one_or_none()

    if policy is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active SLA policy found for priority {request.priority.value}",
        )

    # 基準時刻（指定がない場合は現在時刻）
    base_time = request.created_at if request.created_at else datetime.now(timezone.utc)

    # 期限を計算
    response_deadline = base_time + timedelta(hours=policy.response_time_hours)
    resolution_deadline = base_time + timedelta(hours=policy.resolution_time_hours)

    return DeadlineCalculationResponse(
        priority=request.priority.value,
        created_at=base_time,
        response_deadline=response_deadline,
        resolution_deadline=resolution_deadline,
        response_time_hours=policy.response_time_hours,
        resolution_time_hours=policy.resolution_time_hours,
    )


@router.get("/policies/by-priority/{priority}", response_model=SLAPolicyResponse)
async def get_sla_policy_by_priority(
    priority: TicketPriority,
    current_user: CurrentUser,
    db: DbSession,
):
    """
    優先度からSLAポリシーを取得

    チケット作成時の期限計算に使用。
    """
    result = await db.execute(
        select(SLAPolicy).where(
            SLAPolicy.priority == priority,
            SLAPolicy.is_active == True,
        )
    )
    policy = result.scalar_one_or_none()

    if policy is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No active SLA policy found for priority {priority.value}",
        )

    return SLAPolicyResponse(
        id=policy.id,
        name=policy.name,
        description=policy.description,
        priority=policy.priority.value,
        response_time_hours=policy.response_time_hours,
        resolution_time_hours=policy.resolution_time_hours,
        is_active=policy.is_active,
        created_at=policy.created_at,
        updated_at=policy.updated_at,
    )
