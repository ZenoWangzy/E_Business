# [FOLDER]: frontend/src/app/(dashboard)
Authenticated User Application Routes.

## [SCOPE]
- **Dashboard**: Main workspace view.
- **Editor**: Content creation tools (Copy, Image, Video).
- **Settings**: User and Workspace configuration.

## [STRUCTURE]
- `layout.tsx`: Error Boundary and layout wrapper.
- `editor/`: Route group for specific editor tools.

## [DEPENDENCIES]
- Middleware: Validates session before access.
- Components: `components/business/*` via pages.

## [PROTOCOLS]
1. **Auth Required**: All routes here are protected.
2. **Layout Consistency**: Must share the main navigation shell (if applicable).
