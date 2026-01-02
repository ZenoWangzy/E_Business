'use client';

/**
 * Video Studio Error Boundary
 * Story 4.1: Video Studio UI & Mode Selection
 */

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ErrorProps {
    error: Error & { digest?: string };
    reset: () => void;
}

export default function VideoError({ error, reset }: ErrorProps) {
    useEffect(() => {
        // Log error for debugging (respecting privacy)
        console.error('Video Studio Error:', error.message);
    }, [error]);

    return (
        <div
            className="flex h-screen items-center justify-center bg-background"
            role="alert"
            aria-labelledby="error-title"
            aria-describedby="error-description"
        >
            <div className="text-center max-w-md p-6">
                <div className="flex justify-center mb-4">
                    <AlertCircle className="h-12 w-12 text-destructive" aria-hidden="true" />
                </div>

                <h1 id="error-title" className="text-xl font-semibold text-white mb-2">
                    视频工作室加载失败
                </h1>

                <p id="error-description" className="text-neutral-400 mb-6">
                    抱歉，加载视频工作室时出现问题。请重试或返回仪表板。
                </p>

                <div className="flex gap-3 justify-center">
                    <Button
                        onClick={reset}
                        variant="default"
                        className="gap-2"
                    >
                        <RefreshCw className="h-4 w-4" aria-hidden="true" />
                        重试
                    </Button>

                    <Button
                        variant="outline"
                        onClick={() => window.history.back()}
                    >
                        返回
                    </Button>
                </div>

                {error.digest && (
                    <p className="mt-4 text-xs text-neutral-500">
                        错误代码: {error.digest}
                    </p>
                )}
            </div>
        </div>
    );
}
