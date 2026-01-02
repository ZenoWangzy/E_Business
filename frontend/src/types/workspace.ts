/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Workspace Management Types
 * Type definitions for multi-tenant workspace and member management.
 *
 * Story关联: Story 1.3: Multi-tenancy Support
 *
 * [INPUT]:
 * - API Responses: Workspace, Member, Invite data
 * - Request Bodies: Create/Update workspace, invite, role management
 *
 * [LINK]:
 * - 依赖API -> @/lib/api/workspaces
 * - 使用组件 -> @/components/workspace/*
 * - 后端模型 -> backend/app/models/workspace.py
 *
 * [OUTPUT]: Complete workspace type system with enums and interfaces
 * [POS]: /frontend/src/types/workspace.ts
 *
 * [PROTOCOL]:
 * 1. UserRole enum: OWNER, ADMIN, MEMBER, VIEWER hierarchy
 * 2. InviteStatus enum: PENDING, ACCEPTED, EXPIRED, CANCELLED states
 * 3. All date fields use ISO string format
 * 4. API wrappers include data/message/timestamp fields
 *
 * === END HEADER ===
 */

// =============================================================================
// Enums
// =============================================================================

export enum UserRole {
    OWNER = 'owner',
    ADMIN = 'admin',
    MEMBER = 'member',
    VIEWER = 'viewer',
}

export enum InviteStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    EXPIRED = 'expired',
    CANCELLED = 'cancelled',
}

// =============================================================================
// Core Types
// =============================================================================

export interface UserBrief {
    id: string;
    email: string;
    name?: string;
}

export interface Workspace {
    id: string;
    name: string;
    slug: string;
    description?: string;
    maxMembers: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    memberCount?: number;
}

export interface WorkspaceMember {
    id: string;
    userId: string;
    workspaceId: string;
    role: UserRole;
    joinedAt: string;
    user?: UserBrief;
}

export interface WorkspaceInvite {
    id: string;
    workspaceId: string;
    invitedEmail: string;
    role: UserRole;
    token: string;
    expiresAt: string;
    status: InviteStatus;
    inviterId?: string;
    createdAt: string;
    acceptedAt?: string;
}

export interface WorkspaceInvitePreview {
    workspaceName: string;
    workspaceDescription?: string;
    inviterName?: string;
    role: UserRole;
    expiresAt: string;
    isValid: boolean;
}

// =============================================================================
// Request Types
// =============================================================================

export interface CreateWorkspaceRequest {
    name: string;
    description?: string;
    maxMembers?: number;
}

export interface UpdateWorkspaceRequest {
    name?: string;
    description?: string;
    maxMembers?: number;
    isActive?: boolean;
}

export interface CreateInviteRequest {
    invitedEmail: string;
    role?: UserRole;
}

export interface UpdateMemberRoleRequest {
    role: UserRole;
}

// =============================================================================
// Response Wrappers
// =============================================================================

export interface ApiResponse<T> {
    data: T;
    message?: string;
    timestamp?: string;
}

export interface ListResponse<T> {
    data: T[];
    total: number;
    message?: string;
    timestamp?: string;
}

export interface ErrorDetail {
    code: string;
    message: string;
    details?: Record<string, unknown>;
}

export interface ErrorResponse {
    error: ErrorDetail;
}

// Type aliases for common responses
export type WorkspaceResponse = ApiResponse<Workspace>;
export type WorkspaceListResponse = ListResponse<Workspace>;
export type MemberResponse = ApiResponse<WorkspaceMember>;
export type MemberListResponse = ListResponse<WorkspaceMember>;
export type InviteResponse = ApiResponse<WorkspaceInvite>;
export type InviteListResponse = ListResponse<WorkspaceInvite>;
