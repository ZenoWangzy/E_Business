/**
 * MinIO Upload Types
 * Type definitions for storage API integration
 */

/** Status of an upload operation */
export type UploadStatus =
    | 'pending'
    | 'uploading'
    | 'confirming'
    | 'completed'
    | 'failed'
    | 'cancelled';

/** Request to generate presigned upload URL */
export interface PresignedUploadRequest {
    filename: string;
    fileSize: number;
    contentType: string;
    checksum?: string;
}

/** Response with presigned upload URL */
export interface PresignedUploadResponse {
    uploadUrl: string;
    assetId: string;
    storagePath: string;
    expiresIn: number;
}

/** Request to confirm upload completion */
export interface AssetConfirmation {
    assetId: string;
    actualFileSize: number;
    actualChecksum?: string;
}

/** Response after upload confirmation */
export interface AssetConfirmationResponse {
    assetId: string;
    verified: boolean;
    storageStatus: string;
    fileSize: number;
}

/** Response with presigned download URL */
export interface PresignedDownloadResponse {
    downloadUrl: string;
    expiresIn: number;
    filename: string;
    contentType: string;
    fileSize: number;
}

/** Request for batch download URLs */
export interface BatchDownloadRequest {
    assetIds: string[];
    expiresMinutes?: number;
}

/** Single item in batch download response */
export interface BatchDownloadItem {
    assetId: string;
    downloadUrl: string | null;
    filename: string;
    error: string | null;
}

/** Response with multiple download URLs */
export interface BatchDownloadResponse {
    items: BatchDownloadItem[];
    expiresIn: number;
}

/** Upload progress information */
export interface UploadProgress {
    assetId: string;
    filename: string;
    status: UploadStatus;
    progress: number; // 0-100
    bytesUploaded: number;
    totalBytes: number;
    error?: string;
}

/** Configuration for file upload */
export interface UploadConfig {
    file: File;
    workspaceId: string;
    onProgress?: (progress: UploadProgress) => void;
    signal?: AbortSignal;
}

/** Result of a completed upload */
export interface UploadResult {
    assetId: string;
    filename: string;
    storagePath: string;
    fileSize: number;
    success: boolean;
    error?: string;
}
