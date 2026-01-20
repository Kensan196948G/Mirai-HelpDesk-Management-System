"""
Audit Log Model

Immutable audit trail for all system operations.
Required for compliance and security auditing.
"""

import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AuditAction(str, enum.Enum):
    """Types of auditable actions."""
    # Authentication
    LOGIN = "login"
    LOGOUT = "logout"
    LOGIN_FAILED = "login_failed"
    
    # Tickets
    TICKET_CREATE = "ticket_create"
    TICKET_UPDATE = "ticket_update"
    TICKET_STATUS_CHANGE = "ticket_status_change"
    TICKET_ASSIGN = "ticket_assign"
    TICKET_ESCALATE = "ticket_escalate"
    TICKET_CLOSE = "ticket_close"
    TICKET_REOPEN = "ticket_reopen"
    
    # Comments
    COMMENT_CREATE = "comment_create"
    COMMENT_UPDATE = "comment_update"
    
    # Attachments
    ATTACHMENT_UPLOAD = "attachment_upload"
    ATTACHMENT_DOWNLOAD = "attachment_download"
    
    # Approvals
    APPROVAL_REQUEST = "approval_request"
    APPROVAL_APPROVE = "approval_approve"
    APPROVAL_REJECT = "approval_reject"
    
    # M365 Operations
    M365_TASK_CREATE = "m365_task_create"
    M365_TASK_EXECUTE = "m365_task_execute"
    M365_TASK_COMPLETE = "m365_task_complete"
    M365_TASK_FAIL = "m365_task_fail"
    M365_TASK_ROLLBACK = "m365_task_rollback"
    
    # Knowledge
    KNOWLEDGE_CREATE = "knowledge_create"
    KNOWLEDGE_UPDATE = "knowledge_update"
    KNOWLEDGE_PUBLISH = "knowledge_publish"
    KNOWLEDGE_UNPUBLISH = "knowledge_unpublish"
    
    # User Management
    USER_CREATE = "user_create"
    USER_UPDATE = "user_update"
    USER_ROLE_CHANGE = "user_role_change"
    USER_DEACTIVATE = "user_deactivate"
    
    # System
    SETTINGS_CHANGE = "settings_change"
    EXPORT_DATA = "export_data"


class AuditLog(Base):
    """
    Immutable audit log entry.
    
    This table is append-only. Records should never be updated or deleted.
    All operations are logged with: who, when, what, and why.
    """
    
    __tablename__ = "audit_logs"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    
    # Who
    actor_id: Mapped[int | None] = mapped_column(Integer, nullable=True)  # NULL for system actions
    actor_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    actor_ip: Mapped[str | None] = mapped_column(String(45), nullable=True)  # IPv6 support
    actor_user_agent: Mapped[str | None] = mapped_column(String(500), nullable=True)
    
    # What
    action: Mapped[AuditAction] = mapped_column(Enum(AuditAction), nullable=False, index=True)
    resource_type: Mapped[str] = mapped_column(String(50), nullable=False)  # ticket, user, knowledge, etc.
    resource_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    # Details
    description: Mapped[str] = mapped_column(Text, nullable=False)
    old_value: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    new_value: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON
    
    # Why (optional context)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Related ticket (for traceability)
    related_ticket_id: Mapped[int | None] = mapped_column(Integer, nullable=True)
    
    # When
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False, index=True
    )
    
    def __repr__(self) -> str:
        return f"<AuditLog(id={self.id}, action={self.action}, resource={self.resource_type}:{self.resource_id})>"
    
    @classmethod
    def create_log(
        cls,
        action: AuditAction,
        resource_type: str,
        description: str,
        actor_id: int | None = None,
        actor_email: str | None = None,
        actor_ip: str | None = None,
        resource_id: int | None = None,
        old_value: str | None = None,
        new_value: str | None = None,
        reason: str | None = None,
        related_ticket_id: int | None = None,
    ) -> "AuditLog":
        """Factory method to create audit log entry."""
        return cls(
            actor_id=actor_id,
            actor_email=actor_email,
            actor_ip=actor_ip,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            description=description,
            old_value=old_value,
            new_value=new_value,
            reason=reason,
            related_ticket_id=related_ticket_id,
        )
