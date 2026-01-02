/**
 * TaskHistoryList Component
 * 
 * Story 5.4: User Management & Task Retry
 * 
 * Displays user's task history with retry functionality for failed tasks.
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

interface TaskItem {
    id: string;
    taskType: 'image' | 'video' | 'copy';
    status: 'pending' | 'processing' | 'completed' | 'failed';
    createdAt: string;
    updatedAt: string;
    errorMessage: string | null;
    workspaceId: string;
    workspaceName: string | null;
}

interface TaskHistoryResponse {
    items: TaskItem[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

interface TaskHistoryListProps {
    userId: string;
}

const taskTypeLabels: Record<string, string> = {
    image: '图片生成',
    video: '视频生成',
    copy: '文案生成',
};

const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
    processing: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    completed: 'bg-green-500/20 text-green-400 border-green-500/30',
    failed: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusLabels: Record<string, string> = {
    pending: '等待中',
    processing: '处理中',
    completed: '已完成',
    failed: '失败',
};

export function TaskHistoryList({ userId }: TaskHistoryListProps) {
    const [tasks, setTasks] = useState<TaskItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [retrying, setRetrying] = useState<string | null>(null);

    const pageSize = 20;

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pageSize.toString(),
            });

            const response = await fetch(
                `/api/v1/admin/users/${userId}/tasks?${params.toString()}`,
                { credentials: 'include' }
            );

            if (!response.ok) {
                throw new Error('Failed to fetch tasks');
            }

            const data: TaskHistoryResponse = await response.json();
            setTasks(data.items);
            setTotal(data.total);
            setHasMore(data.hasMore);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : '加载任务历史失败');
        } finally {
            setLoading(false);
        }
    }, [userId, page]);

    useEffect(() => {
        fetchTasks();
    }, [fetchTasks]);

    const retryTask = async (taskId: string, taskType: string) => {
        try {
            setRetrying(taskId);
            const response = await fetch(
                `/api/v1/admin/tasks/${taskId}/retry?task_type=${taskType}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ force: false }),
                }
            );

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.detail || 'Retry failed');
            }

            const result = await response.json();
            toast.success(result.message || '任务已重新排队');

            // Refresh task list
            await fetchTasks();
        } catch (err) {
            toast.error(err instanceof Error ? err.message : '重试失败');
        } finally {
            setRetrying(null);
        }
    };

    if (error) {
        return (
            <div className="p-4 rounded-lg border border-red-500/30 bg-red-500/10">
                <p className="text-red-400">{error}</p>
                <Button
                    variant="outline"
                    onClick={fetchTasks}
                    className="mt-2"
                >
                    重试
                </Button>
            </div>
        );
    }

    if (loading && tasks.length === 0) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-12 bg-neutral-800 rounded animate-pulse" />
                ))}
            </div>
        );
    }

    if (tasks.length === 0) {
        return (
            <div className="text-center py-12 text-neutral-500">
                该用户暂无任务记录
            </div>
        );
    }

    return (
        <div>
            <div className="rounded-xl border border-neutral-800 overflow-hidden">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-neutral-900/50">
                            <TableHead>任务类型</TableHead>
                            <TableHead>状态</TableHead>
                            <TableHead>工作区</TableHead>
                            <TableHead>创建时间</TableHead>
                            <TableHead>错误信息</TableHead>
                            <TableHead>操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tasks.map((task) => (
                            <TableRow key={task.id}>
                                <TableCell className="font-medium text-white">
                                    {taskTypeLabels[task.taskType] || task.taskType}
                                </TableCell>
                                <TableCell>
                                    <Badge className={statusColors[task.status]}>
                                        {statusLabels[task.status] || task.status}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-neutral-400">
                                    {task.workspaceName || '-'}
                                </TableCell>
                                <TableCell className="text-neutral-400 text-sm">
                                    {new Date(task.createdAt).toLocaleString('zh-CN')}
                                </TableCell>
                                <TableCell className="text-red-400 text-sm max-w-xs truncate">
                                    {task.errorMessage || '-'}
                                </TableCell>
                                <TableCell>
                                    {task.status === 'failed' && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => retryTask(task.id, task.taskType)}
                                            disabled={retrying === task.id}
                                        >
                                            {retrying === task.id ? '重试中...' : '重试'}
                                        </Button>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>

            {/* Pagination */}
            <div className="mt-4 flex justify-between items-center">
                <p className="text-neutral-500 text-sm">
                    共 {total} 条记录
                </p>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                    >
                        上一页
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={!hasMore}
                        onClick={() => setPage(page + 1)}
                    >
                        下一页
                    </Button>
                </div>
            </div>
        </div>
    );
}
