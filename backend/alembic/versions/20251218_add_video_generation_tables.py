"""Add video generation tables

Story 4.2: Script & Storyboard AI Service

Revision ID: 20251218_add_video_generation_tables
Revises: 20251215_create_image_jobs
Create Date: 2025-12-18

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20251218_add_video_generation_tables'
down_revision: Union[str, None] = '20251215_create_image_jobs'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create VideoMode enum type
    videomode_enum = postgresql.ENUM(
        'creative_ad', 'functional_intro',
        name='videomode',
        create_type=True
    )
    videomode_enum.create(op.get_bind(), checkfirst=True)

    # Create VideoProjectStatus enum type
    videoprojectstatus_enum = postgresql.ENUM(
        'pending', 'script_ready', 'completed', 'failed',
        name='videoprojectstatus',
        create_type=True
    )
    videoprojectstatus_enum.create(op.get_bind(), checkfirst=True)

    # Create video_projects table
    op.create_table('video_projects',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, default=sa.text('uuid_generate_v4()')),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('product_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('mode', videomode_enum, nullable=False),
        sa.Column('target_duration', sa.Integer(), nullable=False),
        sa.Column('script', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('storyboard', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('status', videoprojectstatus_enum, nullable=False, default='pending'),
        sa.Column('model_used', sa.String(length=100), nullable=True),
        sa.Column('token_usage', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['product_id'], ['products.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_video_projects_workspace_id'), 'video_projects', ['workspace_id'], unique=False)
    op.create_index(op.f('ix_video_projects_user_id'), 'video_projects', ['user_id'], unique=False)
    op.create_index(op.f('ix_video_projects_product_id'), 'video_projects', ['product_id'], unique=False)
    op.create_index(op.f('ix_video_projects_status'), 'video_projects', ['status'], unique=False)

    # Create video_generation_jobs table
    op.create_table('video_generation_jobs',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, default=sa.text('uuid_generate_v4()')),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('video_project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('status', sa.Enum('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', name='jobstatus'), nullable=False, default='PENDING'),
        sa.Column('progress', sa.Integer(), nullable=False, default=0),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('generation_config', postgresql.JSON(astext_type=sa.Text()), nullable=False),
        sa.Column('raw_results', postgresql.JSON(astext_type=sa.Text()), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('started_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['video_project_id'], ['video_projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('task_id')
    )
    op.create_index(op.f('ix_video_generation_jobs_workspace_id'), 'video_generation_jobs', ['workspace_id'], unique=False)
    op.create_index(op.f('ix_video_generation_jobs_user_id'), 'video_generation_jobs', ['user_id'], unique=False)
    op.create_index(op.f('ix_video_generation_jobs_video_project_id'), 'video_generation_jobs', ['video_project_id'], unique=False)
    op.create_index(op.f('ix_video_generation_jobs_task_id'), 'video_generation_jobs', ['task_id'], unique=False)
    op.create_index(op.f('ix_video_generation_jobs_status'), 'video_generation_jobs', ['status'], unique=False)


def downgrade() -> None:
    # Drop video_generation_jobs table
    op.drop_index(op.f('ix_video_generation_jobs_status'), table_name='video_generation_jobs')
    op.drop_index(op.f('ix_video_generation_jobs_task_id'), table_name='video_generation_jobs')
    op.drop_index(op.f('ix_video_generation_jobs_video_project_id'), table_name='video_generation_jobs')
    op.drop_index(op.f('ix_video_generation_jobs_user_id'), table_name='video_generation_jobs')
    op.drop_index(op.f('ix_video_generation_jobs_workspace_id'), table_name='video_generation_jobs')
    op.drop_table('video_generation_jobs')

    # Drop video_projects table
    op.drop_index(op.f('ix_video_projects_status'), table_name='video_projects')
    op.drop_index(op.f('ix_video_projects_product_id'), table_name='video_projects')
    op.drop_index(op.f('ix_video_projects_user_id'), table_name='video_projects')
    op.drop_index(op.f('ix_video_projects_workspace_id'), table_name='video_projects')
    op.drop_table('video_projects')

    # Drop enum types
    op.execute('DROP TYPE IF EXISTS videoprojectstatus')
    op.execute('DROP TYPE IF EXISTS videomode')