"""
User Routes

User management endpoints.
"""

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, EmailStr
from sqlalchemy import func, select

from app.models.user import User, UserRole
from app.core.security import get_password_hash
from app.api.deps import CurrentUser, DbSession, require_roles


router = APIRouter()


# ============== Schemas ==============

class UserCreate(BaseModel):
    """Schema for creating a user."""
    email: EmailStr
    password: str
    display_name: str
    department: str | None = None
    role: UserRole = UserRole.REQUESTER


class UserUpdate(BaseModel):
    """Schema for updating a user."""
    display_name: str | None = None
    department: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    """Schema for user response."""
    id: int
    email: str
    display_name: str
    department: str | None
    role: str
    is_active: bool
    created_at: str
    last_login_at: str | None
    
    class Config:
        from_attributes = True


class UserListResponse(BaseModel):
    """Schema for paginated user list."""
    items: list[UserResponse]
    total: int
    page: int
    page_size: int


# ============== Routes ==============

@router.get("", response_model=UserListResponse)
async def list_users(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    role: UserRole | None = None,
    is_active: bool | None = None,
):
    """List users (Manager only)."""
    if current_user.role != UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Access denied")
    
    query = select(User)
    
    if role:
        query = query.where(User.role == role)
    if is_active is not None:
        query = query.where(User.is_active == is_active)
    
    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    
    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(User.display_name).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    users = result.scalars().all()
    
    items = [
        UserResponse(
            id=u.id,
            email=u.email,
            display_name=u.display_name,
            department=u.department,
            role=u.role.value,
            is_active=u.is_active,
            created_at=u.created_at.isoformat(),
            last_login_at=u.last_login_at.isoformat() if u.last_login_at else None,
        )
        for u in users
    ]
    
    return UserListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    data: UserCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Create a new user (Manager only)."""
    if current_user.role != UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Access denied")
    
    # Check if email exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    
    user = User(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        display_name=data.display_name,
        department=data.department,
        role=data.role,
    )
    
    db.add(user)
    await db.commit()
    await db.refresh(user)
    
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        department=user.department,
        role=user.role.value,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
        last_login_at=None,
    )


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get a single user."""
    # Users can view themselves, managers can view anyone
    if current_user.id != user_id and current_user.role != UserRole.MANAGER:
        raise HTTPException(status_code=403, detail="Access denied")
    
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        department=user.department,
        role=user.role.value,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
        last_login_at=user.last_login_at.isoformat() if user.last_login_at else None,
    )


@router.patch("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    data: UserUpdate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Update a user (Manager only, or self for limited fields)."""
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Check permissions
    if current_user.role != UserRole.MANAGER:
        if current_user.id != user_id:
            raise HTTPException(status_code=403, detail="Access denied")
        # Self-update: only allow display_name
        if data.role is not None or data.is_active is not None:
            raise HTTPException(
                status_code=403,
                detail="You can only update your display name",
            )
    
    # Update fields
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(user, field, value)
    
    await db.commit()
    await db.refresh(user)
    
    return UserResponse(
        id=user.id,
        email=user.email,
        display_name=user.display_name,
        department=user.department,
        role=user.role.value,
        is_active=user.is_active,
        created_at=user.created_at.isoformat(),
        last_login_at=user.last_login_at.isoformat() if user.last_login_at else None,
    )
