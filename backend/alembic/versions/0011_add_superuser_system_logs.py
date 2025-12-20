"""Add superuser field and system_logs table.

Revision ID: 0011
Revises: 0010_add_billing
Create Date: 2025-12-19

Story 5.3: Admin Dashboard - Stats & Logs
"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0011_add_superuser_system_logs'
down_revision = '0010_add_billing'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add is_superuser to users table
    op.add_column(
        'users',
        sa.Column('is_superuser', sa.Boolean(), nullable=False, server_default='false')
    )
    op.create_index('ix_users_is_superuser', 'users', ['is_superuser'])
    
    # Create system_logs table
    op.create_table(
        'system_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, primary_key=True),
        sa.Column('level', sa.Enum('error', 'warning', 'info', name='systemloglevel'), nullable=False),
        sa.Column('message', sa.Text(), nullable=False),
        sa.Column('component', sa.String(50), nullable=False, server_default='unknown'),
        sa.Column('trace_id', sa.String(50), nullable=True),
        sa.Column('stack_trace', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
    )
    
    # Create indexes for efficient querying
    op.create_index('ix_system_logs_level', 'system_logs', ['level'])
    op.create_index('ix_system_logs_created_at', 'system_logs', ['created_at'])
    op.create_index('ix_system_logs_trace_id', 'system_logs', ['trace_id'])
    op.create_index('ix_system_logs_level_created', 'system_logs', ['level', 'created_at'])
    op.create_index('ix_system_logs_component_created', 'system_logs', ['component', 'created_at'])


def downgrade() -> None:
    # Drop system_logs table and indexes
    op.drop_index('ix_system_logs_component_created', table_name='system_logs')
    op.drop_index('ix_system_logs_level_created', table_name='system_logs')
    op.drop_index('ix_system_logs_trace_id', table_name='system_logs')
    op.drop_index('ix_system_logs_created_at', table_name='system_logs')
    op.drop_index('ix_system_logs_level', table_name='system_logs')
    op.drop_table('system_logs')
    
    # Drop enum type
    op.execute('DROP TYPE IF EXISTS systemloglevel')
    
    # Remove is_superuser from users
    op.drop_index('ix_users_is_superuser', table_name='users')
    op.drop_column('users', 'is_superuser')
