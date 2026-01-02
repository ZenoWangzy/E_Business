/**
 * Unified File Parser Interface (AC: 13-21)
 * @module lib/parsers/index
 * 
 * Provides consistent parsing interface for all supported file types
 * Uses Web Workers for heavy parsing to prevent UI blocking
 */

import { FILE_LIMITS, type ParseResult, type ParseProgress } from '@/types/file';

export type ProgressCallback = (progress: ParseProgress) => void;

/**
 * Parse a file and extract text content
 * Automatically selects the appropriate parser based on file type
 */
export async function parseFile(
    file: File,
    fileId: string,
    onProgress?: ProgressCallback
): Promise<ParseResult> {
    const startTime = performance.now();

    try {
        // Report initial progress
        onProgress?.({
            fileId,
            progress: 0,
            stage: 'loading',
            message: '加载文件...',
        });

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`解析超时（超过 ${FILE_LIMITS.parseTimeoutMs / 1000} 秒）`));
            }, FILE_LIMITS.parseTimeoutMs);
        });

        // Select parser based on file type
        const parsePromise = selectAndParse(file, fileId, onProgress);

        // Race between parse and timeout
        const result = await Promise.race([parsePromise, timeoutPromise]);

        // Log performance
        const endTime = performance.now();
        const parseTime = endTime - startTime;
        console.log(`[Parser] ${file.name} parsed in ${parseTime.toFixed(2)}ms`);

        onProgress?.({
            fileId,
            progress: 100,
            stage: 'complete',
            message: '解析完成',
        });

        return result;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知解析错误';
        console.error(`[Parser] Failed to parse ${file.name}:`, error);

        return {
            success: false,
            error: errorMessage,
        };
    }
}

/**
 * Select appropriate parser and execute
 */
async function selectAndParse(
    file: File,
    fileId: string,
    onProgress?: ProgressCallback
): Promise<ParseResult> {
    const mimeType = file.type;

    onProgress?.({
        fileId,
        progress: 10,
        stage: 'parsing',
        message: '解析中...',
    });

    switch (mimeType) {
        case 'application/pdf':
            return await parsePDF(file, fileId, onProgress);

        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
            return await parseDOCX(file, fileId, onProgress);

        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
            return await parseXLSX(file, fileId, onProgress);

        case 'text/plain':
            return await parsePlainText(file, fileId, onProgress);

        case 'image/jpeg':
        case 'image/png':
        case 'image/gif':
        case 'image/webp':
            // Images don't need text extraction
            return {
                success: true,
                text: '',
                metadata: {
                    type: 'image',
                    mimeType,
                    size: file.size,
                },
            };

        default:
            return {
                success: false,
                error: `不支持的文件类型: ${mimeType}`,
            };
    }
}

/**
 * Parse PDF using pdf.js
 */
async function parsePDF(
    file: File,
    fileId: string,
    onProgress?: ProgressCallback
): Promise<ParseResult> {
    try {
        // Dynamic import to enable code splitting
        const pdfjsLib = await import('pdfjs-dist');

        // Set worker source
        pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js`;

        const arrayBuffer = await file.arrayBuffer();

        onProgress?.({
            fileId,
            progress: 30,
            stage: 'extracting',
            message: '提取 PDF 内容...',
        });

        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        const numPages = pdf.numPages;
        const textParts: string[] = [];

        for (let i = 1; i <= numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .map((item) => ('str' in item ? item.str : ''))
                .join(' ');
            textParts.push(pageText);

            // Update progress
            onProgress?.({
                fileId,
                progress: 30 + Math.floor((i / numPages) * 60),
                stage: 'extracting',
                message: `解析第 ${i}/${numPages} 页...`,
            });
        }

        return {
            success: true,
            text: textParts.join('\n\n'),
            metadata: {
                type: 'pdf',
                numPages,
                title: ((await pdf.getMetadata()).info as Record<string, unknown>)?.Title as string || undefined,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: `PDF 解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        };
    }
}

/**
 * Parse DOCX using mammoth.js
 */
async function parseDOCX(
    file: File,
    fileId: string,
    onProgress?: ProgressCallback
): Promise<ParseResult> {
    try {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();

        onProgress?.({
            fileId,
            progress: 50,
            stage: 'extracting',
            message: '提取 Word 文档内容...',
        });

        const result = await mammoth.extractRawText({ arrayBuffer });

        return {
            success: true,
            text: result.value,
            metadata: {
                type: 'docx',
                warnings: result.messages.length,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: `DOCX 解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        };
    }
}

/**
 * Parse XLSX using xlsx
 */
async function parseXLSX(
    file: File,
    fileId: string,
    onProgress?: ProgressCallback
): Promise<ParseResult> {
    try {
        const XLSX = await import('xlsx');
        const arrayBuffer = await file.arrayBuffer();

        onProgress?.({
            fileId,
            progress: 50,
            stage: 'extracting',
            message: '提取 Excel 数据...',
        });

        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        const textParts: string[] = [];

        for (const sheetName of workbook.SheetNames) {
            const sheet = workbook.Sheets[sheetName];
            const csv = XLSX.utils.sheet_to_csv(sheet);
            textParts.push(`--- ${sheetName} ---\n${csv}`);
        }

        return {
            success: true,
            text: textParts.join('\n\n'),
            metadata: {
                type: 'xlsx',
                sheetCount: workbook.SheetNames.length,
                sheetNames: workbook.SheetNames,
            },
        };
    } catch (error) {
        return {
            success: false,
            error: `Excel 解析失败: ${error instanceof Error ? error.message : '未知错误'}`,
        };
    }
}

/**
 * Parse plain text file
 */
async function parsePlainText(
    file: File,
    fileId: string,
    onProgress?: ProgressCallback
): Promise<ParseResult> {
    try {
        onProgress?.({
            fileId,
            progress: 50,
            stage: 'extracting',
            message: '读取文本文件...',
        });

        const text = await file.text();

        return {
            success: true,
            text,
            metadata: {
                type: 'text',
                encoding: 'utf-8',
            },
        };
    } catch (error) {
        return {
            success: false,
            error: `文本文件读取失败: ${error instanceof Error ? error.message : '未知错误'}`,
        };
    }
}

/**
 * Check if a file type is parsable (has text content to extract)
 */
export function isParsableType(mimeType: string): boolean {
    return [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
    ].includes(mimeType);
}
