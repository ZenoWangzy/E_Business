/**
 * FilePreview Component (AC: 16, 37-39)
 * @module components/business/FilePreview
 * 
 * Displays file preview with extracted text content and side panel support.
 * Supports accessibility with ARIA labels.
 */

'use client';

import React from 'react';
import { X, FileText, Image as ImageIcon, FileSpreadsheet, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type ParsedFile, DEFAULT_MESSAGES_ZH } from '@/types/file';

export interface FilePreviewProps {
    file: ParsedFile;
    onClose?: () => void;
    className?: string;
}

export function FilePreview({ file, onClose, className }: FilePreviewProps) {
    const getIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return ImageIcon;
        if (mimeType.includes('spreadsheet')) return FileSpreadsheet;
        return FileText;
    };

    const Icon = getIcon(file.mimeType);

    const formatSize = (bytes: number): string => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    return (
        <div
            className={cn(
                'bg-white border rounded-lg shadow-lg overflow-hidden',
                className
            )}
            role="dialog"
            aria-label={`预览文件: ${file.name}`}
            aria-modal="false"
        >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
                <div className="flex items-center gap-2">
                    <Icon className="w-5 h-5 text-gray-500" aria-hidden="true" />
                    <h3 className="text-sm font-medium text-gray-900 truncate max-w-[200px]">
                        {file.name}
                    </h3>
                </div>

                {onClose && (
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                        aria-label="关闭预览"
                    >
                        <X className="w-4 h-4 text-gray-500" aria-hidden="true" />
                    </button>
                )}
            </div>

            {/* Metadata */}
            <div className="px-4 py-2 text-xs text-gray-500 border-b bg-gray-25 flex gap-4">
                <span>类型: {file.mimeType}</span>
                <span>大小: {formatSize(file.size)}</span>
                {file.metadata?.numPages != null && <span>页数: {String(file.metadata.numPages)}</span>}
            </div>

            {/* Content Preview */}
            <div className="p-4 max-h-[400px] overflow-auto">
                {file.mimeType.startsWith('image/') ? (
                    // Image preview
                    <div className="flex items-center justify-center">
                        <div className="text-center text-gray-400">
                            <Eye className="w-12 h-12 mx-auto mb-2" />
                            <p>图片预览将在上传完成后显示</p>
                        </div>
                    </div>
                ) : file.content ? (
                    // Text content preview
                    <div
                        className="prose prose-sm max-w-none"
                        aria-label="文件内容预览"
                    >
                        <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono bg-gray-50 p-3 rounded">
                            {file.content.slice(0, 2000)}
                            {file.content.length > 2000 && (
                                <span className="text-gray-400">
                                    {'\n\n'}... (显示前 2000 字符，共 {file.content.length} 字符)
                                </span>
                            )}
                        </pre>
                    </div>
                ) : (
                    // No content
                    <div className="text-center text-gray-400 py-8">
                        <FileText className="w-12 h-12 mx-auto mb-2" />
                        <p>{file.status === 'parsing' ? DEFAULT_MESSAGES_ZH.parsing : '暂无预览内容'}</p>
                    </div>
                )}
            </div>

            {/* Metadata section (if available) */}
            {file.metadata && Object.keys(file.metadata).length > 0 && (
                <div className="px-4 py-3 bg-gray-50 border-t">
                    <h4 className="text-xs font-medium text-gray-500 mb-2">解析元数据</h4>
                    <dl className="grid grid-cols-2 gap-1 text-xs">
                        {Object.entries(file.metadata).map(([key, value]) => (
                            <div key={key} className="flex gap-1">
                                <dt className="text-gray-500">{key}:</dt>
                                <dd className="text-gray-700">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</dd>
                            </div>
                        ))}
                    </dl>
                </div>
            )}
        </div>
    );
}

export default FilePreview;
