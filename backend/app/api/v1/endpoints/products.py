"""
Product API Endpoints - CRUD operations for Product management.
Multi-tenant aware with workspace isolation.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.api.deps import get_db, CurrentWorkspaceMember
from app.models.product import Product, ProductCategory, ProductStatus
from app.models.asset import Asset
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse

router = APIRouter()


@router.post("/workspaces/{workspace_id}/products", response_model=ProductResponse)
async def create_product(
    workspace_id: UUID,
    product_data: ProductCreate,
    member: CurrentWorkspaceMember,
    db: AsyncSession = Depends(get_db)
):
    """
    创建新产品。
    
    Create a new Product linked to an Asset in the workspace.
    Verifies asset exists and belongs to the workspace.
    """
    # Validate Asset exists and belongs to workspace
    asset_result = await db.execute(
        select(Asset).where(
            Asset.id == product_data.original_asset_id,
            Asset.workspace_id == workspace_id
        )
    )
    asset = asset_result.scalar_one_or_none()
    if not asset:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found or access denied"
        )

    # Validate category enum
    try:
        category = ProductCategory(product_data.category)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid category. Must be one of: {[c.value for c in ProductCategory]}"
        )

    # Create product
    product = Product(
        workspace_id=workspace_id,
        name=product_data.name,
        category=category,
        original_asset_id=product_data.original_asset_id,
        status=ProductStatus.DRAFT
    )

    db.add(product)
    await db.commit()
    await db.refresh(product)

    return product


@router.get("/workspaces/{workspace_id}/products/{product_id}", response_model=ProductResponse)
async def get_product(
    workspace_id: UUID,
    product_id: UUID,
    member: CurrentWorkspaceMember,
    db: AsyncSession = Depends(get_db)
):
    """
    获取产品详情。
    
    Get product details by ID within a workspace.
    """
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.workspace_id == workspace_id
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    return product


@router.patch("/workspaces/{workspace_id}/products/{product_id}", response_model=ProductResponse)
async def update_product(
    workspace_id: UUID,
    product_id: UUID,
    product_update: ProductUpdate,
    member: CurrentWorkspaceMember,
    db: AsyncSession = Depends(get_db)
):
    """
    更新产品信息。
    
    Update product name or category.
    """
    result = await db.execute(
        select(Product).where(
            Product.id == product_id,
            Product.workspace_id == workspace_id
        )
    )
    product = result.scalar_one_or_none()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found"
        )

    # Update fields
    if product_update.name is not None:
        product.name = product_update.name
    
    if product_update.category is not None:
        try:
            product.category = ProductCategory(product_update.category)
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid category. Must be one of: {[c.value for c in ProductCategory]}"
            )

    await db.commit()
    await db.refresh(product)

    return product


@router.get("/workspaces/{workspace_id}/products", response_model=list[ProductResponse])
async def list_products(
    workspace_id: UUID,
    member: CurrentWorkspaceMember,
    db: AsyncSession = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    """
    列出工作空间中的所有产品。
    
    List all products in a workspace with pagination.
    """
    result = await db.execute(
        select(Product)
        .where(Product.workspace_id == workspace_id)
        .offset(skip)
        .limit(limit)
        .order_by(Product.created_at.desc())
    )
    products = result.scalars().all()
    return products
