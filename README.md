# E_Business: Project Architecture

## **Global Constitution (Level 1)**

### 1. **Core Protocol**
This project operates under the **High-Integrity Context Protocol**.
- **Accuracy > Speed**: Always verify dependencies via `read_file`.
- **Zero-Trust**: Do not rely on headers alone; read the source.
- **Atomic Double-Write**: Code changes must be reflected in documentation instantly.
- **Fractal Navigation**:
    - **Root**: This file (`/README.md`)
    - **Folder**: Check `_folder.md` in every directory.
    - **File**: Check `[HEADER]` in every file.

### 2. **Architecture Overview**
This is a monorepo containing an AI-powered e-commerce content generation platform.

- **`/backend`**: Python/FastAPI backend.
    - `app/`: Core application logic (API, Models, Services).
    - `alembic/`: Database migrations.
- **`/frontend`**: TypeScript/Next.js frontend.
    - `src/`: Source code (Components, Pages, Utilities).
- **`/docs`**: Project documentation.

### 3. **System Health & Status**
- **Status**: Active Development.
- **Pilot Phase**: Implementing High-Integrity Protocol in core modules.

---
**[NAVIGATION]**:
- [Backend Map](./backend/app/_folder.md) (Pending)
- [Frontend Map](./frontend/src/_folder.md) (Pending)
