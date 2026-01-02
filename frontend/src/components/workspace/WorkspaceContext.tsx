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
    error: string | null;
    refresh: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: ReactNode }) {
    const { data: session, status } = useSession();
    const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
    const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Only load workspaces once session is available
        if (status === 'authenticated' && session?.user?.accessToken) {
            loadWorkspaces();
        } else if (status === 'unauthenticated') {
            setLoading(false);
        } else if (status === 'authenticated' && !session?.user?.accessToken) {
            // Session exists but no accessToken - auth configuration issue
            console.error('[WorkspaceContext] Session exists but no accessToken');
            setError('认证令牌缺失，请重新登录');
            setLoading(false);
        }
        // Note: when status is 'loading', we keep loading=true and wait
    }, [status, session]);

    async function loadWorkspaces() {
        if (!session?.user?.accessToken) {
            console.error('[WorkspaceContext] No access token available');
            setError('无法获取认证令牌，请重新登录');
            setLoading(false);
            return;
        }

        try {
            console.log('[WorkspaceContext] Loading workspaces with token');
            setError(null);
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
            if (err instanceof Error) {
                if (err.message.includes('超时')) {
                    setError('服务器响应超时，请检查网络连接或稍后重试');
                } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
                    setError('认证失败，请重新登录');
                } else if (err.message.includes('500')) {
                    setError('服务器内部错误，请稍后重试');
                } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
                    setError('网络连接失败，请检查后端服务是否运行');
                } else {
                    setError('加载工作区失败：' + err.message);
                }
            } else {
                setError('加载工作区失败，请稍后重试');
            }
            setWorkspaces([]);
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
                error,
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
