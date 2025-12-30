# Tech-Spec: Public User Registration (Story 1.7)

**Created:** 2025-12-30
**Status:** Ready for Development

## Overview

### Problem Statement
Currently, the platform only supports user access via invitation (Story 1.3). There is no "Sign Up" capability for new users to self-register and create their own workspaces. This limits growth and trial adoption.

### Solution
Implement a public registration flow (`/register`) that allows users to create an account with email/password. Upon success, auto-login the user and redirect them to the Onboarding flow to set up their first workspace.

### Scope (In/Out)
**In:**
- Backend `POST /api/v1/auth/register` endpoint.
- Frontend `/register` page and form component.
- `UserCreate` Pydantic schema.
- Email uniqueness validation.
- Password strength validation.
- Auto-login after registration.

**Out:**
- Email verification (sending magic links/codes) - Deferred to future story.
- Social Login Registration (already handled by Login flow, this is specific to Credentials).
- CAPTCHA (deferred for MVP).

## Context for Development

### Codebase Patterns
- **Auth**: NextAuth.js v5 using Credentials provider (JWS tokens).
- **Architecture**: Separated Frontend (Next.js) and Backend (FastAPI).
- **Styling**: Tailwind CSS + shadcn/ui (Glassmorphism).
- **Validation**: Pydantic for Backend, Client-side validation in Frontend.
- **Security**: `app.core.security` module exists for hashing and password validation.

### Files to Reference
- `docs/sprint-artifacts/1-7-public-user-registration.md` (Source Story)
- `backend/app/core/security.py` (Security utils)
- `backend/app/models/user.py` (User model)
- `backend/app/api/v1/endpoints/auth.py` (Auth endpoints)
- `frontend/src/components/auth/login-form.tsx` (Reference for UI adaptation)

### Technical Decisions
- **Schema Location**: Create `backend/app/schemas/user.py` as it doesn't exist yet. This will house `UserCreate` and future user-related schemas.
- **Auto-Login**: Frontend will immediately call `signIn("credentials", ...)` after a successful registration API call to provide a seamless experience (no need to re-enter password).
- **Validation**: Re-use `validate_password_strength` from backend core to ensure consistency between API and util, though frontend will also implement immediate feedback.

## Implementation Plan

### Tasks

- [ ] **Backend: Create User Schema**
  - Create `backend/app/schemas/user.py`.
  - Define `UserCreate` with `email` (EmailStr), `password` (str), `name` (str).
  - Add validator for password using `core.security.validate_password_strength`.

- [ ] **Backend: Registration API**
  - Modify `backend/app/api/v1/endpoints/auth.py`.
  - Add `POST /register` endpoint.
  - Dependency: `db: AsyncSession`.
  - Logic: Check if email exists -> 400; Hash password; Create User; Commit.
  - Return: `UserResponse` or success message.

- [ ] **Frontend: Register Form Component**
  - Create `frontend/src/components/auth/register-form.tsx`.
  - Copy structure from `login-form.tsx`.
  - Add `name` input field.
  - Update submit handler to call `/api/v1/auth/register` (using axios or fetch wrapper).
  - On success, call `signIn`.

- [ ] **Frontend: Register Page**
  - Create `frontend/src/app/(auth)/register/page.tsx`.
  - Render `RegisterForm`.

- [ ] **Frontend: Navigation Links**
  - Update `login/page.tsx` (or form) to link to `/register`.
  - Update `register/page.tsx` to link to `/login`.

### Acceptance Criteria

- [ ] **AC 1**: User can navigate to `/register` from Login page.
- [ ] **AC 2**: Valid submission creates a `User` in DB with `hashed_password`.
- [ ] **AC 3**: Invalid password (too short/simple) returns legible error and is blocked.
- [ ] **AC 4**: Duplicate email returns "Email already registered" error.
- [ ] **AC 5**: Successful registration redirects to `/onboarding` (via auto-login).

## Additional Context

### Dependencies
- None. `bcrypt`, `pydantic`, `email-validator` are already installed.

### Testing Strategy
- **Unit (Backend)**: Test `create_user` with valid/invalid data. Test duplicate email.
- **Manual (Frontend)**:
  1. Go to `/register`.
  2. Try weak password -> See error.
  3. Register new user -> Check DB -> Verify redirect to `/onboarding`.
  4. Logout, try to register same email -> See error.

### Notes
- Ensure `UserCreate` schema uses `alias_generator` if we want camelCase inputs, BUT currently `auth.py` `LoginRequest` uses snake_case/simple fields. Let's stick to standard Pydantic defaults for simple fields (email, password, name are compatible). Frontend should send JSON matching the schema.
