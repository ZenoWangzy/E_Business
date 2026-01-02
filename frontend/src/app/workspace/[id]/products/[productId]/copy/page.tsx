'use client';

/**
 * Copywriting Studio Page
 * 
 * Entry point for the AI Copywriting Studio module.
 * Route: /workspace/[workspaceId]/products/[productId]/copy
 */

import { useParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';
import { CopyStudioLayout } from '@/components/business/copy/CopyStudioLayout';

interface CopyPageParams {
    workspaceId: string;
    productId: string;
}

export default function CopyPage() {
    const params = useParams() as unknown as CopyPageParams;
    const { data: session, status } = useSession();

    // Route protection: redirect if not authenticated
    if (status === 'loading') {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!session) {
        redirect('/auth/login');
    }

    const { workspaceId, productId } = params;

    // Validate params
    if (!workspaceId || !productId) {
        redirect('/dashboard');
    }

    return (
        <CopyStudioLayout
            workspaceId={workspaceId}
            productId={productId}
        />
    );
}
