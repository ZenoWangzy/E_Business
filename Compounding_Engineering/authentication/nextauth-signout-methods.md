# NextAuth.js SignOut Methods

**Date**: 2026-01-08
**Context**: Dashboard Logout Feature

## The Problem
Clicking the "Logout" button in the dashboard had no effect or resulted in a page reload without clearing the session.

## The Root Cause
The initial implementation used a standard HTML Form POST to `/api/auth/signout`:
```tsx
<form action="/api/auth/signout" method="POST">
    <button type="submit">Logout</button>
</form>
```
NextAuth requires CSRF tokens for POST requests. While NextAuth pages handle this automatically, a raw form in a custom component might miss the CSRF token or be blocked by browser policies if not handled correctly by the framework's hydration.

## The Fix
Use the client-side `signOut` helper provided by `next-auth/react`. This handles CSRF, state cleanup, and client-side redirection gracefully.

```tsx
import { signOut } from 'next-auth/react';

// ... inside component
<button onClick={() => signOut({ callbackUrl: '/login' })}>
    Logout
</button>
```

## The Lesson
1.  **Framework Idioms**: When using auth libraries (NextAuth, Clerk, etc.), prefer their provided hooks/functions over raw HTTP forms.
2.  **CSRF is Invisible**: CSRF failures often fail silently or look like generic network errors.
3.  **Client vs Server**: Understand which flow you are in. Client-side navigation needs client-side auth state cleanup.
