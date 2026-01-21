"""
Knowledge Routes

CRUD operations for knowledge base articles.
"""

from fastapi import APIRouter, HTTPException, Query, status
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.orm import selectinload

from app.models.knowledge import KnowledgeArticle, KnowledgeVisibility
from app.models.user import UserRole
from app.api.deps import CurrentUser, DbSession


router = APIRouter()


# ============== Schemas ==============

class KnowledgeCreate(BaseModel):
    """Schema for creating a knowledge article."""
    title: str = Field(..., min_length=5, max_length=255)
    content: str = Field(..., min_length=10)
    summary: str | None = None
    category: str = Field(..., min_length=1, max_length=50)
    tags: str | None = None
    visibility: KnowledgeVisibility = KnowledgeVisibility.PUBLIC
    article_type: str = Field(default="faq", pattern="^(faq|procedure|known_error|workaround)$")


class KnowledgeUpdate(BaseModel):
    """Schema for updating a knowledge article."""
    title: str | None = None
    content: str | None = None
    summary: str | None = None
    category: str | None = None
    tags: str | None = None
    visibility: KnowledgeVisibility | None = None
    is_published: bool | None = None
    is_featured: bool | None = None


class KnowledgeResponse(BaseModel):
    """Schema for knowledge article response."""
    id: int
    title: str
    content: str
    summary: str | None
    category: str
    tags: str | None
    visibility: str
    article_type: str
    is_published: bool
    is_featured: bool
    view_count: int
    helpful_count: int
    not_helpful_count: int
    author_id: int
    author_name: str | None = None
    created_at: str
    updated_at: str
    
    class Config:
        from_attributes = True


class KnowledgeListResponse(BaseModel):
    """Schema for paginated knowledge list."""
    items: list[KnowledgeResponse]
    total: int
    page: int
    page_size: int


# ============== Routes ==============

@router.get("", response_model=KnowledgeListResponse)
async def list_knowledge(
    current_user: CurrentUser,
    db: DbSession,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    category: str | None = None,
    article_type: str | None = None,
    search: str | None = None,
    published_only: bool = True,
):
    """
    List knowledge articles with filtering and search.
    """
    query = select(KnowledgeArticle).options(selectinload(KnowledgeArticle.author))
    
    # Visibility filter based on role
    if current_user.role == UserRole.REQUESTER:
        query = query.where(KnowledgeArticle.visibility == KnowledgeVisibility.PUBLIC)
    elif current_user.role not in [UserRole.MANAGER, UserRole.AGENT]:
        query = query.where(
            KnowledgeArticle.visibility.in_([
                KnowledgeVisibility.PUBLIC,
                KnowledgeVisibility.DEPARTMENT,
            ])
        )
    
    # Published filter
    if published_only:
        query = query.where(KnowledgeArticle.is_published == True)
    
    # Category filter
    if category:
        query = query.where(KnowledgeArticle.category == category)
    
    # Article type filter
    if article_type:
        query = query.where(KnowledgeArticle.article_type == article_type)
    
    # Search
    if search:
        search_term = f"%{search}%"
        query = query.where(
            or_(
                KnowledgeArticle.title.ilike(search_term),
                KnowledgeArticle.content.ilike(search_term),
                KnowledgeArticle.tags.ilike(search_term),
            )
        )
    
    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0
    
    # Pagination
    offset = (page - 1) * page_size
    query = query.order_by(KnowledgeArticle.updated_at.desc()).offset(offset).limit(page_size)
    
    result = await db.execute(query)
    articles = result.scalars().all()
    
    items = [
        KnowledgeResponse(
            id=a.id,
            title=a.title,
            content=a.content,
            summary=a.summary,
            category=a.category,
            tags=a.tags,
            visibility=a.visibility.value,
            article_type=a.article_type,
            is_published=a.is_published,
            is_featured=a.is_featured,
            view_count=a.view_count,
            helpful_count=a.helpful_count,
            not_helpful_count=a.not_helpful_count,
            author_id=a.author_id,
            author_name=a.author.display_name if a.author else None,
            created_at=a.created_at.isoformat(),
            updated_at=a.updated_at.isoformat(),
        )
        for a in articles
    ]
    
    return KnowledgeListResponse(
        items=items,
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=KnowledgeResponse, status_code=status.HTTP_201_CREATED)
async def create_knowledge(
    data: KnowledgeCreate,
    current_user: CurrentUser,
    db: DbSession,
):
    """Create a new knowledge article."""
    # Only staff can create articles
    if current_user.role == UserRole.REQUESTER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only staff can create knowledge articles",
        )
    
    article = KnowledgeArticle(
        title=data.title,
        content=data.content,
        summary=data.summary,
        category=data.category,
        tags=data.tags,
        visibility=data.visibility,
        article_type=data.article_type,
        author_id=current_user.id,
    )
    
    db.add(article)
    await db.commit()
    await db.refresh(article)
    
    return KnowledgeResponse(
        id=article.id,
        title=article.title,
        content=article.content,
        summary=article.summary,
        category=article.category,
        tags=article.tags,
        visibility=article.visibility.value,
        article_type=article.article_type,
        is_published=article.is_published,
        is_featured=article.is_featured,
        view_count=article.view_count,
        helpful_count=article.helpful_count,
        not_helpful_count=article.not_helpful_count,
        author_id=article.author_id,
        author_name=current_user.display_name,
        created_at=article.created_at.isoformat(),
        updated_at=article.updated_at.isoformat(),
    )


@router.get("/{article_id}", response_model=KnowledgeResponse)
async def get_knowledge(
    article_id: int,
    current_user: CurrentUser,
    db: DbSession,
):
    """Get a single knowledge article and increment view count."""
    result = await db.execute(
        select(KnowledgeArticle)
        .options(selectinload(KnowledgeArticle.author))
        .where(KnowledgeArticle.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if article is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found",
        )
    
    # Check visibility
    if current_user.role == UserRole.REQUESTER:
        if article.visibility != KnowledgeVisibility.PUBLIC:
            raise HTTPException(status_code=403, detail="Access denied")
        if not article.is_published:
            raise HTTPException(status_code=404, detail="Article not found")
    
    # Increment view count
    article.increment_view()
    await db.commit()
    
    return KnowledgeResponse(
        id=article.id,
        title=article.title,
        content=article.content,
        summary=article.summary,
        category=article.category,
        tags=article.tags,
        visibility=article.visibility.value,
        article_type=article.article_type,
        is_published=article.is_published,
        is_featured=article.is_featured,
        view_count=article.view_count,
        helpful_count=article.helpful_count,
        not_helpful_count=article.not_helpful_count,
        author_id=article.author_id,
        author_name=article.author.display_name if article.author else None,
        created_at=article.created_at.isoformat(),
        updated_at=article.updated_at.isoformat(),
    )


@router.post("/{article_id}/feedback")
async def submit_feedback(
    article_id: int,
    helpful: bool,
    current_user: CurrentUser,
    db: DbSession,
):
    """Submit helpfulness feedback for an article."""
    result = await db.execute(
        select(KnowledgeArticle).where(KnowledgeArticle.id == article_id)
    )
    article = result.scalar_one_or_none()
    
    if article is None:
        raise HTTPException(status_code=404, detail="Article not found")
    
    if helpful:
        article.helpful_count += 1
    else:
        article.not_helpful_count += 1
    
    await db.commit()
    
    return {"message": "Feedback submitted", "helpful": helpful}
