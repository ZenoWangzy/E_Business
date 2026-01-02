/**
 * LogViewer Component
 * 
 * Story 5.3: Admin Dashboard - Stats & Logs
 * 
 * Displays paginated system logs with filtering and detail view.
 */
'use client';

import { useState, useEffect, useCallback } from 'react';

interface SystemLog {
    id: number;
    level: string;
    message: string;
    component: string;
    trace_id: string | null;
    stack_trace: string | null;
    created_at: string;
}

interface LogsResponse {
    items: SystemLog[];
    total: number;
    page: number;
    page_size: number;
    has_more: boolean;
}

const levelColors: Record<string, { bg: string; text: string; border: string }> = {
    error: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    warning: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
    info: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
};

export function LogViewer() {
    const [logs, setLogs] = useState<SystemLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [levelFilter, setLevelFilter] = useState<string>('');
    const [selectedLog, setSelectedLog] = useState<SystemLog | null>(null);

    const fetchLogs = useCallback(async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: '20',
            });
            if (levelFilter) {
                params.append('level', levelFilter);
            }

            const response = await fetch(`/api/v1/admin/logs?${params}`, {
                credentials: 'include',
            });

            if (!response.ok) {
                throw new Error('Failed to fetch logs');
            }

            const data: LogsResponse = await response.json();
            setLogs(data.items);
            setTotal(data.total);
            setHasMore(data.has_more);
        } catch (err) {
            console.error('Error fetching logs:', err);
        } finally {
            setLoading(false);
        }
    }, [page, levelFilter]);

    useEffect(() => {
        fetchLogs();
    }, [fetchLogs]);

    const handleFilterChange = (level: string) => {
        setLevelFilter(level);
        setPage(1);
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    return (
        <div className="space-y-4">
            {/* Filters */}
            <div className="flex items-center gap-4 mb-4">
                <span className="text-sm text-neutral-400">过滤:</span>
                <div className="flex gap-2">
                    {['', 'error', 'warning', 'info'].map((level) => (
                        <button
                            key={level || 'all'}
                            onClick={() => handleFilterChange(level)}
                            className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${levelFilter === level
                                    ? 'bg-violet-600 text-white'
                                    : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700'
                                }`}
                        >
                            {level ? level.toUpperCase() : '全部'}
                        </button>
                    ))}
                </div>
                <span className="ml-auto text-sm text-neutral-500">
                    共 {total} 条日志
                </span>
            </div>

            {/* Logs Table */}
            <div className="rounded-xl border border-neutral-800 overflow-hidden">
                <table className="w-full">
                    <thead className="bg-neutral-800/50">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                                时间
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                                级别
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                                组件
                            </th>
                            <th className="px-4 py-3 text-left text-xs font-medium text-neutral-400 uppercase tracking-wider">
                                消息
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={i} className="animate-pulse">
                                    <td className="px-4 py-3"><div className="h-4 w-32 bg-neutral-700 rounded"></div></td>
                                    <td className="px-4 py-3"><div className="h-4 w-16 bg-neutral-700 rounded"></div></td>
                                    <td className="px-4 py-3"><div className="h-4 w-20 bg-neutral-700 rounded"></div></td>
                                    <td className="px-4 py-3"><div className="h-4 w-64 bg-neutral-700 rounded"></div></td>
                                </tr>
                            ))
                        ) : logs.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-4 py-8 text-center text-neutral-500">
                                    暂无日志数据
                                </td>
                            </tr>
                        ) : (
                            logs.map((log) => {
                                const colors = levelColors[log.level] || levelColors.info;
                                return (
                                    <tr
                                        key={log.id}
                                        onClick={() => setSelectedLog(log)}
                                        className="hover:bg-neutral-800/50 cursor-pointer transition-colors"
                                    >
                                        <td className="px-4 py-3 text-sm text-neutral-400">
                                            {formatDate(log.created_at)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-1 text-xs rounded-full ${colors.bg} ${colors.text} ${colors.border} border`}>
                                                {log.level.toUpperCase()}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-sm text-neutral-300">
                                            {log.component}
                                        </td>
                                        <td className="px-4 py-3 text-sm text-neutral-300 max-w-md truncate">
                                            {log.message}
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            {total > 0 && (
                <div className="flex items-center justify-between mt-4">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="px-4 py-2 text-sm bg-neutral-800 text-neutral-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700 transition-colors"
                    >
                        上一页
                    </button>
                    <span className="text-sm text-neutral-400">
                        第 {page} 页
                    </span>
                    <button
                        onClick={() => setPage(p => p + 1)}
                        disabled={!hasMore}
                        className="px-4 py-2 text-sm bg-neutral-800 text-neutral-300 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-neutral-700 transition-colors"
                    >
                        下一页
                    </button>
                </div>
            )}

            {/* Detail Modal */}
            {selectedLog && (
                <div
                    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50"
                    onClick={() => setSelectedLog(null)}
                >
                    <div
                        className="bg-neutral-900 rounded-xl border border-neutral-700 max-w-3xl w-full mx-4 max-h-[80vh] overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-neutral-700 flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-white">日志详情</h3>
                            <button
                                onClick={() => setSelectedLog(null)}
                                className="text-neutral-400 hover:text-white transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-4 overflow-auto max-h-[60vh]">
                            <dl className="space-y-4">
                                <div>
                                    <dt className="text-xs text-neutral-500 uppercase">时间</dt>
                                    <dd className="text-sm text-neutral-300">{formatDate(selectedLog.created_at)}</dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-neutral-500 uppercase">级别</dt>
                                    <dd>
                                        <span className={`px-2 py-1 text-xs rounded-full ${levelColors[selectedLog.level]?.bg} ${levelColors[selectedLog.level]?.text}`}>
                                            {selectedLog.level.toUpperCase()}
                                        </span>
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-xs text-neutral-500 uppercase">组件</dt>
                                    <dd className="text-sm text-neutral-300">{selectedLog.component}</dd>
                                </div>
                                {selectedLog.trace_id && (
                                    <div>
                                        <dt className="text-xs text-neutral-500 uppercase">Trace ID</dt>
                                        <dd className="text-sm font-mono text-neutral-400">{selectedLog.trace_id}</dd>
                                    </div>
                                )}
                                <div>
                                    <dt className="text-xs text-neutral-500 uppercase">消息</dt>
                                    <dd className="text-sm text-neutral-300 whitespace-pre-wrap">{selectedLog.message}</dd>
                                </div>
                                {selectedLog.stack_trace && (
                                    <div>
                                        <dt className="text-xs text-neutral-500 uppercase">Stack Trace</dt>
                                        <dd className="mt-2 p-4 bg-neutral-950 rounded-lg overflow-x-auto">
                                            <pre className="text-xs text-red-400 font-mono whitespace-pre-wrap">
                                                {selectedLog.stack_trace}
                                            </pre>
                                        </dd>
                                    </div>
                                )}
                            </dl>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
