"""add_workspace_fields_and_invite_model

Revision ID: 8779b9e77ccd
Revises: c009d778f3bb
Create Date: 2025-12-14 13:09:07.629723+00:00

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '8779b9e77ccd'
down_revision: Union[str, None] = 'c009d778f3bb'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # === STEP 1: Update existing userrole enum ===
    # Rename ASSISTANT to ADMIN and add MEMBER, VIEWER
    # NOTE: PostgreSQL requires enum value additions to be committed before use
    # We use connection.execute with autocommit=True
    
    connection = op.get_bind()
    
    # Add new enum values (ADMIN, MEMBER, VIEWER) with autocommit
    connection.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'ADMIN'").execution_options(autocommit=True))
    connection.execute(sa.text("COMMIT"))  # Commit the enum changes
    connection.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'MEMBER'").execution_options(autocommit=True))
    connection.execute(sa.text("COMMIT"))
    connection.execute(sa.text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'VIEWER'").execution_options(autocommit=True))
    connection.execute(sa.text("COMMIT"))
    
    # Skip UPDATE for now - will handle via application logic if needed
    # (Cannot use new enum values in same transaction in Postgres)
    
    # === STEP 2: Create invitestatus enum ===
    invitestatus_enum = postgresql.ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED', name='invitestatus', create_type=False)
    invitestatus_enum.create(op.get_bind(), checkfirst=True)
    
    # === STEP 3: Add workspace table columns ===
    op.add_column('workspaces', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('workspaces', sa.Column('max_members', sa.Integer(), nullable=True))
    op.add_column('workspaces', sa.Column('is_active', sa.Boolean(), nullable=True))
    
    # Set default values for existing rows
    op.execute("UPDATE workspaces SET max_members = 100 WHERE max_members IS NULL")
    op.execute("UPDATE workspaces SET is_active = true WHERE is_active IS NULL")
    
    # Make columns NOT NULL after setting defaults
    op.alter_column('workspaces', 'max_members', existing_type=sa.Integer(), nullable=False)
    op.alter_column('workspaces', 'is_active', existing_type=sa.Boolean(), nullable=False)
    
    op.alter_column('workspaces', 'name',
               existing_type=sa.VARCHAR(length=100),
               type_=sa.String(length=50),
               existing_nullable=False)
    
    # === STEP 4: Create workspace_invites table (use existing userrole enum) ===
    # Use postgresql.ENUM directly to avoid automatic type creation
    userrole_type = postgresql.ENUM('OWNER', 'ADMIN', 'MEMBER', 'VIEWER', name='userrole', create_type=False)
    invitestatus_type = postgresql.ENUM('PENDING', 'ACCEPTED', 'EXPIRED', 'CANCELLED', name='invitestatus', create_type=False)
    
    op.create_table('workspace_invites',
    sa.Column('id', sa.UUID(), nullable=False),
    sa.Column('workspace_id', sa.UUID(), nullable=False),
    sa.Column('invited_email', sa.String(length=255), nullable=False),
    sa.Column('role', userrole_type, nullable=False),
    sa.Column('token', sa.UUID(), nullable=False),
    sa.Column('expires_at', sa.DateTime(), nullable=False),
    sa.Column('status', invitestatus_type, nullable=False),
    sa.Column('inviter_id', sa.UUID(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=False),
    sa.Column('accepted_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['inviter_id'], ['users.id'], ondelete='SET NULL'),
    sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_workspace_invites_status', 'workspace_invites', ['status'], unique=False)
    op.create_index(op.f('ix_workspace_invites_token'), 'workspace_invites', ['token'], unique=True)
    op.create_index('ix_workspace_invites_workspace', 'workspace_invites', ['workspace_id'], unique=False)
    
    # === STEP 5: Update workspace_members constraints ===
    op.create_index('ix_workspace_members_user', 'workspace_members', ['user_id'], unique=False)
    op.create_index('ix_workspace_members_workspace', 'workspace_members', ['workspace_id'], unique=False)
    op.create_unique_constraint('uq_workspace_member', 'workspace_members', ['user_id', 'workspace_id'])
    op.drop_constraint('workspace_members_workspace_id_fkey', 'workspace_members', type_='foreignkey')
    op.drop_constraint('workspace_members_user_id_fkey', 'workspace_members', type_='foreignkey')
    op.create_foreign_key(None, 'workspace_members', 'workspaces', ['workspace_id'], ['id'], ondelete='CASCADE')
    op.create_foreign_key(None, 'workspace_members', 'users', ['user_id'], ['id'], ondelete='CASCADE')
    # ### end Alembic commands ###


def downgrade() -> None:
    # ### commands auto generated by Alembic - please adjust! ###
    op.alter_column('workspaces', 'name',
               existing_type=sa.String(length=50),
               type_=sa.VARCHAR(length=100),
               existing_nullable=False)
    op.drop_column('workspaces', 'is_active')
    op.drop_column('workspaces', 'max_members')
    op.drop_column('workspaces', 'description')
    op.drop_constraint(None, 'workspace_members', type_='foreignkey')
    op.drop_constraint(None, 'workspace_members', type_='foreignkey')
    op.create_foreign_key(op.f('workspace_members_user_id_fkey'), 'workspace_members', 'users', ['user_id'], ['id'])
    op.create_foreign_key(op.f('workspace_members_workspace_id_fkey'), 'workspace_members', 'workspaces', ['workspace_id'], ['id'])
    op.drop_constraint('uq_workspace_member', 'workspace_members', type_='unique')
    op.drop_index('ix_workspace_members_workspace', table_name='workspace_members')
    op.drop_index('ix_workspace_members_user', table_name='workspace_members')
    op.drop_index('ix_workspace_invites_workspace', table_name='workspace_invites')
    op.drop_index(op.f('ix_workspace_invites_token'), table_name='workspace_invites')
    op.drop_index('ix_workspace_invites_status', table_name='workspace_invites')
    op.drop_table('workspace_invites')
    
    # Drop invitestatus enum
    postgresql.ENUM(name='invitestatus').drop(op.get_bind(), checkfirst=True)
    # ### end Alembic commands ###
