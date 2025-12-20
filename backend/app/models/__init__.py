# Import all models here for Alembic to discover
from app.models.user import (
    User, Workspace, WorkspaceMember, WorkspaceInvite, 
    UserRole, InviteStatus, SubscriptionTier, WorkspaceBilling
)
from app.models.audit import AuditLog, AuditAction
from app.models.asset import Asset
from app.models.product import Product
from app.models.image import ImageGenerationJob, Image, JobStatus, StyleType
from app.models.video import VideoProject, VideoGenerationJob, VideoMode, VideoProjectStatus, Video, VideoAudioTrack
from app.models.copy import CopyGenerationJob, CopyResult, CopyQuota, CopyType, Tone, Audience, Length
from app.models.system_log import SystemLog, SystemLogLevel

__all__ = [
    "User", "Workspace", "WorkspaceMember", "WorkspaceInvite",
    "UserRole", "InviteStatus", "SubscriptionTier", "WorkspaceBilling",
    "AuditLog", "AuditAction", "Asset", "Product", 
    "ImageGenerationJob", "Image", "JobStatus", "StyleType",
    "VideoProject", "VideoGenerationJob", "VideoMode", "VideoProjectStatus", "Video", "VideoAudioTrack",
    "CopyGenerationJob", "CopyResult", "CopyQuota", "CopyType", "Tone", "Audience", "Length",
    "SystemLog", "SystemLogLevel",
]


