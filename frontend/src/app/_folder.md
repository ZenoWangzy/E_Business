# [FOLDER]: frontend/src/app
Next.js 14 App Router Root Directory.

## [SCOPE]
- **Routes**: Manages application routing and page layouts.
- **Layouts**: Root layout and nested layouts for route groups.
- **Global Styles**: Integrates `globals.css` and font configurations.

## [STRUCTURE]
- `(auth)/`: Authentication routes (Sign In, Sign Up).
- `(dashboard)/`: Main user dashboard (Workspaces, Projects).
- `(admin)/`: Superuser administration panel.
- `api/`: Route handlers for backend proxy or edge logic.
- `layout.tsx`: **ROOT** server layout component.
- `page.tsx`: **LANDING** page component.
- `globals.css`: Global Tailwind CSS directives.

## [DEPENDENCIES]
- Parent: `../layout.tsx` (Conceptual hierarchy)
- Components: `../components/*`
- Hooks: `../hooks/*`
- Backend: `/backend/app/api/v1/*` (via API proxy or fetch)

## [PROTOCOLS]
1. **Server Components by Default**: Use "use client" explicit directive strictly when interactivity is needed.
2. **Route Groups**: Use `(group)` folders to organize routes without affecting URL paths.
3. **Data Fetching**: Prefer Server Actions or server-side fetch in `page.tsx`/`layout.tsx`.
