#!/usr/bin/env python3
"""Setup test data for apitest2 user."""
import asyncio
import sys
sys.path.insert(0, '/Users/ZenoWang/Documents/project/E_Business/backend')

from sqlalchemy import select
from app.core.config import get_settings
from app.models.user import User, Workspace, WorkspaceMember, UserRole
from app.models.user import WorkspaceBilling, SubscriptionTier
from app.models.product import Product, ProductCategory, ProductStatus
from app.models.asset import Asset, StorageStatus
from app.db.base import async_session_maker
import secrets

settings = get_settings()

USER_EMAIL = "apitest2@ebusiness.com"

async def setup_test_data():
    """Create test workspace, products, and assets for apitest2."""
    async with async_session_maker() as db:
        # Get apitest2 user
        result = await db.execute(
            select(User).where(User.email == USER_EMAIL)
        )
        user = result.scalar_one_or_none()

        if not user:
            print(f"ERROR: User {USER_EMAIL} not found!")
            return

        print(f"Found user: {user.email} ({user.id})")

        # Create new workspace
        slug = f"api-test-{secrets.token_hex(4)}"

        workspace = Workspace(
            name="API Test Workspace 2",
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
        await db.flush()

        # Create test asset
        asset = Asset(
            workspace_id=workspace.id,
            name="test_product_image.jpg",
            mime_type="image/jpeg",
            size=12345,
            storage_status=StorageStatus.UPLOADED,
            storage_path=f"workspaces/{workspace.id}/assets/test/test_product_image.jpg",
        )
        db.add(asset)
        await db.flush()

        # Create test product
        product = Product(
            workspace_id=workspace.id,
            name="Test Product for API",
            description="A product for testing the APIs",
            category=ProductCategory.ELECTRONICS,
            target_audience="Developers and testers",
            original_asset_id=asset.id,
            status=ProductStatus.READY,
        )
        db.add(product)
        await db.commit()

        print(f"\nTest Data Summary:")
        print(f"  Workspace ID: {workspace.id}")
        print(f"  Asset ID: {asset.id}")
        print(f"  Product ID: {product.id}")
        print(f"  User ID: {user.id}")
        print(f"\nUse this data for API testing!")

if __name__ == "__main__":
    asyncio.run(setup_test_data())
