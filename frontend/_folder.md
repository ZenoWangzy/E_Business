# Folder Map: Frontend Module

**[SCOPE]**:
This folder (`/frontend`) is the **Next.js 16 Application**. It provides the complete user interface for the E_Business platform, including authentication, workspace management, and AI generation workflows.

**[MEMBERS]**:
- `src/`: **Source Code**. All application code (App Router structure).
  - `app/`: **Pages & Layouts**. Next.js App Router structure.
  - `components/`: **React Components**. UI and business components.
    - `ui/`: **Base Components**. shadcn/ui components.
    - `business/`: **Business Components**. Domain-specific components.
  - `lib/`: **Utilities**. API clients, helpers, storage services.
  - `hooks/`: **Custom Hooks**. React hooks for data fetching and state.
  - `stores/`: **State Management**. Zustand stores.
  - `types/`: **Type Definitions**. TypeScript types and interfaces.
  - `workers/`: **Web Workers**. Background processing (file parsing).
- `public/`: **Static Assets**. Images, fonts, and static files.
- `package.json`: **Dependencies**. NPM package configuration.
- `next.config.js`: **Next.js Config**. Framework configuration.
- `tailwind.config.js`: **Styling Config**. Tailwind CSS customization.
- `tsconfig.json`: **TypeScript Config**. Type checking rules.
- `jest.config.js`: **Test Config**. Jest testing framework setup.
- `playwright.config.ts`: **E2E Test Config**. Playwright configuration.

**[CONSTRAINTS]**:
- **Client/Server**: Use `"use client"` directive for components using hooks.
- **Imports**: Use absolute imports `@/` instead of relative paths.
- **Styles**: Use Tailwind CSS classes; avoid CSS modules unless necessary.
- **Type Safety**: All files must pass `tsc --noEmit` type checking.
- **State**: Server state via React Query, client state via Zustand.
- **Security**: All API calls use credentials: 'include' for authentication.
