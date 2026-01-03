# [FOLDER]: frontend/src/lib
Core Utilities, Configurations, and Shared Libraries.

## [SCOPE]
- **Utils**: Stateless helper functions (formatting, validation).
- **API**: API client wrappers and fetch interceptors.
- **Config**: Environment variables and constant definitions.
- **Security**: Auth helpers and token management.

## [STRUCTURE]
- `api/`: API client instances (Axios/Fetch wrappers).
- `utils.ts`: General purpose utility functions (`cn`, `isUuid`).
- `__tests__/`: Jest tests for lib utilities.
- `storage/`: LocalStorage/SessionStorage wrappers.
- `security/`: Encryption or hashing helpers (if any).

## [DEPENDENCIES]
- External: `clsx`, `tailwind-merge` (for UI utils).
- Environment: `process.env`.

## [PROTOCOLS]
1. **Pure Functions**: Files here should generally export pure functions.
2. **Type Safety**: strict TypeScript typing for all utilities.
3. **No UI**: Do NOT import React components here.
