# [FOLDER]: frontend/src/components/providers
Global React Contexts and Wrappers.

## [SCOPE]
- **State Management**: App-wide state (Theme, Auth, A11y).
- **Security**: Error Boundary encapsulation.

## [STRUCTURE]
- `AccessibilityProvider.tsx`: Manages high-contrast/font-size preferences.
- `ErrorBoundaryProvider.tsx`: Catches React render errors.

## [PROTOCOLS]
1. **Client Components**: These are inherently `"use client"`.
2. **Performance**: Avoid frequent re-renders affecting the whole tree.
3. **Layout Usage**: Should be wrapped in `app/layout.tsx`.
