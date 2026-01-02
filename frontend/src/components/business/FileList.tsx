/**
 * FileList Component (AC: 26-30)
 * @module components/business/FileList
 * 
 * Displays a list of uploaded files with workspace context.
 * Supports batch operations and multi-tenancy awareness.
 */

'use client';

import React from 'react';
import { FileText, Image as ImageIcon, FileSpreadsheet, Trash2, Eye, Download, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ParsedFile, DEFAULT_MESSAGES_ZH } from '@/types/file';

export interface FileListProps {
    files: ParsedFile[];
    workspaceId: string;
    onRemove?: (fileId: string) => void;
    onPreview?: (file: ParsedFile) => void;
    onDownload?: (file: ParsedFile) => void;
    selectable?: boolean;
    selectedIds?: Set<string>;
    onSelectionChange?: (selectedIds: Set<string>) => void;
    className?: string;
}

export function FileList({
    files,
    workspaceId,
    onRemove,
    onPreview,
    onDownload,
    selectable = false,
    selectedIds = new Set(),
    onSelectionChange,
    className,
}: FileListProps) {
    const getIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return ImageIcon;
        if (mimeType.includes('spreadsheet')) return FileSpreadsheet;
        return FileText;
    };

    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getStatusColor = (status: ParsedFile['status']) => {
        switch (status) {
            case 'completed':
                return 'text-green-600';
            case 'error':
                return 'text-red-600';
            case 'uploading':
            case 'parsing':
            case 'validating':
                return 'text-blue-600';
            default:
                return 'text-gray-600';
        }
    };

    const getStatusText = (file: ParsedFile) => {
        switch (file.status) {
            case 'validating':
                return DEFAULT_MESSAGES_ZH.validating;
            case 'parsing':
                return DEFAULT_MESSAGES_ZH.parsing;
            case 'uploading':
                return DEFAULT_MESSAGES_ZH.uploading;
            case 'completed':
                return DEFAULT_MESSAGES_ZH.uploadSuccess;
            case 'error':
                return file.error?.message || '上传失败';
            default:
                return DEFAULT_MESSAGES_ZH.ready;
        }
    };

    const toggleSelection = (fileId: string) => {
        if (!selectable || !onSelectionChange) return;

        const newSelection = new Set(selectedIds);
        if (newSelection.has(fileId)) {
            newSelection.delete(fileId);
        } else {
            newSelection.add(fileId);
        }
        onSelectionChange(newSelection);
    };

    const toggleSelectAll = () => {
        if (!selectable || !onSelectionChange) return;

        if (selectedIds.size === files.length) {
            onSelectionChange(new Set());
        } else {
            onSelectionChange(new Set(files.map(f => f.id)));
        }
    };

    if (files.length === 0) {
        return (
            <div className={cn('text-center py-8 text-gray-400', className)}>
                <FileText className="w-12 h-12 mx-auto mb-2" />
                <p>暂无文件</p>
            </div>
        );
    }

    return (
        <div className={cn('space-y-2', className)} role="list" aria-label="文件列表">
            {/* Select all header (if selectable) */}
            {selectable && files.length > 0 && (
                <div className="flex items-center gap-2 pb-2 border-b">
                    <input
                        type="checkbox"
                        checked={selectedIds.size === files.length}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 rounded border-gray-300"
                        aria-label="全选"
                    />
                    <span className="text-sm text-gray-600">
                        已选择 {selectedIds.size} / {files.length} 个文件
                    </span>
                </div>
            )}

            {/* File items */}
            {files.map((file) => {
                const Icon = getIcon(file.mimeType);
                const isSelected = selectedIds.has(file.id);
                const StatusIcon = file.status === 'completed'
                    ? CheckCircle
                    : file.status === 'error'
                        ? AlertCircle
                        : Loader2;

                return (
                    <div
                        key={file.id}
                        className={cn(
                            'flex items-center gap-3 p-3 bg-white border rounded-lg hover:shadow-sm transition-shadow',
                            isSelected && 'ring-2 ring-blue-500 bg-blue-50'
                        )}
                        role="listitem"
                        aria-label={`文件: ${file.name}`}
                    >
                        {/* Selection checkbox */}
                        {selectable && (
                            <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleSelection(file.id)}
                                className="h-4 w-4 rounded border-gray-300 flex-shrink-0"
                                aria-label={`选择 ${file.name}`}
                            />
                        )}

                        {/* Icon */}
                        <Icon className="w-8 h-8 text-gray-400 flex-shrink-0" aria-hidden="true" />

                        {/* File details */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-500">{formatSize(file.size)}</span>
                                <span className={cn('text-xs', getStatusColor(file.status))}>
                                    {getStatusText(file)}
                                </span>
                            </div>

                            {/* Progress bar */}
                            {file.status !== 'completed' && file.status !== 'error' && file.status !== 'idle' && (
                                <div className="w-full bg-gray-200 rounded-full h-1 mt-1.5">
                                    <div
                                        className="bg-blue-600 h-1 rounded-full transition-all duration-300"
                                        style={{ width: `${file.progress}%` }}
                                        role="progressbar"
                                        aria-valuenow={file.progress}
                                        aria-valuemin={0}
                                        aria-valuemax={100}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Status icon */}
                        <StatusIcon
                            className={cn(
                                'w-5 h-5 flex-shrink-0',
                                getStatusColor(file.status),
                                file.status !== 'completed' && file.status !== 'error' && 'animate-spin'
                            )}
                            aria-hidden="true"
                        />

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                            {onPreview && file.content && (
                                <button
                                    onClick={() => onPreview(file)}
                                    className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                    aria-label={`预览 ${file.name}`}
                                >
                                    <Eye className="w-4 h-4 text-gray-500" />
                                </button>
                            )}

                            {onDownload && file.status === 'completed' && (
                                <button
                                    onClick={() => onDownload(file)}
                                    className="p-1.5 hover:bg-gray-100 rounded transition-colors"
                                    aria-label={`下载 ${file.name}`}
                                >
                                    <Download className="w-4 h-4 text-gray-500" />
                                </button>
                            )}

                            {onRemove && (
                                <button
                                    onClick={() => onRemove(file.id)}
                                    className="p-1.5 hover:bg-red-50 rounded transition-colors"
                                    aria-label={`删除 ${file.name}`}
                                >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                </button>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

export default FileList;
