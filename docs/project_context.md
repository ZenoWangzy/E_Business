---
project_name: 'E_Business'
user_name: 'ZenoWang'
date: '2025-12-12'
sections_completed: ['technology_stack', 'critical_rules', 'testing', 'workflow']
existing_patterns_found: 4
status: 'complete'
---

# Project Context for AI Agents

_This file contains critical rules and patterns that AI agents must follow when implementing code in this project. Focus on unobvious details that agents might otherwise miss._

---

## Technology Stack & Versions

- **Frontend**: Next.js 14+ (App Router), Tailwind CSS, shadcn/ui
- **Backend**: FastAPI (Python), Celery 5.6, SQLAlchemy (Async), Pydantic
- **Database**: PostgreSQL (Docker), Redis (Docker)
- **Storage**: MinIO (Docker, S3 Compatible)
- **Auth**: NextAuth.js v5 (Beta) / Auth.js

## Critical Implementation Rules

### 1. Naming & Case Convention (Strict)
- **Frontend (TS)**: MUST use `camelCase` for all variables and properties.
- **Backend (Python)**: MUST use `snake_case` for all variables and DB fields.
- **API Boundary**: Backend Pydantic models MUST configure `alias_generator` to output `camelCase` JSON. Frontend MUST NOT manually convert case.

### 2. Type Safety
- **Single Source of Truth**: Frontend TypeScript types MUST be generated from Backend OpenAPI spec (`npm run gen:api`).
- **Do NOT** manually write TypeScript interfaces that duplicate Python Pydantic models.

### 3. API Response Format
- **Flat Response**: API returns `{ ...data }` directly, NOT `{ data: { ... } }`.
- **Errors**: Return `{ detail: "message" }`. Use HTTP Status Codes (4xx/5xx) for errors.

### 4. Directory Structure Boundaries
- **Frontend**: `frontend/src/app` (Pages), `frontend/src/components` (UI)
- **Backend**: `backend/app/api` (Routes), `backend/app/services` (Business Logic)
- **Shared**: `docker-compose.yml` (Infrastructure)

### 5. Testing & Quality Standards
- **Backend Testing (Pytest)**:
    - **Unit**: `backend/app/tests/unit`. Mock ALL external dependencies.
    - **Integration**: `backend/app/tests/integration`. Use TestClient + Test DB.
- **Frontend Testing (Jest)**:
    - **Business Components**: Must have unit tests covering state changes.
    - **UI Library**: Do NOT test `components/ui` (shadcn).
- **Linting**:
    - **Frontend**: ESLint + Prettier.
    - **Backend**: Ruff (Linter & Formatter).
- **Documentation**:
    - **API**: Endpoints MUST have `summary` and `description` docstrings.
    - **Complex Logic**: Comments MUST explain the "Why", not the "What".

### 6. Development Workflow
- **Git Commits**: Follow Conventional Commits (e.g., `feat: user login`, `fix: auth bug`).
- **Dependency Management**:
    - Frontend: `npm` (lockfile: `package-lock.json`)
    - Backend: `poetry` (lockfile: `poetry.lock`)

## Anti-Patterns (Do NOT Do This)
- ❌ **No circular imports** in Python. Use `TYPE_CHECKING` for type hints.
- ❌ **No logic in UI components**. Move logic to `hooks` or `services`.
- ❌ **No blocking code** in FastAPI routes. Use `await` or `Celery` for slow tasks.
- ❌ **No secrets** in code. Always use `.env` variables mapped via `pydantic-settings`.

