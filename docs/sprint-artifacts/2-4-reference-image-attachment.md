# Story 2.4: Reference Image Attachment

Status: ready-for-dev

## Story

As a **User**,
I want to **attach a reference image to a specific generation slot**,
so that **I can guide the AI to match a specific look**.

## Acceptance Criteria

### 1. Reference Image Upload
**Given** I am viewing an image card in the Editor
**When** I click the "Add Reference" (Plus) button
**Then** A file selection dialog should appear
**And** I should be able to select a local image (JPG/PNG)
**And** The image should be uploaded to the server (MinIO)
**And** A thumbnail of the reference image should appear attached to the card (e.g., in a side-by-side or overlay slot)

### 2. State Management
**Given** A reference image is attached
**When** I navigate away and back (within the session)
**Then** The reference image should still be attached to that specific card
**And** I should be able to remove the reference image with a "Clear" or "Remove" action

### 3. Regeneration with Reference
**Given** A card has a reference image attached
**When** I click "Regenerate" on that card
**Then** The backend generation request should include the `reference_image_url`
**And** The AI worker should use this reference to guide the generation (e.g. Image-to-Image or ControlNet flow)
**And** The result should reflect the influence of the reference image

### 4. UI Feedback
**Given** I am uploading a reference image
**When** The upload is in progress
**Then** I should see a loading spinner on the reference slot
**And** If the upload fails, I should see an error toast

## Tasks / Subtasks

- [ ] **Frontend: Upload UI**
  - [ ] Add hidden file input or use `react-dropzone` logic in `SVGPreviewCard`.
  - [ ] Implement "Add Reference" button with `Plus` icon from `lucide-react`.
  - [ ] Implement upload handler calling `AssetService.upload` (reusing existing logic or creating new).
  - [ ] Display reference image thumbnail with "Remove" (X) button.

- [ ] **Frontend: State Integration**
  - [ ] Update `EditorGrid` items interface to include `referenceImage?: { url: string, id: string }`.
  - [ ] Pass `onAttachReference` and `onRemoveReference` callbacks to `SVGPreviewCard`.

- [ ] **Backend: API Integration**
  - [ ] Verify `POST /api/v1/image/generate` accepts `reference_image_id` or similar field.
  - [ ] If not, update `ImageGenerationSchema` in `backend/app/schemas` and `image.py` endpoint.

- [ ] **Testing**
  - [ ] Unit test: `SVGPreviewCard` renders reference slot correctly.
  - [ ] Integration: Upload reference -> Verify URL in state -> Mock regenerate call check payload.

## Dev Notes

### Technical Specifics
- **Upload Flow**: 
    1. User selects file.
    2. Frontend requests Presigned URL (or uses direct upload endpoint if simple). *Preference*: Reuse Story 1.5 logic (MinIO integration).
    3. Frontend sends file to MinIO.
    4. Frontend saves metadata to `assets` table via Backend API.
    5. Resulting Asset ID/URL is stored in the Card's local state.
- **Visuals**: The reference image should be small but visible. Maybe a split view in the card thumbnail or a floating badge.
- **AI Logic**: This story focuses on the *plumbing* of getting the reference image ID to the backend. The actual AI ControlNet/Img2Img implementation might be in the Worker (Story 2.2) or refined here. *Assumption*: The worker logic supports it or will be updated.

### Architecture Patterns
- **API**: `AssetService` (Frontend) for upload. `ImageService` (Frontend) for regeneration.
- **Components**: `SVGPreviewCard.tsx` modification.

### References
- [UX Design specification](file:///Users/ZenoWang/Documents/project/E_Business/docs/ux-design-specification.md#step-4-editor--preview-the-work-surface)
- [Story 1.5: Asset Storage](file:///Users/ZenoWang/Documents/project/E_Business/docs/sprint-artifacts/1-5-asset-storage-service-minio-integration.md)

## Dev Agent Record

### Context Reference
- **Dependencies**: Depends on Story 2.3 (`SVGPreviewCard`) and Story 1.5 (Uploads).
- **Core Files**: `frontend/src/components/business/SVGPreviewCard.tsx`.

### Agent Model Used
- Antigravity (Google Deepmind)
