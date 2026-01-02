'use client';

import { ReactNode } from 'react';
import { SessionProvider } from 'next-auth/react';
import { WorkspaceProvider, WorkspaceHeader } from '@/components/workspace';

interface DashboardLayoutClientProps {
    children: ReactNode;
    userEmail: string;
    userName?: string;
}

export default function DashboardLayoutClient({
    children,
    userEmail,
    userName
}: DashboardLayoutClientProps) {
    return (
        <SessionProvider>
            <WorkspaceProvider>
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
            </WorkspaceProvider>
        </SessionProvider>
    );
}
