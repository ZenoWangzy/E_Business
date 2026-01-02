# [FOLDER]: frontend/src/app/(admin)
Superuser Administration Panel Routes.

## [SCOPE]
- **Stats**: System-wide metrics (MRR, Users).
- **Logs**: System audit logs.
- **Users**: User management interface.

## [STRUCTURE]
- `layout.tsx`: Admin-specific header and auth check.
- `admin/`: Sub-routes for specific admin functions.

## [PROTOCOLS]
1. **Strict Auth**: Must verify `is_superuser` (mostly via API, but layout adds checks).
2. **Visual Distinction**: Use distinct styling (e.g., Red/Black theme) to indicate privileged context.
