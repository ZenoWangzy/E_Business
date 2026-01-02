/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Workspace API Client
 * Multi-tenancy workspace management service.
 *
 * Story关联: Story 1.3 - Multi-tenancy API integration
 *
 * [INPUT]:
 * - workspaceId: string
 * - CreateWorkspaceRequest, UpdateWorkspaceRequest, etc.
 *
 * [LINK]:
 * - Backend API -> /api/v1/workspaces
 * - Type Definitions -> @/types/workspace.ts
 *
 * [OUTPUT]:
 * - Workspace, WorkspaceMember, WorkspaceInvite objects
 *
 * [POS]: /frontend/src/lib/api/workspaces.ts
 *
 * [PROTOCOL]:
 * 1. All requests must use credentials: 'include'.
 * 2. Response handling wrapper handles standard errors.
 * 3. Supports Invite mechanics (Create, List, Cancel, Accept).
 *
 * === END HEADER ===
 */

import type {
    Workspace,
    WorkspaceMember,
    WorkspaceInvite,
    WorkspaceInvitePreview,
    CreateWorkspaceRequest,
    UpdateWorkspaceRequest,
    CreateInviteRequest,
    UpdateMemberRoleRequest,
    WorkspaceResponse,
    WorkspaceListResponse,
    MemberListResponse,
    MemberResponse,
    InviteResponse,
    InviteListResponse,
    UserRole,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// =============================================================================
// Utility Functions
// =============================================================================

async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.error?.message || `HTTP ${response.status}`);
    }
    return response.json();
}

function buildUrl(path: string): string {
    return `${API_BASE}/api/v1${path}`;
}

// =============================================================================
// Workspace CRUD
// =============================================================================

export async function createWorkspace(data: CreateWorkspaceRequest, token: string): Promise<Workspace> {
    const response = await fetch(buildUrl('/workspaces/'), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
        },
        credentials: 'include',
        body: JSON.stringify(data),
    });
    // Flat Response - direct data return
    return handleResponse<Workspace>(response);
}

export async function listWorkspaces(token: string, skip = 0, limit = 100): Promise<{ workspaces: Workspace[]; total: number }> {
    const { fetchWithTimeout } = await import('./fetchWithTimeout');
    const response = await fetchWithTimeout(
        buildUrl(`/workspaces/?skip=${skip}&limit=${limit}`),
        {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
        },
        10000  // 10 秒超时
    );
    // Flat Response - returns list directly
    const workspaces = await handleResponse<Workspace[]>(response);
    return { workspaces, total: workspaces.length };
}

export async function getWorkspace(workspaceId: string): Promise<Workspace> {
    const response = await fetch(buildUrl(`/workspaces/${workspaceId}`), {
        credentials: 'include',
    });
    return handleResponse<Workspace>(response);
}

export async function updateWorkspace(workspaceId: string, data: UpdateWorkspaceRequest): Promise<Workspace> {
    const response = await fetch(buildUrl(`/workspaces/${workspaceId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
    });
    return handleResponse<Workspace>(response);
}

export async function deleteWorkspace(workspaceId: string): Promise<void> {
    const response = await fetch(buildUrl(`/workspaces/${workspaceId}`), {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete workspace');
    }
}

// =============================================================================
// Member Management
// =============================================================================

export async function listMembers(workspaceId: string): Promise<{ members: WorkspaceMember[]; total: number }> {
    const response = await fetch(buildUrl(`/workspaces/${workspaceId}/members`), {
        credentials: 'include',
    });
    const members = await handleResponse<WorkspaceMember[]>(response);
    return { members, total: members.length };
}

export async function updateMemberRole(
    workspaceId: string,
    userId: string,
    data: UpdateMemberRoleRequest
): Promise<WorkspaceMember> {
    const response = await fetch(buildUrl(`/workspaces/${workspaceId}/members/${userId}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data),
    });
    return handleResponse<WorkspaceMember>(response);
}

export async function removeMember(workspaceId: string, userId: string): Promise<void> {
    const response = await fetch(buildUrl(`/workspaces/${workspaceId}/members/${userId}`), {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to remove member');
    }
}

// =============================================================================
// Invite Management
// =============================================================================

export async function createInvite(workspaceId: string, data: CreateInviteRequest): Promise<WorkspaceInvite> {
    const response = await fetch(buildUrl(`/workspaces/${workspaceId}/invites`), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
            invited_email: data.invitedEmail,
            role: data.role,
        }),
    });
    return handleResponse<WorkspaceInvite>(response);
}

export async function listInvites(workspaceId: string): Promise<{ invites: WorkspaceInvite[]; total: number }> {
    const response = await fetch(buildUrl(`/workspaces/${workspaceId}/invites`), {
        credentials: 'include',
    });
    const invites = await handleResponse<WorkspaceInvite[]>(response);
    return { invites, total: invites.length };
}

export async function cancelInvite(workspaceId: string, inviteId: string): Promise<void> {
    const response = await fetch(buildUrl(`/workspaces/${workspaceId}/invites/${inviteId}`), {
        method: 'DELETE',
        credentials: 'include',
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to cancel invite');
    }
}

// =============================================================================
// Public Invite Actions (no auth required for preview)
// =============================================================================

export async function previewInvite(token: string): Promise<WorkspaceInvitePreview> {
    const response = await fetch(buildUrl(`/workspaces/invites/${token}`));
    return handleResponse<WorkspaceInvitePreview>(response);
}

export async function acceptInvite(token: string): Promise<Workspace> {
    const response = await fetch(buildUrl(`/workspaces/invites/${token}/accept`), {
        method: 'POST',
        credentials: 'include',
    });
    return handleResponse<Workspace>(response);
}

// =============================================================================
// Utilities
// =============================================================================

export function getRoleLabel(role: UserRole | string): string {
    const labels: Record<string, string> = {
        owner: '所有者',
        admin: '管理员',
        member: '成员',
        viewer: '访客',
    };
    return labels[role.toLowerCase()] || role;
}

export function canManageMembers(role: UserRole | string): boolean {
    return role === 'owner' || role === 'admin';
}

export function canDeleteWorkspace(role: UserRole | string): boolean {
    return role === 'owner';
}
