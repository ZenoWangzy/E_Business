/**
 * [IDENTITY]: Network Status Hook
 * 监听浏览器网络连接状态，提供离线/在线状态检测
 *
 * [INPUT]: 无
 * [OUTPUT]: { isOnline: boolean, wasOffline: boolean }
 *
 * [LINK]:
 *   - Consumer -> components/NetworkStatusBar.tsx
 *   - Pattern -> components/providers/AccessibilityProvider.tsx (mounted 模式)
 *
 * [POS]: /frontend/src/hooks/useNetworkStatus.ts
 *
 * [PROTOCOL]:
 *   1. SSR 兼容：使用 mounted 状态确保服务端和客户端初始渲染一致
 *   2. 客户端挂载后才同步真实网络状态
 *   3. 零闪烁：避免用户看到状态提示突然出现
 */

'use client';

import { useState, useEffect, useCallback } from 'react';

interface NetworkStatus {
    /** 当前是否在线 */
    isOnline: boolean;
    /** 是否曾经断线过（用于恢复提示） */
    wasOffline: boolean;
}

export function useNetworkStatus(): NetworkStatus {
    // 核心修复：添加 mounted 状态
    const [mounted, setMounted] = useState<boolean>(false);

    // 初始状态：始终假设在线（确保 SSR 一致性）
    const [isOnline, setIsOnline] = useState<boolean>(true);
    const [wasOffline, setWasOffline] = useState<boolean>(false);

    const handleOnline = useCallback(() => {
        setIsOnline(true);
    }, []);

    const handleOffline = useCallback(() => {
        setIsOnline(false);
        setWasOffline(true);
    }, []);

    useEffect(() => {
        // 服务端安全检查
        if (typeof window === 'undefined') return;

        // 标记为已挂载
        setMounted(true);

        // 同步真实网络状态（只在客户端执行）
        setIsOnline(navigator.onLine);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [handleOnline, handleOffline]);

    return { isOnline, wasOffline };
}
