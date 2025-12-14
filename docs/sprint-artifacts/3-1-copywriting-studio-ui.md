# Story 3.1: Copywriting Studio UI

Status: ready-for-dev

## Story

As a **User**,
I want a **dedicated interface for generating product text**,
so that **I can focus on creating catchy copy without visual distractions**.

## Acceptance Criteria

### 1. Module Access & Layout
**Given** I have selected the "Smart Copy" module from the main navigation
**When** I view the dashboard
**Then** I should see the Copywriting Studio layout
**And** I should see the parsed product information (title, parsed text from Epic 1) in a collapsible side panel
**And** The main area should be a focused workspace

### 2. Tabbed Interface
**Given** I am in the Copywriting Studio
**When** I look at the main workspace
**Then** I should see a tabbed interface with 3 initial sections: "Titles", "Selling Points", and "FAQ"
**And** The "Titles" tab should be active by default

### 3. Generation Controls
**Given** I am on any generation tab (e.g., Titles)
**When** I view the tab content
**Then** I should see a "Generate" button specific to that content type
**And** I should see configuration options relevant to that type (e.g., "Tone of Voice" selector) - *Note: MVP can be simple button*

## Tasks / Subtasks

- [ ] **Frontend: Route & Page Structure**
  - [ ] Create `src/app/(dashboard)/copy/page.tsx`.
  - [ ] Create `src/app/(dashboard)/copy/layout.tsx` (if needed for specific layout, otherwise use main dashboard layout).
  - [ ] Update Sidebar Navigation to include "Smart Copy" link (href: `/copy`).

- [ ] **Frontend: Copy Studio Components**
  - [ ] Create `src/components/business/copy/CopyStudio.tsx` (Main container).
  - [ ] Implement `src/components/business/copy/ProductContextPanel.tsx`:
    - Fetch product data from Context/Store (relies on Epic 1 data).
    - Display parsed text/summary.
  - [ ] Implement `src/components/business/copy/GeneratorTabs.tsx`:
    - Use `shadcn/ui` Tabs component.
    - Define tabs: Titles, Selling Points, FAQ.

- [ ] **Frontend: Tab Content Skeletons**
  - [ ] Create placeholder content for each tab (Story 3.2 will implement actual generation logic).
  - [ ] Add "Generate [Type]" button in each tab.
  - [ ] Add "Tone" selector (Dropdown) as a shared control or per-tab.

## Dev Notes

### Architecture Patterns
- **Module Structure**: This is the entry point for "Module 1: Smart Copy" defined in `architecture.md`.
- **Frontend Path**: `src/app/(dashboard)/copy/page.tsx`.
- **State Management**: Use React Client Component (`"use client"`) for the Studio wrapper to manage Tab state and Inputs.
- **Data Fetching**: Ensure Product Context is available. If using a global store or context provider (from Story 1.3), consume it here.

### Technical Specifics
- **Components**: Use `shadcn/ui` components (`Tabs`, `Card`, `Button`, `ScrollArea`).
- **Icons**: Use `lucide-react`.
- **Responsiveness**: Side panel should be collapsible or stack on mobile (Standard Triple-Sidebar Layout pattern mentioned in Architecture).

### Dependencies
- Depends on **Epic 1** (Workspace & Content Ingestion) for Product Data.
- Backend API (`backend/app/api/v1/endpoints/copy.py`) will be implemented in **Story 3.2**. For now, the "Generate" button can log to console or show a toast "API not ready".

## References
- [Epic 3 Definition](file:///Users/ZenoWang/Documents/project/E_Business/docs/epics.md#epic-3-content-power---ai-copywriting-studio)
- [Architecture Module Mapping](file:///Users/ZenoWang/Documents/project/E_Business/docs/architecture.md#module-1-smart-copy-text)
- [UX Design Specification](file:///Users/ZenoWang/Documents/project/E_Business/docs/ux-design-specification.md) (Check for "Smart Copy" wireframes if available)

## Dev Agent Record

### Context Reference
- **Story ID**: 3.1
- **Epic**: 3 (Content Power)

### Agent Model Used
- Antigravity (Google Deepmind)
