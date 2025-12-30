"""
[IDENTITY]: Workspace Compatibility Shim
Re-exports Workspace-related models from `user.py` to maintain backward compatibility.

[INPUT]: None
[LINK]:
- Source -> ./user.py

[OUTPUT]: Re-exported symbols
[POS]: /backend/app/models/workspace.py

[PROTOCOL]:
1. Do not add new models here. Add them to `user.py` or new specific files.
"""

from app.models.user import (
    Workspace,
    WorkspaceMember,
    WorkspaceInvite,
    UserRole,
    InviteStatus,
)

__all__ = [
    "Workspace",
    "WorkspaceMember",
    "WorkspaceInvite",
    "UserRole",
    "InviteStatus",
]
