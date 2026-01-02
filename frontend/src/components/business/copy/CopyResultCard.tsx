'use client';

/**
 * CopyResultCard Component
 *
 * Displays a generated copy result with actions:
 * - Copy to clipboard (enhanced with useClipboard hook)
 * - Toggle favorite
 * - Delete result
 * - Keyboard shortcuts (Ctrl+C to copy)
 * - Accessibility support
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CopyButton } from '@/components/ui/copy-button';
import {
    Heart,
    Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCopyActions, type CopyResult } from '@/hooks/useCopyStudio';

export interface CopyResultCardProps {
    result: CopyResult;
    className?: string;
}

export function CopyResultCard({ result, className }: CopyResultCardProps) {
    const { toggleFavorite, removeResult } = useCopyActions();

    // Handle copy success with custom feedback
    const handleCopySuccess = () => {
        // Custom animation or feedback can be added here
        console.log(`Copied result ${result.id} successfully`);
    };

    // Handle copy errors
    const handleCopyError = (error: Error) => {
        console.error(`Failed to copy result ${result.id}:`, error);
    };

    // Handle favorite toggle
    const handleToggleFavorite = () => {
        toggleFavorite(result.id);
    };

    // Handle delete
    const handleDelete = () => {
        removeResult(result.id);
    };

    // Format date for better readability
    const formatDate = (date: Date) => {
        return date.toLocaleString('zh-CN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    return (
        <Card
            className={cn(
                'transition-all duration-200 hover:shadow-md group relative',
                'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2',
                className
            )}
            data-testid="copy-result-card"
        >
            <CardContent className="pt-4">
                <p className="text-sm leading-relaxed whitespace-pre-wrap select-text">
                    {result.content}
                </p>
            </CardContent>
            <CardFooter className="flex justify-between items-center border-t pt-3">
                <span
                    className="text-xs text-muted-foreground"
                    title={`创建时间: ${result.createdAt.toLocaleString('zh-CN')}`}
                >
                    {formatDate(result.createdAt)}
                </span>
                <div className="flex gap-1" role="group" aria-label="操作按钮">
                    <CopyButton
                        text={result.content}
                        variant="icon"
                        size="sm"
                        tooltip="复制内容"
                        showShortcut
                        onCopySuccess={handleCopySuccess}
                        onCopyError={handleCopyError}
                        className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200"
                    />
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleToggleFavorite}
                        aria-label={result.isFavorite ? '取消收藏' : '收藏'}
                        aria-pressed={result.isFavorite}
                        data-testid="favorite-button"
                        className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200"
                    >
                        <Heart
                            className={cn(
                                'h-4 w-4 transition-colors duration-200',
                                result.isFavorite ? 'fill-red-500 text-red-500' : 'hover:text-red-500'
                            )}
                        />
                    </Button>
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={handleDelete}
                        aria-label="删除"
                        data-testid="delete-button"
                        className="opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200 text-muted-foreground hover:text-destructive"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardFooter>
        </Card>
    );
}
