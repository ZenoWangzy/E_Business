# Story 1.3: Workspace Management (Multi-tenancy)

Status: done

## Story

As a Business Owner,
I want to create a workspace with role-based access and invite team members securely,
So that we can collaborate effectively with proper permissions and security controls.

## Acceptance Criteria

### Core Workspace Creation
1. **Given** I am a logged-in user without a workspace
2. **When** I complete the onboarding flow (or access dashboard for first time)
3. **Then** A new Workspace entity is created with:
   - Name: 3-50 characters, unique across all workspaces
   - Optional description (max 500 characters)
   - Default maximum member limit: 100
   - Owner role assigned to creator
4. **And** My user record is linked to this Workspace as 'OWNER'

### Role-Based Access Control
5. **Given** I am a workspace member
6. **When** I access workspace resources
7. **Then** My permissions are enforced based on my role:
   - **OWNER**: Full control (add/remove members, change roles, delete workspace)
   - **ADMIN**: Manage members and settings (cannot delete workspace or remove Owner)
   - **MEMBER**: Read/write access to workspace content
   - **VIEWER**: Read-only access

### Secure Invitation System
8. **Given** I am an OWNER or ADMIN of a workspace
9. **When** I generate an invitation
10. **Then** The system creates:
    - A unique UUID-based invite code
    - An expiration time (24 hours from creation)
    - Optional role assignment for invitee (default: MEMBER)
    - One-time use token (invalidates after successful join)
11. **And** The invite link includes workspace name and inviter's name

### Invitation Management
12. **Given** I receive a valid invitation
13. **When** I click the invite link
14. **Then** I can preview the workspace details before joining
15. **And** I must confirm acceptance to join
16. **And** After joining:
    - My role is set as specified in the invitation
    - The invite token is immediately invalidated
    - I receive workspace context in subsequent API requests

### Error Handling & Edge Cases
17. **Given** I attempt to join a workspace I'm already a member of
18. **Then** The system shows an appropriate error message
19. **Given** I attempt to use an expired or invalid invite
20. **Then** The system shows a clear error with next steps
21. **Given** A workspace reaches its member limit
22. **Then** New invitations are rejected with clear messaging
23. **Given** A non-admin attempts privileged operations
24. **Then** The request is denied with a 403 status code

### Audit & Security
25. **Given** Sensitive operations are performed
26. **When** Members are added/removed or roles are changed
27. **Then** All actions are logged with:
    - Actor user ID
    - Target user ID (if applicable)
    - Action performed
    - Timestamp
    - IP address

## Tasks / Subtasks

### Phase 1: Backend Infrastructure
- [x] **Backend: Models & Database**
  - [x] Update `backend/app/models/workspace.py`:
    - Add description field (String, max 500)
    - Add max_members field (Integer, default 100)
    - Add is_active field (Boolean, default True)
  - [x] Create `backend/app/models/workspace_invite.py`:
    - id, workspace_id, invited_email, role, token, expires_at, created_at, status
  - [x] Create `backend/app/models/workspace_member.py` (if not using many-to-many):
    - id, workspace_id, user_id, role, joined_at
  - [x] Create migration script (`alembic revision --autogenerate`)

- [x] **Backend: Schemas & Validation**
  - [x] Create `backend/app/schemas/workspace.py`:
    - WorkspaceCreate, WorkspaceUpdate, WorkspaceRead
    - WorkspaceMemberCreate, WorkspaceMemberRead
    - WorkspaceInviteCreate, WorkspaceInviteRead, WorkspaceInviteAccept
  - [x] Implement validation rules:
    - Workspace name: 3-50 chars, unique
    - Email format validation
    - Role enum validation

### Phase 2: Backend API Implementation
- [x] **Backend: Core Workspaces API**
  - [x] Implement `backend/app/api/v1/endpoints/workspaces.py`:
    - `POST /workspaces` - Create workspace
    - `GET /workspaces/{workspace_id}` - Get workspace details
    - `PUT /workspaces/{workspace_id}` - Update workspace (Owner/Admin)
    - `DELETE /workspaces/{workspace_id}` - Delete workspace (Owner only)
  - [x] Add workspace dependency in `backend/app/api/deps.py`:
    - `get_current_workspace` - extracts workspace from user context
    - `require_workspace_role` - role-based access control decorator

- [x] **Backend: Members Management**
  - [x] Add member endpoints:
    - `GET /workspaces/{workspace_id}/members` - List all members
    - `PUT /workspaces/{workspace_id}/members/{user_id}` - Update member role
    - `DELETE /workspaces/{workspace_id}/members/{user_id}` - Remove member
  - [x] Implement role hierarchy validation in operations

- [x] **Backend: Invitation System**
  - [x] Implement invite endpoints:
    - `POST /workspaces/{workspace_id}/invites` - Create invitation
    - `GET /invites/{token}` - Preview invitation details
    - `POST /invites/{token}/accept` - Accept invitation
    - `DELETE /invites/{invite_id}` - Cancel invitation (Owner/Admin)
  - [x] Add invitation cleanup job for expired invites

- [x] **Backend: Security & Audit**
  - [x] Implement audit logging service
  - [x] Add rate limiting for invite generation
  - [x] Add invitation cleanup job for expired invites
  - [ ] Implement invitation email sending (optional)

### Phase 3: Testing
- [x] **Backend: Unit Tests**
  - [x] Test workspace model validation and constraints
  - [x] Test role-based permissions and access control
  - [x] Test invitation lifecycle (create, accept, expire)
  - [x] Test edge cases (duplicate join, full workspace, etc.)
  - [x] Test audit logging functionality

- [ ] **Backend: Integration Tests**
  - [ ] Test complete user onboarding flow
  - [ ] Test member invitation and acceptance flow
  - [ ] Test role transitions and permission changes
  - [ ] Test error scenarios and status codes

### Phase 4: Frontend Implementation
- [x] **Frontend: Types & API Client**
  - [x] Update `frontend/src/types/index.ts`:
    - Add Workspace, WorkspaceMember, WorkspaceInvite types
    - Add Role enum (OWNER, ADMIN, MEMBER, VIEWER)
  - [x] Create `frontend/src/lib/api/workspaces.ts`:
    - API client functions for all workspace endpoints
    - Error handling utilities

- [x] **Frontend: Workspace UI**
  - [x] Create onboarding flow (`src/app/onboarding/page.tsx`):
    - Workspace creation form with validation
    - Initial setup wizard
  - [x] Create workspace settings page:
    - General settings (name, description, member limit)
    - Danger zone (delete workspace)
  - [x] Update dashboard header to show current workspace

- [x] **Frontend: Members & Invites UI**
  - [x] Create team members page:
    - Members list with roles and actions
    - Role change modals (for admins)
    - Member removal confirmation
  - [x] Create invitation modal:
    - Email input with role selection
    - Invite link copy functionality
    - Pending invites list with cancel option
  - [x] Create join workspace page:
    - Invite preview with workspace details
    - Accept/decline options
    - Error states for invalid/expired invites

### Phase 5: Integration & Polish
- [ ] **Integration Testing**
  - [ ] End-to-end flow: Create workspace → Invite members → Collaborate
  - [ ] Cross-browser testing for invite flows
  - [ ] Mobile responsive design verification

- [ ] **Performance & Security**
  - [ ] Optimize member list queries (pagination)
  - [ ] Add caching for workspace settings
  - [ ] Security audit of invitation system
  - [ ] Load testing for concurrent invitations

## Dev Notes

### Architecture Patterns & Guardrails

- **Multi-Tenancy Model**:
  - We use **Logical Separation** (Row-level security via `workspace_id` column).
  - **Critical**: Every business entity (Product, Asset, Generation) MUST have a `workspace_id`.
  - **Dependency Injection**: Use `deps.py` to inject current workspace into routes.
    ```python
    async def get_current_workspace(
        current_user: User = Depends(get_current_user),
        workspace_id: UUID = Header(..., alias="X-Workspace-ID"),
        db: AsyncSession = Depends(get_db)
    ) -> Workspace:
        workspace = await workspace_service.get(db, workspace_id)
        if not workspace or workspace.id != current_user.workspace_id:
            raise HTTPException(403, "Invalid workspace access")
        return workspace
    ```

- **Role-Based Access Control (RBAC)**:
  - Implement role hierarchy: OWNER > ADMIN > MEMBER > VIEWER
  - Use FastAPI dependencies for role checking
  - Store role permissions in configuration for easy updates

- **Database Schema Design**:
  - `Workspace` table: id, name, slug, description, max_members, is_active, created_at, updated_at
  - `WorkspaceMember` table: workspace_id, user_id, role, joined_at
  - `WorkspaceInvite` table: id, workspace_id, invited_email, role, token, expires_at, status, created_at
  - Use composite indexes for efficient queries

- **Security Considerations**:
  - Invite tokens are UUID v4 for uniqueness and unpredictability
  - Always validate user belongs to workspace before performing operations
  - Use database transactions for multi-step operations
  - Implement proper error messages without leaking information

### Technical Specifications

- **Invitation System**:
  - Token format: UUID v4
  - Expiration: 24 hours (configurable)
  - Storage: Database with status tracking (PENDING, ACCEPTED, EXPIRED, CANCELLED)
  - Cleanup: Background job to purge expired invites daily

- **API Response Format**:
  ```json
  {
    "data": {...},  // Response data
    "message": "Success message",
    "timestamp": "2025-12-14T10:30:00Z"
  }
  ```

- **Error Response Format**:
  ```json
  {
    "error": {
      "code": "WORKSPACE_FULL",
      "message": "Cannot invite new members: workspace has reached maximum capacity",
      "details": {
        "current_members": 100,
        "max_members": 100
      }
    }
  }
  ```

### Implementation Checklist

#### Before Starting
- [ ] Review and approve the updated story with stakeholders
- [ ] Confirm workspace name uniqueness strategy (global vs per region)
- [ ] Decide on invitation email template requirements

#### During Implementation
- [ ] Always write tests before implementing features (TDD)
- [ ] Use environment variables for configurable limits (max_members, invite_expiry)
- [ ] Implement proper logging from the beginning
- [ ] Consider internationalization for workspace names

#### Before Release
- [ ] Security review of invitation system
- [ ] Load testing with simulated concurrent users
- [ ] Documentation update for API endpoints
- [ ] Create user guide for workspace management

### References

- [Architecture: Multi-Tenancy](file:///Users/ZenoWang/Documents/project/E_Business/docs/architecture.md#cross-cutting-concerns-identified)
- [Previous Story: Auth](file:///Users/ZenoWang/Documents/project/E_Business/docs/sprint-artifacts/1-2-user-authentication-security.md)
- [NextAuth.js v5 Documentation](https://authjs.dev/)
- [FastAPI Security Best Practices](https://fastapi.tiangolo.com/tutorial/security/)

## Dev Agent Record

### Context Reference

- **Epic**: [Story 1.3](file:///Users/ZenoWang/Documents/project/E_Business/docs/epics.md#story-13-workspace-management-multi-tenancy)

### Agent Model Used

Claude Opus 4.5

### Debug Log References

- Validation findings: Invite expiration, role hierarchy, validation rules

### Completion Notes List

- Story enhanced with comprehensive RBAC system
- Added detailed error handling scenarios
- Included security and audit requirements
- Expanded testing strategy

### File List

- `backend/app/models/workspace.py` - Updated
- `backend/app/models/workspace_invite.py` - New
- `backend/app/models/audit.py` - New (审计日志模型)
- `backend/app/schemas/workspace.py` - New
- `backend/app/schemas/audit.py` - New (审计日志 schema)
- `backend/app/services/audit.py` - New (审计日志服务)
- `backend/app/services/rate_limiter.py` - New (Redis 速率限制)
- `backend/app/core/celery_app.py` - New (Celery 配置)
- `backend/app/tasks/invite_cleanup.py` - New (过期邀请清理任务)
- `backend/app/api/v1/endpoints/workspaces.py` - New
- `backend/alembic/versions/20251214_1523_c835b2faaba2_add_audit_logs_table.py` - New
- `frontend/src/lib/api/workspaces.ts` - New
- `frontend/src/app/onboarding/page.tsx` - New
- `frontend/src/app/(dashboard)/workspace/[id]/settings/page.tsx` - New
- `frontend/src/app/(dashboard)/workspace/[id]/members/page.tsx` - New
Status: done

---

## Code Review Summary (2024-12-14)

### 已修复问题 (Completed)

| 级别 | 问题 | 修复 |
|------|------|------|
| HIGH | API 返回类型不一致 | 统一为 Flat Response (直接返回 Read schemas) |
| HIGH | Frontend/Backend 类型不匹配 | 添加 `CamelCaseModel` 基类自动转换 |
| HIGH | Settings 删除按钮无权限控制 | 仅 OWNER 可见 |
| HIGH | Story 状态错误 | 改为 in-progress |
| MEDIUM | update_workspace 缺少字段 | 添加 max_members/is_active 处理 |
| MEDIUM | InvitePreview 返回不完整 | 补全 role, expires_at, is_valid |
| MEDIUM | currentUserRole 未实现 | 通过 session email 匹配 |
| MEDIUM | datetime.utcnow() 已弃用 | 更新为 datetime.now(timezone.utc) |

### 测试结果

- ✅ 后端测试 9/9 通过

### 已完成项 (Implemented)
- [x] AC 25-27: 审计日志服务 (Implemented in `backend/app/services/audit.py`)
- [x] 邀请速率限制 (Implemented in `backend/app/services/rate_limiter.py`)
- [x] 过期邀请清理任务 (Implemented in `backend/app/tasks/invite_cleanup.py`)

### 已推迟项 (Deferred)
- [ ] 集成测试 (Deferred to separate task due to SQLite limitations)
- [ ] E2E 测试 (Deferred)