# Story 2.4: Reference Image Attachment

Status: Done

## Story

As a **User**,
I want to **attach a reference image to a specific generation slot**,
so that **I can guide the AI to match a specific look**.

## Acceptance Criteria

### 1. Reference Image Upload
**Given** I am viewing an image card in the Editor
**When** I click the "Add Reference" (Plus) button
**Then** A file selection dialog should appear
**And** I should be able to select a local image (JPG/PNG, max 5MB)
**And** The image should be validated for content security before upload
**And** The image should be uploaded to the server (MinIO) with workspace isolation
**And** A thumbnail of the reference image should appear attached to the card (e.g., in a side-by-side or overlay slot)

### 2. State Management
**Given** A reference image is attached
**When** I navigate away and back (within the session)
**Then** The reference image should still be attached to that specific card
**And** I should be able to remove the reference image with a "Clear" or "Remove" action

### 3. Regeneration with Reference
**Given** A card has a reference image attached
**When** I click "Regenerate" on that card
**Then** The backend generation request should include the `reference_image_id`
**And** The AI worker (Celery) should receive the reference image URL in the task payload
**And** The worker should use this reference to guide the generation (e.g. Image-to-Image or ControlNet flow)
**And** The result should reflect the influence of the reference image

### 4. UI Feedback
**Given** I am uploading a reference image
**When** The upload is in progress
**Then** I should see a loading spinner on the reference slot
**And** The upload progress should be displayed via SSE real-time updates
**And** If the upload fails, I should see an error toast with retry option
**And** CSRF protection should be included in all upload requests

## Tasks / Subtasks

- [x] **Frontend: Upload UI**
  - [x] Add hidden file input or use `react-dropzone` logic in `frontend/src/components/business/SVGPreviewCard.tsx`.
  - [x] Implement "Add Reference" button with `Plus` icon from `lucide-react`.
  - [x] Implement upload handler calling `AssetService.upload` from `frontend/src/lib/api/assets.ts` (reusing Story 1.5 logic).
  - [x] Add file validation: type (JPG/PNG), size (max 5MB), content security scan.
  - [x] Display reference image thumbnail with "Remove" (X) button.
  - [x] Implement drag-and-drop support for reference images.

- [x] **Frontend: State Integration**
  - [x] Update `EditorGrid` items interface in `frontend/src/types/editor.ts` to include `referenceImage?: { url: string, id: string }`.
  - [x] Pass `onAttachReference` and `onRemoveReference` callbacks to `SVGPreviewCard`.
  - [x] Store reference image URLs in localStorage for session persistence.

- [x] **Backend: API Integration**
  - [x] Update `backend/app/api/v1/endpoints/image.py` to accept `reference_image_id` field.
  - [x] Update `ImageGenerationSchema` in `backend/app/schemas/image.py`:
    ```python
    class ImageGenerationRequest(BaseModel):
        style_id: StyleType
        category_id: str
        asset_id: UUID
        product_id: UUID
        reference_image_id: Optional[UUID] = None
    ```
  - [x] Add workspace authorization check for reference image access.
  - [x] Include CSRF token validation in upload endpoint.

- [x] **Testing**
  - [x] Unit test: `SVGPreviewCard` renders reference slot correctly in `frontend/src/__tests__/SVGPreviewCard.test.tsx`.
  - [x] Integration: Upload reference -> Verify URL in state -> Mock regenerate call check payload.
  - [x] E2E test: Complete reference upload workflow using Playwright in `frontend/e2e/reference-upload.spec.ts`.
  - [x] Security test: Verify file size limits, content validation, and workspace isolation.
  - [x] Performance test: Upload and render reference images under 2 seconds.

## Dev Notes

### Technical Specifics
- **Upload Flow**:
    1. User selects file (max 5MB, JPG/PNG only).
    2. Frontend validates file size and type locally.
    3. Frontend requests Presigned URL from `backend/app/services/storage_service.py` (reuse Story 1.5 logic).
    4. Frontend uploads file directly to MinIO with workspace-scoped path.
    5. Backend saves metadata to `assets` table with content security validation.
    6. Resulting Asset ID/URL is returned to frontend and stored in card state.

- **Security Implementation**:
    - File size limit: 5MB enforced at both client and server
    - Content scan: Use `python-magic` to verify file signatures
    - Workspace isolation: Store in `workspaces/{workspace_id}/assets/` path
    - CSRF token: Include in all upload API requests

- **Visuals**: The reference image thumbnail (100x100px) appears in bottom-right corner of card with semi-transparent overlay. Click to view full-size in modal.

- **AI Worker Integration**:
    - Celery task receives `reference_image_id` in payload
    - Worker retrieves presigned URL from storage service
    - URL passed to AI generation API as reference parameter

### Architecture Patterns
- **API**:
  - Frontend: `AssetService` from `frontend/src/lib/api/assets.ts` for upload
  - Frontend: `ImageService` from `frontend/src/lib/api/images.ts` for regeneration
  - Backend: `POST /api/v1/assets/upload/presigned` endpoint (reuse from Story 1.5)
  - Backend: `POST /api/v1/image/generate` endpoint in `backend/app/api/v1/endpoints/image.py`

- **Components**:
  - Main component: `frontend/src/components/business/SVGPreviewCard.tsx`
  - Type definitions: `frontend/src/types/editor.ts`
  - Upload handler: `frontend/src/lib/storage/minioUpload.ts`

- **State Management**:
  ```typescript
  interface ReferenceImage {
    id: string
    url: string
    thumbnailUrl: string
    assetId: string
  }

  interface GridItem {
    id: string
    imageSrc: string
    title: string
    textOverlays?: TextOverlay[]
    referenceImage?: ReferenceImage
  }
  ```

- **File Structure**:
  ```
  frontend/src/
  ├── components/business/SVGPreviewCard.tsx (modify)
  ├── types/editor.ts (update)
  ├── lib/api/assets.ts (reuse)
  └── hooks/useReferenceUpload.ts (create)

  backend/app/
  ├── api/v1/endpoints/image.py (update)
  ├── schemas/image_generation.py (update)
  ├── services/storage_service.py (reuse)
  └── tasks/image_generation_tasks.py (update)
  ```

### References
- [UX Design specification](file:///Users/ZenoWang/Documents/project/E_Business/docs/ux-design-specification.md#step-4-editor--preview-the-work-surface)
- [Story 1.5: Asset Storage](file:///Users/ZenoWang/Documents/project/E_Business/docs/sprint-artifacts/1-5-asset-storage-service-minio-integration.md)

## Dev Agent Record

### Context Reference
- **Dependencies**: Depends on Story 2.3 (`SVGPreviewCard`), Story 1.5 (MinIO Uploads), and Story 2.2 (Celery Worker).
- **Core Files**:
  - `frontend/src/components/business/SVGPreviewCard.tsx`
  - `backend/app/services/storage_service.py`
  - `backend/app/tasks/image_generation_tasks.py`
- **Previous Story Learnings**:
  - Story 1.5: MinIO presigned URL pattern
  - Story 2.3: SSE real-time updates pattern
  - Story 2.2: Celery task payload structure

### Implementation Details

**Frontend Implementation**:
- Created `ReferenceImage` interface with id, url, thumbnailUrl, and assetId fields
- Developed `useReferenceUpload` hook with comprehensive file validation (JPG/PNG, 5MB limit)
- Enhanced `SVGPreviewCard` component with reference image thumbnail display in bottom-right corner
- Implemented drag-and-drop support with visual feedback overlay
- Added upload progress indication and error handling with toast notifications
- Extended `editorStore` with `attachReference` and `removeReference` methods
- Added localStorage persistence for reference image state

**Backend Implementation**:
- Extended `ImageGenerationJob` model with `reference_image_id` field (foreign key to Asset)
- Updated `ImageGenerationRequest` schema to include optional `reference_image_id`
- Enhanced image generation API endpoint with reference image validation
- Added workspace authorization check for reference image access
- Modified Celery task to fetch reference image URL and pass to AI generation service
- Implemented proper error handling and workspace isolation

**Testing Implementation**:
- Unit tests for `SVGPreviewCard` component covering reference image display, upload, and removal
- Unit tests for `useReferenceUpload` hook covering file validation, upload progress, and error states
- Integration tests for API endpoint with reference image validation and workspace isolation
- E2E tests using Playwright covering complete user workflow from upload to generation

### Files Modified
- `frontend/src/types/editor.ts` - Added ReferenceImage interface and updated component props
- `frontend/src/hooks/useReferenceUpload.ts` - New custom hook for reference image upload
- `frontend/src/components/business/SVGPreviewCard.tsx` - Enhanced with reference image UI
- `frontend/src/stores/editorStore.ts` - Added reference image management methods
- `backend/app/models/image.py` - Added reference_image_id field to ImageGenerationJob
- `backend/app/schemas/image.py` - Updated ImageGenerationRequest schema
- `backend/app/api/v1/endpoints/image.py` - Enhanced with reference image validation
- `backend/app/tasks/image_generation.py` - Added reference image URL fetching
- Test files created as listed above

### Agent Model Used
- Claude (Anthropic) - Implemented all features according to AC requirements
