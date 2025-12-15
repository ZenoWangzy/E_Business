# Story 3.1: AI Copywriting Studio UI

Status: ready-for-dev

## Story

As a **User**,
I want a **dedicated workspace within my product for generating AI-powered copy**,
so that **I can create compelling product content while maintaining full context of my product information**.

## Acceptance Criteria

### 1. Workspace Navigation & Access
**Given** I am in a workspace with a selected product
**When** I navigate to the Copywriting Studio
**Then** I should see the complete Triple-Sidebar Layout
**And** The Global Navigation Rail should highlight the "Smart Copy" module
**And** The URL should be `/workspace/[workspaceId]/products/[productId]/copy`

### 2. Triple-Sidebar Layout Implementation
**Given** I am in the Copywriting Studio
**When** I view the interface
**Then** I should see:
- **Left Rail (Global Navigation)**: Module switcher for Product Visuals, Smart Copy, and Batch Operations
- **Middle Sidebar (Context Panel)**: Collapsible product information and parsed content
- **Main Area**: Focused copy generation workspace

### 3. Product Context Integration
**Given** I have uploaded and parsed product files (from Epic 1)
**When** I view the Context Panel
**Then** I should see:
- Product title and metadata
- Parsed text summary with expandable sections
- Thumbnail previews of uploaded images
- Quick action buttons to reference content in generation

### 4. Tabbed Generation Interface
**Given** I am in the main workspace area
**When** I view the content
**Then** I should see tabbed sections: "Titles", "Selling Points", "FAQ", "Descriptions"
**And** Each tab should have:
- Configuration controls (tone, target audience, length)
- Generate button with loading state
- Results area with copy cards

### 5. Security & Authentication
**Given** I am accessing any copy generation feature
**When** The system processes my request
**Then** My workspace access must be verified
**And** I can only access content from my workspace
**And** All API requests must include authentication tokens
**And** Quota limits must be checked before generation

### 6. Responsive Design
**Given** I am using different screen sizes
**When** I view the Copywriting Studio
**Then** The layout must adapt:
- **Desktop**: Full three-column layout
- **Tablet**: Collapsible middle sidebar, optimized main area
- **Mobile**: Overlay drawer for context panel, stacked tabs

## Tasks / Subtasks

- [ ] **Frontend: Route Structure & Layout**
  - [ ] Create `src/app/(dashboard)/workspace/[workspaceId]/products/[productId]/copy/page.tsx`
  - [ ] Implement `CopyStudioLayout` with Triple-Sidebar structure
  - [ ] Create `GlobalNavRail` component for module switching
  - [ ] Add route protection with workspace authentication

- [ ] **Frontend: Context Panel Components**
  - [ ] Create `src/components/business/copy/ProductContextPanel.tsx` with interfaces:
    ```typescript
    interface ProductContextPanelProps {
      productId: string
      workspaceId: string
      isCollapsed: boolean
      onToggle: () => void
    }

    interface ParsedContent {
      sections: {
        title: string
        content: string
        images?: string[]
      }[]
    }
    ```
  - [ ] Integrate with existing WorkspaceContext for product data
  - [ ] Implement expandable content sections with syntax highlighting
  - [ ] Add quick reference buttons for text selection

- [ ] **Frontend: Generation Components**
  - [ ] Create `src/components/business/copy/CopyGeneratorTabs.tsx`
  - [ ] Implement specialized generators:
    - `TitleGenerator.tsx`
    - `SellingPointsGenerator.tsx`
    - `FAQGenerator.tsx`
    - `DescriptionGenerator.tsx`
  - [ ] Create `CopyResultCard.tsx` with edit, copy, and favorite actions
  - [ ] Implement `GenerationProgress.tsx` with real-time SSE updates

- [ ] **Frontend: State Management**
  - [ ] Extend WorkspaceContext with copy-specific state:
    ```typescript
    interface CopyStudioState {
      activeTab: 'titles' | 'sellingPoints' | 'faq' | 'descriptions'
      generationConfig: {
        tone: 'professional' | 'casual' | 'playful' | 'luxury'
        audience: 'b2b' | 'b2c' | 'technical'
        length: 'short' | 'medium' | 'long'
      }
      results: CopyResult[]
      isGenerating: boolean
    }
    ```
  - [ ] Create `useCopyStudio` hook for state management
  - [ ] Implement state persistence in localStorage

- [ ] **Frontend: API Integration**
  - [ ] Create `src/lib/api/copy.ts` with typed interfaces:
    ```typescript
    interface CopyGenerationRequest {
      workspaceId: string
      productId: string
      type: CopyType
      config: GenerationConfig
      context: string[]
    }

    interface CopyGenerationResponse {
      id: string
      results: string[]
      usage: QuotaUsage
    }
    ```
  - [ ] Implement SSE connection for real-time progress
  - [ ] Add error handling with retry logic
  - [ ] Integrate quota checking before API calls

- [ ] **Frontend: UI Components**
  - [ ] Reuse `SmartDropzone` from Epic 1 for content uploads
  - [ ] Implement custom configuration controls using shadcn/ui
  - [ ] Create loading skeletons for async states
  - [ ] Add toast notifications for actions

- [ ] **Testing** (95% coverage required):
  - [ ] **Unit Tests**:
    - All component rendering with different states
    - State management transitions
    - API integration with mocks
    - Responsive behavior at breakpoints
  - [ ] **Integration Tests**:
    - Complete user workflows
    - Context switching between modules
    - Error scenarios and recovery
  - [ ] **E2E Tests**:
    - Full copy generation flow
    - Multi-tab navigation
    - Mobile responsive workflows
    - Accessibility compliance (WCAG 2.1 AA)

## Dev Notes

### Architecture Integration
- **Triple-Sidebar Layout Pattern**:
  ```tsx
  <CopyStudioLayout>
    <GlobalNavRail activeModule="copy" />
    <ProductContextPanel />
    <MainContentArea>
      <CopyGeneratorTabs />
    </MainContentArea>
  </CopyStudioLayout>
  ```
- **State Management Strategy**: Extend existing WorkspaceContext rather than creating new context
- **Route Hierarchy**: Follows workspace → product → module pattern established in Epic 1

### Technical Specifications
- **Dependencies**:
  - `html2canvas` (from Story 2.5) for potential export features
  - `zustand` for state management (already in project)
  - `shadcn/ui` components (Tabs, Card, Button, ScrollArea, Collapsible)
  - `lucide-react` for icons
- **API Integration**:
  - WebSocket connection for real-time generation updates
  - Exponential backoff retry for failed requests
  - Request deduplication for concurrent generations
- **Performance**:
  - Virtual scrolling for large result sets
  - Debounced auto-save for draft content
  - Lazy loading of tab content

### Security Implementation
- **Authentication**: All routes must verify workspace membership
- **Authorization**: Product access checks for each request
- **Input Validation**:
  - Sanitize all user inputs before API calls
  - Validate content length limits (max 10,000 chars)
  - Rate limiting per user (5 requests/minute)
- **Quota Integration**:
  - Check Epic 5 quota before generation
  - Display remaining quota to user
  - Graceful handling of quota exceeded

### Responsive Design Strategy
- **Breakpoints**:
  - `desktop`: >1024px (full layout)
  - `tablet`: 768px-1024px (collapsible sidebar)
  - `mobile`: <768px (drawer overlay)
- **Touch Optimization**:
  - 44px minimum touch targets
  - Swipe gestures for sidebar
  - Haptic feedback for actions

### Content Security Policy
```html
<meta http-equiv="Content-Security-Policy"
      content="default-src 'self';
               img-src 'self' data: blob: https:;
               script-src 'self' 'unsafe-inline';
               connect-src 'self' ws: wss:;">
```

## Dependencies

- **Required Prerequisites**:
  - Epic 1: Workspace & Content Ingestion complete
  - Epic 1.6: Product category selection implemented
  - User must be authenticated with workspace access
  - Product must have parsed content available

- **Backend Dependencies** (Story 3.2):
  - `/api/v1/copy/generate` endpoint
  - WebSocket server for progress updates
  - Quota management service integration

## Accessibility Requirements

- **Keyboard Navigation**: Full keyboard access to all features
- **Screen Reader**: ARIA labels and descriptions for all interactive elements
- **High Contrast**: Support for Windows High Contrast mode
- **Focus Management**: Visible focus indicators and logical tab order
- **Text Scaling**: Support for 200% text zoom

## References

- [Epic 3: Content Power](file:///Users/ZenoWang/Documents/project/E_Business/docs/epics.md#epic-3-content-power---ai-copywriting-studio)
- [Architecture: Triple-Sidebar Layout](file:///Users/ZenoWang/Documents/project/E_Business/docs/architecture.md#layout-patterns)
- [UX Specification: Smart Copy Module](file:///Users/ZenoWang/Documents/project/E_Business/docs/ux-design-specification.md#smart-copy)
- [Story 1.6: Product Category Selection](file:///Users/ZenoWang/Documents/project/E_Business/docs/sprint-artifacts/1-6-product-category-selection.md)
- [Security Policy](file:///Users/ZenoWang/Documents/project/E_Business/docs/security-policy.md)

## Dev Agent Record

### Context Reference
- **Story ID**: 3.1
- **Epic**: 3 (Content Power)
- **Module**: Smart Copy (Module 1 of 3)
- **Layout Pattern**: Triple-Sidebar
- **State Management**: WorkspaceContext extension

### Key Files
- `src/app/(dashboard)/workspace/[workspaceId]/products/[productId]/copy/page.tsx`
- `src/components/business/copy/CopyStudioLayout.tsx`
- `src/contexts/WorkspaceContext.ts` (to be extended)
- `src/lib/api/copy.ts`

### Agent Model Used
- Complete rewrite with architecture alignment