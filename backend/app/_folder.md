# Folder Map: Backend Core

**[SCOPE]**:
This folder (`backend/app`) is the **Application Root**. It orchestrates the entire Python backend, holding the API entry points, core logic, database models, and business services.

**[MEMBERS]**:
- `main.py`: **Entry Point**. Initializes `FastAPI` app, mounts routers, and handles CORS/Exceptions.
- `api/`: **Interface Layer**. Contains V1/V2 route definitions.
- `core/`: **Kernel**. Config, Security, Event handlers.
- `db/`: **Persistence**. Database connection (`session.py`) and generic repositories.
- `models/`: **Domain Entities**. SQLAlchemy ORM models.
- `schemas/`: **Data Contracts**. Pydantic models for Input/Output validation.
- `services/`: **Business Logic**. Complex operations isolated from HTTP layer.
- `middleware/`: **Interceptors**. Custom request/response processing (e.g. Auth, Logging).

**[CONSTRAINTS]**:
- **Layering**: API routes must call `Services` or `CRUD` modules; never query DB directly.
- **Async**: All I/O bound operations should be `async`.
- **Typing**: Strict Type hinting is enforced.
