/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Billing Types
 * Type definitions for subscription, credit management, and usage tracking.
 *
 * Story关联: Story 5.2: User Usage Dashboard
 *
 * [INPUT]:
 * - API Responses: Subscription details, credit balance
 * - User Actions: Usage tracking, tier management
 *
 * [LINK]:
 * - 依赖API -> @/lib/api/billing, @/lib/api/billing-mock
 * - 使用组件 -> @/components/dashboard/BillingPanel
 * - 后端模型 -> backend/app/models/user.py (SubscriptionTier)
 *
 * [OUTPUT]: Complete billing type system with helper functions
 * [POS]: /frontend/src/types/billing.ts
 *
 * [PROTOCOL]:
 * 1. Subscription tiers: FREE, PRO, ENTERPRISE
 * 2. Credit tracking: total, used, remaining calculation
 * 3. Helper functions: getTierBadgeConfig(), calculateUsagePercentage()
 * 4. Color coding: Green (<70%), Yellow (70-90%), Red (>90%)
 * 5. Converts backend snake_case to frontend camelCase
 *
 * === END HEADER ===
 */

/**
 * Subscription tier enum matching backend SubscriptionTier.
 */
export type SubscriptionTier = 'FREE' | 'PRO' | 'ENTERPRISE';

/**
 * Credit usage information.
 */
export interface CreditUsage {
    /** Total monthly credit limit */
    total: number;
    /** Credits used this period */
    used: number;
    /** Credits remaining */
    remaining: number;
}

/**
 * Complete subscription details from API.
 */
export interface SubscriptionDetails {
    /** Subscription tier: FREE, PRO, or ENTERPRISE */
    tier: SubscriptionTier;
    /** Credit usage information */
    credits: CreditUsage;
    /** Current billing period end date (ISO string) */
    periodEnd: string;
    /** Next renewal date (ISO string, optional) */
    renewalDate?: string;
    /** Available features for this tier */
    features?: string[];
}

/**
 * Credit balance response from API.
 */
export interface CreditBalanceResponse {
    /** Remaining credits */
    remainingCredits: number;
    /** Workspace ID */
    workspaceId: string;
}

/**
 * Usage percentage with color indicator.
 */
export interface UsagePercentage {
    /** Usage percentage (0-100) */
    percentage: number;
    /** Color based on usage threshold */
    color: 'green' | 'yellow' | 'red';
}

/**
 * Tier configuration for display.
 */
export interface TierBadge {
    /** Tier name */
    tier: SubscriptionTier;
    /** Display label */
    label: string;
    /** Badge color class */
    colorClass: string;
}

/**
 * Billing error response types.
 */
export interface BillingError {
    /** Error message */
    message: string;
    /** Error code for handling */
    code: 'unauthorized' | 'forbidden' | 'not_found' | 'server_error';
}

/**
 * Get color class for tier badge.
 */
export function getTierBadgeConfig(tier: SubscriptionTier): TierBadge {
    const configs: Record<SubscriptionTier, TierBadge> = {
        FREE: { tier: 'FREE', label: 'Free Plan', colorClass: 'bg-gray-100 text-gray-800' },
        PRO: { tier: 'PRO', label: 'Pro Plan', colorClass: 'bg-blue-100 text-blue-800' },
        ENTERPRISE: { tier: 'ENTERPRISE', label: 'Enterprise', colorClass: 'bg-purple-100 text-purple-800' },
    };
    return configs[tier];
}

/**
 * Calculate usage percentage and color.
 */
export function calculateUsagePercentage(credits: CreditUsage): UsagePercentage {
    const percentage = credits.total > 0 ? Math.round((credits.used / credits.total) * 100) : 0;

    let color: UsagePercentage['color'];
    if (percentage >= 90) {
        color = 'red';
    } else if (percentage >= 70) {
        color = 'yellow';
    } else {
        color = 'green';
    }

    return { percentage, color };
}
