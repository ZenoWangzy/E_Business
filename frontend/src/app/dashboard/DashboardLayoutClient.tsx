'use client';

import { ReactNode, useEffect, useState } from 'react';
import { SessionProvider } from 'next-auth/react';
import { WorkspaceProvider, WorkspaceHeader, useWorkspace } from '@/components/workspace';
import { useRouter } from 'next/navigation';
import { Toaster } from 'sonner';

interface DashboardLayoutClientProps {
    children: ReactNode;
    userEmail: string;
    userName?: string;
}

/**
 * 工作区守卫组件
 * 检测用户是否有工作区，如果没有则重定向到 onboarding 创建
 * 支持错误状态降级显示
 */
function WorkspaceGuard({ children }: { children: ReactNode }) {
    const { workspaces, loading, error, refresh } = useWorkspace();
    const router = useRouter();
    const [checked, setChecked] = useState(false);

    // 调试日志
    console.log('[WorkspaceGuard] State:', { loading, workspacesCount: workspaces.length, checked, error });

    useEffect(() => {
        console.log('[WorkspaceGuard] Effect running:', { loading, workspacesCount: workspaces.length, error });
        if (!loading) {
            if (error) {
                // 有错误时直接设置 checked，显示错误状态
                console.log('[WorkspaceGuard] Error detected:', error);
                setChecked(true);
            } else if (workspaces.length === 0) {
                // 无工作区，重定向到 onboarding
                console.log('[WorkspaceGuard] No workspaces found, redirecting to onboarding');
                router.replace('/onboarding');
            } else {
                console.log('[WorkspaceGuard] Workspaces found, setting checked=true');
                setChecked(true);
            }
        }
    }, [loading, workspaces, error, router]);

    // 加载中或检查中，显示 loading 状态
    if (loading || (!checked && !error)) {
        return (
            <div className="min-h-screen bg-neutral-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-violet-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-neutral-400">加载工作区...</span>
                </div>
            </div>
        );
    }

    // 错误状态显示友好的降级界面
    if (error && !loading) {
        return (
            <div className="min-h-screen bg-neutral-900 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-neutral-800/50 rounded-2xl p-8 border border-neutral-700">
                    <div className="text-center mb-6">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/10 flex items-center justify-center">
                            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">加载失败</h2>
                        <p className="text-neutral-400">{error}</p>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={() => {
                                console.log('[WorkspaceGuard] Retry clicked');
                                refresh();
                            }}
                            className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors"
                        >
                            重试
                        </button>

                        <button
                            onClick={() => router.push('/api/auth/signout')}
                            className="w-full py-3 px-4 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-medium transition-colors"
                        >
                            重新登录
                        </button>

                        {(error.includes('超时') || error.includes('网络')) && (
                            <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg text-yellow-400 text-sm">
                                <p className="font-medium mb-1">提示：</p>
                                <ul className="list-disc list-inside space-y-1 text-xs">
                                    <li>请检查后端服务是否运行（端口 8000）</li>
                                    <li>检查网络连接</li>
                                    <li>查看浏览器控制台错误信息</li>
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}

export default function DashboardLayoutClient({
    children,
    userEmail,
    userName
}: DashboardLayoutClientProps) {
    return (
        <SessionProvider>
            <WorkspaceProvider>
                <WorkspaceGuard>
                    <div className="min-h-screen bg-neutral-900">
                        <header className="border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-xl sticky top-0 z-50">
                            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <h1 className="text-xl font-bold text-white">E-Business</h1>
                                    <div className="h-6 w-px bg-neutral-700" />
                                    <WorkspaceHeader />
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-sm text-neutral-400">
                                        {userEmail}
                                    </span>
                                    <form action="/api/auth/signout" method="POST">
                                        <button
                                            type="submit"
                                            className="text-sm text-neutral-400 hover:text-white transition-colors"
                                        >
                                            退出登录
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </header>
                        {children}
                    </div>
                    <Toaster position="top-center" richColors />
                </WorkspaceGuard>
            </WorkspaceProvider>
        </SessionProvider>
    );
}

