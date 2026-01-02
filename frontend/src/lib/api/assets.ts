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
 * - Type Definitions -> @/types/file.ts
 *
 * [OUTPUT]:
 * - uploadAsset(): UploadResponse
 * - listAssets(): ListAssetsResponse
 * - deleteAsset(): void
 *
 * [POS]: /frontend/src/lib/api/assets.ts
 *
 * [PROTOCOL]:
 * 1. Must handle CSRF tokens for upload requests.
 * 2. Supports direct upload and MinIO presigned URL flow.
 * 3. Progress tracking via callback.
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
                    reject(new Error(error.detail || 'Upload failed'));
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
 * Flow:
 * 1. Request presigned URL from backend
 * 2. Upload directly to MinIO
 * 3. Confirm upload with backend
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

    // Step 1: Get presigned upload URL
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

    const { uploadUrl, assetId, storagePath }: PresignedUploadResponse = await presignedResponse.json();

    // Step 2: Upload directly to MinIO
    await uploadToMinIO(file, uploadUrl, onProgress);

    // Step 3: Confirm upload
    const confirmResponse = await fetch(
        `/api/v1/workspaces/${workspaceId}/assets/confirm`,
        {
            method: 'POST',
            headers,  // Reuse headers with CSRF token
            credentials: 'include',
            body: JSON.stringify({
                assetId,
                actualFileSize: file.size,
            }),
        }
    );

    if (!confirmResponse.ok) {
        const error = await confirmResponse.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to confirm upload');
    }

    const confirmation = await confirmResponse.json();

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
