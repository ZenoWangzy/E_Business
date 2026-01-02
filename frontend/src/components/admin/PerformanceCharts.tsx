/**
 * Performance Charts Component
 * 
 * Story 5.3: Admin Dashboard - Stats & Logs (AC4)
 * 
 * Displays:
 * - Line chart of "Generations over last 7 days"
 * - Bar chart of "Usage by Tier"
 */
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';

// Mock data for generations over past 7 days
// In production, this would come from /api/v1/admin/analytics/generations
const generateMockDailyData = () => {
    const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    return days.map((day, i) => ({
        day,
        image: Math.floor(Math.random() * 500) + 100,
        copy: Math.floor(Math.random() * 300) + 50,
        video: Math.floor(Math.random() * 100) + 20,
    }));
};

// Mock data for usage by tier
const generateMockTierData = () => [
    { tier: 'Free', workspaces: Math.floor(Math.random() * 500) + 200, color: '#6b7280' },
    { tier: 'Pro', workspaces: Math.floor(Math.random() * 200) + 50, color: '#8b5cf6' },
    { tier: 'Enterprise', workspaces: Math.floor(Math.random() * 50) + 10, color: '#10b981' },
];

interface DailyGeneration {
    day: string;
    image: number;
    copy: number;
    video: number;
}

interface TierUsage {
    tier: string;
    workspaces: number;
    color: string;
}

export function PerformanceCharts() {
    const [dailyData, setDailyData] = useState<DailyGeneration[]>([]);
    const [tierData, setTierData] = useState<TierUsage[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = useCallback(async () => {
        try {
            // In production, fetch from API:
            // const response = await fetch('/api/v1/admin/analytics', { credentials: 'include' });
            // const data = await response.json();

            // For now, use mock data
            setDailyData(generateMockDailyData());
            setTierData(generateMockTierData());
        } catch (err) {
            console.error('Failed to fetch analytics:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAnalytics();
        // Refresh every 5 minutes
        const interval = setInterval(fetchAnalytics, 300000);
        return () => clearInterval(interval);
    }, [fetchAnalytics]);

    if (loading) {
        return (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {[1, 2].map((i) => (
                    <div key={i} className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50 animate-pulse">
                        <div className="h-4 w-32 bg-neutral-700 rounded mb-4"></div>
                        <div className="h-64 bg-neutral-800 rounded"></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Generations Over Last 7 Days - Line Chart */}
            <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50">
                <h4 className="text-lg font-semibold text-white mb-4">过去 7 天生成量</h4>
                <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={dailyData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="day" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#fff',
                            }}
                        />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="image"
                            name="图片"
                            stroke="#8b5cf6"
                            strokeWidth={2}
                            dot={{ fill: '#8b5cf6', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="copy"
                            name="文案"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={{ fill: '#10b981', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                        <Line
                            type="monotone"
                            dataKey="video"
                            name="视频"
                            stroke="#f59e0b"
                            strokeWidth={2}
                            dot={{ fill: '#f59e0b', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Usage by Tier - Bar Chart */}
            <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50">
                <h4 className="text-lg font-semibold text-white mb-4">按套餐使用量</h4>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={tierData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis dataKey="tier" stroke="#9ca3af" fontSize={12} />
                        <YAxis stroke="#9ca3af" fontSize={12} />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#1f2937',
                                border: '1px solid #374151',
                                borderRadius: '8px',
                                color: '#fff',
                            }}
                        />
                        <Bar
                            dataKey="workspaces"
                            name="工作区数量"
                            fill="#8b5cf6"
                            radius={[4, 4, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
