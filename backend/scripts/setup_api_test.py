#!/usr/bin/env python3
"""Setup test data for API testing."""
import asyncio
import sys
sys.path.insert(0, '/Users/ZenoWang/Documents/project/E_Business/backend')

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from app.core.config import get_settings
from app.models.user import User, Workspace, WorkspaceMember, UserRole
from app.models.user import WorkspaceBilling, SubscriptionTier
from app.models.product import Product, ProductCategory, ProductStatus
from app.models.asset import Asset, StorageStatus
from app.db.base import Base

settings = get_settings()

async def setup_test_data():
    """Create test workspace, products, and assets."""
    from app.db.base import async_session_maker

    engine = create_async_engine(settings.database_url, echo=False)
    async_session_maker = async_session_maker

    async with async_session_maker() as db:
        # Get api test user
        result = await db.execute(
            select(User).where(User.email == "apitest@ebusiness.com")
        )
        user = result.scalar_one_or_none()

        if not user:
            print("ERROR: User apitest@ebusiness.com not found!")
            return

        print(f"Found user: {user.email} ({user.id})")

        # Check if user has any workspaces
        result = await db.execute(
            select(Workspace).join(WorkspaceMember).where(WorkspaceMember.user_id == user.id)
        )
        workspace = result.scalar_one_or_none()

        if workspace:
            print(f"Using existing workspace: {workspace.name} ({workspace.id})")
            workspace_id = workspace.id
        else:
            # Create new workspace
            import secrets
            slug = f"api-test-{secrets.token_hex(4)}"

            workspace = Workspace(
                name="API Test Workspace",
                slug=slug,
                description="For automated API testing"
            )
            db.add(workspace)
            await db.flush()

            # Add user as owner
            member = WorkspaceMember(
                workspace_id=workspace.id,
                user_id=user.id,
                role=UserRole.OWNER
            )
            db.add(member)
            await db.flush()

            # Create billing
            billing = WorkspaceBilling(
                workspace_id=workspace.id,
                tier=SubscriptionTier.FREE.value,
                credits_remaining=100,
                credits_limit=100,
            )
            db.add(billing)

            await db.commit()
            workspace_id = workspace.id
            print(f"Created workspace: {workspace.name} ({workspace.id})")

        # Check billing
        result = await db.execute(
            select(WorkspaceBilling).where(WorkspaceBilling.workspace_id == workspace_id)
        )
        billing = result.scalar_one_or_none()
        if billing:
            print(f"Workspace billing: {billing.credits_remaining} credits")

        # First create a test asset (products require original_asset_id)
        asset = Asset(
            workspace_id=workspace_id,
            name="test_product_image.jpg",
            mime_type="image/jpeg",
            size=12345,
            storage_status=StorageStatus.UPLOADED,
            storage_path=f"workspaces/{workspace_id}/assets/test/test_product_image.jpg",
        )
        db.add(asset)
        await db.flush()

        print(f"Created asset: {asset.name} ({asset.id})")

        # Create a test product with required fields
        product = Product(
            workspace_id=workspace_id,
            name="Test Product for API",
            description="A product for testing the APIs",
            category=ProductCategory.ELECTRONICS,
            target_audience="Developers and testers",
            original_asset_id=asset.id,
            status=ProductStatus.READY,
        )
        db.add(product)
        await db.commit()
        await db.refresh(product)

        print(f"Created product: {product.name} ({product.id})")
        print(f"\nTest Data Summary:")
        print(f"  Workspace ID: {workspace_id}")
        print(f"  Asset ID: {asset.id}")
        print(f"  Product ID: {product.id}")
        print(f"  User ID: {user.id}")

if __name__ == "__main__":
    asyncio.run(setup_test_data())
