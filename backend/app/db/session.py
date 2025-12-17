"""
Database session management for Celery tasks.

Provides safe database session handling for async background tasks.
"""
import contextlib
from typing import Generator

from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import get_settings

settings = get_settings()

# Async engine for FastAPI
async_engine = create_async_engine(settings.database_url)
AsyncSessionLocal = async_sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)

# Sync engine for Celery tasks
sync_engine = create_engine(settings.database_url.replace("+asyncpg", ""))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)


def get_db() -> Generator[Session, None, None]:
    """Get a database session for sync operations.

    Used by Celery tasks which require synchronous database access.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextlib.contextmanager
def get_db_context() -> Generator[Session, None, None]:
    """Database session context manager for Celery tasks.

    Usage:
        with get_db_context() as db:
            # Use db session
            result = db.query(Model).first()
            db.commit()
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()