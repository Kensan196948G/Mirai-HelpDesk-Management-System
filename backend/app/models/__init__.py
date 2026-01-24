"""
Database Models

All SQLAlchemy ORM models for the HelpDesk system.
"""

from app.models.user import User, UserRole
from app.models.ticket import Ticket, TicketStatus, TicketType, TicketPriority, TicketCategory
from app.models.comment import Comment, CommentVisibility
from app.models.attachment import Attachment
from app.models.approval import Approval, ApprovalStatus
from app.models.m365_task import M365Task, M365TaskType, M365TaskStatus, M365ExecutionLog
from app.models.knowledge import KnowledgeArticle, KnowledgeVisibility
from app.models.audit_log import AuditLog, AuditAction
from app.models.ticket_history import TicketHistory, HistoryAction
from app.models.sla_policy import SLAPolicy

__all__ = [
    # User
    "User",
    "UserRole",
    # Ticket
    "Ticket",
    "TicketStatus",
    "TicketType",
    "TicketPriority",
    "TicketCategory",
    # Comment
    "Comment",
    "CommentVisibility",
    # Attachment
    "Attachment",
    # Approval
    "Approval",
    "ApprovalStatus",
    # M365
    "M365Task",
    "M365TaskType",
    "M365TaskStatus",
    "M365ExecutionLog",
    # Knowledge
    "KnowledgeArticle",
    "KnowledgeVisibility",
    # Audit
    "AuditLog",
    "AuditAction",
    # Ticket History
    "TicketHistory",
    "HistoryAction",
    # SLA Policy
    "SLAPolicy",
]
