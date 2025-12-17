"""Create image_generation_jobs table

Story 2.1: Style Selection & Generation Trigger

Revision ID: 20251215_create_image_jobs
Revises: 20251215_add_products
Create Date: 2025-12-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20251215_create_image_jobs'
down_revision: Union[str, None] = '20251215_add_products'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create JobStatus enum type
    jobstatus_enum = postgresql.ENUM(
        'pending', 'processing', 'completed', 'failed',
        name='jobstatus',
        create_type=True
    )
    jobstatus_enum.create(op.get_bind(), checkfirst=True)
    
    # Create image_generation_jobs table
    op.create_table(
        'image_generation_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('style_id', sa.String(length=20), nullable=False),
        sa.Column('status', jobstatus_enum, nullable=False, server_default='pending'),
        sa.Column('progress', sa.Integer(), nullable=True, server_default='0'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('result_urls', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('ix_image_generation_jobs_workspace_id', 'image_generation_jobs', ['workspace_id'], unique=False)
    op.create_index('ix_image_generation_jobs_task_id', 'image_generation_jobs', ['task_id'], unique=True)


def downgrade() -> None:
    op.drop_index('ix_image_generation_jobs_task_id', table_name='image_generation_jobs')
    op.drop_index('ix_image_generation_jobs_workspace_id', table_name='image_generation_jobs')
    op.drop_table('image_generation_jobs')
    
    # Drop enum type
    jobstatus_enum = postgresql.ENUM('pending', 'processing', 'completed', 'failed', name='jobstatus')
    jobstatus_enum.drop(op.get_bind(), checkfirst=True)
