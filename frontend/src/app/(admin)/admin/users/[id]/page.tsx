/**
 * User Detail Page
 * 
 * Story 5.4: User Management & Task Retry
 * 
 * User profile, workspace memberships, and task history with retry.
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { TaskHistoryList } from '@/components/admin/TaskHistoryList';
import { toast } from 'sonner';

interface WorkspaceBrief {
    id: string;
    name: string;
    slug: string;
    role: string;
    joinedAt: string;
}

interface UserDetail {
    id: string;
    email: string;
    name: string | null;
    isActive: boolean;
    isSuperuser: boolean;
    createdAt: string;
    updatedAt: string;
    workspaces: WorkspaceBrief[];
}

export default function UserDetailPage() {
    const params = useParams();
    const router = useRouter();
    const userId = params.id as string;

    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [updating, setUpdating] = useState(false);

    const fetchUser = useCallback(async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/v1/admin/users/${userId}`, {
                credentials: 'include',
            });

            if (response.status === 403) {
                setError('您没有管理员权限访问此页面');
                return;
            }

            if (response.status === 404) {
                setError('用户不存在');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch user');
            }

            const data: UserDetail = await response.json();
            setUser(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : '加载用户详情失败');
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        fetchUser();
    }, [fetchUser]);

    const updateUser = async (updates: { isActive?: boolean; isSuperuser?: boolean }) => {
        if (!user) return;

        try {
            setUpdating(true);
            const response = await fetch(`/api/v1/admin/users/${userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(updates),
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Update failed');
            }

            const updatedUser: UserDetail = await response.json();
            setUser(updatedUser);
            toast.success('用户信息已更新');
        } catch (err) {
            toast.error(err instanceof Error ? err.message : '更新失败');
        } finally {
            setUpdating(false);
        }
    };

    const toggleActive = () => {
        if (!user) return;
        updateUser({ isActive: !user.isActive });
    };

    const toggleSuperuser = () => {
        if (!user) return;
        updateUser({ isSuperuser: !user.isSuperuser });
    };

    if (loading) {
        return (
            <main className="container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto">
                    <div className="animate-pulse space-y-4">
                        <div className="h-8 w-48 bg-neutral-800 rounded" />
                        <div className="h-6 w-64 bg-neutral-800 rounded" />
                    </div>
                </div>
            </main>
        );
    }

    if (error) {
        return (
            <main className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto">
                    <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/10 text-center">
                        <h2 className="text-xl font-bold text-red-400 mb-2">错误</h2>
                        <p className="text-neutral-400">{error}</p>
                        <Link
                            href="/admin/users"
                            className="inline-block mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                        >
                            返回用户列表
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    if (!user) return null;

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="max-w-6xl mx-auto">
                {/* Breadcrumb */}
                <div className="mb-6">
                    <Link
                        href="/admin/users"
                        className="text-neutral-400 hover:text-white transition-colors"
                    >
                        ← 返回用户列表
                    </Link>
                </div>

                {/* User Profile Card */}
                <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-6 mb-8">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-2">{user.email}</h1>
                            <p className="text-neutral-400">{user.name || '未设置姓名'}</p>
                            <div className="flex gap-2 mt-4">
                                <Badge variant={user.isActive ? 'default' : 'secondary'}>
                                    {user.isActive ? '已激活' : '已停用'}
                                </Badge>
                                {user.isSuperuser && (
                                    <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                                        超级用户
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        variant={user.isActive ? 'destructive' : 'default'}
                                        disabled={updating}
                                    >
                                        {user.isActive ? '停用用户' : '激活用户'}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            确认{user.isActive ? '停用' : '激活'}用户？
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {user.isActive
                                                ? '停用后，该用户将无法登录系统或访问任何工作区。'
                                                : '激活后，该用户将恢复系统访问权限。'}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>取消</AlertDialogCancel>
                                        <AlertDialogAction onClick={toggleActive}>
                                            确认
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>

                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" disabled={updating}>
                                        {user.isSuperuser ? '移除超级用户' : '提升为超级用户'}
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>
                                            确认{user.isSuperuser ? '移除' : '授予'}超级用户权限？
                                        </AlertDialogTitle>
                                        <AlertDialogDescription>
                                            {user.isSuperuser
                                                ? '移除后，该用户将无法访问管理面板。'
                                                : '授予后，该用户将拥有系统管理权限，包括管理所有用户。'}
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>取消</AlertDialogCancel>
                                        <AlertDialogAction onClick={toggleSuperuser}>
                                            确认
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>

                    {/* User Info */}
                    <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-neutral-800">
                        <div>
                            <p className="text-neutral-500 text-sm">用户 ID</p>
                            <p className="text-neutral-300 font-mono text-sm">{user.id}</p>
                        </div>
                        <div>
                            <p className="text-neutral-500 text-sm">注册时间</p>
                            <p className="text-neutral-300">
                                {new Date(user.createdAt).toLocaleString('zh-CN')}
                            </p>
                        </div>
                        <div>
                            <p className="text-neutral-500 text-sm">最后更新</p>
                            <p className="text-neutral-300">
                                {new Date(user.updatedAt).toLocaleString('zh-CN')}
                            </p>
                        </div>
                        <div>
                            <p className="text-neutral-500 text-sm">工作区数量</p>
                            <p className="text-neutral-300">{user.workspaces.length}</p>
                        </div>
                    </div>
                </div>

                {/* Workspaces */}
                <section className="mb-8">
                    <h2 className="text-xl font-bold text-white mb-4">所属工作区</h2>
                    {user.workspaces.length === 0 ? (
                        <p className="text-neutral-500">该用户未加入任何工作区</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {user.workspaces.map((ws) => (
                                <div
                                    key={ws.id}
                                    className="p-4 rounded-lg border border-neutral-800 bg-neutral-900/50"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-white font-medium">{ws.name}</h3>
                                            <p className="text-neutral-500 text-sm">/{ws.slug}</p>
                                        </div>
                                        <Badge variant="outline">{ws.role}</Badge>
                                    </div>
                                    <p className="text-neutral-500 text-sm mt-2">
                                        加入于 {new Date(ws.joinedAt).toLocaleDateString('zh-CN')}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                {/* Task History */}
                <section>
                    <h2 className="text-xl font-bold text-white mb-4">任务历史</h2>
                    <TaskHistoryList userId={userId} />
                </section>
            </div>
        </main>
    );
}
