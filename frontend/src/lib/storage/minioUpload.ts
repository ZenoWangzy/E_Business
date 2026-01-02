/**
 * MinIO Upload Service
 * Handles direct client-to-MinIO file uploads using presigned URLs
 * Implements workspace-isolated storage paths (AC: 1-6, 12-16)
 */

import type {
    PresignedUploadRequest,
    PresignedUploadResponse,
    AssetConfirmation,
    AssetConfirmationResponse,
    PresignedDownloadResponse,
    BatchDownloadRequest,
    BatchDownloadResponse,
    UploadConfig,
    UploadResult,
    UploadProgress,
} from './types';

/** API base URL */
const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Calculate MD5 checksum for a file (for small files only)
 * For large files, skip checksum to avoid blocking
 */
async function calculateChecksum(file: File): Promise<string | undefined> {
    // Skip checksum for files > 5MB to avoid performance issues
    if (file.size > 5 * 1024 * 1024) {
        return undefined;
    }

    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Request a presigned upload URL from the backend
 */
async function getPresignedUploadUrl(
    workspaceId: string,
    request: PresignedUploadRequest
): Promise<PresignedUploadResponse> {
    const response = await fetch(
        `${API_BASE}/api/v1/workspaces/${workspaceId}/assets/upload/presigned`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(request),
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `Failed to get presigned URL: ${response.status}`);
    }

    return response.json();
}

/**
 * Upload file directly to MinIO using presigned URL
 */
async function uploadToMinIO(
    file: File,
    presignedUrl: string,
    onProgress?: (progress: number) => void,
    signal?: AbortSignal
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable && onProgress) {
                const progress = Math.round((event.loaded / event.total) * 100);
                onProgress(progress);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(`Upload failed with status: ${xhr.status}`));
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('Network error during upload'));
        });

        xhr.addEventListener('abort', () => {
            reject(new Error('Upload cancelled'));
        });

        // Handle AbortSignal
        if (signal) {
            signal.addEventListener('abort', () => {
                xhr.abort();
            });
        }

        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
    });
}

/**
 * Confirm upload completion with the backend
 */
async function confirmUpload(
    workspaceId: string,
    confirmation: AssetConfirmation
): Promise<AssetConfirmationResponse> {
    const response = await fetch(
        `${API_BASE}/api/v1/workspaces/${workspaceId}/assets/confirm`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(confirmation),
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `Failed to confirm upload: ${response.status}`);
    }

    return response.json();
}

/**
 * Main upload function - orchestrates the full upload flow
 * 1. Get presigned URL from backend
 * 2. Upload directly to MinIO
 * 3. Confirm upload with backend
 */
export async function uploadFile(config: UploadConfig): Promise<UploadResult> {
    const { file, workspaceId, onProgress, signal } = config;

    const progress: UploadProgress = {
        assetId: '',
        filename: file.name,
        status: 'pending',
        progress: 0,
        bytesUploaded: 0,
        totalBytes: file.size,
    };

    const updateProgress = (updates: Partial<UploadProgress>) => {
        Object.assign(progress, updates);
        onProgress?.(progress);
    };

    try {
        // Step 1: Get presigned URL
        updateProgress({ status: 'pending' });

        const checksum = await calculateChecksum(file);

        const presignedResponse = await getPresignedUploadUrl(workspaceId, {
            filename: file.name,
            fileSize: file.size,
            contentType: file.type || 'application/octet-stream',
            checksum,
        });

        updateProgress({
            assetId: presignedResponse.assetId,
            status: 'uploading',
        });

        // Step 2: Upload to MinIO
        await uploadToMinIO(
            file,
            presignedResponse.uploadUrl,
            (uploadProgress) => {
                updateProgress({
                    progress: uploadProgress,
                    bytesUploaded: Math.round((uploadProgress / 100) * file.size),
                });
            },
            signal
        );

        // Step 3: Confirm upload
        updateProgress({ status: 'confirming', progress: 100 });

        const confirmation = await confirmUpload(workspaceId, {
            assetId: presignedResponse.assetId,
            actualFileSize: file.size,
            actualChecksum: checksum,
        });

        updateProgress({ status: 'completed' });

        return {
            assetId: confirmation.assetId,
            filename: file.name,
            storagePath: presignedResponse.storagePath,
            fileSize: confirmation.fileSize,
            success: true,
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';

        updateProgress({
            status: signal?.aborted ? 'cancelled' : 'failed',
            error: errorMessage,
        });

        return {
            assetId: progress.assetId,
            filename: file.name,
            storagePath: '',
            fileSize: 0,
            success: false,
            error: errorMessage,
        };
    }
}

/**
 * Get presigned download URL for an asset
 */
export async function getDownloadUrl(
    workspaceId: string,
    assetId: string,
    expiresMinutes: number = 15
): Promise<PresignedDownloadResponse> {
    const response = await fetch(
        `${API_BASE}/api/v1/workspaces/${workspaceId}/assets/${assetId}/url?expires_minutes=${expiresMinutes}`,
        {
            method: 'GET',
            credentials: 'include',
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `Failed to get download URL: ${response.status}`);
    }

    return response.json();
}

/**
 * Get presigned download URLs for multiple assets
 */
export async function getBatchDownloadUrls(
    workspaceId: string,
    request: BatchDownloadRequest
): Promise<BatchDownloadResponse> {
    const response = await fetch(
        `${API_BASE}/api/v1/workspaces/${workspaceId}/assets/batch-download`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(request),
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || `Failed to get batch download URLs: ${response.status}`);
    }

    return response.json();
}

/**
 * Upload multiple files with concurrency limit
 */
export async function uploadFiles(
    configs: UploadConfig[],
    maxConcurrent: number = 3
): Promise<UploadResult[]> {
    const results: UploadResult[] = [];
    const queue = [...configs];

    const workers = Array(Math.min(maxConcurrent, queue.length))
        .fill(null)
        .map(async () => {
            while (queue.length > 0) {
                const config = queue.shift();
                if (config) {
                    const result = await uploadFile(config);
                    results.push(result);
                }
            }
        });

    await Promise.all(workers);
    return results;
}
