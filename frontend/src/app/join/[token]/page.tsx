'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { previewInvite, acceptInvite } from '@/lib/api/workspaces';
import type { WorkspaceInvitePreview } from '@/types';

export default function JoinWorkspacePage() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    const [preview, setPreview] = useState<WorkspaceInvitePreview | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [accepting, setAccepting] = useState(false);

    useEffect(() => {
        loadPreview();
    }, [token]);

    async function loadPreview() {
        try {
            const data = await previewInvite(token);
            setPreview(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : '邀请无效或已过期');
        } finally {
            setLoading(false);
        }
    }

    async function handleAccept() {
        setAccepting(true);
        try {
            const workspace = await acceptInvite(token);
            router.push(`/dashboard?workspace=${workspace.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : '加入失败');
            setAccepting(false);
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="animate-spin h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">邀请无效</h1>
                    <p className="text-slate-400 mb-6">{error}</p>
                    <button
                        onClick={() => router.push('/')}
                        className="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg text-white transition"
                    >
                        返回首页
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700 text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 text-2xl font-bold">
                        {preview?.workspaceName?.[0]?.toUpperCase() || 'W'}
                    </div>

                    <h1 className="text-2xl font-bold text-white mb-2">
                        加入 {preview?.workspaceName}
                    </h1>

                    {preview?.workspaceDescription && (
                        <p className="text-slate-400 mb-4">{preview.workspaceDescription}</p>
                    )}

                    <p className="text-slate-500 text-sm mb-6">
                        {preview?.inviterName || '团队成员'} 邀请您加入工作区
                    </p>

                    <button
                        onClick={handleAccept}
                        disabled={accepting}
                        className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 text-white font-medium rounded-lg transition"
                    >
                        {accepting ? '加入中...' : '接受邀请'}
                    </button>

                    <button
                        onClick={() => router.push('/')}
                        className="w-full py-3 mt-3 text-slate-400 hover:text-white transition"
                    >
                        暂不加入
                    </button>
                </div>
            </div>
        </div>
    );
}
