"""add audit_logs table

Revision ID: c835b2faaba2
Revises: 8779b9e77ccd
Create Date: 2025-12-14 15:23:21.013137+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'c835b2faaba2'
down_revision: Union[str, None] = '8779b9e77ccd'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create AuditAction enum type
    auditaction_enum = postgresql.ENUM(
        'workspace.created', 'workspace.updated', 'workspace.deleted',
        'member.added', 'member.removed', 'member.role_changed',
        'invite.created', 'invite.accepted', 'invite.cancelled',
        name='auditaction',
        create_type=True
    )
    auditaction_enum.create(op.get_bind(), checkfirst=True)
    
    # Create audit_logs table
    op.create_table('audit_logs',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('actor_id', sa.UUID(), nullable=True),
        sa.Column('workspace_id', sa.UUID(), nullable=False),
        sa.Column('action', postgresql.ENUM(
            'workspace.created', 'workspace.updated', 'workspace.deleted',
            'member.added', 'member.removed', 'member.role_changed',
            'invite.created', 'invite.accepted', 'invite.cancelled',
            name='auditaction', create_type=False
        ), nullable=False),
        sa.Column('resource_type', sa.String(length=50), nullable=False),
        sa.Column('resource_id', sa.UUID(), nullable=True),
        sa.Column('target_user_id', sa.UUID(), nullable=True),
        sa.Column('ip_address', sa.String(length=45), nullable=True),
        sa.Column('user_agent', sa.String(length=500), nullable=True),
        sa.Column('extra_data', postgresql.JSONB(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['actor_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['target_user_id'], ['users.id'], ondelete='SET NULL'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('ix_audit_logs_workspace', 'audit_logs', ['workspace_id'], unique=False)
    op.create_index('ix_audit_logs_actor', 'audit_logs', ['actor_id'], unique=False)
    op.create_index('ix_audit_logs_action', 'audit_logs', ['action'], unique=False)
    op.create_index('ix_audit_logs_created', 'audit_logs', ['created_at'], unique=False)


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_audit_logs_created', table_name='audit_logs')
    op.drop_index('ix_audit_logs_action', table_name='audit_logs')
    op.drop_index('ix_audit_logs_actor', table_name='audit_logs')
    op.drop_index('ix_audit_logs_workspace', table_name='audit_logs')
    
    # Drop table
    op.drop_table('audit_logs')
    
    # Drop enum type
    sa.Enum(name='auditaction').drop(op.get_bind(), checkfirst=True)

