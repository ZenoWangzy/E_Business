# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Overview

This repo contains two main parts:
- backend: FastAPI-based API service (async SQLAlchemy, Alembic, Celery with Redis).
- netlify-deploy: A static, frontend-only tool for generating e-commerce detail pages (no build step, uses vanilla JS + CDN libs).

A docker-compose.yml at the repo root provides local infrastructure (Postgres, Redis, MinIO) for the backend.

## Common commands

All commands assume macOS/zsh. Use Poetry (preferred) or pip for the backend. Run from the indicated directory.

### Start local infra (from repo root)
- docker compose up -d
- docker compose ps

### Backend (from backend/)
Install deps (choose one):
- Poetry: poetry install --with dev
- Pip venv: python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt && pip install -r <(python - <<'PY'\nimport tomllib,sys;data=tomllib.load(open('pyproject.toml','rb'));\nprint('\n'.join([f"{k}{v}" if isinstance(v,str) else k for k,v in data.get('tool',{}).get('poetry',{}).get('group',{}).get('dev',{}).get('dependencies',{}).items()]))\nPY)

Run API server (FastAPI on Uvicorn):
- Poetry: poetry run uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
- Pip: uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

Run Celery (worker and beat) for scheduled tasks:
- Worker: poetry run celery -A app.core.celery_app.celery_app worker -l info
- Beat: poetry run celery -A app.core.celery_app.celery_app beat -l info
  - Pip users: drop poetry run.

Database migrations (Alembic):
- Upgrade to latest: (cd backend &&) alembic upgrade head
- Create autogeneration revision: alembic revision --autogenerate -m "<message>"

Testing (pytest):
- Run all: poetry run pytest -q
- Single file: poetry run pytest app/tests/unit/test_auth.py -q
- Single test: poetry run pytest app/tests/unit/test_auth.py::TestLoginEndpoint::test_login_success -q
  - Pip users: drop poetry run.

Notes:
- Backend settings come from pydantic-settings; create backend/.env as needed. See “Backend configuration” below for key variable names.
- CORS allows http://localhost:3000 by default; adjust as needed in app/main.py.

### Frontend (from netlify-deploy/)
Serve locally (static site, no build):
- Python: python -m http.server 8000
- Node: npx http-server -p 8000
Then open http://localhost:8000

Deploy (examples):
- Netlify: netlify deploy --prod --dir=.
- GitHub Pages: push to main (per your Pages settings).

## High-level architecture

### Backend (FastAPI service)
- Entry point: app/main.py
  - Creates FastAPI app, configures CORS, mounts versioned routers under /api/v1.
- API layer: app/api/v1/endpoints/
  - auth.py: email/password login (JWT issuance) and /me using cookie-based NextAuth compatibility.
  - workspaces.py: workspace CRUD, membership management, invite lifecycle, and rate limiting hooks.
- Dependency and auth wiring: app/api/deps.py
  - get_current_user resolves NextAuth cookies, validates JWT (app/core/security.py), loads User; exposes role/permission checks per-workspace.
- Core configuration/security: app/core/
  - config.py: Settings via pydantic-settings (env/.env), includes database_url, redis_url, auth_secret, etc.
  - security.py: bcrypt password hashing and HS256 JWT create/decode helpers.
  - celery_app.py: Celery app + Beat schedule (daily invite cleanup task).
- Data access:
  - app/db/base.py: async engine/session factory and FastAPI dependency get_db.
  - Models in app/models/: User, Workspace, WorkspaceMember, WorkspaceInvite, Asset, AuditLog (Postgres UUID PKs, indexes, enums).
  - Schemas in app/schemas/: Pydantic response/input models (camelCase aliasing via CamelCaseModel).
- Services:
  - app/services/audit.py: audit logging abstraction.
  - app/services/rate_limiter.py: Redis-backed rate limiting (used in invites) if Redis available.
- Background tasks: app/tasks/invite_cleanup.py (Celery task to mark expired invites) scheduled via celery_app.py.
- Migrations: backend/alembic.ini + alembic/env.py (sqlalchemy.url set from Settings at runtime; autogenerate enabled via Base.metadata import).
- Tests: app/tests/
  - Unit tests use FastAPI TestClient and dependency_overrides; structure under unit/ and integration/.

Cross-cutting concerns:
- Auth: JWT (HS256) with NextAuth-compatible cookies; roles enforced per workspace via dependency factories.
- Multi-tenancy: workspace_id on relevant entities, membership/roles in association table; RBAC checked in endpoints.
- Observability/Audit: structured AuditLog with action enums and extra_data; service centralizes writes.

### Frontend (netlify-deploy static tool)
- No framework/build. Single-page app wired in index.html with CDN libraries (PDF.js, Mammoth.js, SheetJS).
- Steps/state: js/steps.js implements a simple state machine for a 4-step wizard; global userData holds inputs.
- File ingestion: js/app.js handles uploads for images/PDF/Word/Excel; extracts text using the above libraries with pragmatic limits (e.g., first 10 PDF pages, first 20 Excel rows).
- Generation: js/generator.js produces placeholder images and interactive UI for reordering, annotating, batch deleting, and previewing merged long images; download via canvas.
- Routing/deploy: netlify.toml enables SPA redirect to index.html; no backend required.

## Backend configuration
Define these environment variables (backend/.env recommended); defaults exist for local dev but should be overridden in real deployments:
- DATABASE_URL (python field: database_url) — Postgres async URL, e.g., postgresql+asyncpg://user:pass@localhost:5433/ebusiness
- REDIS_URL (redis_url) — e.g., redis://localhost:6379/0
- AUTH_SECRET (auth_secret) — HS256 secret for JWT (NextAuth-compatible)
- SECRET_KEY (secret_key) — app secret (general purpose)
- MINIO_ENDPOINT, MINIO_ROOT_USER, MINIO_ROOT_PASSWORD, MINIO_BUCKET — if using object storage features
- ACCESS_TOKEN_EXPIRE_MINUTES (access_token_expire_minutes)
- API_V1_PREFIX (api_v1_prefix) — defaults to /api/v1

## Important notes from existing docs
- netlify-deploy/CLAUDE.md documents the frontend’s 4-step flow, parser limits (PDF first 10 pages, Excel first 20 rows), and static deployment strategy; use it as a reference when modifying the static tool.
- No repo-level linter/formatter config is present; tests are provided for the backend via pytest.
