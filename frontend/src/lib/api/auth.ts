/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Authentication Token Provider
 * Retrieves the current user's access token from NextAuth session.
 *
 * [INPUT]:
 * - NextAuth session (server-side or client-side)
 *
 * [LINK]:
 * - NextAuth -&gt; @/auth.ts
 * - API layer -&gt; All API client files that需要 needs authentication
 *
 * [OUTPUT]:
 * - accessToken: string | null
 *
 * [POS]: /frontend/src/lib/api/auth.ts
 *
 * [PROTOCOL]:
 * 1. Server components use auth() from @/auth
 * 2. Client components use useSession() from next-auth/react
 * 3. Returns null if no session exists
 *
 * === END HEADER ===
 */

import { auth } from '@/auth';

/**
 * Get access token for server-side API calls
 * Use this in Server Components and Server Actions
 */
export async function getServerToken(): Promise<string | null> {
    const session = await auth();
    return session?.user?.accessToken || null;
}

/**
 * Get access token for client-side API calls
 * Use this in Client Components with useSession hook
 */
export function getClientToken(session: any): string | null {
    return session?.user?.accessToken || null;
}
