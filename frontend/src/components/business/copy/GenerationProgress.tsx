'use client';

/**
 * GenerationProgress Component
 * 
 * Shows generation progress with animated indicator.
 * Displays during AI copy generation.
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface GenerationProgressProps {
    isGenerating: boolean;
    message?: string;
    className?: string;
}

export function GenerationProgress({
    isGenerating,
    message = 'AI 正在生成内容...',
    className,
}: GenerationProgressProps) {
    if (!isGenerating) return null;

    return (
        <div
            className={cn(
                'flex items-center gap-3 p-4 rounded-lg bg-muted/50 border border-dashed',
                className
            )}
            role="status"
            aria-live="polite"
            data-testid="generation-progress"
        >
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div className="flex-1">
                <p className="text-sm font-medium">{message}</p>
                <p className="text-xs text-muted-foreground">
                    这可能需要几秒钟...
                </p>
            </div>
        </div>
    );
}
