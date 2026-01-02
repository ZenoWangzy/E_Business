'use client';

/**
 * [IDENTITY]: Subscription Details Hook
 * Manages the state and recurring fetching of user subscription data.
 * Includes auto-refresh (60s) and exponential backoff retry for network errors.
 *
 * [INPUT]: Workspace UUID (string)
 * [LINK]:
 *   - TypeDefs -> @/types/billing.ts
 *   - ApiClient -> @/lib/api/billing-mock.ts
 *
 * [OUTPUT]: UseSubscriptionDetailsResult (Data, Loading, Error, Refetch)
 * [POS]: /frontend/src/hooks/useSubscriptionDetails.ts
 *
 * [PROTOCOL]:
 * 1. The polling interval (60s) should match the backend cache-control if applicable.
 * 2. Error states must differentiate between "Offline" (Retry) and "Forbidden" (Fatal).
 */
import { useState, useEffect, useCallback } from 'react';
import type { SubscriptionDetails } from '@/types/billing';
import { getSubscriptionDetailsWithFallback } from '@/lib/api/billing-mock';

interface UseSubscriptionDetailsResult {
    /** Subscription data */
    data: SubscriptionDetails | null;
    /** Loading state */
    loading: boolean;
    /** Error message */
    error: string | null;
    /** Number of retry attempts made */
    retryCount: number;
    /** Manually refetch data */
    refetch: () => Promise<void>;
    /** Whether retry is available */
    canRetry: boolean;
}

const MAX_RETRIES = 3;
const AUTO_REFRESH_INTERVAL = 60000; // 60 seconds

/**
 * Hook for fetching and managing subscription details.
 * 
 * @param workspaceId - Workspace UUID
 * @returns Subscription details with loading/error states
 */
export function useSubscriptionDetails(workspaceId: string): UseSubscriptionDetailsResult {
    const [data, setData] = useState<SubscriptionDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retryCount, setRetryCount] = useState(0);

    const fetchWithRetry = useCallback(async (attempt = 0) => {
        try {
            setLoading(true);
            setError(null);

            const subscription = await getSubscriptionDetailsWithFallback(workspaceId);
            setData(subscription);
            setRetryCount(0); // Reset retry count on success
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '无法加载订阅详情';

            // Retry for network errors (support both Chinese and English error messages)
            const isNetworkError = errorMessage.includes('网络') ||
                errorMessage.toLowerCase().includes('network') ||
                errorMessage.toLowerCase().includes('fetch');
            if (attempt < MAX_RETRIES && isNetworkError) {
                const backoffMs = 1000 * Math.pow(2, attempt);
                setTimeout(() => fetchWithRetry(attempt + 1), backoffMs);
                return;
            }

            setError(errorMessage);
            setRetryCount(attempt);
        } finally {
            setLoading(false);
        }
    }, [workspaceId]);

    // Initial fetch
    useEffect(() => {
        fetchWithRetry();
    }, [fetchWithRetry]);

    // Auto-refresh every 60 seconds
    useEffect(() => {
        if (!data) return;

        const interval = setInterval(() => {
            fetchWithRetry();
        }, AUTO_REFRESH_INTERVAL);

        return () => clearInterval(interval);
    }, [fetchWithRetry, data]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Any cleanup needed
        };
    }, []);

    return {
        data,
        loading,
        error,
        retryCount,
        refetch: () => fetchWithRetry(),
        canRetry: retryCount < MAX_RETRIES,
    };
}
