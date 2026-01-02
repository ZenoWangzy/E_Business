/**
 * File Validator - Client-side security validation (AC: 22-25)
 * @module lib/security/fileValidator
 * 
 * Performs:
 * - MIME type whitelist validation
 * - File header (magic bytes) validation
 * - File size check
 * - Malicious file pattern detection
 */

import {
    ALL_ALLOWED_TYPES,
    FILE_SIGNATURES,
    FILE_LIMITS,
    FILE_ERROR_CODES,
    type FileError,
    type SupportedMimeType,
} from '@/types/file';

export interface ValidationResult {
    valid: boolean;
    error?: FileError;
}

/**
 * Validate MIME type against whitelist
 */
export function validateMimeType(file: File): ValidationResult {
    if (!ALL_ALLOWED_TYPES.includes(file.type as SupportedMimeType)) {
        return {
            valid: false,
            error: {
                code: FILE_ERROR_CODES.INVALID_TYPE,
                message: `不支持的文件类型: ${file.type || '未知'}`,
                retryable: false,
                details: { mimeType: file.type, allowedTypes: ALL_ALLOWED_TYPES },
            },
        };
    }
    return { valid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(file: File): ValidationResult {
    if (file.size > FILE_LIMITS.maxSizeBytes) {
        const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
        return {
            valid: false,
            error: {
                code: FILE_ERROR_CODES.FILE_TOO_LARGE,
                message: `文件大小 (${sizeMB}MB) 超过限制 (最大 ${FILE_LIMITS.maxSizeMB}MB)`,
                retryable: false,
                details: { fileSize: file.size, maxSize: FILE_LIMITS.maxSizeBytes },
            },
        };
    }
    return { valid: true };
}

/**
 * Validate file header (magic bytes)
 */
export async function validateFileSignature(file: File): Promise<ValidationResult> {
    const signature = FILE_SIGNATURES[file.type];

    // If no signature defined for this type, skip validation (text files, etc.)
    if (!signature) {
        return { valid: true };
    }

    try {
        const headerBytes = await readFileHeader(file, signature.length);
        const matches = signature.every((byte, index) => headerBytes[index] === byte);

        if (!matches) {
            return {
                valid: false,
                error: {
                    code: FILE_ERROR_CODES.INVALID_SIGNATURE,
                    message: '文件头校验失败：文件内容与声明类型不符',
                    retryable: false,
                    details: {
                        declaredType: file.type,
                        expectedSignature: signature,
                        actualSignature: Array.from(headerBytes),
                    },
                },
            };
        }

        return { valid: true };
    } catch (err) {
        return {
            valid: false,
            error: {
                code: FILE_ERROR_CODES.INVALID_SIGNATURE,
                message: '无法读取文件头进行验证',
                retryable: true,
                details: { error: String(err) },
            },
        };
    }
}

/**
 * Read file header bytes
 */
async function readFileHeader(file: File, length: number): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        const blob = file.slice(0, length);

        reader.onload = () => {
            if (reader.result instanceof ArrayBuffer) {
                resolve(new Uint8Array(reader.result));
            } else {
                reject(new Error('Failed to read file as ArrayBuffer'));
            }
        };

        reader.onerror = () => reject(reader.error);
        reader.readAsArrayBuffer(blob);
    });
}

/**
 * Detect potentially malicious file patterns
 * Checks for:
 * - Embedded scripts in file names
 * - Double extensions
 * - Null bytes in filename
 */
export function detectMaliciousPatterns(file: File): ValidationResult {
    const fileName = file.name;

    // Check for null bytes
    if (fileName.includes('\0')) {
        return {
            valid: false,
            error: {
                code: FILE_ERROR_CODES.MALICIOUS_FILE,
                message: '检测到潜在恶意文件：文件名包含非法字符',
                retryable: false,
            },
        };
    }

    // Check for double extensions that might hide executable
    const dangerousPatterns = [
        /\.exe\./, /\.bat\./, /\.cmd\./, /\.scr\./, /\.pif\./,
        /\.js$/, /\.vbs$/, /\.wsf$/, /\.hta$/,
        /<script/i, /javascript:/i,
    ];

    for (const pattern of dangerousPatterns) {
        if (pattern.test(fileName)) {
            return {
                valid: false,
                error: {
                    code: FILE_ERROR_CODES.MALICIOUS_FILE,
                    message: '检测到潜在恶意文件模式',
                    retryable: false,
                    details: { pattern: pattern.toString() },
                },
            };
        }
    }

    return { valid: true };
}

/**
 * Perform full file validation (sync checks + async signature check)
 */
export async function validateFile(file: File): Promise<ValidationResult> {
    // Quick sync checks first
    const sizeResult = validateFileSize(file);
    if (!sizeResult.valid) return sizeResult;

    const mimeResult = validateMimeType(file);
    if (!mimeResult.valid) return mimeResult;

    const malwareResult = detectMaliciousPatterns(file);
    if (!malwareResult.valid) return malwareResult;

    // Async signature check
    const signatureResult = await validateFileSignature(file);
    if (!signatureResult.valid) return signatureResult;

    return { valid: true };
}

/**
 * Quick validation (sync only, for drag-over feedback)
 */
export function quickValidate(file: File): ValidationResult {
    const sizeResult = validateFileSize(file);
    if (!sizeResult.valid) return sizeResult;

    const mimeResult = validateMimeType(file);
    if (!mimeResult.valid) return mimeResult;

    return { valid: true };
}
