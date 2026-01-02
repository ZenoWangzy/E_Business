'use client';

/**
 * SubscriptionCard Component
 * 
 * Story 5.2: User Usage Dashboard
 * Displays subscription tier with badge and renewal date.
 */

import { useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SubscriptionDetails, SubscriptionTier } from '@/types/billing';
import { getTierBadgeConfig } from '@/types/billing';
import { UsageProgressBar } from './UsageProgressBar';

interface SubscriptionCardProps {
    /** Subscription details from API */
    subscription: SubscriptionDetails;
    /** Additional class names */
    className?: string;
}

/**
 * Format date as relative time (e.g., "12 天后续费").
 */
function formatRelativeTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return '已过期';
    } else if (diffDays === 0) {
        return '今天续费';
    } else if (diffDays === 1) {
        return '明天续费';
    } else if (diffDays <= 30) {
        return `${diffDays} 天后续费`;
    } else {
        const months = Math.floor(diffDays / 30);
        return `${months} 个月后续费`;
    }
}

/**
 * Format date as full date string.
 */
function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}

export function SubscriptionCard({ subscription, className }: SubscriptionCardProps) {
    const tierConfig = useMemo(
        () => getTierBadgeConfig(subscription.tier),
        [subscription.tier],
    );

    const relativeRenewal = useMemo(
        () => formatRelativeTime(subscription.periodEnd),
        [subscription.periodEnd],
    );

    const absoluteDate = useMemo(
        () => formatDate(subscription.periodEnd),
        [subscription.periodEnd],
    );

    return (
        <Card className={cn('', className)}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <CreditCard className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">订阅计划</CardTitle>
                    </div>
                    <Badge
                        variant="secondary"
                        className={cn('font-medium', tierConfig.colorClass)}
                        data-testid="subscription-tier"
                    >
                        {tierConfig.label}
                    </Badge>
                </div>
                <CardDescription className="flex items-center gap-2 mt-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                        {relativeRenewal}
                        <span className="text-muted-foreground/60 ml-1">({absoluteDate})</span>
                    </span>
                </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6">
                <UsageProgressBar
                    credits={subscription.credits}
                    data-testid="credit-usage"
                />

                {subscription.features && subscription.features.length > 0 && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-medium text-muted-foreground">包含功能</h4>
                        <ul className="grid grid-cols-2 gap-2 text-sm">
                            {subscription.features.map((feature, index) => (
                                <li key={index} className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
