# Story 5.3: Admin Dashboard - Stats & Logs

Status: validated

## Story

**As an** Admin,
**I want** to view system health, aggregated usage statistics, and recent error logs,
**So that** I can monitor the platform's performance and proactively identify issues.

## Acceptance Criteria

### AC1: Admin Authorization Guard
**Given** A user attempts to access the `/admin` route group
**When** The request is processed
**Then** The system should verify if the user has the `ADMIN` role
**And** If unauthorized, redirect to standard dashboard or 403 Forbidden
**And** This check must be robust (server-side)

### AC2: Key Metrics Overview
**Given** I am on the Admin Dashboard
**When** The "Overview" tab loads
**Then** I should see summary cards for:
  - Total Active Workspaces
  - Total Generations Today (Image/Copy/Video)
  - System Error Rate (Last 24h)
  - Current Revenue/MRR (Estimate based on subscriptions)

### AC3: System Logs Viewer
**Given** I want to investigate errors
**When** I view the "Logs" section
**Then** I should see a paginated table of system events
**And** Columns should include: Timestamp, Level (Info/Error), Component, Message, Trace ID
**And** I should be able to filter by "Error" level
**And** I should be able to click a row to see the full stack trace (if available)

### AC4: Performance Charts
**Given** I want to see trends
**When** I view the "Analytics" section
**Then** I should see a line chart of "Generations over last 7 days"
**And** I should see a bar chart of "Usage by Tier"

## Tasks / Subtasks

- [ ] **1. System Admin Model & Security**
  - [ ] Update `backend/app/models/user.py`:
    - [ ] Add `is_superuser: Mapped[bool] = mapped_column(default=False)` field
    - [ ] Create database migration for existing users
  - [ ] Update `backend/app/api/deps.py`:
    - [ ] Add `get_current_superuser` dependency with explicit admin check
    - [ ] Ensure server-side validation (not just client-side)

- [ ] **2. SystemLog Model & Database Logging**
  - [ ] Create `backend/app/models/system_log.py`:
    - [ ] Define SystemLog table with level, message, component, trace_id, stack_trace
    - [ ] Add monthly table partitioning for performance
    - [ ] Create indexes for efficient querying
  - [ ] Create `backend/app/core/db_log_handler.py`:
    - [ ] Implement custom logging handler that writes to SystemLog table
    - [ ] Filter to ERROR/WARNING levels (INFO levels stay in files)
    - [ ] Add async logging to avoid blocking main thread

- [ ] **3. Admin Stats API**
  - [ ] Create `backend/app/api/v1/endpoints/admin.py`:
    - [ ] Protect all endpoints with `get_current_superuser` dependency
    - [ ] `GET /admin/stats`: Use optimized CTE queries for aggregation
    - [ ] `GET /admin/logs`: Paginated SystemLog query with filters
    - [ ] Add Redis caching with TTL for heavy queries
    - [ ] Implement rate limiting to prevent abuse

- [ ] **4. Frontend Admin Layout & Performance**
  - [ ] Create `frontend/src/app/(admin)/layout.tsx`:
    - [ ] Distinct sidebar or header to differentiate from User Dashboard
    - [ ] Add admin-only navigation protection
  - [ ] Create `frontend/src/app/(admin)/admin/page.tsx`:
    - [ ] Dashboard grid layout with lazy-loaded components
    - [ ] Implement data refresh with stale-while-revalidate pattern
  - [ ] Install and configure `recharts` for visualization

- [ ] **5. Log Viewer Component**
  - [ ] Create `frontend/src/components/admin/LogViewer.tsx`:
    - [ ] Paginated Data Table with server-side sorting/filtering
    - [ ] Modal for detailed stack trace view
    - [ ] Export functionality for filtered logs
    - [ ] Real-time updates using WebSocket or polling

- [ ] **6. Performance Optimization**
  - [ ] Create `backend/app/tasks/stats_precomputation.py`:
    - [ ] Celery task to pre-compute daily stats
    - [ ] Store in Redis with expiration
    - [ ] Schedule to run every hour
  - [ ] Add data archiving task:
    - [ ] Archive SystemLog entries older than 90 days
    - [ ] Compress and store in cold storage

- [ ] **7. Testing**
  - [ ] Unit Tests:
    - [ ] Verify `get_current_superuser` blocks non-admins
    - [ ] Test SystemLog model and DB handler
    - [ ] Test caching mechanisms
  - [ ] Integration Tests:
    - [ ] UI test: Non-admin cannot access `/admin` routes
    - [ ] Performance test: Stats API response < 200ms
    - [ ] Security test: SQL injection prevention

## Dev Notes

### Technical Implementation Guide

#### System Admin Model Implementation
```python
# backend/app/models/user.py - Add to existing User model
is_superuser: Mapped[bool] = mapped_column(default=False, index=True)

# backend/app/api/deps.py
async def get_current_superuser(
    current_user: CurrentUser = Depends(get_current_user)
) -> User:
    """Require system-level superuser access"""
    if not current_user.is_superuser:
        logger.warning(
            "Unauthorized admin access attempt",
            user_id=current_user.id,
            email=current_user.email
        )
        raise HTTPException(
            status_code=403,
            detail="Superuser access required"
        )
    return current_user
```

#### SystemLog Model with Partitioning
```python
# backend/app/models/system_log.py
class SystemLogLevel(str, enum.Enum):
    ERROR = "error"
    WARNING = "warning"
    INFO = "info"

class SystemLog(Base):
    """System runtime logs (separate from audit logs)"""
    __tablename__ = "system_logs"
    __table_args__ = (
        # Monthly partitioning for performance
        CheckConstraint(
            "created_at >= date_trunc('month', CURRENT_DATE)"
        ),
        Index("ix_system_logs_level_created", "level", "created_at"),
        Index("ix_system_logs_component_created", "component", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    level: Mapped[SystemLogLevel] = mapped_column(index=True)
    message: Mapped[str]
    component: Mapped[str]  # e.g., "api", "worker", "celery"
    trace_id: Mapped[Optional[str]]
    stack_trace: Mapped[Optional[Text]]
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
```

#### Database Logging Handler
```python
# backend/app/core/db_log_handler.py
import logging
import asyncio
from sqlalchemy.ext.asyncio import AsyncSession

class DBLogHandler(logging.Handler):
    """Async logging handler for ERROR/WARNING to database"""

    def __init__(self, session_factory):
        super().__init__()
        self.session_factory = session_factory
        self.setLevel(logging.WARNING)  # Only WARNING and ERROR

    def emit(self, record):
        """Non-blocking emit"""
        asyncio.create_task(self._async_emit(record))

    async def _async_emit(self, record):
        async with self.session_factory() as session:
            log_entry = SystemLog(
                level=record.levelname.lower(),
                message=record.getMessage(),
                component=getattr(record, 'component', 'unknown'),
                trace_id=getattr(record, 'trace_id', None),
                stack_trace=self.format(record) if record.exc_info else None
            )
            session.add(log_entry)
            await session.commit()
```

#### Optimized Stats API
```python
# backend/app/api/v1/endpoints/admin.py
from fastapi import Depends, HTTPException, Query
from sqlalchemy import text
from redis import Redis

@router.get("/stats")
async def get_admin_stats(
    db: AsyncSession = Depends(get_db),
    redis: Redis = Depends(get_redis),
    _: User = Depends(get_current_superuser)
):
    """Get cached or compute system statistics"""
    # Try cache first
    cached = await redis.get("admin:stats")
    if cached:
        return json.loads(cached)

    # Compute using optimized CTE queries
    query = text("""
        WITH stats AS (
            SELECT
                (SELECT COUNT(*) FROM workspaces WHERE is_active = true) as active_workspaces,
                (SELECT COUNT(*) FROM image_generation_jobs
                 WHERE created_at >= CURRENT_DATE) as generations_today,
                (SELECT COUNT(*) FROM system_logs
                 WHERE level = 'error'
                 AND created_at >= NOW() - INTERVAL '24 hours') as errors_24h,
                (SELECT COALESCE(SUM(amount), 0) FROM subscriptions
                 WHERE status = 'active' AND period_end > NOW()) as mrr
        )
        SELECT * FROM stats
    """)

    result = await db.execute(query)
    stats = dict(result.fetchone())

    # Cache for 5 minutes
    await redis.setex("admin:stats", 300, json.dumps(stats))
    return stats
```

#### Real-time Log Updates
```typescript
// frontend/src/hooks/useRealTimeLogs.ts
export function useRealTimeLogs(filters: LogFilters) {
    const [logs, setLogs] = useState<SystemLog[]>([])

    useEffect(() => {
        const ws = new WebSocket(`${WS_BASE}/admin/logs/ws`)

        ws.onmessage = (event) => {
            const newLog = JSON.parse(event.data)
            if (passesFilters(newLog, filters)) {
                setLogs(prev => [newLog, ...prev.slice(0, 999)])
            }
        }

        return () => ws.close()
    }, [filters])

    return logs
}
```

#### Error Handling & Monitoring
```python
# backend/app/middleware/admin_error_handler.py
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse

@app.exception_handler(Exception)
async def admin_error_handler(request: Request, exc: Exception):
    """Global error handler with admin-specific logging"""
    error_id = str(uuid.uuid4())

    # Log to database for admin visibility
    logger.error(
        "Unhandled admin error",
        error_id=error_id,
        path=request.url.path,
        method=request.method,
        user_id=getattr(request.state, 'user_id', None),
        error=str(exc),
        traceback=traceback.format_exc()
    )

    # Return generic error to client
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "error_id": error_id  # For support lookup
        }
    )
```

#### Security Hardening
```python
# Rate limiting for admin endpoints
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.get("/logs")
@limiter.limit("10/minute")  # Prevent log table abuse
async def get_admin_logs(
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_superuser)
):
    # Implementation with rate limiting
    pass
```

### Architecture Compliance
- **Security**: Multi-layer protection (superuser role + server validation + rate limiting)
- **Performance**: Partitioned tables + Redis caching + pre-computation
- **Scalability**: Async logging + pagination + data archiving
- **Monitoring**: Real-time updates + error tracking + health checks

### References
- [Epic 5 Requirements](file:///Users/ZenoWang/Documents/project/E_Business/docs/epics.md#story-53-admin-dashboard---stats--logs)
- [Existing User Model](../backend/app/models/user.py) - Reference for adding is_superuser
- [Existing Logger](../backend/app/core/logger.py) - Base logger configuration
- [Existing API Patterns](../backend/app/api/v1/endpoints/workspaces.py) - Reference for API structure

## Testing Strategy Examples

### Security Test Example
```python
# tests/test_admin_security.py
@pytest.mark.asyncio
async def test_superuser_required():
    """Test that non-superusers cannot access admin endpoints"""
    # Create regular user
    user = await create_user(is_superuser=False)
    token = await get_user_token(user)

    # Try to access admin endpoint
    response = client.get(
        "/admin/stats",
        headers={"Authorization": f"Bearer {token}"}
    )
    assert response.status_code == 403
    assert "Superuser access required" in response.json()["detail"]
```

### Performance Test Example
```python
# tests/test_admin_performance.py
@pytest.mark.asyncio
async def test_stats_api_performance():
    """Test stats API response time under load"""
    # Create test data
    await create_test_data(workspaces=10000, jobs=100000)

    # Measure response time
    start = time.time()
    response = client.get("/admin/stats", headers=admin_headers)
    duration = time.time() - start

    assert response.status_code == 200
    assert duration < 0.2  # Should be under 200ms
```

## Dev Agent Record

### Context Reference
- **Analysis**: Full system admin implementation with security, performance, and monitoring.
- **Pattern**: Enterprise-grade admin dashboard with real-time capabilities.
- **Key Files**:
  - System Admin: `backend/app/models/user.py` & `backend/app/api/deps.py`
  - System Logging: `backend/app/models/system_log.py` & `backend/app/core/db_log_handler.py`
  - Admin API: `backend/app/api/v1/endpoints/admin.py`
  - Admin UI: `frontend/src/app/(admin)/`

### Completion Notes List
- [ ] System superuser model implemented
- [ ] SystemLog table with partitioning created
- [ ] Async database logging handler added
- [ ] Admin endpoints with rate limiting secured
- [ ] Real-time log viewer with WebSocket
- [ ] Performance optimization (cache + precompute)
- [ ] Comprehensive security and performance tests
- [ ] Monitoring and alerting system
- [ ] Data archiving for compliance
