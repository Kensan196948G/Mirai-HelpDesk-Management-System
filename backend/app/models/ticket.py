"""
Ticket Model

Core ticket entity for incidents and service requests.
"""

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User
    from app.models.comment import Comment
    from app.models.attachment import Attachment
    from app.models.approval import Approval
    from app.models.m365_task import M365Task
    from app.models.ticket_history import TicketHistory


class TicketType(str, enum.Enum):
    """Type of ticket."""
    INCIDENT = "incident"            # 障害・不具合
    SERVICE_REQUEST = "service_request"  # サービス依頼
    M365_REQUEST = "m365_request"    # M365関連依頼


class TicketStatus(str, enum.Enum):
    """Ticket lifecycle status."""
    NEW = "new"                      # 新規
    TRIAGE = "triage"                # 受付・分類中
    ASSIGNED = "assigned"            # 担当割当済
    IN_PROGRESS = "in_progress"      # 対応中
    PENDING_CUSTOMER = "pending_customer"  # 利用者回答待ち
    PENDING_APPROVAL = "pending_approval"  # 承認待ち
    PENDING_CHANGE = "pending_change"      # 実施待ち（時間帯指定）
    RESOLVED = "resolved"            # 解決（クローズ待ち）
    CLOSED = "closed"                # 完了
    CANCELED = "canceled"            # 取消
    REOPENED = "reopened"            # 再開


class TicketPriority(str, enum.Enum):
    """Priority levels (P1=Critical, P4=Low)."""
    P1 = "p1"  # 全社停止
    P2 = "p2"  # 部門影響
    P3 = "p3"  # 個人影響
    P4 = "p4"  # 問い合わせ


class TicketCategory(str, enum.Enum):
    """Ticket categories."""
    ACCOUNT = "account"              # アカウント関連
    LICENSE = "license"              # ライセンス
    EMAIL = "email"                  # メール
    TEAMS = "teams"                  # Teams
    ONEDRIVE = "onedrive"            # OneDrive
    SHAREPOINT = "sharepoint"        # SharePoint
    SECURITY = "security"            # セキュリティ
    NETWORK = "network"              # ネットワーク
    HARDWARE = "hardware"            # ハードウェア
    SOFTWARE = "software"            # ソフトウェア
    OTHER = "other"                  # その他


class Ticket(Base):
    """Main ticket model."""
    
    __tablename__ = "tickets"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ticket_number: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    
    # Basic info
    subject: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Classification
    type: Mapped[TicketType] = mapped_column(Enum(TicketType), nullable=False)
    status: Mapped[TicketStatus] = mapped_column(Enum(TicketStatus), default=TicketStatus.NEW, nullable=False)
    priority: Mapped[TicketPriority] = mapped_column(Enum(TicketPriority), default=TicketPriority.P3, nullable=False)
    category: Mapped[TicketCategory] = mapped_column(Enum(TicketCategory), nullable=False)
    
    # Impact & Urgency (for priority calculation)
    impact: Mapped[int] = mapped_column(Integer, default=2, nullable=False)  # 1-4
    urgency: Mapped[int] = mapped_column(Integer, default=2, nullable=False)  # 1-4
    
    # Users
    requester_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    assignee_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    
    # SLA tracking
    due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    first_response_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Resolution
    resolution_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolution_category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    satisfaction_rating: Mapped[int | None] = mapped_column(Integer, nullable=True)  # 1-5
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    requester: Mapped["User"] = relationship(
        "User", back_populates="requested_tickets", foreign_keys=[requester_id]
    )
    assignee: Mapped["User | None"] = relationship(
        "User", back_populates="assigned_tickets", foreign_keys=[assignee_id]
    )
    comments: Mapped[list["Comment"]] = relationship("Comment", back_populates="ticket", cascade="all, delete-orphan")
    attachments: Mapped[list["Attachment"]] = relationship("Attachment", back_populates="ticket", cascade="all, delete-orphan")
    approvals: Mapped[list["Approval"]] = relationship("Approval", back_populates="ticket", cascade="all, delete-orphan")
    m365_tasks: Mapped[list["M365Task"]] = relationship("M365Task", back_populates="ticket", cascade="all, delete-orphan")
    history: Mapped[list["TicketHistory"]] = relationship("TicketHistory", back_populates="ticket", cascade="all, delete-orphan")
    
    def __repr__(self) -> str:
        return f"<Ticket(id={self.id}, number={self.ticket_number}, status={self.status})>"
    
    @staticmethod
    def generate_ticket_number(ticket_id: int) -> str:
        """Generate ticket number like TKT-2024-00001."""
        from datetime import datetime
        year = datetime.now().year
        return f"TKT-{year}-{ticket_id:05d}"
    
    def calculate_priority(self) -> TicketPriority:
        """Calculate priority from impact and urgency."""
        matrix = {
            (1, 1): TicketPriority.P1, (1, 2): TicketPriority.P1, (2, 1): TicketPriority.P1,
            (1, 3): TicketPriority.P2, (2, 2): TicketPriority.P2, (3, 1): TicketPriority.P2,
            (1, 4): TicketPriority.P3, (2, 3): TicketPriority.P3, (3, 2): TicketPriority.P3, (4, 1): TicketPriority.P3,
            (2, 4): TicketPriority.P4, (3, 3): TicketPriority.P4, (3, 4): TicketPriority.P4,
            (4, 2): TicketPriority.P4, (4, 3): TicketPriority.P4, (4, 4): TicketPriority.P4,
        }
        return matrix.get((self.impact, self.urgency), TicketPriority.P3)
