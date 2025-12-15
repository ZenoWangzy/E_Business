"""Add products table

Revision ID: 20251215_add_products
Revises: 20251215_1448_add_storage_fields
Create Date: 2025-12-15 16:35:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '20251215_add_products'
down_revision = '20251215_1448_add_storage_fields'
branch_labels = None
depends_on = None


def upgrade():
    # Create product_category enum
    product_category_enum = postgresql.ENUM(
        'clothing', 'electronics', 'beauty', 'home', 'food',
        'sports', 'toys', 'books', 'automotive', 'health', 'other',
        name='productcategory'
    )
    product_category_enum.create(op.get_bind())

    # Create product_status enum
    product_status_enum = postgresql.ENUM(
        'draft', 'ready', 'processing', 'completed', 'archived',
        name='productstatus'
    )
    product_status_enum.create(op.get_bind())

    # Create products table
    op.create_table(
        'products',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('category', sa.Enum('clothing', 'electronics', 'beauty', 'home', 'food',
                                       'sports', 'toys', 'books', 'automotive', 'health', 'other',
                                       name='productcategory'), nullable=False),
        sa.Column('original_asset_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.Enum('draft', 'ready', 'processing', 'completed', 'archived',
                                     name='productstatus'), nullable=False, server_default='draft'),
        sa.Column('created_at', sa.DateTime(), nullable=True),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(['original_asset_id'], ['assets.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
    )

    # Create indexes
    op.create_index('ix_products_workspace_id', 'products', ['workspace_id'], unique=False)
    op.create_index('ix_products_category', 'products', ['category'], unique=False)


def downgrade():
    op.drop_index('ix_products_category', table_name='products')
    op.drop_index('ix_products_workspace_id', table_name='products')
    op.drop_table('products')

    # Drop enums
    sa.Enum(name='productstatus').drop(op.get_bind())
    sa.Enum(name='productcategory').drop(op.get_bind())
