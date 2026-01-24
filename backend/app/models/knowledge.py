"""
Knowledge Article Model

FAQ, procedures, known errors, and workarounds.
"""

import enum
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class KnowledgeVisibility(str, enum.Enum):
    """Knowledge article visibility levels."""
    PUBLIC = "public"      # 全社公開
    DEPARTMENT = "department"  # 部署限定
    IT_ONLY = "it_only"    # IT部門のみ


class KnowledgeArticle(Base):
    """Knowledge base article model."""
    
    __tablename__ = "knowledge_articles"
    
    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    
    # Content
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    
    # Classification
    category: Mapped[str] = mapped_column(String(50), nullable=False)
    tags: Mapped[str | None] = mapped_column(String(500), nullable=True)  # Comma-separated
    visibility: Mapped[KnowledgeVisibility] = mapped_column(
        Enum(KnowledgeVisibility), default=KnowledgeVisibility.PUBLIC, nullable=False
    )
    
    # Article type
    article_type: Mapped[str] = mapped_column(String(50), default="faq", nullable=False)
    # faq, procedure, known_error, workaround
    
    # Status
    is_published: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_featured: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    
    # Metrics
    view_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    helpful_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    not_helpful_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    
    # Authorship
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    
    # Related ticket (if created from ticket)
    source_ticket_id: Mapped[int | None] = mapped_column(ForeignKey("tickets.id"), nullable=True)
    
    # Timestamps
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    author: Mapped["User"] = relationship("User")
    
    def __repr__(self) -> str:
        return f"<KnowledgeArticle(id={self.id}, title={self.title[:30]}...)>"
    
    def publish(self) -> None:
        """Publish the article."""
        from datetime import datetime, timezone
        self.is_published = True
        self.published_at = datetime.now(timezone.utc)
    
    def unpublish(self) -> None:
        """Unpublish the article."""
        self.is_published = False
        self.published_at = None
    
    def increment_view(self) -> None:
        """Increment view count."""
        self.view_count += 1
    
    @property
    def helpfulness_ratio(self) -> float:
        """Calculate helpfulness ratio."""
        total = self.helpful_count + self.not_helpful_count
        if total == 0:
            return 0.0
        return self.helpful_count / total
