'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useSession } from 'next-auth/react';
import { listWorkspaces } from '@/lib/api/workspaces';
import type { Workspace } from '@/types';

interface WorkspaceContextType {
    workspaces: Workspace[];
    currentWorkspace: Workspace | null;
    setCurrentWorkspace: (workspace: Workspace | null) => void;
    loading: boolean;
    refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Only load workspaces once session is available
        if (status === 'authenticated' && session?.user?.accessToken) {
            loadWorkspaces();
        } else if (status === 'unauthenticated') {
            setLoading(false);
        }
    }, [status, session]);

    async function loadWorkspaces() {
        if (!session?.user?.accessToken) {
            console.error('[WorkspaceContext] No access token available');
            setLoading(false);
            return;
        }

        try {
            console.log('[WorkspaceContext] Loading workspaces with token');
            const { workspaces: data } = await listWorkspaces(session.user.accessToken);
            setWorkspaces(data);
            console.log('[WorkspaceContext] Loaded', data.length, 'workspaces');

            // Auto-select first workspace if none selected
            if (data.length > 0 && !currentWorkspace) {
                // Check URL for workspace param
                const params = new URLSearchParams(window.location.search);
                const wsId = params.get('workspace');
                const found = wsId ? data.find(w => w.id === wsId) : null;
                setCurrentWorkspace(found || data[0]);
            }
        } catch (err) {
            console.error('[WorkspaceContext] Failed to load workspaces:', err);
        } finally {
            setLoading(false);
        }
    }

    return (
        <WorkspaceContext.Provider
            value={{
                workspaces,
                currentWorkspace,
                setCurrentWorkspace,
                loading,
                refresh: loadWorkspaces,
            }}
        >
            {children}
        </WorkspaceContext.Provider>
    );
}

export function useWorkspace() {
    const context = useContext(WorkspaceContext);
    if (!context) {
        throw new Error('useWorkspace must be used within WorkspaceProvider');
    }
    return context;
}
