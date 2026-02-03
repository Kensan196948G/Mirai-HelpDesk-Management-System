"""
Database Configuration and Session Management

Provides async SQLAlchemy engine and session factory with connection pooling.
Supports both SQLite (development) and PostgreSQL (production).
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy.pool import NullPool, QueuePool

from app.config import settings


# Configure engine based on database type
engine_kwargs = {
    "echo": settings.DB_ECHO,
    "future": True,
}

if settings.is_postgres:
    # PostgreSQL: Use connection pooling for performance
    engine_kwargs.update({
        "pool_size": settings.DB_POOL_SIZE,
        "max_overflow": settings.DB_MAX_OVERFLOW,
        "pool_timeout": settings.DB_POOL_TIMEOUT,
        "pool_recycle": settings.DB_POOL_RECYCLE,
        "pool_pre_ping": True,  # Verify connections before use
        "poolclass": QueuePool,
    })
else:
    # SQLite: No connection pooling (not thread-safe)
    engine_kwargs["poolclass"] = NullPool

# Create async engine with appropriate configuration
engine = create_async_engine(
    settings.DATABASE_URL,
    **engine_kwargs,
)

# Session factory
async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


class Base(DeclarativeBase):
    """Base class for all SQLAlchemy models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency that provides a database session.
    
    Yields:
        AsyncSession: Database session that will be closed after use.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
        finally:
            await session.close()


async def init_db() -> None:
    """Initialize database tables."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)


async def close_db() -> None:
    """Close database connections."""
    await engine.dispose()
