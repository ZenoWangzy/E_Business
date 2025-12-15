# Story 1.1: Environment Initialization & DB Migration

Status: done

## Story

As a Developer,
I want to initialize the local docker-compose environment and database migrations,
So that I have a working foundation for the application.

## Acceptance Criteria

1. **Given** the project repository is cloned
2. **When** I run `docker-compose up -d`
3. **Then** PostgreSQL, Redis, and MinIO containers should be running and healthy
4. **And** I can access the MinIO console at localhost:9001
5. **And** I can run `alembic upgrade head` to apply initial migrations (Users, Workspaces tables)
6. **And** The monorepo structure (frontend/backend) is created with basic boilerplate

## Tasks / Subtasks

- [x] Initialize Monorepo Structure
  - [x] Create root directory structure (`/frontend`, `/backend`, `/docs`)
  - [x] Initialize git repository (if not already done)
  - [x] Create root `.env` template
- [x] Implement Infrastructure (Docker)
  - [x] Create `docker-compose.yml`
  - [x] Configure PostgreSQL service (v15+, port 5432)
  - [x] Configure Redis service (v7+, port 6379)
  - [x] Configure MinIO service (latest, port 9000/9001)
  - [x] Verify container health checks
- [x] Initialize Backend (FastAPI)
  - [x] initialize `backend/` with Poetry/uv
  - [x] Install dependencies: `fastapi`, `uvicorn`, `sqlalchemy`, `asyncpg`, `pydantic-settings`, `alembic`
  - [x] Create basic app structure (`app/main.py`, `app/core/config.py`)
- [x] Configure Database & Migrations
  - [x] Implement Async Database Session (`app/db/session.py`)
  - [x] Initialize Alembic (`alembic init`)
  - [x] Configure `alembic.ini` and `env.py` for async support
  - [x] Create Users model (`app/models/user.py`)
  - [x] Create Workspaces model (`app/models/workspace.py`)
  - [x] Generate initial migration script
- [x] Initialize Frontend (Next.js)
  - [x] Run `npx create-next-app@latest frontend` (TypeScript, Tailwind, ESLint, App Router)
  - [x] Install `shadcn-ui` init
- [x] Verification
  - [x] Test `docker-compose up`
  - [x] Test `alembic upgrade head`
  - [x] Verify MinIO access

### Review Follow-ups (AI)
- [x] [AI-Review][CRITICAL] Initialize git repository in project root → Already exists (main branch)
- [x] [AI-Review][CRITICAL] Add comprehensive test suite → Created `backend/app/tests/` with 18 unit tests (all passing)
- [x] [AI-Review][CRITICAL] Fix dangerous Alembic default config in alembic.ini → Commented out default URL, added warning comment
- [x] [AI-Review][HIGH] Resolve PostgreSQL port mismatch (5433 vs 5432) → Confirmed intentional: host:5433 maps to container:5432, config.py uses 5433 correctly
- [x] [AI-Review][HIGH] Add evidence for Alembic migration verification → `alembic current` shows `c009d778f3bb (head)`
- [x] [AI-Review][HIGH] Add evidence for MinIO console access verification → `curl localhost:9001` returns HTTP 200
- [x] [AI-Review][MEDIUM] Create .env.example template file → Already exists at project root

## Dev Notes

### Architecture Patterns
- **Monorepo**: Strict separation between `frontend` and `backend`.
- **Database**: Use `SQLAlchemy` 2.0+ with `asyncpg` driver for full async support.
- **Config**: Use `pydantic-settings` to load env vars in Backend.
- **Docker**: Ensure persistence for DB and MinIO using named volumes.

### Project Structure Alignment
- Backend: Follow `app/api`, `app/core`, `app/models`, `app/schemas` structure.
- Use `snake_case` for all Python/DB naming.

### References
- [Architecture: Selected Starter Options](file:///Users/ZenoWang/Documents/project/E_Business/docs/architecture.md#selected-starter-options)
- [Architecture: Infrastructure](file:///Users/ZenoWang/Documents/project/E_Business/docs/architecture.md#infrastructure)
- [Architecture: Core Architectural Decisions](file:///Users/ZenoWang/Documents/project/E_Business/docs/architecture.md#core-architectural-decisions)

## Dev Agent Record

### Context Reference
- **Epic**: [Epic 1: The Foundation](file:///Users/ZenoWang/Documents/project/E_Business/docs/epics.md#epic-1-the-foundation---workspace--content-ingestion)
- **Architecture**: [Implementation Patterns](file:///Users/ZenoWang/Documents/project/E_Business/docs/architecture.md#implementation-patterns--consistency-rules)

### Implementation Guide
- **Priority**: This is the blocked foundation for everything else. Focus on getting the containers UP and specific tables created.
- **Warning**: Do not over-engineer the User model yet, just basic fields (id, email, hashed_password) and relation to Workspace. NextAuth integration comes in Story 1.2, but table is needed now.

### Completion Notes
**Date**: 2025-12-14

**Implementation Summary**:
- Verified all Docker containers (PostgreSQL, Redis, MinIO) are running and healthy
- Confirmed Alembic migrations are applied successfully (Users, Workspaces, WorkspaceMember tables)
- Installed and initialized `shadcn-ui` in frontend (created `components.json`, `src/lib/utils.ts`)
- Verified MinIO console is accessible at http://localhost:9001 (HTTP 200)

**Files Verified/Changed**:
- `docker-compose.yml` - PostgreSQL (5433), Redis (6379), MinIO (9000/9001)
- `backend/app/db/base.py` - Async session with SQLAlchemy 2.0
- `backend/app/models/user.py` - User, Workspace, WorkspaceMember models
- `backend/alembic/versions/20251213_2024_*.py` - Initial migration
- `frontend/components.json` - shadcn-ui configuration (NEW)
- `frontend/src/lib/utils.ts` - shadcn-ui utilities (NEW)
- `frontend/src/app/globals.css` - Updated with CSS variables

## File List

| File | Action |
|------|--------|
| `docker-compose.yml` | Verified |
| `backend/app/main.py` | Verified |
| `backend/app/core/config.py` | Verified |
| `backend/app/db/base.py` | Verified |
| `backend/app/models/user.py` | Verified |
| `backend/alembic.ini` | Verified |
| `backend/alembic/env.py` | Verified |
| `backend/alembic/versions/20251213_2024_c009d778f3bb_initial_users_workspaces.py` | Verified |
| `frontend/components.json` | Added |
| `frontend/src/lib/utils.ts` | Added |
| `frontend/src/app/globals.css` | Modified |
| `backend/app/tests/__init__.py` | Added |
| `backend/app/tests/conftest.py` | Added |
| `backend/app/tests/unit/__init__.py` | Added |
| `backend/app/tests/unit/test_config.py` | Added |
| `backend/app/tests/unit/test_models.py` | Added |
| `backend/alembic.ini` | Modified (security fix) |

## Change Log

| Date | Change |
|------|--------|
| 2025-12-14 | Story completed: All tasks verified and marked complete. shadcn-ui installed, Alembic migrations verified, MinIO console accessible. |
| 2025-12-14 | Review Follow-ups completed: 18 unit tests added (`test_config.py`, `test_models.py`), alembic.ini fixed, all verifications documented. Status → review. |
