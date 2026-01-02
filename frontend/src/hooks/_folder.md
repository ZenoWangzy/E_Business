# Folder Map: React Hooks

**[SCOPE]**:
This folder (`frontend/src/hooks`) contains custom React hooks for encapsulating state logic, API calls, and side effects.

**[MEMBERS]**:
- `useSubscriptionDetails.ts`: **Billing**. Fetches current user subscription and quota info.
- `useRealTimeLogs.ts`: **Monitoring**. Handles SSE connections for live logs.
- `useSSE.ts`: **Network**. Core Server-Sent Events utility.
- `useClipboard.ts`: **UI Interaction**. Copy-to-clipboard functionality.

**[CONSTRAINTS]**:
- **Prefix**: All files must start with `use`.
- **Dependencies**: Hooks should handle their own cleanup (e.g., clearing intervals/listeners).
