# Project Overview

**Project Name:** E_Business
**Generated On:** 2025-12-13

## Executive Summary

The E_Business project is an e-commerce content generation platform. The current codebase represents a **Frontend Prototype** built with React, intended to be expanded into a full SaaS platform. The project is currently in a "Brownfield" state where a functional frontend exists (using mocked data in `App.tsx`) and is being documented for migration to a structured Full-Stack architecture (Next.js + FastAPI).

## Technology Stack

| Category | Technology | Version | Justification |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | React | ^18.3.1 | Core UI library |
| **Build Tool** | Vite | 6.3.5 | Fast web build tool |
| **Language** | TypeScript | (Inferred) | Type safety |
| **Styling** | Tailwind CSS | * | Utility-first CSS |
| **UI Components** | Radix UI / shadcn/ui | * | Accessible component primitives |
| **Icons** | Lucide React | ^0.487.0 | Iconography |

## Project Structure Classification

- **Type**: **Multi-part / Monorepo**
- **Architecture**: **Single-Page Application (SPA)** currently, moving to **Client-Server**.

### Detected Parts

1.  **Website front end** (Active)
    -   **Type**: Web Application
    -   **Path**: `/Website front end`
    -   **Status**: Active development prototype.
2.  **netlify-deploy** (Legacy/Static)
    -   **Type**: Static Site / Logic Reference
    -   **Path**: `/netlify-deploy`
    -   **Status**: Reference for business logic (`logic.md`).

## Critical Documentation Links

- [Product Requirements (PRD)](./prd.md)
- [Architecture Design](./architecture.md)
- [UX Design Specification](./ux-design-specification.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Component Inventory](./component-inventory.md)
