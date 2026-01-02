/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Billing API Client
 * API integration for subscription and credit management.
 *
 * Story关联: Story 5.2: User Usage Dashboard
 *
 * [INPUT]:
 * - workspaceId: string (Workspace UUID)
 * - Environment: API_BASE_URL from process.env
 *
 * [LINK]:
 * - 依赖类型 -> @/types/billing (SubscriptionDetails, CreditBalanceResponse)
 * - 后端API -> /api/v1/billing/workspaces/{workspaceId}/*
 *
 * [OUTPUT]: Subscription details and credit balance information
 * [POS]: /frontend/src/lib/api/billing.ts
 *
 * [PROTOCOL]:
 * 1. Converts snake_case from backend to camelCase for frontend
 * 2. Provides detailed Chinese error messages for common HTTP status codes
 * 3. Uses credentials: 'include' for cookie-based authentication
 * 4. Handles 401/403/404/500 errors with user-friendly messages
 *
 * === END HEADER ===
 */

import type { SubscriptionDetails, CreditBalanceResponse } from '@/types/billing';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Build API URL with path.
 */
function buildUrl(path: string): string {
    return `${API_BASE}/api/v1${path}`;
}

/**
 * Handle API response with detailed error messages.
 */
async function handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        switch (response.status) {
            case 401:
                throw new Error('请登录以查看账单信息');
            case 403:
                throw new Error('您没有权限查看此工作空间的账单信息');
            case 404:
                throw new Error('账单信息未找到，请联系客服');
            case 500:
                throw new Error('服务器错误，请稍后再试');
            default:
                throw new Error(errorData.detail || `HTTP ${response.status}`);
        }
    }

    return response.json();
}

/**
 * Get subscription details for a workspace.
 * 
 * @param workspaceId - Workspace UUID
 * @returns Subscription details with tier and credit usage
 */
export async function getSubscriptionDetails(workspaceId: string): Promise<SubscriptionDetails> {
    const response = await fetch(buildUrl(`/billing/workspaces/${workspaceId}/subscription`), {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const data = await handleResponse<{
        tier: string;
        credits: {
            total: number;
            used: number;
            remaining: number;
        };
        period_end: string;
        renewal_date?: string;
        features?: string[];
    }>(response);

    // Convert snake_case to camelCase
    return {
        tier: data.tier as SubscriptionDetails['tier'],
        credits: data.credits,
        periodEnd: data.period_end,
        renewalDate: data.renewal_date,
        features: data.features,
    };
}

/**
 * Get current credit balance for a workspace.
 * 
 * @param workspaceId - Workspace UUID
 * @returns Credit balance information
 */
export async function getCreditBalance(workspaceId: string): Promise<CreditBalanceResponse> {
    const response = await fetch(buildUrl(`/billing/workspaces/${workspaceId}/credits`), {
        credentials: 'include',
        headers: {
            'Content-Type': 'application/json',
        },
    });

    const data = await handleResponse<{
        remaining_credits: number;
        workspace_id: string;
    }>(response);

    // Convert snake_case to camelCase
    return {
        remainingCredits: data.remaining_credits,
        workspaceId: data.workspace_id,
    };
}
