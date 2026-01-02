/**
 * FileUploadSectionWrapper - Client Component Wrapper
 * Wraps FileUploadSection for use in Server Components (AC: 173-177)
 */
'use client';

import dynamic from 'next/dynamic';

// Dynamic import to ensure client-side only rendering
const FileUploadSection = dynamic(
    () => import('./FileUploadSection').then((mod) => ({ default: mod.FileUploadSection })),
    {
        ssr: false,
        loading: () => (
            <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50 animate-pulse">
                <div className="h-6 bg-neutral-700 rounded w-32 mb-4" />
                <div className="h-32 bg-neutral-800 rounded" />
            </div>
        ),
    }
);

export default function FileUploadSectionWrapper() {
    return <FileUploadSection />;
}
