# Folder Map: Middleware

**[SCOPE]**:
This folder (`backend/app/middleware`) contains ASGI middlewares for intercepting requests/responses.

**[MEMBERS]**:
- `admin_error_handler.py`: **Error Handling**. Catches exceptions in Admin routes to log to SystemLog DB.

**[CONSTRAINTS]**:
- **Performance**: Middleware runs on every request; keep lightweight.
- **Exception Safety**: Must not crash the application; ensure `call_next` is safe.
