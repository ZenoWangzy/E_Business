# Story 1.7: Public User Registration

Status: done

## Story

As a **new User**,
I want to **create an account on the platform**,
so that **I can start using the service without waiting for an invitation**.

## Acceptance Criteria

1. **Given** I am on the public landing page or login page
2. **When** I click "Sign Up" or "Register"
3. **Then** I should be navigated to the registration page (`/register`)
4. **And** I can enter my name, email, and password
5. **And** The password must meet security requirements (min 8 chars including at least one number or special character)
6. **When** I submit the form
7. **Then** A new User record should be created in the database
8. **And** I should be automatically logged in (session created)
9. **And** I should be redirected to the Onboarding flow (Story 1.3) to create my first workspace
10. **And** If the email already exists, I should see a clear error message

## Tasks / Subtasks

- [x] Backend: Registration API
  - [x] Implement `POST /api/v1/auth/register` endpoint
  - [x] Validate email uniqueness
  - [x] Hash password using `core.security.get_password_hash`
  - [x] Create User record (is_active=True)
- [x] Frontend: Registration UI
  - [x] Create `src/app/(auth)/register/page.tsx`
  - [x] Create `src/components/auth/register-form.tsx` (Reuse/Adapt LoginForm styles)
  - [x] Add "Don't have an account? Sign up" link to Login page
  - [x] Add "Already have an account? Sign in" link to Register page
- [x] Frontend: Auth Integration
  - [x] Implement `signIn` with verify-credentials after successful registration (auto-login)
  - [x] Handle redirect to `/onboarding` upon success

## Dev Notes

### 🔐 Security Requirements (Critical)
- **Password Validation**: Must pass `validate_password_strength()` from `core/security.py`:
  - Minimum 8 characters
  - Must include at least one number OR special character
- **Token Format**: Use standard JWT (JWS HS256), consistent with Story 1.2 decision
- **Password Hashing**: Use `get_password_hash()` from `core/security.py`

### Architecture Patterns
- **Flat Response**: Return JSON user object or plain success message
- **Pydantic Schema**: Use `UserCreate` for input validation (defined below)
- **Type Conversion**: Frontend (CamelCase) <-> Backend (SnakeCase)

### Schema Definition
```python
# backend/app/schemas/user.py
class UserCreate(BaseModel):
    """User registration request."""
    email: EmailStr
    password: str  # Validated using validate_password_strength
    name: str
```

### Auto-Login Implementation
After successful registration, frontend should call:
```typescript
const result = await signIn("credentials", {
    email: registeredUser.email,
    password: registeredUser.password,
    redirect: false
})
if (result?.error) {
    // Registration succeeded but login failed - prompt manual login
    setError("注册成功，请手动登录")
} else {
    router.push("/onboarding")
}
```

### Email Uniqueness
- Database constraint: `email` column has `unique=True` (see `models/user.py`)
- Backend should catch `IntegrityError` and return user-friendly 400 error
- Frontend should display clear error message: "该邮箱已被注册"

### NextAuth Integration
- **Reuse Story 1.2 Configuration**: No changes needed to Credentials Provider
- Registration uses same `signIn('credentials')` mechanism for auto-login
- Token validation compatible with existing `deps.py` parser

### Form Validation (Frontend)
Reuse `login-form.tsx` patterns:
- Card layout with glassmorphism styling
- Input component configuration
- Error message styling
- Loading state handling

### Error Scenarios to Handle
- Network errors during API call
- Password strength validation failure
- Email already exists (409/400 from backend)
- Database connection failure
- NextAuth session creation failure
- Registration success but auto-login failure

### Project Structure Notes

- **Frontend Page**: `src/app/(auth)/register/page.tsx` - Inherits auth layout
- **Frontend Component**: `src/components/auth/register-form.tsx` - Registration form
- **Backend Endpoint**: `app/api/v1/endpoints/auth.py` - Add `POST /register` route
- **Backend Schema**: `app/schemas/user.py` - Add `UserCreate` class
- **Backend Model**: `app/models/user.py` - Reference existing User model
- **Security Utils**: `app/core/security.py` - Use `get_password_hash`, `validate_password_strength`

### References

- [Architecture: docs/architecture.md#Authentication & Security](file:///Users/ZenoWang/Documents/project/E_Business/docs/architecture.md)
- [Epic: docs/epics.md#Story 1.7](file:///Users/ZenoWang/Documents/project/E_Business/docs/epics.md)
- [Story 1.2: User Authentication & Security](file:///Users/ZenoWang/Documents/project/E_Business/docs/sprint-artifacts/1-2-user-authentication-security.md) - NextAuth config, JWT mechanism
- [Story 1.3: Workspace Management](file:///Users/ZenoWang/Documents/project/E_Business/docs/sprint-artifacts/1-3-workspace-management-multi-tenancy.md) - Onboarding flow

## Dev Agent Record

### Agent Model Used
Claude 3.5 Sonnet

### Implementation Plan
1. **Backend API**: 创建 `UserCreate` schema，实现 `/api/v1/auth/register` 端点（密码验证、用户创建、邮箱唯一性检查）
2. **Testing**: 编写6个单元测试覆盖成功注册、密码强度验证、邮箱重复等场景
3. **Frontend UI**: 创建 `register-form.tsx` 复用登录表单样式，实现客户端密码验证
4. **Auto-login**: 注册成功后调用 `signIn('credentials')` 自动登录并重定向到 `/onboarding`
5. **Navigation Links**: 在登录/注册页面添加互相链接

### Debug Log
- 无调试问题

### File List
**Backend:**
- `backend/app/schemas/user.py` - [NEW] UserCreate schema
- `backend/app/api/v1/endpoints/auth.py` - [MODIFIED] 添加 POST /register 端点和 RegisterResponse schema
- `backend/app/tests/unit/test_auth.py` - [MODIFIED] 添加 TestRegisterEndpoint 测试类（6个测试）

**Frontend:**
- `frontend/src/components/auth/register-form.tsx` - [NEW] 注册表单组件
- `frontend/src/app/(auth)/register/page.tsx` - [NEW] 注册页面
- `frontend/src/components/auth/login-form.tsx` - [MODIFIED] 添加 Link 导入和注册链接

### Change Log
- **2025-12-30**: Story 1.7 实现完成
  - 后端：创建 `UserCreate` schema，实现 `POST /api/v1/auth/register` 端点（密码强度验证、邮箱唯一性、用户创建）
  - 测试：6个单元测试全部通过（成功注册、密码验证、邮箱重复、请求验证）
  - 前端：创建注册表单和页面，实现客户端密码验证和自动登录功能
  - 集成：登录/注册页面添加互相链接，注册成功后自动登录并重定向到 `/onboarding`

### Completion Notes List
- **Created**: Story 1.7 to address missing public registration feature
- **Validated**: Six-dimension competitive quality check (2025-12-30)
- **Improved**: Applied all 10 recommendations from validation report:
  1. Fixed AC 5 password validation rule consistency
  2. Added auto-login implementation with code example
  3. Specified Token format (JWS HS256)
  4. Added UserCreate Schema definition
  5. Referenced NextAuth Credentials Provider reuse
  6. Added email uniqueness error handling
  7. Clarified form validation reuse patterns
  8. Highlighted password validation rules
  9. Added comprehensive error scenarios list
  10. Added Schema file location notes
- **Implemented**: (2025-12-30)
  - ✅ Backend: `POST /api/v1/auth/register` 端点完成
  - ✅ Frontend: 注册表单、注册页面、登录/注册链接完成
  - ✅ Auth Integration: 自动登录和 `/onboarding` 重定向完成
  - ✅ Testing: 6个单元测试全部通过
- **Code Review**: (2025-12-30) - PASSED
  - 所有 10 个 AC 验证通过
  - 所有 9 个 Task 确认完成
  - 修复 5 个 MEDIUM 问题:
    1. 移除 `security.py` 重复密码验证
    2. 添加确认密码字段到 `register-form.tsx`
    3. 添加注册端点速率限制 (`5/minute`)
    4. 添加 name 输入验证 (2-50 字符)
    5. 添加环境变量 fallback
  - 测试套件: 14 passed
