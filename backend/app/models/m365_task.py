"""
M365 Task Model

Microsoft 365 operations with execution logging for audit compliance.
"""

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.ticket import Ticket
    from app.models.user import User


class M365TaskType(str, enum.Enum):
    """Types of M365 operations."""
    LICENSE_ASSIGN = "license_assign"        # ライセンス付与
    LICENSE_REMOVE = "license_remove"        # ライセンス剥奪
    PASSWORD_RESET = "password_reset"        # パスワードリセット
    MFA_RESET = "mfa_reset"                  # MFAリセット
    MAILBOX_PERMISSION = "mailbox_permission"  # メールボックス権限
    GROUP_ADD = "group_add"                  # グループ追加
    GROUP_REMOVE = "group_remove"            # グループ削除
    TEAM_CREATE = "team_create"              # Teams作成
    TEAM_OWNER_CHANGE = "team_owner_change"  # Teams所有者変更
    ONEDRIVE_RESTORE = "onedrive_restore"    # OneDrive復元
    ONEDRIVE_SHARE_REVOKE = "onedrive_share_revoke"  # 共有解除
    USER_OFFBOARD = "user_offboard"          # 退職者処理
    USER_ONBOARD = "user_onboard"            # 新規ユーザー作成
    SECURITY_GROUP = "security_group"        # セキュリティグループ操作
    OTHER = "other"                          # その他


class M365TaskStatus(str, enum.Enum):
    """M365 task execution status."""
    PENDING = "pending"        # 実施待ち
    IN_PROGRESS = "in_progress"  # 実施中
    COMPLETED = "completed"    # 完了
    FAILED = "failed"          # 失敗
    ROLLED_BACK = "rolled_back"  # ロールバック済み


class M365Task(Base):
    """M365 operation task model."""
    
    __tablename__ = "m365_tasks"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets.id", ondelete="CASCADE"), nullable=False)
    
    # Task details
    task_type: Mapped[M365TaskType] = mapped_column(Enum(M365TaskType), nullable=False)
    status: Mapped[M365TaskStatus] = mapped_column(
        Enum(M365TaskStatus), default=M365TaskStatus.PENDING, nullable=False
    )
    
    # Target
    target_upn: Mapped[str | None] = mapped_column(String(255), nullable=True)  # User principal name
    target_resource_id: Mapped[str | None] = mapped_column(String(255), nullable=True)  # Group/Team ID
    target_description: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Checklist (JSON format)
    checklist: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Rollback procedure
    rollback_procedure: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Operator
    operator_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    ticket: Mapped["Ticket"] = relationship("Ticket", back_populates="m365_tasks")
    execution_logs: Mapped[list["M365ExecutionLog"]] = relationship(
        "M365ExecutionLog", back_populates="task", cascade="all, delete-orphan"
    )
    
    def __repr__(self) -> str:
        return f"<M365Task(id={self.id}, type={self.task_type}, status={self.status})>"


class M365ExecutionLog(Base):
    """Execution log for M365 operations (audit trail)."""
    
    __tablename__ = "m365_execution_logs"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("m365_tasks.id", ondelete="CASCADE"), nullable=False)
    operator_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    
    # Execution details
    action: Mapped[str] = mapped_column(String(100), nullable=False)
    method: Mapped[str] = mapped_column(String(50), nullable=False)  # admin_center, powershell, graph_api
    command_or_action: Mapped[str] = mapped_column(Text, nullable=False)
    
    # Result
    result: Mapped[str] = mapped_column(String(20), nullable=False)  # success, failure
    result_details: Mapped[str | None] = mapped_column(Text, nullable=True)
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Evidence
    evidence_attachment_id: Mapped[int | None] = mapped_column(
        ForeignKey("attachments.id"), nullable=True
    )
    
    # Timestamp
    executed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    
    # Relationships
    task: Mapped["M365Task"] = relationship("M365Task", back_populates="execution_logs")
    
    def __repr__(self) -> str:
        return f"<M365ExecutionLog(id={self.id}, task_id={self.task_id}, result={self.result})>"
