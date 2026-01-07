/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Wizard Layout
 * Provides SessionProvider context for all wizard pages.
 *
 * [INPUT]:
 * - Children (wizard pages)
 *
 * [LINK]:
 * - SessionProvider -> next-auth/react
 * - Similar to -> @/app/onboarding/layout.tsx
 *
 * [OUTPUT]:
 * - Wrapped children with SessionProvider
 *
 * [POS]: /frontend/src/app/wizard/layout.tsx
 *
 * [PROTOCOL]:
 * 1. Client component for SessionProvider
 * 2. Must wrap all wizard pages to enable useSession()
 *
 * === END HEADER ===
 */

'use client';

import { SessionProvider } from 'next-auth/react';
import { ReactNode } from 'react';

export default function WizardLayout({ children }: { children: ReactNode }) {
    return (
        <SessionProvider>
            {children}
        </SessionProvider>
    );
}
