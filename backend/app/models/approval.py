"""
Approval Model

Approval workflow for M365 operations and privileged actions.
"""

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.ticket import Ticket


class ApprovalStatus(str, enum.Enum):
    """Approval workflow status."""
    PENDING = "pending"    # 承認待ち
    APPROVED = "approved"  # 承認済み
    REJECTED = "rejected"  # 却下


class Approval(Base):
    """Approval record model."""
    
    __tablename__ = "approvals"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    
    # Approval details
    request_reason: Mapped[str] = mapped_column(Text, nullable=False)
    approver_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    status: Mapped[ApprovalStatus] = mapped_column(
        Enum(ApprovalStatus), default=ApprovalStatus.PENDING, nullable=False
    )
    decision_comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Timestamps
    requested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="approvals")
    approver: Mapped["User | None"] = relationship("User", back_populates="approvals")
    
    def __repr__(self) -> str:
        return f"<Approval(id={self.id}, ticket_id={self.ticket_id}, status={self.status})>"
    
    def approve(self, approver_id: int, comment: str | None = None) -> None:
        """Mark approval as approved."""
        from datetime import datetime, timezone
        self.approver_id = approver_id
        self.status = ApprovalStatus.APPROVED
        self.decision_comment = comment
        self.decided_at = datetime.now(timezone.utc)
    
    def reject(self, approver_id: int, comment: str) -> None:
        """Mark approval as rejected."""
        from datetime import datetime, timezone
        self.approver_id = approver_id
        self.status = ApprovalStatus.REJECTED
        self.decision_comment = comment
        self.decided_at = datetime.now(timezone.utc)
