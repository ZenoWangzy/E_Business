/**
 * BatchOperationsBar Component
 * @module components/business/BatchOperationsBar
 *
 * Provides batch operations toolbar for selected items.
 * Enhanced with copy functionality for Story 3.3.
 */

'use client';

import React, { useState } from 'react';
import { Trash2, Download, X, Copy, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BatchCopyDialog } from '@/components/business/copy/BatchCopyDialog';
import { type CopyResult } from '@/hooks/useCopyStudio';

export interface BatchOperationsBarProps {
    selectedCount: number;
    totalCount: number;
    onClearSelection: () => void;
    onBatchDelete?: () => void;
    onBatchDownload?: () => void;
    onBatchCopy?: () => void;
    selectedItems?: CopyResult[];
    isDeleting?: boolean;
    isDownloading?: boolean;
    isCopying?: boolean;
    className?: string;
}

/**
 * BatchOperationsBar
 * 批量操作工具栏，显示在有项目被选中时
 * Enhanced with copy functionality for copy studio items
 */
export function BatchOperationsBar({
    selectedCount,
    totalCount,
    onClearSelection,
    onBatchDelete,
    onBatchDownload,
    onBatchCopy,
    selectedItems = [],
    isDeleting = false,
    isDownloading = false,
    isCopying = false,
    className,
}: BatchOperationsBarProps) {
    const [showCopyDialog, setShowCopyDialog] = useState(false);

    if (selectedCount === 0) {
        return null;
    }

    const handleBatchCopy = () => {
        if (onBatchCopy) {
            onBatchCopy();
        } else if (selectedItems.length > 0) {
            setShowCopyDialog(true);
        }
    };

    return (
        <div
            className={cn(
                'flex items-center justify-between gap-4 p-3 bg-blue-50 border border-blue-200 rounded-lg',
                'dark:bg-blue-950 dark:border-blue-800',
                className
            )}
            role="toolbar"
            aria-label="批量操作"
            data-testid="batch-operations-bar"
        >
            {/* Selection info */}
            <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    已选择 {selectedCount} / {totalCount} 项
                </span>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearSelection}
                    className="h-6 px-2 text-blue-600 hover:text-blue-800 dark:text-blue-400"
                    aria-label="清除选择"
                >
                    <X className="w-3 h-3 mr-1" />
                    清除
                </Button>
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-2">
                {/* Batch Copy Button */}
                {(selectedItems.length > 0 || onBatchCopy) && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleBatchCopy}
                        disabled={isCopying}
                        className="text-green-600 border-green-300 hover:bg-green-100 dark:text-green-400"
                        data-testid="batch-copy-btn"
                    >
                        <Copy className="w-4 h-4 mr-1" />
                        {isCopying ? '复制中...' : '批量复制'}
                    </Button>
                )}

                {onBatchDownload && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onBatchDownload}
                        disabled={isDownloading}
                        className="text-blue-600 border-blue-300 hover:bg-blue-100 dark:text-blue-400"
                        data-testid="batch-download-btn"
                    >
                        <Download className="w-4 h-4 mr-1" />
                        {isDownloading ? '下载中...' : '批量下载'}
                    </Button>
                )}

                {onBatchDelete && (
                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={onBatchDelete}
                        disabled={isDeleting}
                        data-testid="batch-delete-btn"
                    >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {isDeleting ? '删除中...' : '批量删除'}
                    </Button>
                )}
            </div>

            {/* Batch Copy Dialog */}
            {showCopyDialog && (
                <BatchCopyDialog
                    open={showCopyDialog}
                    onOpenChange={setShowCopyDialog}
                    items={selectedItems}
                    defaultOptions={{
                        format: 'merged',
                        separator: '\n\n---\n\n',
                        includeIndex: false,
                        includeTitle: true,
                    }}
                />
            )}
        </div>
    );
}

export default BatchOperationsBar;
