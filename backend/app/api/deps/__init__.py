"""
API Dependencies subpackage.

Re-exports quota checking dependencies and auth dependencies for use in endpoints.
"""
from app.api.deps.quota import (
    QuotaChecker,
    require_credits,
    check_copy_quota,
    check_image_quota,
    check_video_quota,
)

# Re-export auth dependencies from deps.py (at package level)
from app.api.deps_auth import (
    get_current_user,
    get_current_workspace_member,
    get_current_workspace,
    require_workspace_role,
    CurrentUser,
    CurrentWorkspaceMember,
)

# Re-export database dependency
from app.db.base import get_db

__all__ = [
    # Quota checking
    "QuotaChecker",
    "require_credits", 
    "check_copy_quota",
    "check_image_quota",
    "check_video_quota",
    # Auth dependencies
    "get_current_user",
    "get_current_workspace_member",
    "get_current_workspace",
    "require_workspace_role",
    "CurrentUser",
    "CurrentWorkspaceMember",
    # Database
    "get_db",
]

