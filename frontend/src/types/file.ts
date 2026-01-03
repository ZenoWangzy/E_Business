/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: File Upload Types
 * Type definitions for smart file upload component with security validation.
 *
 * Story关联: Story 1.4: Smart File Upload
 *
 * [INPUT]:
 * - File uploads: Images, Documents (PDF, Word, Excel)
 * - MIME types: Whitelist validation
 * - File signatures: Magic bytes validation
 *
 * [LINK]:
 * - 使用组件 -> @/components/business/SmartDropzone
 * - 安全验证 -> @/lib/security/fileValidator
 * - Worker -> @/workers/fileParser.worker.ts
 *
 * [OUTPUT]: Complete file upload type system
 * [POS]: /frontend/src/types/file.ts
 *
 * [PROTOCOL]:
 * 1. MIME type whitelist: Only allowed types accepted (AC: 22-25)
 * 2. Magic bytes validation: File signature verification
 * 3. Size limits: 10MB max, 30s parse timeout (NFR1)
 * 4. Worker messages: Parse progress and result types
 * 5. All types use camelCase (project standard)
 *
 * === END HEADER ===
 */

// ============ MIME Type Whitelist (AC: 22-25) ============
export const ALLOWED_MIME_TYPES = {
    images: [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp'
    ],
    documents: [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain'
    ],
    spreadsheets: [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ]
} as const;

// Flatten for easy checking
export const ALL_ALLOWED_TYPES = [
    ...ALLOWED_MIME_TYPES.images,
    ...ALLOWED_MIME_TYPES.documents,
    ...ALLOWED_MIME_TYPES.spreadsheets
] as const;

export type SupportedMimeType = typeof ALL_ALLOWED_TYPES[number];

// ============ File Signatures (Magic Bytes) ============
export const FILE_SIGNATURES: Record<string, number[]> = {
    'application/pdf': [0x25, 0x50, 0x44, 0x46], // %PDF
    'image/png': [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A],
    'image/jpeg': [0xFF, 0xD8, 0xFF],
    'image/gif': [0x47, 0x49, 0x46, 0x38], // GIF8
    'image/webp': [0x52, 0x49, 0x46, 0x46], // RIFF (WebP starts with RIFF)
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': [0x50, 0x4B, 0x03, 0x04], // PK (ZIP)
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': [0x50, 0x4B, 0x03, 0x04], // PK (ZIP)
};

// ============ File Limits ============
export const FILE_LIMITS = {
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    maxSizeMB: 10,
    maxConcurrentUploads: 5,
    parseTimeoutMs: 30000, // 30 seconds (NFR1)
} as const;

// ============ Upload Status ============
export type UploadStatus =
    | 'idle'
    | 'validating'
    | 'parsing'
    | 'uploading'
    | 'completed'
    | 'error';

// ============ File Error ============
export interface FileError {
    code: string;
    message: string;
    retryable: boolean;
    details?: Record<string, unknown>;
}

export const FILE_ERROR_CODES = {
    INVALID_TYPE: 'INVALID_TYPE',
    INVALID_SIGNATURE: 'INVALID_SIGNATURE',
    FILE_TOO_LARGE: 'FILE_TOO_LARGE',
    PARSE_FAILED: 'PARSE_FAILED',
    UPLOAD_FAILED: 'UPLOAD_FAILED',
    NETWORK_ERROR: 'NETWORK_ERROR',
    MALICIOUS_FILE: 'MALICIOUS_FILE',
} as const;

// ============ Parsed File ============
export interface ParsedFile {
    id: string;
    workspaceId: string;
    name: string;
    type: SupportedMimeType;
    size: number;
    mimeType: string;
    content?: string;
    preview?: string;
    status: UploadStatus;
    progress: number;
    error?: FileError;
    createdAt: Date;
    metadata?: Record<string, unknown>;
    /** Original File object preserved for retry functionality */
    originalFile?: File;
    /** Number of retry attempts made */
    retryCount?: number;
}

// ============ Dropzone State ============
export type DropzoneState = 'idle' | 'dragging' | 'processing' | 'success' | 'error';

// ============ Parse Progress ============
export interface ParseProgress {
    fileId: string;
    progress: number;
    stage: 'loading' | 'parsing' | 'extracting' | 'complete';
    message?: string;
}

// ============ Parse Result ============
export interface ParseResult {
    success: boolean;
    text?: string;
    metadata?: Record<string, unknown>;
    error?: string;
}

// ============ Worker Messages ============
export interface ParseWorkerMessage {
    type: 'parse';
    payload: {
        id: string;
        file: ArrayBuffer;
        fileType: string;
        fileName: string;
    };
}

export interface ParseWorkerProgress {
    type: 'progress';
    payload: ParseProgress;
}

export interface ParseWorkerResult {
    type: 'result';
    payload: {
        id: string;
        result: ParseResult;
    };
}

export type ParseWorkerOutgoing = ParseWorkerProgress | ParseWorkerResult;

// ============ i18n Messages ============
export interface FileUploadMessages {
    dragDrop: string;
    unsupportedType: string;
    fileTooLarge: string;
    parsingFailed: string;
    uploadSuccess: string;
    uploadRetry: string;
    validating: string;
    parsing: string;
    uploading: string;
    ready: string;
}

export const DEFAULT_MESSAGES_ZH: FileUploadMessages = {
    dragDrop: '拖放文件到此处',
    unsupportedType: '不支持的文件类型',
    fileTooLarge: '文件大小超过限制（最大 10MB）',
    parsingFailed: '文件解析失败',
    uploadSuccess: '文件上传成功',
    uploadRetry: '重试上传',
    validating: '验证中...',
    parsing: '解析中...',
    uploading: '上传中...',
    ready: '准备上传',
};

export const DEFAULT_MESSAGES_EN: FileUploadMessages = {
    dragDrop: 'Drag and drop files here',
    unsupportedType: 'Unsupported file type',
    fileTooLarge: 'File size exceeds limit (max 10MB)',
    parsingFailed: 'File parsing failed',
    uploadSuccess: 'File uploaded successfully',
    uploadRetry: 'Retry upload',
    validating: 'Validating...',
    parsing: 'Parsing...',
    uploading: 'Uploading...',
    ready: 'Ready to upload',
};
