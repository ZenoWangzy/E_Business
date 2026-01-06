/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Asset API Client
 * Workspace-aware file upload and asset management.
 *
 * Story关联: Story 2.4 - Secure Uploads & Asset Management
 *
 * [INPUT]:
 * - workspaceId: string
 * - file: File Object
 * - token: string (Auth Token)
 *
 * [LINK]:
 * - Backend API -> /api/v1/workspaces/{workspaceId}/assets
 * - Backend Storage Service -> backend/app/api/v1/endpoints/storage.py
 * - TransactionalUploadService -> backend/app/services/transactional_upload.py
 * - Type Definitions -> @/types/file.ts
 *
 * [OUTPUT]:
 * - uploadAsset(): UploadResponse
 * - uploadAssetViaMinIO(): UploadResponse (Two-Phase Commit with retry)
 * - listAssets(): ListAssetsResponse
 * - deleteAsset(): void
 *
 * [POS]: /frontend/src/lib/api/assets.ts
 *
 * [PROTOCOL]:
 * 1. Must handle CSRF tokens for upload requests.
 * 2. Supports direct upload and MinIO presigned URL flow.
 * 3. Progress tracking via callback.
 * 4. **Two-Phase Commit**: Phase 1 (prepare) + Phase 2 (confirm).
 * 5. **Idempotent Confirmation**: Uses retry with exponential backoff.
 * 6. Backend confirm endpoint is idempotent (safe for retries).
 *
 * === END HEADER ===
 */

import type { ParsedFile } from '@/types/file';

/**
 * Get CSRF token from cookie or meta tag
 * Story 2.4: Required for secure upload requests
 */
function getCsrfToken(): string | null {
    // Try to get from cookie first
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrf_token' || name === 'csrftoken') {
            return decodeURIComponent(value);
        }
    }

    // Fallback: try meta tag
    const metaTag = document.querySelector('meta[name="csrf-token"]');
    if (metaTag) {
        return metaTag.getAttribute('content');
    }

    return null;
}

/**
 * Utility function for delay with promise
 * Used for exponential backoff retry logic
 */
function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Confirm upload response from backend
 */
interface ConfirmUploadResult {
    assetId: string;
    verified: boolean;
    storageStatus: string;
    fileSize: number;
}

/**
 * Confirm upload with retry and exponential backoff
 * 
 * This is crucial for the Two-Phase Commit protocol:
 * - Phase 1 (prepare_upload) happens when getting presigned URL
 * - Phase 2 (confirm_upload) must succeed after MinIO upload
 * 
 * The backend confirm endpoint is idempotent:
 * - If already UPLOADED, returns {storageStatus: "already_uploaded"}
 * - Safe to retry multiple times
 * 
 * @param workspaceId - Workspace ID
 * @param assetId - Asset ID from Phase 1
 * @param fileSize - Actual uploaded file size
 * @param token - Auth token
 * @param checksum - Optional file checksum for integrity verification
 * @param maxRetries - Maximum retry attempts (default: 3)
 * @returns ConfirmUploadResult
 */
async function confirmUploadWithRetry(
    workspaceId: string,
    assetId: string,
    fileSize: number,
    token: string,
    checksum?: string,
    maxRetries: number = 3
): Promise<ConfirmUploadResult> {
    const csrfToken = getCsrfToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
    if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(
                `/api/v1/workspaces/${workspaceId}/assets/confirm`,
                {
                    method: 'POST',
                    headers,
                    credentials: 'include',
                    body: JSON.stringify({
                        assetId,
                        actualFileSize: fileSize,
                        actualChecksum: checksum,
                    }),
                }
            );

            if (!response.ok) {
                const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
                throw new Error(error.detail || `Confirm failed with status ${response.status}`);
            }

            const data = await response.json();

            // Backend returns success for already_uploaded (idempotent)
            return {
                assetId: data.assetId || data.asset_id,
                verified: data.verified,
                storageStatus: data.storageStatus || data.storage_status,
                fileSize: data.fileSize || data.file_size,
            };
        } catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));

            // Don't retry on the last attempt
            if (attempt < maxRetries) {
                // Exponential backoff: 1s, 2s, 4s, ...
                const backoffMs = 1000 * Math.pow(2, attempt);
                console.warn(
                    `[Asset Upload] Confirm attempt ${attempt + 1}/${maxRetries + 1} failed, ` +
                    `retrying in ${backoffMs}ms: ${lastError.message}`
                );
                await delay(backoffMs);
            }
        }
    }

    // All retries exhausted
    throw new Error(
        `Failed to confirm upload after ${maxRetries + 1} attempts: ${lastError?.message}`
    );
}

export interface UploadResponse {
    id: string;
    workspaceId: string;
    name: string;
    size: number;
    mimeType: string;
    createdAt: string;
}

export interface ListAssetsResponse {
    assets: UploadResponse[];
    total: number;
}

/**
 * Upload a file to the workspace
 */
export async function uploadAsset(
    file: File,
    workspaceId: string,
    token: string,
    onProgress?: (progress: number) => void
): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        // Track upload progress
        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable && onProgress) {
                const progress = (event.loaded / event.total) * 100;
                onProgress(progress);
            }
        });

        // Handle completion
        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (error) {
                    reject(new Error('Invalid response format'));
                }
            } else {
                try {
                    const error = JSON.parse(xhr.responseText);
                    let message = error.detail || error.message || 'Upload failed';

                    // 提供中文友好提示
                    if (xhr.status === 413) {
                        message = '文件大小超过限制（最大 10MB）';
                    } else if (xhr.status === 415) {
                        message = '不支持的文件类型';
                    } else if (xhr.status === 403) {
                        message = '权限不足，需要工作空间成员身份';
                    } else if (xhr.status === 404) {
                        message = '工作空间不存在或您没有访问权限';
                    } else if (xhr.status === 401) {
                        message = '登录已过期，请重新登录';
                    } else if (xhr.status === 500) {
                        message = '服务器错误，请稍后重试';
                    }

                    reject(new Error(message));
                } catch {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            }
        });

        // Handle errors
        xhr.addEventListener('error', () => {
            reject(new Error('Network error occurred during upload'));
        });

        xhr.addEventListener('abort', () => {
            reject(new Error('Upload was aborted'));
        });

        // Configure and send request
        xhr.open('POST', `/api/v1/workspaces/${workspaceId}/assets`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('X-Workspace-ID', workspaceId);
        xhr.send(formData);
    });
}

/**
 * List assets in a workspace
 */
export async function listAssets(
    workspaceId: string,
    token: string
): Promise<ListAssetsResponse> {
    const response = await fetch(`/api/v1/workspaces/${workspaceId}/assets`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`,
            'X-Workspace-ID': workspaceId,
        },
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to list assets');
    }

    return response.json();
}

/**
 * Delete an asset
 */
export async function deleteAsset(
    workspaceId: string,
    assetId: string,
    token: string
): Promise<void> {
    const response = await fetch(
        `/api/v1/workspaces/${workspaceId}/assets/${assetId}`,
        {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'X-Workspace-ID': workspaceId,
            },
        }
    );

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Failed to delete asset');
    }
}

/**
 * MinIO Presigned URL Upload Response
 */
export interface PresignedUploadResponse {
    uploadUrl: string;
    assetId: string;
    storagePath: string;
    expiresIn: number;
}

/**
 * Upload a file via MinIO presigned URL (AC: 1-6)
 * 
 * **Two-Phase Commit Protocol**:
 * - Phase 1: Request presigned URL (creates Asset with PENDING_UPLOAD, sets Redis TTL)
 * - Phase 2: After MinIO upload, confirm with retry (updates to UPLOADED, clears TTL)
 * 
 * Flow:
 * 1. Request presigned URL from backend (Phase 1 - prepare)
 * 2. Upload directly to MinIO
 * 3. Confirm upload with backend using retry logic (Phase 2 - confirm)
 */
export async function uploadAssetViaMinIO(
    file: File,
    workspaceId: string,
    token: string,
    onProgress?: (progress: number) => void
): Promise<UploadResponse> {
    // Story 2.4: Get CSRF token for security
    const csrfToken = getCsrfToken();
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
    };
    if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
    }

    // Phase 1: Get presigned upload URL (backend creates Asset + sets Redis TTL)
    const presignedResponse = await fetch(
        `/api/v1/workspaces/${workspaceId}/assets/upload/presigned`,
        {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({
                filename: file.name,
                fileSize: file.size,
                contentType: file.type || 'application/octet-stream',
            }),
        }
    );

    if (!presignedResponse.ok) {
        const error = await presignedResponse.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to get presigned URL');
    }

    const { uploadUrl, assetId }: PresignedUploadResponse = await presignedResponse.json();

    // Step 2: Upload directly to MinIO
    await uploadToMinIO(file, uploadUrl, onProgress);

    // Phase 2: Confirm upload with exponential backoff retry
    // This is idempotent - safe to retry if network issues occur
    const confirmation = await confirmUploadWithRetry(
        workspaceId,
        assetId,
        file.size,
        token,
        undefined,  // checksum (optional)
        3           // maxRetries
    );

    return {
        id: assetId,
        workspaceId,
        name: file.name,
        size: confirmation.fileSize,
        mimeType: file.type,
        createdAt: new Date().toISOString(),
    };
}

/**
 * Upload file directly to MinIO using presigned URL
 */
function uploadToMinIO(
    file: File,
    presignedUrl: string,
    onProgress?: (progress: number) => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (event) => {
            if (event.lengthComputable && onProgress) {
                const progress = (event.loaded / event.total) * 100;
                onProgress(progress);
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve();
            } else {
                reject(new Error(`MinIO upload failed with status: ${xhr.status}`));
            }
        });

        xhr.addEventListener('error', () => {
            reject(new Error('Network error during MinIO upload'));
        });

        xhr.addEventListener('abort', () => {
            reject(new Error('MinIO upload was aborted'));
        });

        xhr.open('PUT', presignedUrl);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.send(file);
    });
}

/**
 * Get presigned download URL for an asset
 */
export async function getAssetDownloadUrl(
    workspaceId: string,
    assetId: string,
    token: string
): Promise<string> {
    const response = await fetch(
        `/api/v1/workspaces/${workspaceId}/assets/${assetId}/url`,
        {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            credentials: 'include',
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to get download URL');
    }

    const { downloadUrl } = await response.json();
    return downloadUrl;
}
