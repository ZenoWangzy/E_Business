/**
 * ParsingProgress Component (AC: 17, 40-43)
 * @module components/business/ParsingProgress
 * 
 * Displays file parsing progress with percentage and time estimates.
 * Supports accessibility announcements.
 */

'use client';

import React from 'react';
import { Loader2, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ParsingProgressProps {
    fileId: string;
    fileName: string;
    progress: number;
    stage: 'loading' | 'parsing' | 'extracting' | 'complete' | 'error';
    message?: string;
    error?: string;
    className?: string;
}

export function ParsingProgress({
    fileId,
    fileName,
    progress,
    stage,
    message,
    error,
    className,
}: ParsingProgressProps) {
    const getStageLabel = (stage: ParsingProgressProps['stage']): string => {
        switch (stage) {
            case 'loading':
                return '加载中';
            case 'parsing':
                return '解析中';
            case 'extracting':
                return '提取内容';
            case 'complete':
                return '完成';
            case 'error':
                return '错误';
            default:
                return '处理中';
        }
    };

    const getStageColor = (stage: ParsingProgressProps['stage']): string => {
        switch (stage) {
            case 'complete':
                return 'bg-green-500';
            case 'error':
                return 'bg-red-500';
            default:
                return 'bg-blue-500';
        }
    };

    const getIcon = (stage: ParsingProgressProps['stage']) => {
        switch (stage) {
            case 'complete':
                return CheckCircle;
            case 'error':
                return AlertCircle;
            default:
                return Loader2;
        }
    };

    const Icon = getIcon(stage);

    // Estimate remaining time (rough calculation)
    const estimatedTimeRemaining = progress > 0
        ? Math.ceil((100 - progress) / 10) // ~10% per second as rough estimate
        : null;

    return (
        <div
            className={cn(
                'flex items-center gap-3 p-3 bg-white border rounded-lg',
                stage === 'error' && 'border-red-200 bg-red-50',
                className
            )}
            role="status"
            aria-live="polite"
            aria-label={`${fileName} ${getStageLabel(stage)} ${progress}%`}
        >
            {/* Icon */}
            <div className="flex-shrink-0">
                <Icon
                    className={cn(
                        'w-6 h-6',
                        stage === 'complete' && 'text-green-500',
                        stage === 'error' && 'text-red-500',
                        stage !== 'complete' && stage !== 'error' && 'text-blue-500 animate-spin'
                    )}
                    aria-hidden="true"
                />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                {/* File name and stage */}
                <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-900 truncate">{fileName}</span>
                    <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full',
                        stage === 'complete' && 'bg-green-100 text-green-700',
                        stage === 'error' && 'bg-red-100 text-red-700',
                        stage !== 'complete' && stage !== 'error' && 'bg-blue-100 text-blue-700'
                    )}>
                        {getStageLabel(stage)}
                    </span>
                </div>

                {/* Progress bar */}
                {stage !== 'complete' && stage !== 'error' && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                            className={cn(
                                'h-2 rounded-full transition-all duration-300',
                                getStageColor(stage)
                            )}
                            style={{ width: `${progress}%` }}
                            role="progressbar"
                            aria-valuenow={progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        />
                    </div>
                )}

                {/* Message and progress */}
                <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500 truncate">
                        {error || message || '处理中...'}
                    </span>
                    {stage !== 'complete' && stage !== 'error' && (
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                            {progress}%
                            {estimatedTimeRemaining && estimatedTimeRemaining > 0 && (
                                <span className="ml-1">· 约 {estimatedTimeRemaining} 秒</span>
                            )}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ParsingProgress;
