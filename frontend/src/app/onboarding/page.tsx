'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { createWorkspace } from '@/lib/api/workspaces';

export default function OnboardingPage() {
    const router = useRouter();
    const { data: session, status } = useSession();
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        if (!session?.user?.accessToken) {
            setError('认证令牌缺失，请重新登录');
            setIsLoading(false);
            return;
        }

        try {
            const workspace = await createWorkspace({ name, description }, session.user.accessToken);
            router.push(`/dashboard?workspace=${workspace.id}`);
        } catch (err) {
            setError(err instanceof Error ? err.message : '创建失败');
        } finally {
            setIsLoading(false);
        }
    };

    // 等待 session 加载
    if (status === 'loading') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <svg className="animate-spin h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    <span className="text-slate-400">加载中...</span>
                </div>
            </div>
        );
    }

    // 未登录则重定向
    if (status === 'unauthenticated') {
        router.push('/login');
        return null;
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-6">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-white mb-2">创建您的工作区</h1>
                    <p className="text-slate-400">设置您的团队协作空间</p>
                </div>

                <form onSubmit={handleSubmit} className="bg-slate-800/50 backdrop-blur-sm rounded-2xl p-8 border border-slate-700">
                    {error && (
                        <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    <div className="mb-6">
                        <label htmlFor="name" className="block text-sm font-medium text-slate-300 mb-2">
                            工作区名称 <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="例如: 我的团队"
                            minLength={3}
                            maxLength={50}
                            required
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                        />
                        <p className="mt-1 text-xs text-slate-500">3-50 个字符</p>
                    </div>

                    <div className="mb-8">
                        <label htmlFor="description" className="block text-sm font-medium text-slate-300 mb-2">
                            描述 <span className="text-slate-500">(可选)</span>
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="简要描述您的工作区用途..."
                            maxLength={500}
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading || name.length < 3}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 disabled:from-slate-600 disabled:to-slate-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition duration-200 flex items-center justify-center gap-2"
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                                创建中...
                            </>
                        ) : (
                            '创建工作区'
                        )}
                    </button>
                </form>

                <p className="mt-6 text-center text-sm text-slate-500">
                    您将作为工作区所有者,拥有完全管理权限
                </p>
            </div>
        </div>
    );
}
