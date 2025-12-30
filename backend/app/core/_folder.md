# Folder Map: Core Infrastructure

**[SCOPE]**:
This folder (`backend/app/core`) contains global configurations, security utilities, and system-wide singletons.

**[MEMBERS]**:
- `config.py`: **Settings**. Pydantic `BaseSettings` loading env vars.
- `security.py`: **Auth Utils**. JWT encoding/decoding, password hashing.
- `database.py`: **Event Handlers**. Startup/Shutdown DB connection logic.
- `celery_app.py`: **Task Queue**. Celery configuration.
- `logger.py`: **Logging**. Global logger configuration.

**[CONSTRAINTS]**:
- **Zero Dependencies**: Core modules should not depend on other layers (like models or services).
- **Environment Driven**: All configuration must be overridable via environment variables.
