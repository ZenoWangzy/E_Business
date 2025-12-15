# Story 2.4: Reference Image Attachment

Status: ready-for-dev (validated and enhanced)

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

- [ ] **Frontend: Upload UI**
  - [ ] Add hidden file input or use `react-dropzone` logic in `frontend/src/components/business/SVGPreviewCard.tsx`.
  - [ ] Implement "Add Reference" button with `Plus` icon from `lucide-react`.
  - [ ] Implement upload handler calling `AssetService.upload` from `frontend/src/lib/api/assets.ts` (reusing Story 1.5 logic).
  - [ ] Add file validation: type (JPG/PNG), size (max 5MB), content security scan.
  - [ ] Display reference image thumbnail with "Remove" (X) button.
  - [ ] Implement drag-and-drop support for reference images.

- [ ] **Frontend: State Integration**
  - [ ] Update `EditorGrid` items interface in `frontend/src/types/editor.ts` to include `referenceImage?: { url: string, id: string }`.
  - [ ] Pass `onAttachReference` and `onRemoveReference` callbacks to `SVGPreviewCard`.
  - [ ] Store reference image URLs in localStorage for session persistence.

- [ ] **Backend: API Integration**
  - [ ] Update `backend/app/api/v1/endpoints/image.py` to accept `reference_image_id` field.
  - [ ] Update `ImageGenerationSchema` in `backend/app/schemas/image_generation.py`:
    ```python
    class ImageGenerationSchema(BaseModel):
        prompt: str
        style: str
        reference_image_id: Optional[UUID] = None
    ```
  - [ ] Add workspace authorization check for reference image access.
  - [ ] Include CSRF token validation in upload endpoint.

- [ ] **Testing**
  - [ ] Unit test: `SVGPreviewCard` renders reference slot correctly in `frontend/src/__tests__/SVGPreviewCard.test.tsx`.
  - [ ] Integration: Upload reference -> Verify URL in state -> Mock regenerate call check payload.
  - [ ] E2E test: Complete reference upload workflow using Playwright in `frontend/e2e/reference-upload.spec.ts`.
  - [ ] Security test: Verify file size limits, content validation, and workspace isolation.
  - [ ] Performance test: Upload and render reference images under 2 seconds.

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

### Agent Model Used
- Antigravity (Google Deepmind)
