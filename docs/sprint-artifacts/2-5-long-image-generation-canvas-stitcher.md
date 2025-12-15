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

### 4. Security & Performance Requirements
**Given** I am generating a long image from multiple sources
**When** The stitcher processes the images
**Then** All images must pass content security validation before rendering
**And** The total canvas height must not exceed 32,768 pixels (browser limit)
**And** The output file size must not exceed 50MB
**And** The processing must complete within 10 seconds for up to 20 images
**And** Only authenticated users can access images in their workspace
**And** All export operations must be logged for audit purposes

### 5. Error Handling & User Feedback
**Given** An error occurs during image generation
**When** The stitcher encounters issues
**Then** The user must see a clear error message with actionable steps
**And** The system must gracefully handle canvas tainting errors
**And** Memory overflow must be prevented with progressive loading fallback
**And** Users can retry failed exports after addressing the issue

## Tasks / Subtasks

- [ ] **Infrastructure & Dependencies**
  - [ ] Install `html2canvas` (or verify if `dom-to-image-more` is preferred for SVG support).
  - [ ] **CRITICAL**: Verify MinIO/S3 CORS configuration. Images loaded from external domains will taint the canvas and block export unless `Access-Control-Allow-Origin` headers are set and `crossOrigin="anonymous"` attributes are used on `<img>` tags.

- [ ] **Frontend: CanvasStitcher Component**
  - [ ] Create `src/components/business/CanvasStitcher.tsx` with TypeScript interfaces:
    ```typescript
    interface CanvasStitcherProps {
      items: ImageItem[]
      onPreview?: (previewUrl: string) => void
      onError?: (error: StitcherError) => void
      maxCanvasHeight?: number
      quality?: number
      className?: string
    }

    interface ImageItem {
      id: string
      url: string
      title: string
      metadata?: Record<string, any>
    }

    interface StitcherError {
      type: 'CORS' | 'MEMORY' | 'CANVAS_LIMIT' | 'NETWORK'
      message: string
      retryable: boolean
    }
    ```
  - [ ] Implement "Clean Render" logic with CSS class `.hide-on-export` for UI controls.
  - [ ] Implement `generateLongImage` function with progressive loading for >20 images.
  - [ ] Add content security validation before rendering images.
  - [ ] Implement performance monitoring with 10-second timeout.
  - [ ] Add audit logging for all export operations.

- [ ] **Frontend: Integration**
  - [ ] Add "Preview Long Image" button to `EditorGrid` component using existing UI library Button component.
  - [ ] Integrate with Zustand store:
    - Add `isGeneratingPreview` state to track progress
    - Use existing `images` array from EditorGrid state
    - Implement error handling through store's error mechanism
  - [ ] Use existing `Modal` component from UI library for preview display.
  - [ ] Implement SSE progress updates for large image generation.
  - [ ] Add retry mechanism with exponential backoff for failed exports.

- [ ] **Testing**
  - [ ] **Unit Tests** (90% coverage required):
    - `CanvasStitcher` component rendering
    - `generateLongImage` function with various image counts
    - Error handling for each error type
    - Performance timeout handling
  - [ ] **Integration Tests**:
    - EditorGrid integration with CanvasStitcher
    - Zustand store state updates
    - Modal component interaction
  - [ ] **E2E Tests**:
    - Full workflow: upload -> generate -> order -> preview -> download
    - CORS error scenarios
    - Large dataset performance (50+ images)
    - Memory constraint testing
  - [ ] **Performance Tests**:
    - Benchmark with 10, 20, 50 images
    - Memory usage profiling
    - Export time must be <10s for 20 images
  - [ ] **Security Tests**:
    - XSS prevention through malicious images
    - Cross-workspace access prevention
    - Content Security Policy enforcement

## Dev Notes

### Technical Specifics
- **Library Choice**: `html2canvas` v1.4.1 is the industry standard for specific DOM capture.
  - `npm install html2canvas@^1.4.1`
  - Usage: `html2canvas(element, {
      useCORS: true,
      scale: 2,
      allowTaint: false,
      logging: false,
      timeout: 10000
    })`.
- **CORS Strategy**: Critical for canvas export success.
  - **Frontend**: All `<img>` tags MUST have `crossOrigin="anonymous"` and proper error handling.
  - **MinIO Configuration**: Bucket policy must include:
    ```json
    {
      "Version": "2012-10-17",
      "Statement": [
        {
          "Effect": "Allow",
          "Principal": {"AWS": "*"},
          "Action": ["s3:GetObject"],
          "Resource": ["arn:aws:s3:::bucket-name/*"]
        }
      ]
    }
    ```
  - Add CORS headers: `Access-Control-Allow-Origin: *` and `Access-Control-Allow-Methods: GET`.
- **Content Security**:
  - Implement CSP meta tag: `meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data: blob: https:; script-src 'self' 'unsafe-inline'"`
  - Sanitize image URLs before rendering
  - Validate image dimensions before processing
- **Clean Capture Strategy**:
  - Use container ID `#canvas-export-target` with class `hide-on-export`.
  - CSS snippet: `.hide-on-export { opacity: 0 !important; pointer-events: none; }`
  - Alternative: Clone DOM node off-screen, strip UI elements, capture clone.

### Architecture Patterns
- **Client-Side Only**: This feature does NOT require a backend "stitcher" service. It reduces server load and cost.
- **State Management Integration**: Use Zustand store pattern established in Epic 2:
  ```typescript
  interface EditorStore {
    images: ImageItem[]
    isGeneratingPreview: boolean
    previewError: StitcherError | null
    setGeneratingPreview: (generating: boolean) => void
    setPreviewError: (error: StitcherError | null) => void
  }
  ```
- **Component Design**: `CanvasStitcher` is a pure functional component that:
  - Takes `items[]` prop and renders clean version for export
  - Emits events through callbacks (onPreview, onError)
  - Does NOT directly mutate state
  - Is testable in isolation with mock props
- **UI Integration**:
  - Use `@/components/ui/Button` for all actions
  - Use `@/components/ui/Modal` for preview display
  - Follow established spacing and typography tokens
  - Implement loading states with `@/components/ui/Spinner`
- **Error Boundaries**: Wrap CanvasStitcher in error boundary to prevent crashes
- **Performance Optimization**:
  - Implement virtual rendering for >20 images
  - Use requestIdleCallback for non-critical processing
  - Debounce preview generation during rapid changes

### References
- [UX Design specification](file:///Users/ZenoWang/Documents/project/E_Business/docs/ux-design-specification.md#step-4-editor--preview-the-work-surface)
- [Story 1.5: Asset Storage](file:///Users/ZenoWang/Documents/project/E_Business/docs/sprint-artifacts/1-5-asset-storage-service-minio-integration.md) (Check for CORS requirements)
- [Story 2.3: SVG Preview Card & Editor](file:///Users/ZenoWang/Documents/project/E_Business/docs/sprint-artifacts/2-3-svg-preview-card-editor.md) (EditorGrid component)
- [Epic 2: AI-Powered Product Visualization](file:///Users/ZenoWang/Documents/project/E_Business/docs/sprint-artifacts/epic-2-ai-product-visualization.md) (Overall context)
- [Frontend Architecture Guide](file:///Users/ZenoWang/Documents/project/E_Business/docs/frontend-architecture.md) (Patterns & conventions)

## Security Checklist

- [ ] All images validated for XSS before rendering
- [ ] User authentication verified before accessing workspace images
- [ ] CORS headers properly configured on MinIO bucket
- [ ] CSP policy implemented in frontend
- [ ] Export operations logged with user ID and timestamp
- [ ] Error messages sanitized to prevent information leakage
- [ ] File size limits enforced (50MB max)
- [ ] Canvas height limits enforced (32,768px max)

## Browser Compatibility

- **Chrome**: 90+ (full support)
- **Firefox**: 88+ (full support)
- **Safari**: 14+ (full support)
- **Edge**: 90+ (full support)

Note: Progressive enhancement fallback for unsupported browsers

## Dev Agent Record

### Context Reference
- **Dependencies**:
  - Story 2.3 (EditorGrid & SVGPreviewCard integration)
  - Story 2.4 (Reference Image Attachment for image URLs)
  - Story 1.5 (MinIO CORS configuration)
  - Epic 2 (Zustand store pattern, UI component library)
- **Core Files**:
  - `frontend/src/components/business/CanvasStitcher.tsx`
  - `frontend/src/components/business/EditorGrid.tsx` (integration point)
  - `frontend/src/store/editor.ts` (state management)

### Agent Model Used
- Enhanced validation through fresh context analysis
