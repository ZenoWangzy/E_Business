# Story 3.2: AI Copy Generation Service

Status: ready-for-dev

## Story

As a **Developer**,
I want to **implement a secure, multi-tenant AI copy generation service**,
so that **users can generate high-quality marketing copy with real-time progress updates while maintaining workspace isolation and quota compliance**.

## Acceptance Criteria

### 1. Authenticated Request Processing
**Given** A user is authenticated with a valid JWT token containing workspace_id
**And** The user has sufficient quota remaining for copy generation
**When** A POST request is made to `/api/v1/copy/generate`
**Then** The request must be validated for workspace ownership
**And** Quota must be decremented before generation starts
**And** The request must be rate-limited to prevent abuse

### 2. Data Integration from Asset Model
**Given** A product_id is provided in the request
**When** The service fetches product data
**Then** It must query the Asset model for assets associated with the workspace and product
**And** It must extract text content from the Asset.content field
**And** It must aggregate text from all related assets (PDFs, images with OCR, etc.)

### 3. Async Generation with SSE Streaming
**Given** A copy generation request is initiated
**When** The service processes the request
**Then** It must immediately return a job_id to the client
**And** It must emit real-time progress updates via Server-Sent Events:
  - "parsing" - Extracting product information
  - "prompting" - Constructing LLM prompt
  - "generating" - LLM processing
  - "parsing_response" - Structuring output
  - "completed" - Final result ready

### 4. Complete API Schema Definition
**Request Schema** (`CopyGenerationRequest`):
```python
class CopyGenerationRequest(BaseModel):
    workspace_id: UUID
    product_id: UUID
    copy_type: Literal["titles", "selling_points", "faq", "descriptions"]
    tone: Optional[Literal["professional", "casual", "enthusiastic", "luxury"]] = "professional"
    target_audience: Optional[str] = None
    length_preference: Optional[Literal["short", "medium", "long"]] = "medium"
    count: int = Field(default=5, ge=1, le=10)
```

**Response Schema** (`CopyGenerationResponse`):
```python
class CopyGenerationResponse(BaseModel):
    job_id: str
    status: Literal["pending", "processing", "completed", "failed"]
    items: Optional[List[str]] = None
    error: Optional[str] = None
```

### 5. Comprehensive Prompt Templates
**SEO Titles Template**:
```
System: You are an expert e-commerce copywriter. Generate 5 SEO-optimized titles under 60 characters.
Product: {product_text}
Category: {product_category}
Tone: {tone}
Target: {target_audience}

Requirements:
- Include primary keywords naturally
- Create urgency or curiosity
- Highlight key benefits
- Be mobile-friendly (displays well on small screens)

Output: JSON array of 5 titles
```

**Selling Points Template**:
```
System: You are a marketing expert creating compelling selling points.
Product: {product_text}
Features: {extracted_features}
Tone: {tone}
Target: {target_audience}

Requirements:
- Focus on benefits, not just features
- Use emotional triggers
- Include social proof elements
- Address pain points

Output: JSON array of 3-5 selling points
```

**FAQ Template**:
```
System: You are creating a comprehensive FAQ for this product.
Product: {product_text}
Common Questions: {extracted_questions}
Tone: {tone}

Requirements:
- Include 5-7 most common questions
- Provide clear, concise answers
- Address shipping, returns, warranty
- Cover technical specifications

Output: JSON array of Q&A pairs
```

### 6. Error Handling & Resilience
**Given** The LLM API encounters an error
**When** Processing the request
**Then** The service must:
  - Implement exponential backoff retry (3 attempts, 2s base delay)
  - Return structured error responses with proper HTTP codes
  - Log errors without exposing API keys
  - Emit "failed" status via SSE with error details
  - Refund quota on failure

### 7. Audit & Usage Tracking
**Given** Any copy generation request
**When** The service processes it
**Then** It must create an audit record with:
  - workspace_id, user_id, product_id
  - copy_type, tokens_used, cost
  - timestamp, status, result_count
**And** Store in audit_log table for billing analytics

## Tasks / Subtasks

### Phase 1: Foundation & Dependencies
- [ ] **Backend: Dependencies & Config**
  - [ ] Add to `pyproject.toml`: `openai>=1.3.0`, `tenacity>=8.2.0`, `redis>=5.0.0`
  - [ ] Update `.env`: `OPENAI_API_KEY`, `OPENAI_MODEL=gpt-4-turbo-preview`, `COPY_GENERATION_RATE_LIMIT=10/min`
  - [ ] Add config settings for: max_tokens, temperature, retry_attempts

### Phase 2: Data Models & Schemas
- [ ] **Backend: Schema Definitions** (`backend/app/schemas/copy.py`)
  ```python
  from pydantic import BaseModel, Field
  from typing import Optional, List, Literal
  from uuid import UUID

  class CopyGenerationRequest(BaseModel):
      workspace_id: UUID
      product_id: UUID
      copy_type: Literal["titles", "selling_points", "faq", "descriptions"]
      tone: Optional[Literal["professional", "casual", "enthusiastic", "luxury"]] = "professional"
      target_audience: Optional[str] = None
      length_preference: Optional[Literal["short", "medium", "long"]] = "medium"
      count: int = Field(default=5, ge=1, le=10)

  class CopyGenerationResponse(BaseModel):
      job_id: str
      status: Literal["pending", "processing", "completed", "failed"]
      items: Optional[List[str]] = None
      error: Optional[str] = None
      tokens_used: Optional[int] = None
  ```

### Phase 3: Service Layer Implementation
- [ ] **Backend: Copy Service Logic** (`backend/app/services/copy_service.py`)
  ```python
  class CopyGenerationService:
      async def generate_copy_async(
          self,
          workspace_id: UUID,
          product_id: UUID,
          request: CopyGenerationRequest,
          job_id: str,
          progress_callback: callable
      ) -> List[str]:
          # 1. Fetch and aggregate asset content
          # 2. Construct prompt based on copy_type
          # 3. Call LLM with retry logic
          # 4. Parse and validate response
          # 5. Update progress via SSE
  ```

- [ ] **Prompt Template System**
  - [ ] Create `templates/titles.txt`, `templates/selling_points.txt`, `templates/faq.txt`
  - [ ] Implement template rendering with Jinja2
  - [ ] Add support for dynamic content insertion

### Phase 4: API Endpoint & SSE
- [ ] **Backend: API Endpoint** (`backend/app/api/v1/endpoints/copy.py`)
  ```python
  @router.post("/generate")
  @rate_limit("10/minute")
  async def generate_copy(
      request: CopyGenerationRequest,
      current_user: User = Depends(get_current_user),
      db: AsyncSession = Depends(get_db)
  ) -> CopyGenerationResponse:
      # 1. Validate workspace ownership
      # 2. Check quota limits
      # 3. Start async job
      # 4. Return job_id immediately
  ```

- [ ] **SSE Endpoint**
  ```python
  @router.get("/generate/{job_id}/status")
  async def generation_status(job_id: str):
      # Stream real-time updates
  ```

### Phase 5: Background Processing
- [ ] **Backend: Celery Task** (for complex generations >30s)
  - [ ] Create `backend/app/tasks/copy_tasks.py`
  - [ ] Implement fallback to Celery when complexity > threshold
  - [ ] Store job state in Redis

### Phase 6: Audit & Logging
- [ ] **Backend: Audit Service**
  - [ ] Log all generation requests with metadata
  - [ ] Track token usage and costs
  - [ ] Create daily usage reports endpoint

### Phase 7: Testing Strategy
- [ ] **Unit Tests** (`tests/test_copy_service.py`)
  ```python
  @pytest.mark.asyncio
  async def test_generate_titles_success():
      # Mock LLM response
      # Verify prompt construction
      # Test output parsing
  ```

- [ ] **Integration Tests**
  - [ ] Test full SSE flow
  - [ ] Test quota enforcement
  - [ ] Test workspace isolation
  - [ ] Test error scenarios

- [ ] **Load Testing**
  - [ ] Simulate concurrent requests
  - [ ] Verify rate limiting
  - [ ] Monitor memory usage

## Architecture Patterns

### Service Layer
- **Separation of Concerns**: Prompt logic in service, not in route handlers
- **Dependency Injection**: Database, Redis, LLM client injected via FastAPI's DI system
- **Async/Await**: All I/O operations non-blocking

### Multi-tenancy
- **Row Level Security**: All queries filtered by workspace_id
- **Quota Management**: Redis-based counters with TTL
- **Isolation**: Each workspace's data completely isolated

### Error Handling
```python
class CopyGenerationError(Exception):
    def __init__(self, message: str, error_code: str, retryable: bool = False):
        self.message = message
        self.error_code = error_code
        self.retryable = retryable

ERROR_CODES = {
    "QUOTA_EXCEEDED": (402, "Payment Required", False),
    "LLM_TIMEOUT": (504, "Gateway Timeout", True),
    "INVALID_PRODUCT": (404, "Not Found", False),
}
```

## Security Implementation

### Authentication
```python
# All copy endpoints require:
async def get_current_user_workspace(
    token: str = Depends(oauth2_scheme),
    workspace_id: UUID = Path(...),
    db: AsyncSession = Depends(get_db)
) -> Tuple[User, Workspace]:
    # Verify JWT token
    # Check workspace membership
    # Return user and workspace context
```

### Rate Limiting
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/generate")
@limiter.limit("10/minute")
async def generate_copy(...):
```

### Input Validation
- Sanitize all user inputs
- Validate UUID formats
- Limit generation count to prevent abuse
- SQL injection prevention through SQLAlchemy ORM

## Performance Optimization

### Caching Strategy
- Cache product data aggregation for 5 minutes
- Cache template rendering results
- Use Redis for job state storage

### LLM Optimization
- Batch multiple small requests when possible
- Use streaming responses for long generations
- Implement request queuing for cost management

## Monitoring & Observability

### Metrics to Track
- Generation success/failure rate
- Average tokens per generation
- Cost per workspace
- Popular copy types

### Logging
```python
import structlog

logger = structlog.get_logger()

logger.info(
    "copy_generation_started",
    workspace_id=workspace_id,
    product_id=product_id,
    copy_type=request.copy_type
)
```

## Dependencies & Prerequisites

### Existing Models Required
- **Asset Model** (Epic 1): `backend/app/models/asset.py` - Contains product text content
- **User/Workspace Models** (Epic 1): For authentication and multi-tenancy
- **Audit Model**: For logging AI usage

### Service Dependencies
- **Redis**: For job state and SSE streaming
- **PostgreSQL**: For persistent data storage
- **MinIO**: For asset file storage (referenced but not directly used)

### Integration Points
- **Frontend Story 3.1**: Copywriting Studio UI expects SSE updates
- **Quota Service**: Must integrate with subscription management
- **Audit Service**: Must log all AI generations

## Testing Coverage Requirements

### Unit Tests (95% coverage required)
```python
# test_copy_service.py
- test_prompt_construction_titles()
- test_prompt_construction_selling_points()
- test_prompt_construction_faq()
- test_llm_call_success()
- test_llm_call_retry_logic()
- test_asset_content_aggregation()
- test_workspace_isolation()
- test_quota_enforcement()

# test_endpoints.py
- test_generate_copy_unauthorized()
- test_generate_copy_insufficient_quota()
- test_generate_copy_success()
- test_sse_stream()
- test_rate_limiting()
```

### Integration Tests
- End-to-end generation flow
- Multi-tenant data isolation
- SSE real-time updates
- Error propagation
- Concurrency handling

### Load Testing
- 100 concurrent users (NFR6)
- Response times <2 seconds for simple generations
- Memory usage stability

## Known Constraints

### Performance Requirements
- Simple copy generation: <5 seconds
- Complex copy generation: <30 seconds
- Rate limit: 10 requests per minute per user

### Security Requirements
- Workspace data isolation (NFR3)
- Input sanitization (NFR5)
- No API key exposure in logs

### Compliance
- GDPR compliance for user data
- Audit trail for all AI operations
- Cost tracking for billing

## References

### Story Dependencies
- **Story 3.1**: Copywriting Studio UI - Frontend integration
- **Story 1.6**: Product Category Selection - Product context
- **Story 1.5**: Asset Storage Service - File content access

### Architecture References
- [Module 1: Smart Copy (Text)](file:///Users/ZenoWang/Documents/project/E_Business/docs/architecture.md#module-1-smart-copy-text)
- [Multi-tenancy Patterns](file:///Users/ZenoWang/Documents/project/E_Business/docs/architecture.md#cross-cutting-multi-tenancy)
- [API Consistency Rules](file:///Users/ZenoWang/Documents/project/E_Business/docs/architecture.md#api- consistency)

### Epic Context
- [Epic 3: Content Power - AI Copywriting Studio](file:///Users/ZenoWang/Documents/project/E_Business/docs/epics.md#epic-3-content-power---ai-copywriting-studio)

## Success Metrics

### Functional Success
- All copy types generate valid, readable content
- SSE streaming works for real-time updates
- Workspace isolation is 100% effective
- Rate limiting prevents abuse

### Performance Success
- 95% of requests complete within SLA
- No memory leaks under sustained load
- Redis job storage uses <100MB

### Business Success
- AI usage is accurately tracked
- Cost per generation is within budget
- User satisfaction score >4.5/5

## Rollout Plan

### Phase 1: Core Functionality
1. Basic copy generation (titles only)
2. Simple prompt templates
3. Basic error handling

### Phase 2: Full Feature Set
1. All copy types (titles, selling points, FAQ, descriptions)
2. Advanced prompt engineering
3. SSE streaming

### Phase 3: Production Hardening
1. Full test coverage
2. Load testing
3. Monitoring and alerting

## Open Questions

TBD during implementation:
- Exact token limits per copy type
- Cost allocation model for billing
- A/B testing strategy for prompt optimization

## Dev Agent Record

### Context Reference
- **Story ID**: 3.2
- **Epic**: 3 (Content Power)
- **Prerequisites**: Stories 1.5, 1.6, 3.1

### Implementation Priority
1. **HIGH**: Core service with workspace isolation
2. **HIGH**: SSE streaming for frontend compatibility
3. **MEDIUM**: Advanced prompt optimization
4. **LOW**: A/B testing framework
