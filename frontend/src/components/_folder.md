# Folder Map: UI Components

**[SCOPE]**:
This folder (`frontend/src/components`) contains the visual building blocks of the application, organized by domain and reusability.

**[MEMBERS]**:
- `ui/`: **Design System**. Low-level, generic components (Buttons, Inputs, Cards). Usually based on ShadcnUI/Radix.
- `common/`: **Shared Patterns**. Reusable composites (PageHeaders, EmptyStates).
- `auth/`: **Authentication**. Login forms, Sign-up flows, Route guards.
- `workspace/`: **Workspace Domain**. Workspace selectors, settings forms.
- `billing/`: **Billing Domain**. Pricing tables, credit usage displays.
- `admin/`: **Admin Domain**. Dashboards, user management tables.
- `providers/`: **React Contexts**. Global providers for Theme, Auth, Toast.

**[CONSTRAINTS]**:
- **Client Components**: Most components here will be `"use client"` unless purely static.
- **Composition**: Prefer composition over inheritance.
- **Styles**: Use Tailwind utility classes.
