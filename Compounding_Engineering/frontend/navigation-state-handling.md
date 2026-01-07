# Frontend Zombie Buttons & Navigation

**Date**: 2026-01-08
**Context**: Wizard Step-4 Navigation

## The Problem
User clicked "Next" on a wizard step, but nothing happened. No error, no loading state, just silence.

## The Root Cause
The `handleNext` function contained commented-out navigation logic because the target page (Step 5) was not yet implemented.
```tsx
const handleNext = () => {
   // TODO: Implement Step 5
   // router.push(...) 
   toast.success('Selected');
}
```
The UI showed a primary acting button that looked functional but was effectively a "zombie".

## The Fix
1.  **Implement the Destination**: Created a basic placeholder for Step 5 to allow flow completion.
2.  **Enable Navigation**: Uncommented and fixed the routing logic.
3.  **State Passing**: Passed necessary state (selected image index) via URL parameters for URL-driven state Truth.

## The Lesson
1.  **No Dead Ends**: Never leave a user flow dead-ended in production/staging code.
2.  **Disable vs Hide**: If a feature isn't ready, either **Disable** the button with a tooltip ("Coming Soon") or **Hide** it entirely. Do not leave it clickable but non-functional.
3.  **URL as State**: For wizard flows, passing simple state (like IDs or indexes) in URL params makes the application more robust to refreshes than relying solely on in-memory stores.
