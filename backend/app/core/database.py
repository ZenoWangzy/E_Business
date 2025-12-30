"""
[IDENTITY]: Database Session Helper
Compatibility layer providing async database session management for FastAPI dependencies.

[INPUT]:
- None (uses configured session factory)

[LINK]:
- Session Factory -> app.db.session.AsyncSessionLocal
- Models -> app.models.*
- Tests -> tests/**/*.py (usage)

[OUTPUT]: AsyncGenerator[AsyncSession, None] or AsyncSession
[POS]: /backend/app/core/database.py

[PROTOCOL]:
1. Provides FastAPI dependency injection pattern for async sessions
2. Ensures proper session lifecycle management
3. Maintains backward compatibility with existing imports
"""

from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an AsyncSession."""
    async with AsyncSessionLocal() as session:
        yield session


def get_async_session() -> AsyncSession:
    """Return an AsyncSession (async context manager)."""
    return AsyncSessionLocal()
