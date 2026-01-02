/**
[IDENTITY]: Smart File Dropzone
Multi - Tenant Aware File Uploader with Client - Side Parsing.

[INPUT]:
- Params: workspaceId, token, onUploadComplete.
- Events: Drag & Drop, File Selection.

[LINK]:
- Validator -> @/lib/security / fileValidator
    - Parser -> @/lib/parsers
    - API -> @/lib/api / assets

    [OUTPUT]: ParsedFile Objects(with progress / status).
[POS]: /frontend/src / components / business / SmartDropzone.tsx

[PROTOCOL]:
1. ** Security **: Validate MIME types AND magic bytes before upload.
2. ** UX **: Provide real - time progress bars and cancellable states.
3. ** Resilience **: Handle network failures with retry logic.
 */
'use client';

import React, { useCallback, useState, useRef, useEffect } from 'react';
import { useDropzone, type DropzoneOptions } from 'react-dropzone';
import { Upload, FileText, Image as ImageIcon, FileSpreadsheet, X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { validateFile, quickValidate } from '@/lib/security/fileValidator';
import { parseFile, isParsableType } from '@/lib/parsers';
import { uploadAsset, uploadAssetViaMinIO } from '@/lib/api/assets';
import {
    type ParsedFile,
    type DropzoneState,
    type FileError,
    type SupportedMimeType,
    ALL_ALLOWED_TYPES,
    FILE_LIMITS,
    DEFAULT_MESSAGES_ZH,
} from '@/types/file';

export interface SmartDropzoneProps {
    workspaceId: string;
    token: string;
    onFilesAdded?: (files: ParsedFile[]) => void;
    onUploadComplete?: (file: ParsedFile) => void;
    onUploadError?: (file: ParsedFile, error: FileError) => void;
    maxFiles?: number;
    className?: string;
    /** Use MinIO presigned URL upload (default: false for backward compatibility) */
    useMinIO?: boolean;
}

export function SmartDropzone({
    workspaceId,
    token,
    onFilesAdded,
    onUploadComplete,
    onUploadError,
    maxFiles = FILE_LIMITS.maxConcurrentUploads,
    className,
    useMinIO = false,
}: SmartDropzoneProps) {
    const [files, setFiles] = useState<ParsedFile[]>([]);
    const [dropzoneState, setDropzoneState] = useState<DropzoneState>('idle');
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Handle file drop/selection
    const onDrop = useCallback(
        async (acceptedFiles: File[], rejectedFiles: any[]) => {
            setDropzoneState('processing');

            // Handle rejected files
            if (rejectedFiles.length > 0) {
                console.warn('Rejected files:', rejectedFiles);
            }

            // Process accepted files
            const newFiles: ParsedFile[] = [];

            for (const file of acceptedFiles) {
                const fileId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

                const parsedFile: ParsedFile = {
                    id: fileId,
                    workspaceId,
                    name: file.name,
                    type: file.type as SupportedMimeType,
                    size: file.size,
                    mimeType: file.type,
                    status: 'validating',
                    progress: 0,
                    createdAt: new Date(),
                };

                newFiles.push(parsedFile);

                // Asynchronously validate and process
                processFile(file, parsedFile);
            }

            setFiles((prev) => [...prev, ...newFiles]);
            onFilesAdded?.(newFiles);
            setDropzoneState('idle');
        },
        [workspaceId, onFilesAdded]
    );

    // Process individual file
    const processFile = async (file: File, parsedFile: ParsedFile) => {
        try {
            // Step 1: Validate file
            updateFileStatus(parsedFile.id, { status: 'validating', progress: 10 });

            const validationResult = await validateFile(file);
            if (!validationResult.valid && validationResult.error) {
                updateFileStatus(parsedFile.id, {
                    status: 'error',
                    error: validationResult.error,
                });
                onUploadError?.(parsedFile, validationResult.error);
                return;
            }

            // Step 2: Parse file (if applicable)
            if (isParsableType(file.type)) {
                updateFileStatus(parsedFile.id, { status: 'parsing', progress: 20 });

                const parseResult = await parseFile(file, parsedFile.id, (progress) => {
                    updateFileStatus(parsedFile.id, { progress: 20 + progress.progress * 0.5 });
                });

                if (parseResult.success) {
                    updateFileStatus(parsedFile.id, {
                        content: parseResult.text,
                        metadata: parseResult.metadata,
                        progress: 70,
                    });
                } else {
                    // Parsing failed but continue with upload (graceful degradation)
                    console.warn(`Parsing failed for ${file.name}:`, parseResult.error);
                }
            }

            // Step 3: Upload file (choose method based on useMinIO prop)
            updateFileStatus(parsedFile.id, { status: 'uploading', progress: 70 });

            const uploadFn = useMinIO ? uploadAssetViaMinIO : uploadAsset;
            const uploadResponse = await uploadFn(file, workspaceId, token, (uploadProgress) => {
                updateFileStatus(parsedFile.id, { progress: 70 + uploadProgress * 0.3 });
            });

            // Step 4: Complete
            updateFileStatus(parsedFile.id, { status: 'completed', progress: 100 });
            onUploadComplete?.(parsedFile);
        } catch (error) {
            const fileError: FileError = {
                code: 'UPLOAD_FAILED',
                message: error instanceof Error ? error.message : '上传失败',
                retryable: true,
            };

            updateFileStatus(parsedFile.id, {
                status: 'error',
                error: fileError,
            });
            onUploadError?.(parsedFile, fileError);
        }
    };

    // Update file status helper
    const updateFileStatus = (fileId: string, updates: Partial<ParsedFile>) => {
        setFiles((prev) =>
            prev.map((f) => (f.id === fileId ? { ...f, ...updates } : f))
        );
    };

    // Remove file
    const removeFile = (fileId: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== fileId));
    };

    // Retry failed upload
    const retryFile = async (fileId: string) => {
        const file = files.find((f) => f.id === fileId);
        if (!file) return;

        // This would require keeping the original File object
        // For now, just reset the status
        updateFileStatus(fileId, { status: 'idle', progress: 0, error: undefined });
    };

    // Dropzone configuration
    const dropzoneOptions: DropzoneOptions = {
        onDrop,
        accept: ALL_ALLOWED_TYPES.reduce((acc, type) => {
            acc[type] = [];
            return acc;
        }, {} as Record<string, string[]>),
        maxSize: FILE_LIMITS.maxSizeBytes,
        maxFiles,
        multiple: true,
        noClick: false,
        noKeyboard: false,
    };

    const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone(dropzoneOptions);

    // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
        }
    };

    return (
        <div className={cn('w-full', className)}>
            {/* Dropzone Area */}
            <div
                {...getRootProps()}
                data-testid="dropzone"
                className={cn(
                    'border-2 border-dashed rounded-lg p-8 transition-colors cursor-pointer',
                    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2',
                    isDragActive && !isDragReject && 'border-blue-500 bg-blue-50 drag-over',
                    isDragReject && 'border-red-500 bg-red-50',
                    !isDragActive && 'border-gray-300 hover:border-gray-400',
                    dropzoneState === 'processing' && 'opacity-50 cursor-wait'
                )}
                onKeyDown={handleKeyDown}
                role="button"
                tabIndex={0}
                aria-label="File upload area"
                aria-describedby="file-instructions"
            >
                <input {...getInputProps()} ref={fileInputRef} />

                <div className="flex flex-col items-center justify-center text-center">
                    <Upload className="w-12 h-12 text-gray-400 mb-4" aria-hidden="true" />

                    <p className="text-lg font-medium text-gray-700">
                        {isDragActive ? '释放文件到这里...' : DEFAULT_MESSAGES_ZH.dragDrop}
                    </p>

                    <p className="text-sm text-gray-500 mt-2" id="dropzone-description">
                        支持 PDF, DOCX, XLSX, TXT, JPG, PNG, GIF, WebP
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                        最大 {FILE_LIMITS.maxSizeMB}MB · 最多 {maxFiles} 个文件
                    </p>
                </div>
            </div>

            {/* File List */}
            {files.length > 0 && (
                <div className="mt-6 space-y-3" role="list" aria-label="已选择的文件列表">
                    {files.map((file) => (
                        <FileItem
                            key={file.id}
                            file={file}
                            onRemove={() => removeFile(file.id)}
                            onRetry={() => retryFile(file.id)}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// File Item Component
interface FileItemProps {
    file: ParsedFile;
    onRemove: () => void;
    onRetry: () => void;
}

function FileItem({ file, onRemove, onRetry }: FileItemProps) {
    const getIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return ImageIcon;
        if (mimeType.includes('spreadsheet')) return FileSpreadsheet;
        return FileText;
    };

    const Icon = getIcon(file.mimeType);

    const getStatusColor = (status: typeof file.status) => {
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

    const getStatusText = (status: typeof file.status) => {
        switch (status) {
            case 'validating':
                return DEFAULT_MESSAGES_ZH.validating;
            case 'parsing':
                return DEFAULT_MESSAGES_ZH.parsing;
            case 'uploading':
                return DEFAULT_MESSAGES_ZH.uploading;
            case 'completed':
                return DEFAULT_MESSAGES_ZH.uploadSuccess;
            case 'error':
                return file.error?.message || '错误';
            default:
                return DEFAULT_MESSAGES_ZH.ready;
        }
    };

    const StatusIcon = file.status === 'completed'
        ? CheckCircle
        : file.status === 'error'
            ? AlertCircle
            : Loader2;

    return (
        <div
            className="flex items-center gap-3 p-4 bg-white border rounded-lg shadow-sm"
            role="listitem"
            aria-label={`文件: ${file.name}, 状态: ${getStatusText(file.status)}`}
        >
            <Icon className="w-8 h-8 text-gray-400 flex-shrink-0" aria-hidden="true" />

            <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                <div className="flex items-center gap-2 mt-1">
                    <p className={cn('text-xs', getStatusColor(file.status))}>
                        {getStatusText(file.status)}
                    </p>
                    {file.status !== 'completed' && file.status !== 'error' && (
                        <span className="text-xs text-gray-500">· {file.progress}%</span>
                    )}
                </div>

                {/* Progress Bar */}
                {file.status !== 'completed' && file.status !== 'error' && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                        <div
                            className="bg-blue-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${file.progress}%` }}
                            role="progressbar"
                            aria-valuenow={file.progress}
                            aria-valuemin={0}
                            aria-valuemax={100}
                        />
                    </div>
                )}
            </div>

            <div className="flex items-center gap-2">
                <StatusIcon
                    className={cn(
                        'w-5 h-5',
                        getStatusColor(file.status),
                        file.status !== 'completed' && file.status !== 'error' && 'animate-spin'
                    )}
                    aria-hidden="true"
                />

                {file.status === 'error' && file.error?.retryable && (
                    <button
                        onClick={onRetry}
                        className="text-xs text-blue-600 hover:text-blue-700 underline"
                        aria-label={`重试上传 ${file.name}`}
                    >
                        {DEFAULT_MESSAGES_ZH.uploadRetry}
                    </button>
                )}

                {(file.status === 'idle' || file.status === 'error') && (
                    <button
                        onClick={onRemove}
                        className="p-1 hover:bg-gray-100 rounded"
                        aria-label={`移除 ${file.name}`}
                    >
                        <X className="w-4 h-4 text-gray-500" aria-hidden="true" />
                    </button>
                )}
            </div>
        </div>
    );
}

export default SmartDropzone;
