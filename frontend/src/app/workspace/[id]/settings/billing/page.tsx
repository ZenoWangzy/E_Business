'use client';

/**
 * Billing Settings Page
 * 
 * Story 5.2: User Usage Dashboard
 * Displays subscription tier, credit usage, and upgrade options.
 */

import { useParams } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { SubscriptionCard } from '@/components/billing/SubscriptionCard';
import { UpgradeButton } from '@/components/billing/UpgradeButton';
import { useSubscriptionDetails } from '@/hooks/useSubscriptionDetails';

export default function BillingPage() {
    const params = useParams();
    const workspaceId = params.id as string;

    const { data, loading, error, retryCount, refetch, canRetry } = useSubscriptionDetails(workspaceId);

    // Loading state
    if (loading && !data) {
        return (
            <div className="space-y-6" role="status" aria-label="加载账单信息中">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-8 w-40" aria-hidden="true" />
                    <Skeleton className="h-10 w-32" aria-hidden="true" />
                </div>
                <Skeleton className="h-64 w-full" aria-hidden="true" />
                <div className="text-center text-sm text-muted-foreground">
                    正在加载您的订阅详情...
                </div>
            </div>
        );
    }

    // Error state
    if (error && !data) {
        return (
            <Alert variant="destructive" role="alert" aria-live="polite">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>账单错误</AlertTitle>
                <AlertDescription className="space-y-3">
                    <p>{error}</p>
                    {canRetry && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => refetch()}
                            className="mt-2"
                        >
                            <RefreshCw className="mr-2 h-4 w-4" />
                            重试 ({3 - retryCount} 次机会)
                        </Button>
                    )}
                </AlertDescription>
            </Alert>
        );
    }

    if (!data) {
        return null;
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight">账单与订阅</h2>
                    <p className="text-muted-foreground">
                        管理您的订阅计划和信用额度
                    </p>
                </div>
                <UpgradeButton currentTier={data.tier} />
            </div>

            {/* Show error banner if refresh failed but we have cached data */}
            {error && data && (
                <Alert variant="default" className="border-yellow-200 bg-yellow-50">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-800">
                        刷新失败，显示的是缓存数据。
                        <Button
                            variant="link"
                            size="sm"
                            onClick={() => refetch()}
                            className="p-0 ml-2 h-auto text-yellow-800 underline"
                        >
                            重试
                        </Button>
                    </AlertDescription>
                </Alert>
            )}

            {/* Subscription Card */}
            <SubscriptionCard subscription={data} />

            {/* Footer info */}
            <div className="text-xs text-muted-foreground text-center">
                数据每 60 秒自动刷新 • 最后更新: {new Date().toLocaleTimeString('zh-CN')}
            </div>
        </div>
    );
}
