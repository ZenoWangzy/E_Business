"""add_billing_models

Revision ID: 0010_add_billing
Revises: 0009_add_video_audio_tracks
Create Date: 2025-12-19 04:52:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic. 
revision = '0010_add_billing'
down_revision = '0009_add_video_audio_tracks'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create workspace_billing table
    op.create_table(
        'workspace_billing',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('tier', sa.String(length=20), nullable=False, server_default='free'),
        sa.Column('credits_remaining', sa.Integer(), nullable=False, server_default='50'),
        sa.Column('credits_limit', sa.Integer(), nullable=False, server_default='50'),
        sa.Column('reset_date', sa.DateTime(), nullable=False),
        sa.Column('is_active', sa.Boolean(), server_default='true'),
        sa.Column('features', postgresql.JSON(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.UniqueConstraint('workspace_id')
    )
    
    # Create indexes for performance
    op.create_index('idx_workspace_billing_workspace', 'workspace_billing', ['workspace_id'])
    op.create_index('idx_workspace_billing_reset', 'workspace_billing', ['reset_date'])
    op.create_index('idx_workspace_billing_active_tier', 'workspace_billing', ['is_active', 'tier'])

    # Initialize billing for existing workspaces with default FREE tier
    # Calculate next reset date as first day of next month
    op.execute("""
        INSERT INTO workspace_billing (
            id, workspace_id, tier, credits_remaining, credits_limit, 
            reset_date, is_active, features, created_at, updated_at
        )
        SELECT 
            gen_random_uuid(),
            id as workspace_id,
            'free' as tier,
            50 as credits_remaining,
            50 as credits_limit,
            DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' as reset_date,
            true as is_active,
            '{"features": ["basic_generation"]}'::jsonb as features,
            CURRENT_TIMESTAMP as created_at,
            CURRENT_TIMESTAMP as updated_at
        FROM workspaces
    """)


def downgrade() -> None:
    op.drop_index('idx_workspace_billing_active_tier', table_name='workspace_billing')
    op.drop_index('idx_workspace_billing_reset', table_name='workspace_billing')
    op.drop_index('idx_workspace_billing_workspace', table_name='workspace_billing')
    op.drop_table('workspace_billing')
