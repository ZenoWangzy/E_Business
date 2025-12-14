# Story 2.5: Long Image Generation (Canvas Stitcher)

Status: ready-for-dev

## Story

As a **User**,
I want to **download all my images as a single long detail page**,
so that **I can upload it directly to e-commerce platforms**.

## Acceptance Criteria

### 1. Canvas Stitching & Preview
**Given** I have a set of generated images in the Editor
**When** I click the "Preview Long Image" button
**Then** A modal or overlay should open showing the "Long Image" preview
**And** The preview should show all current images stacked vertically in their user-defined order
**And** The stitching should be seamless (no visible gaps unless designed)
**And** The preview should NOT include UI controls (delete buttons, drag handles)

### 2. High-Quality Download
**Given** I am viewing the Long Image preview
**When** I click "Download PNG"
**Then** The browser should download a single PNG file
**And** The image quality should be high (at least 2x pixel density/Retina quality) for crisp text
**And** The file name should be descriptive (e.g., `product-detail-long-[timestamp].png`)

### 3. Visual Consistency
**Given** The images contain generated content and overlays
**When** The stitcher renders them
**Then** All text, overlays, and reference images must be rendered accurately
**And** The layout must match the "Preview" state of the cards

## Tasks / Subtasks

- [ ] **Infrastructure & Dependencies**
  - [ ] Install `html2canvas` (or verify if `dom-to-image-more` is preferred for SVG support).
  - [ ] **CRITICAL**: Verify MinIO/S3 CORS configuration. Images loaded from external domains will taint the canvas and block export unless `Access-Control-Allow-Origin` headers are set and `crossOrigin="anonymous"` attributes are used on `<img>` tags.

- [ ] **Frontend: CanvasStitcher Component**
  - [ ] Create `src/components/business/CanvasStitcher.tsx`.
  - [ ] Implement "Clean Render" logic: A mechanism to render the card list *without* UI controls (e.g., a hidden off-screen container or specific CSS classes for the capture target).
  - [ ] Implement `generateLongImage` function using `html2canvas` with `scale: 2` (or higher) for quality.
  - [ ] Implement Download utility (trigger browser download of Blob/DataURL).

- [ ] **Frontend: Integration**
  - [ ] Add "Preview" button to the `Editor` toolbar (Story 2.3 context).
  - [ ] Create a `Dialog` / `Modal` to display the stitched preview result.
  - [ ] Connect the `Download` action in the modal.

- [ ] **Testing**
  - [ ] Manual: Upload images -> Generate -> Order -> Preview -> Download -> Verify PNG.
  - [ ] Verify CORS: Ensure images from MinIO download correctly without "Tainted Canvas" security errors.

## Dev Notes

### Technical Specifics
- **Library Choice**: `html2canvas` is the industry standard for specific DOM capture.
  - `npm install html2canvas`
  - Usage: `html2canvas(element, { useCORS: true, scale: 2, allowTaint: true })`.
- **CORS Trap**: This is the #1 failure point for canvas export.
  - **Frontend**: All `<img>` tags inside the cards MUST have `crossOrigin="anonymous"`.
  - **Backend/MinIO**: The storage bucket MUST return standard CORS headers (`Access-Control-Allow-Origin: *`). If using MinIO via Docker, ensure the server command or bucket policy enables this.
- **"Clean" Capture**: use a specific container ID for the capture target (e.g., `#canvas-export-target`). This container can be the same as the visible grid but with a class that hides UI overlays (`.hide-on-export`), or a dedicated off-screen clone if the layout differs significantly.
  - *Recommendation*: Use CSS classes `.group-hover:opacity-100` for UI controls so they are naturally hidden when not hovering (and thus hidden during capture), OR explicitly add a class `exporting` to the container during capture to `display: none` all utility buttons.

### Architecture Patterns
- **Client-Side Only**: This feature does NOT require a backend "stitcher" service. It reduces server load and cost.
- **Component**: `CanvasStitcher` should likely receive the list of data items and render them, rather than trying to screen-grab the exact interactive DOM which might have scrollbars/hover states active.
  - *Better Pattern*: `CanvasStitcher` is a functional component that takes `items[]` prop and renders a "Clean" version of the list specifically for the preview/export, separate from the interactive playground.

### References
- [UX Design specification](file:///Users/ZenoWang/Documents/project/E_Business/docs/ux-design-specification.md#step-4-editor--preview-the-work-surface)
- [Story 1.5: Asset Storage](file:///Users/ZenoWang/Documents/project/E_Business/docs/sprint-artifacts/1-5-asset-storage-service-minio-integration.md) (Check for CORS requirements)

## Dev Agent Record

### Context Reference
- **Dependencies**: Depends on Story 2.3 (Editor Data Structure) and 1.5 (MinIO Setup).
- **Core Files**: `frontend/src/components/business/CanvasStitcher.tsx`.

### Agent Model Used
- Antigravity (Google Deepmind)
