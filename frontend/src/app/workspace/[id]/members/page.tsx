'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import {
    listMembers,
    listInvites,
    createInvite,
    cancelInvite,
    updateMemberRole,
    removeMember,
    getRoleLabel,
    canManageMembers,
} from '@/lib/api/workspaces';
import type { WorkspaceMember, WorkspaceInvite, UserRole } from '@/types';

export default function MembersPage() {
    const params = useParams();
    const router = useRouter();
    const { data: session } = useSession();
    const workspaceId = params.id as string;

    const [members, setMembers] = useState<WorkspaceMember[]>([]);
    const [invites, setInvites] = useState<WorkspaceInvite[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<UserRole>('member' as UserRole);
    const [inviting, setInviting] = useState(false);
    const [currentUserRole, setCurrentUserRole] = useState<string>('');

    useEffect(() => {
        loadData();
    }, [workspaceId, session]);

    async function loadData() {
        try {
            setLoading(true);
            const [membersData, invitesData] = await Promise.all([
                listMembers(workspaceId),
                listInvites(workspaceId).catch(() => ({ invites: [], total: 0 })),
            ]);
            setMembers(membersData.members);
            setInvites(invitesData.invites);

            // Set current user role based on session
            if (session?.user?.email) {
                const currentMember = membersData.members.find(
                    m => m.user?.email === session.user?.email
                );
                if (currentMember) {
                    setCurrentUserRole(currentMember.role);
                }
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : '加载失败');
        } finally {
            setLoading(false);
        }
    }

    async function handleInvite(e: React.FormEvent) {
        e.preventDefault();
        setInviting(true);
        try {
            await createInvite(workspaceId, { invitedEmail: inviteEmail, role: inviteRole });
            setShowInviteModal(false);
            setInviteEmail('');
            loadData();
        } catch (err) {
            alert(err instanceof Error ? err.message : '邀请失败');
        } finally {
            setInviting(false);
        }
    }

    async function handleCancelInvite(inviteId: string) {
        if (!confirm('确定取消此邀请？')) return;
        try {
            await cancelInvite(workspaceId, inviteId);
            loadData();
        } catch (err) {
            alert(err instanceof Error ? err.message : '取消失败');
        }
    }

    async function handleRemoveMember(userId: string, name?: string) {
        if (!confirm(`确定移除成员 ${name || userId}？`)) return;
        try {
            await removeMember(workspaceId, userId);
            loadData();
        } catch (err) {
            alert(err instanceof Error ? err.message : '移除失败');
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
                        <h1 className="text-xl font-semibold">团队成员</h1>
                    </div>
                    <button
                        onClick={() => setShowInviteModal(true)}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition"
                    >
                        邀请成员
                    </button>
                </div>
            </header>

            <main className="container mx-auto px-6 py-8">
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
                        {error}
                    </div>
                )}

                {/* Members List */}
                <section className="mb-10">
                    <h2 className="text-lg font-semibold mb-4">成员 ({members.length})</h2>
                    <div className="bg-slate-800/50 rounded-xl border border-slate-700 divide-y divide-slate-700">
                        {members.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-sm font-bold">
                                        {(member.user?.name || member.user?.email || 'U')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-medium">{member.user?.name || member.user?.email}</p>
                                        <p className="text-sm text-slate-400">{member.user?.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className={`px-2 py-1 text-xs rounded-full ${member.role === 'owner' ? 'bg-yellow-500/20 text-yellow-400' :
                                        member.role === 'admin' ? 'bg-blue-500/20 text-blue-400' :
                                            'bg-slate-600/50 text-slate-300'
                                        }`}>
                                        {getRoleLabel(member.role)}
                                    </span>
                                    {member.role !== 'owner' && (
                                        <button
                                            onClick={() => handleRemoveMember(member.userId, member.user?.name)}
                                            className="text-red-400 hover:text-red-300 text-sm"
                                        >
                                            移除
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Pending Invites */}
                {invites.length > 0 && (
                    <section>
                        <h2 className="text-lg font-semibold mb-4">待接受邀请 ({invites.length})</h2>
                        <div className="bg-slate-800/50 rounded-xl border border-slate-700 divide-y divide-slate-700">
                            {invites.map((invite) => (
                                <div key={invite.id} className="flex items-center justify-between p-4">
                                    <div>
                                        <p className="font-medium">{invite.invitedEmail}</p>
                                        <p className="text-sm text-slate-400">
                                            邀请为 {getRoleLabel(invite.role)} · 过期时间: {new Date(invite.expiresAt).toLocaleString()}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleCancelInvite(invite.id)}
                                        className="text-slate-400 hover:text-red-400 text-sm"
                                    >
                                        取消
                                    </button>
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </main>

            {/* Invite Modal */}
            {showInviteModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md border border-slate-700">
                        <h3 className="text-xl font-semibold mb-4">邀请新成员</h3>
                        <form onSubmit={handleInvite}>
                            <div className="mb-4">
                                <label className="block text-sm font-medium text-slate-300 mb-2">邮箱地址</label>
                                <input
                                    type="email"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    required
                                    placeholder="example@company.com"
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-medium text-slate-300 mb-2">角色</label>
                                <select
                                    value={inviteRole}
                                    onChange={(e) => setInviteRole(e.target.value as UserRole)}
                                    className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="admin">管理员</option>
                                    <option value="member">成员</option>
                                    <option value="viewer">访客</option>
                                </select>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setShowInviteModal(false)}
                                    className="flex-1 py-3 border border-slate-600 rounded-lg hover:bg-slate-700 transition"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    disabled={inviting}
                                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-600 rounded-lg font-medium transition"
                                >
                                    {inviting ? '发送中...' : '发送邀请'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
