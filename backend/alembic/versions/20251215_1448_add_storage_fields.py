"""Add storage fields to assets table

Revision ID: 20251215_1448_add_storage_fields
Revises: 20251214_1523_c835b2faaba2
Create Date: 2025-12-15

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20251215_1448_add_storage_fields'
down_revision: Union[str, None] = '20251214_1523_c835b2faaba2'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add storage-related fields to assets table for MinIO integration."""
    
    # Create enum type for storage status
    storage_status_enum = postgresql.ENUM(
        'pending_upload',
        'uploading', 
        'uploaded',
        'failed',
        'deleted',
        name='storagestatus',
        create_type=False
    )
    storage_status_enum.create(op.get_bind(), checkfirst=True)
    
    # Add storage columns to assets table
    op.add_column('assets', sa.Column(
        'storage_path',
        sa.String(512),
        nullable=True,
        comment='Full path in MinIO: workspaces/{workspace_id}/assets/{asset_id}/{filename}'
    ))
    
    op.add_column('assets', sa.Column(
        'file_checksum',
        sa.String(64),
        nullable=True,
        comment='MD5 checksum for data integrity verification'
    ))
    
    op.add_column('assets', sa.Column(
        'storage_status',
        sa.Enum(
            'pending_upload',
            'uploading',
            'uploaded',
            'failed',
            'deleted',
            name='storagestatus'
        ),
        nullable=False,
        server_default='pending_upload',
        comment='Current storage status in MinIO'
    ))
    
    op.add_column('assets', sa.Column(
        'uploaded_by',
        sa.UUID(),
        sa.ForeignKey('users.id', ondelete='SET NULL'),
        nullable=True,
        comment='User who uploaded the file'
    ))
    
    op.add_column('assets', sa.Column(
        'error_message',
        sa.Text(),
        nullable=True,
        comment='Error details if storage_status is FAILED'
    ))
    
    # Add index on storage_path for faster lookups
    op.create_index(
        'ix_assets_storage_path',
        'assets',
        ['storage_path'],
        unique=False
    )
    
    # Add index on storage_status for filtering
    op.create_index(
        'ix_assets_storage_status',
        'assets',
        ['storage_status'],
        unique=False
    )


def downgrade() -> None:
    """Remove storage-related fields from assets table."""
    
    # Drop indexes
    op.drop_index('ix_assets_storage_status', table_name='assets')
    op.drop_index('ix_assets_storage_path', table_name='assets')
    
    # Drop columns
    op.drop_column('assets', 'error_message')
    op.drop_column('assets', 'uploaded_by')
    op.drop_column('assets', 'storage_status')
    op.drop_column('assets', 'file_checksum')
    op.drop_column('assets', 'storage_path')
    
    # Drop enum type
    sa.Enum(name='storagestatus').drop(op.get_bind(), checkfirst=True)
