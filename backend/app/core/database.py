"""Database helpers.

This module exists for compatibility with tests and legacy imports.
The canonical DB session management lives under app.db.*.
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
