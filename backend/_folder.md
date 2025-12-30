# Folder Map: Backend Module

**[SCOPE]**:
This folder (`/backend`) is the **API Server Core**. It handles all business logic, data persistence, AI integration, and asynchronous task processing for the E_Business platform.

**[MEMBERS]**:
- `app/`: **Application Root**. Main FastAPI application with all source code.
  - `api/`: **Interface Layer**. RESTful API endpoints (v1, v2).
  - `core/`: **Kernel**. Config, Security, Celery app, Logging.
  - `db/`: **Persistence**. Database session management.
  - `models/`: **Domain Entities**. SQLAlchemy ORM models.
  - `schemas/`: **Data Contracts**. Pydantic validation models.
  - `services/`: **Business Logic**. Complex operations isolated from HTTP layer.
  - `tasks/`: **Async Jobs**. Celery tasks for AI generation.
  - `middleware/`: **Interceptors**. Custom middleware (Auth, Logging).
- `alembic/`: **Database Migrations**. Version-controlled schema changes.
- `tests/`: **Test Suite**. Unit, integration, and performance tests.
- `pyproject.toml`: **Dependencies**. Python package configuration using uv.
- `uv.lock`: **Dependency Lock**. Locked versions for reproducibility.
- `venv/`: **Virtual Environment**. Python runtime (gitignored).

**[CONSTRAINTS]**:
- **Async**: All I/O operations must use async/await patterns.
- **Type Safety**: Strict type hints required for all functions.
- **Layering**: API → Services → Models (no direct DB access from endpoints).
- **Security**: All endpoints must authenticate via JWT or NextAuth token.
- **Testing**: All new features require unit tests before merge.
- **Error Handling**: Use standardized HTTP exceptions with proper status codes.
