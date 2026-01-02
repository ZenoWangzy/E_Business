/**
 * Admin Dashboard Page
 * 
 * Story 5.3: Admin Dashboard - Stats & Logs
 * 
 * Main admin dashboard with system statistics and log viewer.
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { LogViewer } from '@/components/admin/LogViewer';
import { PerformanceCharts } from '@/components/admin/PerformanceCharts';

interface AdminStats {
    active_workspaces: number;
    generations_today: number;
    error_rate_24h: number;
    estimated_mrr: number;
    last_updated: string;
}

function StatCard({
    title,
    value,
    suffix = '',
    trend,
    color = 'violet'
}: {
    title: string;
    value: string | number;
    suffix?: string;
    trend?: 'up' | 'down' | 'neutral';
    color?: 'violet' | 'green' | 'red' | 'yellow';
}) {
    const colorClasses = {
        violet: 'border-violet-500/30 bg-violet-500/10',
        green: 'border-green-500/30 bg-green-500/10',
        red: 'border-red-500/30 bg-red-500/10',
        yellow: 'border-yellow-500/30 bg-yellow-500/10',
    };

    const valueColors = {
        violet: 'text-violet-400',
        green: 'text-green-400',
        red: 'text-red-400',
        yellow: 'text-yellow-400',
    };

    return (
        <div className={`p-6 rounded-xl border ${colorClasses[color]} transition-all hover:scale-[1.02]`}>
            <h3 className="text-sm font-medium text-neutral-400 mb-2">{title}</h3>
            <div className="flex items-baseline gap-2">
                <span className={`text-3xl font-bold ${valueColors[color]}`}>
                    {value}
                </span>
                {suffix && (
                    <span className="text-sm text-neutral-500">{suffix}</span>
                )}
            </div>
        </div>
    );
}

export default function AdminPage() {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchStats = useCallback(async () => {
        try {
            const response = await fetch('/api/v1/admin/stats', {
                credentials: 'include',
            });

            if (response.status === 403) {
                setError('您没有管理员权限访问此页面');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch stats');
            }

            const data = await response.json();
            setStats(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : '加载统计数据失败');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchStats();
        // Refresh every 60 seconds
        const interval = setInterval(fetchStats, 60000);
        return () => clearInterval(interval);
    }, [fetchStats]);

    if (error) {
        return (
            <main className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto">
                    <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/10 text-center">
                        <h2 className="text-xl font-bold text-red-400 mb-2">访问被拒绝</h2>
                        <p className="text-neutral-400">{error}</p>
                        <a
                            href="/dashboard"
                            className="inline-block mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                        >
                            返回用户仪表板
                        </a>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2">系统概览</h2>
                    <p className="text-neutral-400">
                        监控系统健康状态、使用统计和错误日志
                    </p>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {loading ? (
                        <>
                            {[1, 2, 3, 4].map((i) => (
                                <div key={i} className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50 animate-pulse">
                                    <div className="h-4 w-24 bg-neutral-700 rounded mb-4"></div>
                                    <div className="h-8 w-16 bg-neutral-700 rounded"></div>
                                </div>
                            ))}
                        </>
                    ) : stats ? (
                        <>
                            <StatCard
                                title="活跃工作区"
                                value={stats.active_workspaces}
                                color="violet"
                            />
                            <StatCard
                                title="今日生成量"
                                value={stats.generations_today}
                                color="green"
                            />
                            <StatCard
                                title="24小时错误率"
                                value={stats.error_rate_24h.toFixed(2)}
                                suffix="%"
                                color={stats.error_rate_24h > 5 ? 'red' : 'yellow'}
                            />
                            <StatCard
                                title="预估月收入"
                                value={`$${stats.estimated_mrr.toLocaleString()}`}
                                color="green"
                            />
                        </>
                    ) : null}
                </div>

                {/* Last Updated */}
                {stats && (
                    <p className="text-xs text-neutral-500 mb-8">
                        最后更新: {new Date(stats.last_updated).toLocaleString('zh-CN')}
                    </p>
                )}

                {/* Analytics Section - AC4 */}
                <section id="analytics" className="mt-12">
                    <h3 className="text-2xl font-bold text-white mb-6">数据分析</h3>
                    <PerformanceCharts />
                </section>

                {/* Logs Section */}
                <section id="logs" className="mt-12">
                    <h3 className="text-2xl font-bold text-white mb-6">系统日志</h3>
                    <LogViewer />
                </section>
            </div>
        </main>
    );
}
