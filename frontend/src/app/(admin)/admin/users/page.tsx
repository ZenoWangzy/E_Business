/**
 * Users Management Page
 * 
 * Story 5.4: User Management & Task Retry
 * 
 * System-level user management for superusers.
 */
'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AdminUser {
    id: string;
    email: string;
    name: string | null;
    isActive: boolean;
    isSuperuser: boolean;
    createdAt: string;
    updatedAt: string;
    workspaceCount: number;
}

interface UsersResponse {
    items: AdminUser[];
    total: number;
    page: number;
    pageSize: number;
    hasMore: boolean;
}

export default function UsersPage() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [search, setSearch] = useState('');
    const [filterSuperuser, setFilterSuperuser] = useState<boolean | null>(null);
    const [filterActive, setFilterActive] = useState<boolean | null>(null);

    const pageSize = 20;

    const fetchUsers = useCallback(async () => {
        try {
            setLoading(true);
            const params = new URLSearchParams({
                page: page.toString(),
                page_size: pageSize.toString(),
            });

            if (search) params.append('search', search);
            if (filterSuperuser !== null) params.append('is_superuser', filterSuperuser.toString());
            if (filterActive !== null) params.append('is_active', filterActive.toString());

            const response = await fetch(`/api/v1/admin/users?${params.toString()}`, {
                credentials: 'include',
            });

            if (response.status === 403) {
                setError('您没有管理员权限访问此页面');
                return;
            }

            if (!response.ok) {
                throw new Error('Failed to fetch users');
            }

            const data: UsersResponse = await response.json();
            setUsers(data.items);
            setTotal(data.total);
            setHasMore(data.hasMore);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : '加载用户列表失败');
        } finally {
            setLoading(false);
        }
    }, [page, search, filterSuperuser, filterActive]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchUsers();
    };

    if (error) {
        return (
            <main className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto">
                    <div className="p-6 rounded-xl border border-red-500/30 bg-red-500/10 text-center">
                        <h2 className="text-xl font-bold text-red-400 mb-2">访问被拒绝</h2>
                        <p className="text-neutral-400">{error}</p>
                        <Link
                            href="/admin"
                            className="inline-block mt-4 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-lg transition-colors"
                        >
                            返回管理面板
                        </Link>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="container mx-auto px-4 py-8">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="mb-8 flex justify-between items-center">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">用户管理</h2>
                        <p className="text-neutral-400">
                            管理平台所有用户 · 共 {total} 位用户
                        </p>
                    </div>
                    <Link
                        href="/admin"
                        className="px-4 py-2 text-neutral-400 hover:text-white transition-colors"
                    >
                        ← 返回概览
                    </Link>
                </div>

                {/* Filters */}
                <div className="mb-6 flex flex-wrap gap-4 items-center">
                    <form onSubmit={handleSearch} className="flex gap-2">
                        <input
                            type="text"
                            placeholder="搜索邮箱或姓名..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="px-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
                        />
                        <Button type="submit">搜索</Button>
                    </form>

                    <div className="flex gap-2">
                        <select
                            value={filterSuperuser === null ? '' : filterSuperuser.toString()}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFilterSuperuser(val === '' ? null : val === 'true');
                                setPage(1);
                            }}
                            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                        >
                            <option value="">所有用户</option>
                            <option value="true">仅超级用户</option>
                            <option value="false">普通用户</option>
                        </select>

                        <select
                            value={filterActive === null ? '' : filterActive.toString()}
                            onChange={(e) => {
                                const val = e.target.value;
                                setFilterActive(val === '' ? null : val === 'true');
                                setPage(1);
                            }}
                            className="px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white"
                        >
                            <option value="">所有状态</option>
                            <option value="true">已激活</option>
                            <option value="false">已停用</option>
                        </select>
                    </div>
                </div>

                {/* Users Table */}
                <div className="rounded-xl border border-neutral-800 overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-neutral-900/50">
                                <TableHead>邮箱</TableHead>
                                <TableHead>姓名</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead>角色</TableHead>
                                <TableHead>工作区</TableHead>
                                <TableHead>注册时间</TableHead>
                                <TableHead>操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell colSpan={7}>
                                            <div className="h-6 bg-neutral-800 rounded animate-pulse" />
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-neutral-500 py-12">
                                        没有找到用户
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium text-white">
                                            {user.email}
                                        </TableCell>
                                        <TableCell className="text-neutral-300">
                                            {user.name || '-'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={user.isActive ? 'default' : 'secondary'}>
                                                {user.isActive ? '已激活' : '已停用'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {user.isSuperuser ? (
                                                <Badge className="bg-violet-500/20 text-violet-400 border-violet-500/30">
                                                    超级用户
                                                </Badge>
                                            ) : (
                                                <span className="text-neutral-500">普通用户</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-neutral-400">
                                            {user.workspaceCount}
                                        </TableCell>
                                        <TableCell className="text-neutral-400 text-sm">
                                            {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                                        </TableCell>
                                        <TableCell>
                                            <Link
                                                href={`/admin/users/${user.id}`}
                                                className="text-violet-400 hover:text-violet-300 text-sm"
                                            >
                                                查看详情
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="mt-6 flex justify-between items-center">
                    <p className="text-neutral-500">
                        显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, total)} 共 {total}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            disabled={page === 1}
                            onClick={() => setPage(page - 1)}
                        >
                            上一页
                        </Button>
                        <Button
                            variant="outline"
                            disabled={!hasMore}
                            onClick={() => setPage(page + 1)}
                        >
                            下一页
                        </Button>
                    </div>
                </div>
            </div>
        </main>
    );
}
