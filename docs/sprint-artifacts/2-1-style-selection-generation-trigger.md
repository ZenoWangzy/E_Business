# Story 2.1: Style Selection & Generation Trigger

Status: done

## Story

As a **User**,
I want to **select a visual style for my product and trigger the generation process**,
so that **I can control the aesthetic of the generated images and start the AI creation workflow**.

## Acceptance Criteria

### 1. Style Selection UI
**Given** I have completed the Category Selection step (Story 1.6)
**When** I view the Style Selection screen
**Then** I should see a grid of 6 distinct style options:
  - Modern
  - Luxury
  - Fresh
  - Tech
  - Warm
  - Business
**And** Each style card should display a visual preview (as defined in UX specs, initially can be CSS gradients/placeholders)
**And** I should be able to select exactly one style at a time
**And** The interface should visually highlight the selected style

### 2. Triggering Generation
**Given** I have selected a style
**When** I click the "Generate" button
**Then** The system should send a request to the backend with:
  - Selected Style ID
  - Product Category (from previous step)
  - Uploaded Asset ID (from context)
  - Current Workspace ID
**And** The UI should immediately transition to a "Generating" loading state
**And** The "Generate" button should be disabled to prevent double-submission

### 3. Backend Generation Task (Async)
**Given** The backend receives a valid generation request
**When** The `POST /api/v1/images/generate` endpoint is called
**Then** It should validate the User has sufficient quota (Stub for now, or check generic limit)
**And** It should create a record in the database for the generation job
**And** It should push a task to the `Celery` queue via `Redis`
**And** It should return a `Task ID` to the frontend immediately (Accepted 202 response)
**And** The Celery worker should pick up the task (Stub implementation: wait 5s and mark success)

## Tasks / Subtasks

- [x] **Frontend Implementation**
  - [x] Create `StyleSelector` component (`src/components/business/StyleSelector.tsx`)
    ```typescript
    // Example implementation skeleton
    interface StyleSelectorProps {
      selectedStyle: string | null;
      onStyleSelect: (styleId: string) => void;
      styles: StyleOption[];
    }

    export const StyleSelector: React.FC<StyleSelectorProps> = ({
      selectedStyle,
      onStyleSelect,
      styles
    }) => {
      // Grid layout implementation
      // Selection state logic
      // Visual style with shadcn Card
    };
    ```
  - [x] Create `GenerationLoading` component (`src/components/business/GenerationLoading.tsx`)
    ```typescript
    interface GenerationLoadingProps {
      taskId: string;
      onComplete: (result: GenerationResult) => void;
      onError: (error: string) => void;
    }
    ```
  - [x] Integrate with `wizardStore` (Zustand) (`src/stores/wizardStore.ts`)
    - Generation state: `generationTaskId`, `generationStatus`, `generationProgress`
    - Actions: `setGenerationTaskId`, `setGenerationStatus`, `resetGeneration`
    - API functions in `src/lib/api/images.ts`: `generateImages()`, `getJobStatus()`
  - [x] Connect "Generate" button in wizard workflow (`src/app/(dashboard)/wizard/step-3/page.tsx`)

- [x] **Backend Implementation**
  - [x] Define Pydantic Schemas (`backend/app/schemas/image.py`)
    ```python
    class ImageGenerationRequest(BaseModel):
        style_id: str = Field(..., regex="^(modern|luxury|fresh|tech|warm|business)$")
        category_id: str
        asset_id: UUID

    class ImageGenerationResponse(BaseModel):
        task_id: UUID
        status: str = Field(default="pending")
        message: Optional[str] = None

    class GenerationErrorResponse(BaseModel):
        detail: str
        error_code: str
    ```
  - [x] Create API Endpoint (`backend/app/api/v1/endpoints/image.py`)
    ```python
    @router.post("/generate", status_code=202)
    async def generate_images(
        request: ImageGenerationRequest,
        current_user: User = Depends(get_current_user),
        workspace: Workspace = Depends(get_current_workspace)
    ) -> ImageGenerationResponse:
        try:
            # Validation, quota check, job creation
            # Celery task dispatch
        except QuotaExceededError as e:
            raise HTTPException(status_code=429, detail=str(e))
        except ValidationError as e:
            raise HTTPException(status_code=400, detail=str(e))
    ```
  - [x] Implement Celery Worker (`backend/app/tasks/image_generation.py`)
    ```python
    @celery_app.task(bind=True, max_retries=3)
    def generate_images_task(self, task_data: dict):
        try:
            # Update progress via self.update_state
            # Call AI service
            # Save results to database
        except Exception as exc:
            self.retry(countdown=60 * (2 ** self.request.retries))
    ```
  - [x] Register `image` router in `backend/app/main.py`

- [x] **State Management (Zustand Store)**
  - [x] Extend `wizardStore` (`src/stores/wizardStore.ts`) with:
    - `selectedStyle: StyleType | null`
    - `generationTaskId`, `generationStatus`, `generationProgress`
    - `generationError`, `generationResultUrls`
    - Actions: `setSelectedStyle`, `setGenerationStatus`, `resetGeneration`
  - [x] Ensure data flow from Story 1.6 (Product model)
    - Category stored in product.category
    - Asset ID available from product.original_asset_id

- [x] **Database Updates**
  - [x] Create migration for ImageGenerationJobs table
    ```sql
    CREATE TABLE image_generation_jobs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
        task_id UUID UNIQUE NOT NULL,
        style_id VARCHAR(20) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        progress INTEGER DEFAULT 0,
        error_message TEXT,
        result_urls JSONB,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        started_at TIMESTAMP WITH TIME ZONE,
        completed_at TIMESTAMP WITH TIME ZONE
    );
    ```

- [x] **Testing Implementation**
  - [x] Unit Tests (`backend/app/tests/unit/test_image_generation.py`)
    ```python
    def test_image_generation_request_validation():
        # Test valid and invalid requests

    def test_task_creation():
        # Test database job creation
    ```
  - [x] Integration Tests (`frontend/src/components/business/StyleSelector.test.tsx`)
    ```typescript
    describe('StyleSelector', () => {
      it('should render 6 style options');
      it('should handle style selection');
      it('should highlight selected style');
    });
    ```

- [x] **Error Handling Implementation**
  - [x] Frontend error boundaries and toast notifications
  - [x] Backend error response standardization
  - [x] Celery task failure handling and retry logic

## Dev Notes

### Architecture Compliance
- **Frontend**: Use `shadcn/ui` Card for style options. Use `lucide-react` for icons if needed.
- **Backend**: Ensure strict `snake_case` in Python and `camelCase` in JSON responses. Use `alias_generator` in Pydantic.
- **Async Pattern**: Do NOT block the HTTP request. Offload to Celery immediately. Frontend should poll every 2 seconds or listen for SSE (if Story 2.2 is ready).

### Technical Requirements
- **Styles**: The 6 styles are: `modern`, `luxury`, `fresh`, `tech`, `warm`, `business` (lowercase for consistency).
- **API**: Ensure the endpoint is versioned: `/api/v1/images/generate`.
- **Validation**: Ensure `style_id` is a valid enum from the allowed list.
- **Rate Limiting**: Implement per-user quota (default: 10 generations per hour).

### Error Handling Requirements
- **API Error Responses**:
  - 400: Invalid request (missing fields, invalid style_id)
  - 401: Unauthorized (missing/invalid token)
  - 403: Forbidden (invalid workspace access)
  - 429: Rate limit exceeded
  - 500: Internal server error
- **Frontend Error Handling**:
  - Show toast notifications for API errors
  - Implement retry mechanism for failed requests
  - Display user-friendly error messages

### State Management Details
```typescript
// WizardContext implementation details
const WizardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const setStyle = useCallback((styleId: string) => {
    dispatch({ type: 'SET_STYLE', payload: styleId });
  }, []);

  const triggerGeneration = useCallback(async () => {
    if (!state.selectedStyle || !state.currentProductId) {
      throw new Error('Missing required data');
    }

    dispatch({ type: 'SET_GENERATION_STATUS', payload: 'generating' });

    try {
      const response = await generateImages({
        styleId: state.selectedStyle,
        categoryId: state.selectedCategory,
        assetId: state.currentAssetId
      });

      dispatch({ type: 'SET_TASK_ID', payload: response.task_id });
    } catch (error) {
      dispatch({ type: 'SET_GENERATION_STATUS', payload: 'failed' });
      throw error;
    }
  }, [state.selectedStyle, state.selectedCategory, state.currentAssetId]);

  return (
    <WizardContext.Provider value={{ ...state, setStyle, triggerGeneration }}>
      {children}
    </WizardContext.Provider>
  );
};
```

### Database Model Details
```python
# backend/app/models/image.py
class ImageGenerationJob(Base):
    __tablename__ = "image_generation_jobs"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.id"), nullable=False)
    task_id = Column(UUID(as_uuid=True), unique=True, nullable=False)
    style_id = Column(String(20), nullable=False)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING)
    progress = Column(Integer, default=0)
    error_message = Column(Text)
    result_urls = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    started_at = Column(DateTime(timezone=True))
    completed_at = Column(DateTime(timezone=True))
```

### Testing Strategy
1. **Unit Tests**:
   - Test all Pydantic schemas for validation
   - Test Celery task logic with mocks
   - Test React components with React Testing Library

2. **Integration Tests**:
   - Test API endpoint with authentication
   - Test end-to-end flow with test database
   - Test error scenarios (quota exceeded, invalid inputs)

3. **Test Files Structure**:
   - Backend: `backend/app/tests/unit/test_image_generation.py`
   - Backend: `backend/app/tests/integration/test_image_api.py`
   - Frontend: `frontend/src/components/business/__tests__/StyleSelector.test.tsx`
   - Frontend: `frontend/src/hooks/__tests__/useImageGeneration.test.tsx`

### UX Specifications
- **Reference**: UX Design Specification - Step 3: Style Selection.
- **Visuals**: "Each card displays a preview of the gradient/SVG style". For MVP, use distinct high-quality CSS gradients:
  - Modern: Linear gradient(135deg, #667eea 0%, #764ba2 100%)
  - Luxury: Linear-gradient(135deg, #f093fb 0%, #f5576c 100%)
  - Fresh: Linear-gradient(135deg, #fa709a 0%, #fee140 100%)
  - Tech: Linear-gradient(135deg, #30cfd0 0%, #330867 100%)
  - Warm: Linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)
  - Business: Linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)
- **Interaction**: Single click to select with visual feedback (border + shadow).

### Integration with Story 1.6
- Data flow: Product category from Story 1.6 → Style selection in Story 2.1
- The `categoryId` comes from the `product.category` field created in Story 1.6
- The `assetId` comes from `product.original_asset_id`
- Both should be passed through WizardContext state

### Project Context & Structure
- **Frontend Path**: `src/components/business` for the selector. `src/app/(dashboard)/wizard/step-3/page.tsx` for the page.
- **Backend Path**: `backend/app/api/v1/endpoints` for the controller.
- **Migration Path**: `backend/alembic/versions/` for database changes.

## Dev Agent Record

### Context Reference
- **Key Files**: `docs/ux-design-specification.md`, `docs/architecture.md`, `docs/epics.md`

### Agent Model Used
- Antigravity (Google Deepmind)

### Code Review Fixes (2025-12-15)
- ✅ CRITICAL #1: 注册 image 路由到 `main.py`
- ✅ HIGH #6: 统一 Enum 定义（schemas 从 models 导入）
- ✅ HIGH #4: 创建 `test_image_api.py` 集成测试
- ✅ HIGH #2/#3 + MEDIUM #7: 更新文档反映 Zustand 实现

