"""Add Video and VideoAudioTrack models for Story 4.4

Revision ID: 20251218_1630_video_audio_track
Revises: 20251218_add_video_generation_tables
Create Date: 2025-12-18 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '20251218_1630_video_audio_track'
down_revision: Union[str, None] = '20251218_add_video_generation_tables'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create VideoStatus enum
    op.execute("CREATE TYPE videostatus AS ENUM ('pending', 'processing', 'completed', 'failed')")
    
    # Create VideoQuality enum
    op.execute("CREATE TYPE videoquality AS ENUM ('720p', '1080p', '4K')")
    
    # Create videos table
    op.create_table(
        'videos',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column('project_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('title', sa.String(length=255), nullable=False),
        sa.Column('status', sa.Enum('pending', 'processing', 'completed', 'failed', name='videostatus'), nullable=False, server_default='pending'),
        sa.Column('video_url', sa.Text(), nullable=True),
        sa.Column('duration', sa.Integer(), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('quality', sa.Enum('720p', '1080p', '4K', name='videoquality'), nullable=False, server_default='1080p'),
        sa.Column('task_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('progress', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('error_message', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['project_id'], ['video_projects.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    )
    
    # Create indexes
    op.create_index('ix_videos_project_id', 'videos', ['project_id'])
    op.create_index('ix_videos_workspace_id', 'videos', ['workspace_id'])
    op.create_index('ix_videos_user_id', 'videos', ['user_id'])
    op.create_index('ix_videos_status', 'videos', ['status'])
    op.create_index('ix_videos_task_id', 'videos', ['task_id'])
    
    # Create video_audio_tracks table
    op.create_table(
        'video_audio_tracks',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False, primary_key=True),
        sa.Column('video_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('workspace_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('voice_id', sa.String(length=100), nullable=False),
        sa.Column('speed', sa.Integer(), nullable=False, server_default='1.0'),
        sa.Column('volume', sa.Integer(), nullable=True, server_default='1.0'),
        sa.Column('audio_url', sa.Text(), nullable=True),
        sa.Column('duration', sa.Integer(), nullable=True),
        sa.Column('file_size', sa.Integer(), nullable=True),
        sa.Column('provider', sa.String(length=50), nullable=False, server_default='openai'),
        sa.Column('cost', sa.Integer(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['video_id'], ['videos.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['workspace_id'], ['workspaces.id'], ondelete='CASCADE'),
    )
    
    # Create indexes
    op.create_index('ix_video_audio_tracks_video_id', 'video_audio_tracks', ['video_id'])
    op.create_index('ix_video_audio_tracks_workspace_id', 'video_audio_tracks', ['workspace_id'])


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_video_audio_tracks_workspace_id', table_name='video_audio_tracks')
    op.drop_index('ix_video_audio_tracks_video_id', table_name='video_audio_tracks')
    
    # Drop tables
    op.drop_table('video_audio_tracks')
    
    # Drop videos indexes
    op.drop_index('ix_videos_task_id', table_name='videos')
    op.drop_index('ix_videos_status', table_name='videos')
    op.drop_index('ix_videos_user_id', table_name='videos')
    op.drop_index('ix_videos_workspace_id', table_name='videos')
    op.drop_index('ix_videos_project_id', table_name='videos')
    
    # Drop videos table
    op.drop_table('videos')
    
    # Drop enums
    op.execute("DROP TYPE videoquality")
    op.execute("DROP TYPE videostatus")
