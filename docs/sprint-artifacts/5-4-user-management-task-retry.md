# Story 5.4: User Management & Task Retry

Status: validated

## Story

**As an** Superuser (System Administrator),
**I want** to manage global user accounts and retry failed asynchronous tasks,
**So that** I can provide system-level support and resolve stuck operations without direct database access.

**Note**: This is SYSTEM-LEVEL user management, not workspace member management. While workspace owners/managers manage members within their workspace, this feature allows superusers to manage all users across the entire platform.

## Acceptance Criteria

### AC1: System-Level User Management Views
**Given** I am logged in as a Superuser on the Admin Dashboard
**When** I navigate to the "Users" section
**Then** I should see a searchable, paginated table of ALL platform users (across all workspaces)
**And** Columns should include: Email, Superuser Status, Subscription Tier, Created At, Last Active, Workspace Count
**And** I should be able to filter by Subscription Tier or Superuser Status
**And** I should only see this section if I have superuser privileges

### AC2: User Detail & Actions
**Given** I click on a user in the table
**When** The detail view opens
**Then** I should see their profile info, all workspaces they belong to, and account status
**And** I should have options to:
  - "Deactivate User" (Global ban - blocks access to all workspaces)
  - "Reset Quota" (Manual override - *Note: Requires Story 5.1 subscription system*)
  - "Promote to Superuser" (Current superuser only, requires confirmation and audit logging)

**Security Requirements:**
- Only current superusers can promote other users to superuser
- All superuser promotions must be logged with audit trail
- Deactivation affects user's access across ALL workspaces
- Critical actions require confirmation modal

### AC3: User Task History
**Given** I am viewing a User Detail page
**When** I scroll to "Recent Tasks"
**Then** I should see a list of their last 50 AI generation tasks
**And** It should show Status (Pending/Success/Failed), Task Type, and Timestamp

### AC4: Task Retry Mechanism
**Given** A task in the history is marked as "FAILED"
**When** I click the "Retry" button
**Then** The system should re-enqueue the original task payload to Redis/Celery
**And** A new Task ID should potentially be generated (or reuse existing if idempotent)
**And** The UI should update to show the task is "Retrying"

## Tasks / Subtasks

- [ ] **1. User Management API**
  - [ ] Update `backend/app/api/v1/endpoints/admin.py`:
    - [ ] `GET /admin/users`: List with pagination/filtering
    - [ ] `GET /admin/users/{id}`: Details
    - [ ] `PATCH /admin/users/{id}`: Update status/quota mechanism

- [ ] **2. Task Management API**
  - [ ] Add `GET /admin/users/{id}/tasks`: Fetch from `ImageGenerationJob` / `VideoGenerationJob` tables
  - [ ] Add `POST /admin/tasks/{id}/retry`:
    - [ ] Logic to fetch job payload
    - [ ] Logic to re-submit to Celery

- [ ] **3. Frontend User Manager**
  - [ ] **Prerequisites**: Install required components:
    ```bash
    npx shadcn-ui@latest add table
    npx shadcn-ui@latest add dialog
    npx shadcn-ui@latest add alert-dialog
    ```
  - [ ] Create `frontend/src/app/(admin)/admin/users/page.tsx`:
    - [ ] Data Table with search and filtering
    - [ ] Superuser-only access protection
  - [ ] Create `frontend/src/app/(admin)/admin/users/[id]/page.tsx`:
    - [ ] User Profile Card with workspace list
    - [ ] Task History List
    - [ ] Action buttons with security controls

- [ ] **4. Retry Action UI**
  - [ ] Implement "Retry" button in Task History
  - [ ] Add loading state execution
  - [ ] Add Toast notification on success

- [ ] **5. Testing**
  - [ ] **Security Tests**:
    - [ ] Verify non-superusers cannot access admin endpoints
    - [ ] Test superuser promotion audit trail
    - [ ] Verify deactivation affects all workspaces
  - [ ] Unit Tests:
    - [ ] Test Retry logic (ensure payload is preserved)
    - [ ] Test quota handling with/without Story 5.1
  - [ ] E2E Tests:
    - [ ] Superuser logs in, manages users, retries tasks
    - [ ] Verify proper error handling for unauthorized access

## Dev Notes

### Technical Implementation Guide

#### Retry Logic
Re-submitting a task requires knowing the original parameters.
Ensure your Job models (`ImageGenerationJob`, etc.) store the original `request_payload` (JSON).
```python
# backend/app/services/task_service.py

async def retry_task(job_id: str, db: Session):
    job = db.get(Job, job_id)
    if not job or job.status != JobStatus.FAILED:
        raise ValueError("Invalid job for retry")
    
    # Reset state
    job.status = JobStatus.PENDING
    job.retry_count += 1
    db.commit()
    
    # Re-dispatch
    celery_app.send_task("app.worker.generate_image", args=[job.id, job.payload])
```

#### Idempotency & Quota Management

**Scenario 1: With Story 5.1 (Subscription System)**
- Failed tasks should automatically refund credits
- Retrying will re-deduct credits according to Story 5.1 billing logic
- Check `WorkspaceBilling.credits_remaining` before retry

**Scenario 2: Without Story 5.1 (Temporary Implementation)**
- Track retry attempts to prevent abuse
- Add logging for all retry operations
- Consider adding a daily retry limit per user

**Implementation Note**: The "Reset Quota" feature depends on Story 5.1. If Story 5.1 is not yet implemented, this action should:
1. Show a message "Subscription system not yet implemented"
2. Or use a manual credit adjustment log for tracking

### References
- [Epic 5 Requirements](file:///Users/ZenoWang/Documents/project/E_Business/docs/epics.md#story-54-user-management--task-retry)

## Dev Agent Record

### Context Reference
- **Analysis**: Completes the Admin circle with system-level user management.
- **Pattern**: Standard CRUD + Action with enhanced security controls.
- **Dependencies**: Story 5.3 (Admin Dashboard), optional Story 5.1 (Subscription System)

### Security Implementation Requirements
1. **Superuser Authentication**:
   - Use `is_superuser` field from Story 5.3
   - All endpoints must require superuser privilege

2. **Audit Logging**:
   - Log all user deactivations
   - Log all superuser promotions with who promoted whom
   - Log all task retries with original task ID

3. **Rate Limiting**:
   - Apply stricter rate limits to admin endpoints
   - Consider IP whitelisting for sensitive operations

### Completion Notes List
- [ ] User management API with superuser protection
- [ ] Retry endpoint with idempotency checks
- [ ] Security audit logging implemented
- [ ] Frontend with proper access controls
- [ ] Shadcn/ui components installed
