# Project Documentation Index

**Project:** E_Business
**Generated:** 2025-12-13

## Project Overview

- **Type:** Multi-part / Monorepo
- **Primary Architecture:** React SPA (Prototype) -> Full-Stack SaaS (Target)
- **Status:** **Brownfield** (Existing frontend code, new backend planned)

## Quick Reference

### Website front end (Active)
- **Type:** web
- **Tech Stack:** React, Vite, Tailwind, shadcn/ui
- **Root:** `/Website front end`

### netlify-deploy (Legacy)
- **Type:** infra / static
- **Root:** `/netlify-deploy`

## Documentation Map

### Core Documents (Source of Truth)
- [Product Requirements (PRD)](./prd.md)
- [Architecture Decision Document](./architecture.md)
- [UX Design Specification](./ux-design-specification.md)

### Analysis & Reference (Generated)
- [Project Overview](./project-overview.md)
- [Source Tree Analysis](./source-tree-analysis.md)
- [Component Inventory](./component-inventory.md)
- [Development Guide](./development-guide.md)

### Future Documentation (To be generated)
- [API Contracts](./api-contracts.md) _(To be generated after Backend impl)_
- [Data Models](./data-models.md) _(To be generated after DB impl)_
- [Deployment Guide](./deployment-guide.md) _(To be generated after Infra setup)_

## Getting Started

To run the current active frontend:

1.  `cd "Website front end"`
2.  `npm install`
3.  `npm run dev`
