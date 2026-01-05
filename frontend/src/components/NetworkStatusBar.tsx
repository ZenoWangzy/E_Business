/**
 * [IDENTITY]: Network Status Bar
 * 全局网络状态提示条，断网时显示警告
 *
 * [INPUT]: 无（使用 useNetworkStatus hook）
 * [OUTPUT]: 断网提示 UI / 恢复提示
 *
 * [LINK]:
 *   - Hook -> @/hooks/useNetworkStatus
 *   - Integration -> app/layout.tsx 或 providers
 *
 * [POS]: /frontend/src/components/NetworkStatusBar.tsx
 *
 * [PROTOCOL]:
 *   1. 仅断网时显示
 *   2. 恢复后显示短暂成功提示
 *   3. 动画过渡效果
 */

'use client';

import { useEffect, useState } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { cn } from '@/lib/utils';

export function NetworkStatusBar() {
    const { isOnline, wasOffline } = useNetworkStatus();
    const [showRecovery, setShowRecovery] = useState(false);

    // 恢复在线时显示短暂提示
    useEffect(() => {
        if (isOnline && wasOffline) {
            setShowRecovery(true);
            const timer = setTimeout(() => {
                setShowRecovery(false);
            }, 3000);
            return () => clearTimeout(timer);
        }
    }, [isOnline, wasOffline]);

    // 在线且不需要显示恢复提示时，不渲染
    if (isOnline && !showRecovery) {
        return null;
    }

    return (
        <div
            role="alert"
            aria-live="polite"
            className={cn(
                'fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium',
                'transition-all duration-300 ease-in-out',
                !isOnline && 'bg-red-500 text-white',
                showRecovery && isOnline && 'bg-green-500 text-white'
            )}
        >
            <div className="flex items-center justify-center gap-2">
                {!isOnline ? (
                    <>
                        <WifiOff className="h-4 w-4" aria-hidden="true" />
                        <span>网络连接已断开，请检查您的网络设置</span>
                    </>
                ) : (
                    <>
                        <Wifi className="h-4 w-4" aria-hidden="true" />
                        <span>网络已恢复连接</span>
                    </>
                )}
            </div>
        </div>
    );
}
