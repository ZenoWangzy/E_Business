'use client';

/**
 * UsageProgressBar Component
 * 
 * Story 5.2: User Usage Dashboard
 * Visual progress bar with color-coded usage thresholds.
 */

import { useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import type { CreditUsage, UsagePercentage } from '@/types/billing';
import { calculateUsagePercentage } from '@/types/billing';

interface UsageProgressBarProps {
    /** Credit usage information */
    credits: CreditUsage;
    /** Additional class names */
    className?: string;
}

/**
 * Get Tailwind color classes for usage percentage.
 */
function getColorClasses(color: UsagePercentage['color']): { bg: string; indicator: string } {
    switch (color) {
        case 'red':
            return { bg: 'bg-red-100', indicator: 'bg-red-500' };
        case 'yellow':
            return { bg: 'bg-yellow-100', indicator: 'bg-yellow-500' };
        case 'green':
        default:
            return { bg: 'bg-green-100', indicator: 'bg-green-500' };
    }
}

export function UsageProgressBar({ credits, className }: UsageProgressBarProps) {
    const [isHovered, setIsHovered] = useState(false);

    const { percentage, color } = useMemo(
        () => calculateUsagePercentage(credits),
        [credits],
    );

    const colorClasses = getColorClasses(color);

    return (
        <div className={cn('space-y-2', className)}>
            <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">信用额度使用</span>
                <span className="font-medium">
                    {credits.used} / {credits.total} 积分
                </span>
            </div>

            <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={percentage}
                aria-label={`已使用 ${percentage}% 信用额度`}
                className={cn(
                    'relative h-3 w-full overflow-hidden rounded-full',
                    colorClasses.bg,
                )}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
                tabIndex={0}
                onFocus={() => setIsHovered(true)}
                onBlur={() => setIsHovered(false)}
            >
                <div
                    className={cn(
                        'h-full transition-all duration-300 ease-out rounded-full',
                        colorClasses.indicator,
                    )}
                    style={{ width: `${percentage}%` }}
                    data-testid="usage-progress-indicator"
                />

                {/* Hover tooltip */}
                {isHovered && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-semibold text-white drop-shadow-sm">
                            {credits.used} 积分已使用
                        </span>
                    </div>
                )}
            </div>

            <div className="flex justify-between text-xs text-muted-foreground">
                <span>剩余: {credits.remaining} 积分</span>
                <span>{percentage}%</span>
            </div>
        </div>
    );
}
