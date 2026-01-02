/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Mock Billing API Client
 * Provides mock data for development and testing of billing features.
 *
 * Story关联: Story 5.2: User Usage Dashboard
 *
 * [INPUT]:
 * - workspaceId: string (Workspace UUID)
 * - tier: keyof SubscriptionTier (for mock selection)
 * - Environment: NODE_ENV and NEXT_PUBLIC_USE_MOCK_BILLING flags
 *
 * [LINK]:
 * - 依赖类型 -> @/types/billing (SubscriptionDetails)
 * - 真实API -> ./billing.ts (getSubscriptionDetails)
 * - 环境配置 -> process.env (development/mock flags)
 *
 * [OUTPUT]: Mock subscription data with simulated network delay
 * [POS]: /frontend/src/lib/api/billing-mock.ts
 *
 * [PROTOCOL]:
 * 1. Development-only: Only active when NODE_ENV=development and USE_MOCK_BILLING=true
 * 2. Simulated delay: 500ms-1.5s network delay for realism
 * 3. Error simulation: 10% error rate in test mode for edge case testing
 * 4. Fallback pattern: getSubscriptionDetailsWithFallback tries real API first
 * 5. Tier presets: FREE, PRO, ENTERPRISE mock data available
 *
 * === END HEADER ===
 */

import type { SubscriptionDetails } from '@/types/billing';

/**
 * Mock subscription data for different tiers.
 */
const mockSubscriptionData: Record<string, SubscriptionDetails> = {
    free: {
        tier: 'FREE',
        credits: { total: 50, used: 35, remaining: 15 },
        periodEnd: '2024-02-01T00:00:00Z',
        renewalDate: '2024-02-01T00:00:00Z',
        features: ['基础 AI 生成', '标准支持'],
    },
    pro: {
        tier: 'PRO',
        credits: { total: 1000, used: 450, remaining: 550 },
        periodEnd: '2024-02-01T00:00:00Z',
        renewalDate: '2024-02-01T00:00:00Z',
        features: ['高级 AI 生成', '优先支持', '自定义模型'],
    },
    enterprise: {
        tier: 'ENTERPRISE',
        credits: { total: 5000, used: 1200, remaining: 3800 },
        periodEnd: '2024-02-01T00:00:00Z',
        renewalDate: '2024-02-01T00:00:00Z',
        features: ['无限生成', '专属支持', '自定义集成', 'SLA 保障'],
    },
};

/**
 * Simulate network delay.
 */
async function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Get mock subscription details with simulated network delay.
 * 
 * @param workspaceId - Workspace UUID
 * @param tier - Tier to simulate (default: 'pro')
 * @returns Mock subscription details
 */
export async function getMockSubscriptionDetails(
    workspaceId: string,
    tier: keyof typeof mockSubscriptionData = 'pro',
): Promise<SubscriptionDetails> {
    // Simulate network delay (500ms - 1.5s)
    const delayMs = Math.random() * 1000 + 500;
    await delay(delayMs);

    // 10% chance of network error for testing
    if (Math.random() < 0.1 && process.env.NODE_ENV === 'test') {
        throw new Error('网络错误：无法连接到账单服务');
    }

    return {
        ...mockSubscriptionData[tier],
    };
}

/**
 * Environment-based API switch.
 */
export const isDevelopment = process.env.NODE_ENV === 'development';
export const useMockBilling = isDevelopment && process.env.NEXT_PUBLIC_USE_MOCK_BILLING === 'true';

/**
 * Get subscription details with mock fallback.
 */
export async function getSubscriptionDetailsWithFallback(
    workspaceId: string,
): Promise<SubscriptionDetails> {
    // Import real API dynamically to avoid bundling issues
    const { getSubscriptionDetails } = await import('./billing');

    if (useMockBilling) {
        console.info('[Billing] Using mock API');
        return getMockSubscriptionDetails(workspaceId, 'pro');
    }

    try {
        return await getSubscriptionDetails(workspaceId);
    } catch (error) {
        console.warn('[Billing] Real API failed, using mock:', error);
        return getMockSubscriptionDetails(workspaceId, 'pro');
    }
}
