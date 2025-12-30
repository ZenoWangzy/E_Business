# Folder Map: API Layer

**[SCOPE]**:
This folder (`backend/app/api`) defines the HTTP Interface of the application. It routes requests to appropriate services and handles dependency injection.

**[MEMBERS]**:
- `v1/`: **Version 1 Router**. Main API version. Contains all endpoints.
- `deps/`: **Dependencies**. Reusable dependency injection modules (e.g. database sessions).
- `deps_auth.py`: **Auth Dependencies**. Functions to retrieve current user/superuser.

**[CONSTRAINTS]**:
- **Thin Controllers**: Endpoints should validate input and call `services`. Business logic should NOT reside here.
- **Dependency Injection**: Use `Depends(...)` for all shared resources (DB, User).
