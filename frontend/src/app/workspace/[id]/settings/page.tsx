'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getWorkspace, updateWorkspace, deleteWorkspace, canDeleteWorkspace, listMembers } from '@/lib/api/workspaces';
import type { Workspace, UserRole } from '@/types';
import { useSession } from 'next-auth/react';

export default function WorkspaceSettingsPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const workspaceId = params.id as string;

    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [userRole, setUserRole] = useState<UserRole | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    // Form state
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [maxMembers, setMaxMembers] = useState(100);

    useEffect(() => {
        loadWorkspace();
    }, [workspaceId]);

    async function loadWorkspace() {
        try {
            const [data, membersData] = await Promise.all([
                getWorkspace(workspaceId),
                listMembers(workspaceId).catch(() => ({ members: [], total: 0 })),
            ]);
            setWorkspace(data);
            setName(data.name);
            setDescription(data.description || '');
            setMaxMembers(data.maxMembers);

            // Find current user's role
            if (session?.user?.email) {
                const currentMember = membersData.members.find(
                    m => m.user?.email === session.user?.email
                );
                if (currentMember) {
                    setUserRole(currentMember.role);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '加载失败');
        } finally {
            setLoading(false);
        }
    }

    async function handleSave(e: React.FormEvent) {
        e.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const updated = await updateWorkspace(workspaceId, { name, description, maxMembers });
            setWorkspace(updated);
            setSuccess('设置已保存');
            setTimeout(() => setSuccess(''), 3000);
        } catch (err) {
            setError(err instanceof Error ? err.message : '保存失败');
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete() {
        const confirmText = prompt('请输入工作区名称以确认删除:');
        if (confirmText !== workspace?.name) {
            alert('名称不匹配，已取消删除');
            return;
        }

        setDeleting(true);
        try {
            await deleteWorkspace(workspaceId);
            router.push('/dashboard');
        } catch (err) {
            setError(err instanceof Error ? err.message : '删除失败');
            setDeleting(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-900 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-900 text-white">
            <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-xl sticky top-0 z-50">
                <div className="container mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <button onClick={() => router.back()} className="text-slate-400 hover:text-white">
                            ← 返回
                        </button>
                        <h1 className="text-xl font-semibold">工作区设置</h1>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8 max-w-2xl">
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                        {error}
                    </div>
                )}
                {success && (
                    <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400">
                        {success}
                    </div>
                )}

                {/* General Settings */}
                <section className="mb-10">
                    <h2 className="text-lg font-semibold mb-4">基本设置</h2>
                    <form onSubmit={handleSave} className="bg-slate-800/50 rounded-xl border border-slate-700 p-6">
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-300 mb-2">工作区名称</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                minLength={3}
                                maxLength={50}
                                required
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-300 mb-2">描述</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                maxLength={500}
                                rows={3}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                            />
                        </div>

                        <div className="mb-6">
                            <label className="block text-sm font-medium text-slate-300 mb-2">成员上限</label>
                            <input
                                type="number"
                                value={maxMembers}
                                onChange={(e) => setMaxMembers(parseInt(e.target.value) || 100)}
                                min={1}
                                max={1000}
                                className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 rounded-lg font-medium transition"
                        >
                            {saving ? '保存中...' : '保存设置'}
                        </button>
                    </form>
                </section>

                {/* Danger Zone - Only visible to Owner */}
                {userRole && canDeleteWorkspace(userRole) && (
                    <section>
                        <h2 className="text-lg font-semibold mb-4 text-red-400">危险区域</h2>
                        <div className="bg-red-500/5 rounded-xl border border-red-500/20 p-6">
                            <h3 className="font-medium text-red-400 mb-2">删除工作区</h3>
                            <p className="text-sm text-slate-400 mb-4">
                                删除工作区将永久移除所有关联数据，包括成员、邀请和设置。此操作不可撤销。
                            </p>
                            <button
                                onClick={handleDelete}
                                disabled={deleting}
                                className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:bg-slate-600 rounded-lg text-sm font-medium transition"
                            >
                                {deleting ? '删除中...' : '删除工作区'}
                            </button>
                        </div>
                    </section>
                )}
            </main>
        </div>
    );
}
