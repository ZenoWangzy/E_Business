# [FOLDER]: frontend/src/components/auth
Authentication and Authorization View Components.

## [SCOPE]
- **Forms**: Login, Register, Forgot Password forms.
- **Guards**: Route protection components (if any).

## [STRUCTURE]
- `login-form.tsx`: Credentials and OAuth login interface.

## [DEPENDENCIES]
- Actions: `src/auth.ts` (NextAuth).
- UI: `../ui/*` (Button, Input, Card).

## [PROTOCOLS]
1. **Security**: Never expose secrets in client components.
2. **Validation**: Use Zod schema for form validation.
3. **Feedback**: Show clear error messages for failed auth attempts.
