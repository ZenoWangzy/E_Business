# Folder Map: Frontend Source

**[SCOPE]**:
This folder (`frontend/src`) contains the source code for the Next.js application. It follows the Next.js App Router structure and includes shared utilities, components, and state management.

**[MEMBERS]**:
- `app/`: **Pages & Routing**. Next.js App Router file-system based routing.
- `components/`: **UI Library**. Reusable React components (Atoms, Molecules, Organisms).
- `lib/`: **Core Utilities**. Shared helper functions, API clients, and constants.
- `hooks/`: **React Hooks**. Custom hooks for logic reuse.
- `types/`: **TypeScript Definitions**. Global type interfaces.
- `stores/`: **State Management**. Global state (e.g., Zustand, Context).
- `middleware.ts`: **Edge Middleware**. Runs before requests (Auth, Routing protection).
- `auth.ts`: **Authentication**. NextAuth configuration and providers.

**[CONSTRAINTS]**:
- **Client/Server**: components must use `"use client"` directive if they use hooks.
- **Imports**: Use absolute imports `@/` instead of relative paths `../../`.
- **Styles**: Use Tailwind CSS classes; avoid CSS modules unless necessary.
