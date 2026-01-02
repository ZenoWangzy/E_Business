/**
[IDENTITY]: Admin Area Layout
Protected Superuser Context Shell.

[INPUT]:
- Auth Session(Cookie / JWT).

[LINK]:
- NextAuth -> @/auth
    - ErrorBoundary -> @/components/providers / ErrorBoundaryProvider

    [OUTPUT]: Authenticated Admin UI Structure.
[POS]: /frontend/src / app / (admin) / layout.tsx

[PROTOCOL]:
1. ** Access Control **: STRICTLY enforce `session.user` check explicitly.
2. ** Visual Cue **: Use Distinct Admin Theme(Red / Dark) to prevent confusion.
3. ** Navigation **: Provide clear exit to Main Dashboard.
 */
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ErrorBoundaryProvider from '@/components/providers/ErrorBoundaryProvider';

export default async function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const session = await auth();

    // Redirect to login if not authenticated
    if (!session?.user) {
        redirect("/login");
    }

    // Check superuser access (this will be verified on API calls too)
    // For now, we allow access and let the API enforce the check
    // In production, add is_superuser to session token

    return (
        <ErrorBoundaryProvider>
            <div className="min-h-screen bg-neutral-900">
                {/* Admin Header */}
                <header className="border-b border-red-900/50 bg-neutral-900/80 backdrop-blur-xl sticky top-0 z-50">
                    <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <h1 className="text-xl font-bold text-white">
                                E-Business <span className="text-red-500">Admin</span>
                            </h1>
                            <nav className="flex items-center gap-4">
                                <a href="/admin" className="text-sm text-neutral-300 hover:text-white transition-colors">
                                    概览
                                </a>
                                <a href="/admin#logs" className="text-sm text-neutral-300 hover:text-white transition-colors">
                                    系统日志
                                </a>
                                <a href="/dashboard" className="text-sm text-neutral-400 hover:text-white transition-colors">
                                    ← 返回用户仪表板
                                </a>
                            </nav>
                        </div>
                        <div className="flex items-center gap-4">
                            <span className="text-sm text-neutral-400">
                                {session.user.email}
                            </span>
                            <span className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded-full border border-red-500/30">
                                管理员
                            </span>
                        </div>
                    </div>
                </header>
                {children}
            </div>
        </ErrorBoundaryProvider>
    );
}
