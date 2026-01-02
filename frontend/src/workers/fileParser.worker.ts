/**
 * File Parser Web Worker (AC: 13-21, 40-43)
 * @module workers/fileParser.worker
 * 
 * Offloads heavy file parsing to a separate thread to prevent UI blocking.
 * Uses pdf.js GlobalWorkerOptions for PDF parsing.
 */

// Worker message types
export interface ParseMessage {
    type: 'parse';
    payload: {
        file: ArrayBuffer;
        fileType: string;
        fileName: string;
        fileId: string;
    };
}

export interface ParseProgress {
    type: 'progress';
    payload: {
        fileId: string;
        progress: number;
        stage: string;
        message?: string;
    };
}

export interface ParseResult {
    type: 'result';
    payload: {
        fileId: string;
        success: boolean;
        text?: string;
        metadata?: Record<string, unknown>;
        error?: string;
    };
}

export type WorkerMessage = ParseMessage;
export type WorkerResponse = ParseProgress | ParseResult;

// Handle incoming messages
self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
    const { type, payload } = event.data;

    if (type === 'parse') {
        await handleParse(payload);
    }
};

async function handleParse(payload: ParseMessage['payload']): Promise<void> {
    const { file, fileType, fileName, fileId } = payload;

    try {
        // Report start
        postProgress(fileId, 0, 'initializing', '初始化解析器...');

        let result: { text: string; metadata: Record<string, unknown> };

        switch (fileType) {
            case 'application/pdf':
                result = await parsePDF(file, fileId);
                break;
            case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
                result = await parseDOCX(file, fileId);
                break;
            case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                result = await parseXLSX(file, fileId);
                break;
            case 'text/plain':
                result = await parsePlainText(file, fileId);
                break;
            default:
                // For images and unsupported types, return empty text with metadata
                result = {
                    text: '',
                    metadata: { type: 'unsupported', mimeType: fileType },
                };
        }

        postResult(fileId, true, result.text, result.metadata);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知解析错误';
        postResult(fileId, false, undefined, undefined, errorMessage);
    }
}

async function parsePDF(
    arrayBuffer: ArrayBuffer,
    fileId: string
): Promise<{ text: string; metadata: Record<string, unknown> }> {
    postProgress(fileId, 10, 'loading', '加载 PDF.js...');

    // Dynamic import pdf.js
    const pdfjsLib = await import('pdfjs-dist');

    // Use CDN worker
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        '//unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    postProgress(fileId, 20, 'parsing', '解析 PDF 文档...');

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

        postProgress(
            fileId,
            20 + Math.floor((i / numPages) * 70),
            'extracting',
            `解析第 ${i}/${numPages} 页...`
        );
    }

    const metadata = await pdf.getMetadata();
    const info = metadata.info as Record<string, unknown> | undefined;

    return {
        text: textParts.join('\n\n'),
        metadata: {
            type: 'pdf',
            numPages,
            title: typeof info?.Title === 'string' ? info.Title : undefined,
            author: typeof info?.Author === 'string' ? info.Author : undefined,
        },
    };
}

async function parseDOCX(
    arrayBuffer: ArrayBuffer,
    fileId: string
): Promise<{ text: string; metadata: Record<string, unknown> }> {
    postProgress(fileId, 10, 'loading', '加载 mammoth.js...');

    const mammoth = await import('mammoth');

    postProgress(fileId, 30, 'extracting', '提取 Word 文档内容...');

    const result = await mammoth.extractRawText({ arrayBuffer });

    postProgress(fileId, 90, 'complete', '解析完成');

    return {
        text: result.value,
        metadata: {
            type: 'docx',
            warnings: result.messages.length,
        },
    };
}

async function parseXLSX(
    arrayBuffer: ArrayBuffer,
    fileId: string
): Promise<{ text: string; metadata: Record<string, unknown> }> {
    postProgress(fileId, 10, 'loading', '加载 xlsx...');

    const XLSX = await import('xlsx');

    postProgress(fileId, 30, 'extracting', '提取 Excel 数据...');

    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const textParts: string[] = [];

    for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        textParts.push(`--- ${sheetName} ---\n${csv}`);
    }

    postProgress(fileId, 90, 'complete', '解析完成');

    return {
        text: textParts.join('\n\n'),
        metadata: {
            type: 'xlsx',
            sheetCount: workbook.SheetNames.length,
            sheetNames: workbook.SheetNames,
        },
    };
}

async function parsePlainText(
    arrayBuffer: ArrayBuffer,
    fileId: string
): Promise<{ text: string; metadata: Record<string, unknown> }> {
    postProgress(fileId, 50, 'extracting', '读取文本文件...');

    const decoder = new TextDecoder('utf-8');
    const text = decoder.decode(arrayBuffer);

    postProgress(fileId, 90, 'complete', '解析完成');

    return {
        text,
        metadata: {
            type: 'text',
            encoding: 'utf-8',
        },
    };
}

// Helper to post progress
function postProgress(
    fileId: string,
    progress: number,
    stage: string,
    message?: string
): void {
    const response: ParseProgress = {
        type: 'progress',
        payload: { fileId, progress, stage, message },
    };
    self.postMessage(response);
}

// Helper to post result
function postResult(
    fileId: string,
    success: boolean,
    text?: string,
    metadata?: Record<string, unknown>,
    error?: string
): void {
    const response: ParseResult = {
        type: 'result',
        payload: { fileId, success, text, metadata, error },
    };
    self.postMessage(response);
}

// Export for TypeScript
export { };
