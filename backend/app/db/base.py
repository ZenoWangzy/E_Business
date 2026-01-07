from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from app.core.config import get_settings

settings = get_settings()

# Parse database URL to add SSL=disable for local development
db_url = settings.database_url
if "localhost" in db_url or "127.0.0.1" in db_url:
    # Disable SSL for local development
    if "?" in db_url:
        db_url = db_url + "&ssl=disable"
    else:
        db_url = db_url + "?ssl=disable"

engine = create_async_engine(
    db_url,
    echo=settings.debug,
    future=True,
)

async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


async def get_db() -> AsyncSession:
    """Dependency for getting async database session."""
    async with async_session_maker() as session:
        try:
            yield session
        finally:
            await session.close()
