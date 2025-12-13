# Source Tree Analysis

**Generated On:** 2025-12-13

## Directory Structure

```
E_Business/
├── docs/                        # Project Documentation
│   ├── prd.md                   # Product Requirements
│   ├── architecture.md          # Technical Architecture
│   └── ux-design-specification.md # UX Design Specs
├── Website front end/           # Main React Application
│   ├── public/                  # Static assets
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/              # shadcn/ui components (Button, Card, etc.)
│   │   │   └── figma/           # Design tokens/icons
│   │   ├── styles/              # Global styles
│   │   ├── App.tsx              # MONOLITHIC ENTRY POINT (Needs Refactoring)
│   │   ├── main.tsx             # React Root
│   │   └── CLAUDE.md            # Frontend Module Documentation
│   ├── package.json             # Dependencies
│   └── vite.config.ts           # Build Config
└── netlify-deploy/              # Legacy Reference
    └── logic.md                 # Core Business Logic Rules
```

## Critical Folders & Files

### /Website front end/src/App.tsx
**Status: CRITICAL REFACTOR TARGET**
This file (approx 1600 lines) contains the bulk of the application logic, including state management, routing simulation, and data handling. It needs to be decomposed into `pages/`, `features/`, and `services/`.

### /Website front end/src/components/ui
**Status: REUSABLE**
Contains standard shadcn/ui components. These should be preserved and reused in the new architecture.

### /docs
**Status: ACTIVE**
Contains the "Source of Truth" for the upcoming refactor. `prd.md` and `architecture.md` define the target state.
