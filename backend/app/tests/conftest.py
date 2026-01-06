"""
Test fixtures and configuration for pytest.

This conftest provides shared fixtures for integration tests, ensuring that
the test database session and the FastAPI app's get_db dependency use the 
SAME session instance for proper transaction visibility.
"""
import pytest
import uuid
from typing import AsyncGenerator
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.pool import NullPool
from sqlalchemy.exc import IntegrityError, DBAPIError

from app.core.config import Settings, get_settings
from app.db.base import get_db
from app.main import app
from app.models.user import User
from app.models.workspace import Workspace, WorkspaceMember, UserRole
from app.core.security import create_access_token, get_password_hash


@pytest.fixture
def settings() -> Settings:
    """Provide test settings instance."""
    return get_settings()


@pytest.fixture
def test_database_url(settings: Settings) -> str:
    """Provide database URL for testing."""
    return settings.database_url


@pytest.fixture
async def db_engine(test_database_url: str):
    """Create a shared test engine per test."""
    engine = create_async_engine(
        test_database_url,
        poolclass=NullPool,
    )
    yield engine
    await engine.dispose()


@pytest.fixture
async def db(db_engine) -> AsyncGenerator[AsyncSession, None]:
    """
    Provide a database session for testing.
    
    This session is shared with the FastAPI app through dependency override.
    """
    session_maker = async_sessionmaker(
        db_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )
    
    async with session_maker() as session:
        yield session


@pytest.fixture
async def async_client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    """
    Provide an async client for API testing.
    
    The get_db override yields the SAME session instance that was created by 
    the db fixture, ensuring that data created in tests is visible to the API 
    endpoints AND vice versa.
    """
    # Override get_db to return the SAME session instance 
    async def override_get_db() -> AsyncGenerator[AsyncSession, None]:
        yield db
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client
        
    app.dependency_overrides.clear()


@pytest.fixture
async def test_user(db: AsyncSession) -> User:
    """Create a test user with retry logic for unique constraints."""
    for _ in range(3):
        try:
            email = f"test_{uuid.uuid4()}@example.com"
            user = User(
                email=email,
                hashed_password=get_password_hash("password"),
                name="Test User",
                is_active=True
            )
            db.add(user)
            await db.commit()
            await db.refresh(user)
            return user
        except (IntegrityError, DBAPIError):
            await db.rollback()
            continue
            
    raise Exception("Failed to create unique test user after 3 attempts")


@pytest.fixture
async def test_workspace(db: AsyncSession, test_user: User) -> Workspace:
    """Create a test workspace with the test user as a member."""
    short_id = str(uuid.uuid4())[:8]
    workspace = Workspace(
        name=f"Test WS {short_id}",
        slug=f"test-ws-{short_id}",
        max_members=10
    )
    db.add(workspace)
    await db.commit()
    await db.refresh(workspace)

    member = WorkspaceMember(
        user_id=test_user.id,
        workspace_id=workspace.id,
        role=UserRole.OWNER
    )
    db.add(member)
    await db.commit()
    
    return workspace


@pytest.fixture
def member_headers(test_user: User) -> dict[str, str]:
    """Return headers with valid access token for the test user."""
    access_token = create_access_token(subject=str(test_user.id))
    return {"Authorization": f"Bearer {access_token}"}
