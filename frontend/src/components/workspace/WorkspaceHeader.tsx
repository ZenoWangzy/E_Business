'use client';

import Link from 'next/link';
import { useWorkspace } from './WorkspaceContext';

export function WorkspaceHeader() {
    const { currentWorkspace, workspaces, setCurrentWorkspace, loading } = useWorkspace();

    if (loading) {
        return (
            <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-slate-700 rounded animate-pulse" />
                <div className="w-24 h-4 bg-slate-700 rounded animate-pulse" />
            </div>
        );
    }

    if (!currentWorkspace) {
        return (
            <Link
                href="/onboarding"
                className="text-sm text-blue-400 hover:text-blue-300"
            >
                创建工作区 →
            </Link>
        );
    }

    return (
        <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 hover:bg-slate-700/50 rounded-lg border border-slate-700 transition">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-500 rounded text-xs font-bold flex items-center justify-center">
                    {currentWorkspace.name[0].toUpperCase()}
                </div>
                <span className="text-sm font-medium max-w-[120px] truncate">
                    {currentWorkspace.name}
                </span>
                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown */}
            <div className="absolute top-full left-0 mt-2 w-56 bg-slate-800 border border-slate-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-2 border-b border-slate-700">
                    <p className="text-xs text-slate-500 px-2 py-1">切换工作区</p>
                    {workspaces.map((ws) => (
                        <button
                            key={ws.id}
                            onClick={() => setCurrentWorkspace(ws)}
                            className={`w-full flex items-center gap-2 px-2 py-2 rounded-md text-sm text-left transition ${ws.id === currentWorkspace.id
                                    ? 'bg-blue-500/20 text-blue-400'
                                    : 'hover:bg-slate-700 text-slate-300'
                                }`}
                        >
                            <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-500 rounded text-xs font-bold flex items-center justify-center">
                                {ws.name[0].toUpperCase()}
                            </div>
                            <span className="truncate">{ws.name}</span>
                        </button>
                    ))}
                </div>
                <div className="p-2">
                    <Link
                        href={`/workspace/${currentWorkspace.id}/members`}
                        className="block px-2 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-700 transition"
                    >
                        团队成员
                    </Link>
                    <Link
                        href={`/workspace/${currentWorkspace.id}/settings`}
                        className="block px-2 py-2 rounded-md text-sm text-slate-300 hover:bg-slate-700 transition"
                    >
                        工作区设置
                    </Link>
                    <Link
                        href="/onboarding"
                        className="block px-2 py-2 rounded-md text-sm text-blue-400 hover:bg-slate-700 transition"
                    >
                        + 创建新工作区
                    </Link>
                </div>
            </div>
        </div>
    );
}
