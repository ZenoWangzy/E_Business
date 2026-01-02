/**
 * GenerationLoading - Loading state component for AI image generation
 * Story 2.1: Style Selection & Generation Trigger
 */

'use client';

import { useEffect, useRef } from 'react';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import type { GenerationStatus } from '@/types/image';

interface GenerationLoadingProps {
    status: GenerationStatus;
    progress: number;
    errorMessage?: string | null;
    onRetry?: () => void;
}

export function GenerationLoading({
    status,
    progress,
    errorMessage,
    onRetry,
}: GenerationLoadingProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-scroll into view when component mounts
    useEffect(() => {
        containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, []);

    const getStatusContent = () => {
        switch (status) {
            case 'pending':
                return {
                    icon: <Loader2 className="w-12 h-12 animate-spin text-primary" />,
                    title: '排队中...',
                    description: '您的生成任务已加入队列',
                };
            case 'processing':
                return {
                    icon: <Loader2 className="w-12 h-12 animate-spin text-primary" />,
                    title: 'AI 正在生成...',
                    description: '请稍候，AI 正在为您创作精美图像',
                };
            case 'completed':
                return {
                    icon: <CheckCircle2 className="w-12 h-12 text-green-500" />,
                    title: '生成完成！',
                    description: '您的图像已成功生成',
                };
            case 'failed':
                return {
                    icon: <XCircle className="w-12 h-12 text-destructive" />,
                    title: '生成失败',
                    description: errorMessage || '发生未知错误，请重试',
                };
            default:
                return null;
        }
    };

    const content = getStatusContent();
    if (!content || status === 'idle') return null;

    return (
        <div
            ref={containerRef}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50"
        >
            <div className="bg-card border rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
                <div className="flex flex-col items-center text-center space-y-6">
                    {/* Icon */}
                    {content.icon}

                    {/* Title */}
                    <div>
                        <h2 className="text-xl font-semibold mb-2">{content.title}</h2>
                        <p className="text-muted-foreground">{content.description}</p>
                    </div>

                    {/* Progress Bar */}
                    {(status === 'pending' || status === 'processing') && (
                        <div className="w-full space-y-2">
                            <Progress value={progress} className="h-2" />
                            <p className="text-sm text-muted-foreground">{progress}%</p>
                        </div>
                    )}

                    {/* Retry Button */}
                    {status === 'failed' && onRetry && (
                        <button
                            onClick={onRetry}
                            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                        >
                            重试
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
