"""
User Model

Defines user accounts and roles for RBAC.
"""

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.ticket import Ticket
    from app.models.comment import Comment
    from app.models.approval import Approval


class UserRole(str, enum.Enum):
    """User roles for RBAC."""
    REQUESTER = "requester"          # 一般社員
    AGENT = "agent"                  # 一次対応
    M365_OPERATOR = "m365_operator"  # M365特権作業者
    APPROVER = "approver"            # 承認者
    MANAGER = "manager"              # 運用管理者
    AUDITOR = "auditor"              # 監査閲覧者


class User(Base):
    """User account model."""
    
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    display_name: Mapped[str] = mapped_column(String(100), nullable=False)
    department: Mapped[str | None] = mapped_column(String(100), nullable=True)
    role: Mapped[UserRole] = mapped_column(Enum(UserRole), default=UserRole.REQUESTER, nullable=False)
    
    # Status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    
    # Entra ID integration
    entra_id: Mapped[str | None] = mapped_column(String(255), unique=True, nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    requested_tickets: Mapped[list["Ticket"]] = relationship(
        "Ticket", back_populates="requester", foreign_keys="Ticket.requester_id"
    )
    assigned_tickets: Mapped[list["Ticket"]] = relationship(
        "Ticket", back_populates="assignee", foreign_keys="Ticket.assignee_id"
    )
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="author")
    approvals: Mapped[list["Approval"]] = relationship("Approval", back_populates="approver")
    
    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, role={self.role})>"
    
    def has_permission(self, required_roles: list[UserRole]) -> bool:
        """Check if user has any of the required roles."""
        return self.role in required_roles
    
    @property
    def is_staff(self) -> bool:
        """Check if user is staff (agent, operator, manager)."""
        return self.role in [UserRole.AGENT, UserRole.M365_OPERATOR, UserRole.MANAGER]
