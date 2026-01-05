'use client';

/**
 * useClipboard Hook
 *
 * Provides a comprehensive clipboard interface with:
 * - Modern Clipboard API support
 * - Fallback for older browsers
 * - Permission handling
 * - Error handling and user feedback
 * - Debounced operations
 * - Large text chunking
 * - Copy history support
 */

import { useState, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';

// Types
export interface CopyOptions {
  timeout?: number;
  maxSize?: number;
  debounceDelay?: number;
  onCopySuccess?: () => void;
  onCopyError?: (error: Error) => void;
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  /** Alias: when true, sets both showSuccessToast and showErrorToast to false */
  disableToast?: boolean;
}

export interface CopyHistoryEntry {
  id: string;
  content: string;
  timestamp: Date;
  truncated: boolean;
}

export type ClipboardPermission = 'granted' | 'denied' | 'prompt' | 'unsupported';

// Constants
const DEFAULT_MAX_SIZE = 1024 * 1024; // 1MB
const CHUNK_SIZE = 10000; // 10KB chunks for large text
const DEBOUNCE_DELAY = 300;
const HISTORY_LIMIT = 100;

// Helper: Sanitize text to prevent XSS
function sanitizeText(text: string): string {
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

// Helper: Check clipboard API support
function checkClipboardSupport(): ClipboardPermission {
  if (typeof navigator === 'undefined') {
    return 'unsupported';
  }

  if (!navigator.clipboard) {
    return 'unsupported';
  }

  if (!window.isSecureContext) {
    return 'unsupported';
  }

  return 'granted'; // We'll check actual permission when needed
}

// Helper: Fallback copy method for older browsers
async function fallbackCopyToClipboard(text: string): Promise<void> {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  textArea.style.left = '-999999px';
  textArea.style.top = '-999999px';

  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();

  try {
    const successful = document.execCommand('copy');
    if (!successful) {
      throw new Error('execCommand failed');
    }
  } finally {
    document.body.removeChild(textArea);
  }
}

// Helper: Check if text is too large
function isTextTooLarge(text: string, maxSize: number): boolean {
  return text.length > maxSize;
}

// Helper: Split large text into chunks
function splitTextIntoChunks(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += chunkSize) {
    chunks.push(text.slice(i, i + chunkSize));
  }
  return chunks;
}

// Debounce async function while still returning a Promise to callers.
function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let lastArgs: Parameters<T> | null = null
  let pendingResolve: ((value: Awaited<ReturnType<T>>) => void) | null = null

  return (...args: Parameters<T>) => {
    lastArgs = args

    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }

    // Cancel any previous pending call.
    if (pendingResolve) {
      // NOTE: this is used only for boolean-returning functions in this codebase.
      pendingResolve(false as Awaited<ReturnType<T>>)
      pendingResolve = null
    }

    return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
      pendingResolve = resolve
      timeout = setTimeout(async () => {
        try {
          const result = await func(...(lastArgs as Parameters<T>))
          resolve(result)
        } catch (err) {
          reject(err)
        } finally {
          timeout = null
          lastArgs = null
          pendingResolve = null
        }
      }, wait)
    })
  }
}

export function useClipboard(options: CopyOptions = {}) {
  const [isCopying, setIsCopying] = useState(false);
  const [permission, setPermission] = useState<ClipboardPermission>(checkClipboardSupport());
  const [history, setHistory] = useState<CopyHistoryEntry[]>([]);
  const lastCopyTime = useRef<number>(0);

  const {
    timeout = 2000,
    maxSize = DEFAULT_MAX_SIZE,
    debounceDelay = DEBOUNCE_DELAY,
    onCopySuccess,
    onCopyError,
    disableToast = false,
    showSuccessToast = !disableToast,
    showErrorToast = !disableToast,
  } = options;

  // Add to history
  const addToHistory = useCallback((content: string, truncated = false) => {
    const entry: CopyHistoryEntry = {
      id: Date.now().toString(),
      content,
      timestamp: new Date(),
      truncated,
    };

    setHistory(prev => {
      const newHistory = [entry, ...prev];
      return newHistory.slice(0, HISTORY_LIMIT);
    });
  }, []);

  // Check clipboard permission
  const checkPermission = useCallback(async (): Promise<ClipboardPermission> => {
    if (!navigator.clipboard || !window.isSecureContext) {
      setPermission('unsupported');
      return 'unsupported';
    }

    try {
      // Try to read clipboard to check permission
      const clipboardItems = await navigator.clipboard.read();
      setPermission('granted');
      return 'granted';
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        setPermission('denied');
        return 'denied';
      } else if (error.name === 'NotFoundError') {
        // Empty clipboard is fine
        setPermission('granted');
        return 'granted';
      } else {
        // Other errors might indicate we need to prompt
        setPermission('prompt');
        return 'prompt';
      }
    }
  }, []);

  // Request clipboard permission
  const requestPermission = useCallback(async (): Promise<ClipboardPermission> => {
    if (!navigator.clipboard || !window.isSecureContext) {
      setPermission('unsupported');
      return 'unsupported';
    }

    try {
      // Try to write something to trigger permission request
      await navigator.clipboard.writeText('');
      setPermission('granted');
      return 'granted';
    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        setPermission('denied');
        return 'denied';
      }
      setPermission('prompt');
      return 'prompt';
    }
  }, []);

  // Core copy function (non-debounced)
  const copyToClipboardInner = useCallback(
    async (text: string): Promise<boolean> => {
      // Rate limiting
      const now = Date.now();
      if (now - lastCopyTime.current < 100) { // 100ms minimum between copies
        return false;
      }
      lastCopyTime.current = now;

      setIsCopying(true);

      try {
        // Validate text size
        if (isTextTooLarge(text, maxSize)) {
          const error = new Error('Text too large for clipboard');
          if (showErrorToast) {
            toast.error('文本过大，请分段复制', {
              description: `最大支持 ${Math.round(maxSize / 1024)}KB`,
              action: {
                label: '分块复制',
                onClick: () => copyLargeText(text),
              },
            });
          }
          onCopyError?.(error);
          return false;
        }

        // Sanitize text
        const sanitizedText = sanitizeText(text);
        if (!sanitizedText && text) {
          throw new Error('Text contains only prohibited content');
        }

        // Try modern clipboard API first
        if (navigator.clipboard && window.isSecureContext && permission !== 'unsupported') {
          await navigator.clipboard.writeText(sanitizedText);
        } else {
          // Fallback method
          await fallbackCopyToClipboard(sanitizedText);
        }

        // Success
        if (showSuccessToast) {
          toast.success('已复制到剪贴板');
        }

        addToHistory(sanitizedText, false);
        onCopySuccess?.();
        return true;

      } catch (error: any) {
        console.error('Copy failed:', error);

        let errorMessage = '复制失败，请手动选择复制';

        // Handle specific errors
        if (error.name === 'NotAllowedError') {
          errorMessage = '剪贴板访问被拒绝，请允许访问权限';
          setPermission('denied');
        } else if (error.message === 'Text too large for clipboard') {
          errorMessage = '文本过大，请分段复制';
        } else if (error.name === 'TypeError' && !navigator.clipboard) {
          errorMessage = '浏览器不支持剪贴板API';
          setPermission('unsupported');
        }

        if (showErrorToast) {
          toast.error(errorMessage, {
            action: error.name === 'NotAllowedError' ? {
              label: '重新请求权限',
              onClick: () => requestPermission(),
            } : undefined,
          });
        }

        onCopyError?.(error instanceof Error ? error : new Error(errorMessage));
        return false;
      } finally {
        setIsCopying(false);
      }
    },
    [
      maxSize,
      permission,
      showSuccessToast,
      showErrorToast,
      onCopySuccess,
      onCopyError,
      addToHistory,
      requestPermission,
    ]
  )

  // Debounced wrapper (still returns Promise<boolean> to callers)
  const copyToClipboard = useMemo(() => {
    if (debounceDelay <= 0) {
      return copyToClipboardInner
    }
    return debounceAsync(copyToClipboardInner, debounceDelay)
  }, [copyToClipboardInner, debounceDelay])

  // Copy large text in chunks
  const copyLargeText = useCallback(async (text: string): Promise<boolean> => {
    if (!navigator.clipboard || !window.isSecureContext) {
      toast.error('浏览器不支持分块复制');
      return false;
    }

    setIsCopying(true);

    try {
      const chunks = splitTextIntoChunks(text, CHUNK_SIZE);
      let copiedCount = 0;

      toast.info(`正在复制 ${chunks.length} 个片段...`);

      for (let i = 0; i < chunks.length; i++) {
        await navigator.clipboard.writeText(chunks[i]);
        copiedCount++;

        // Show progress
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      toast.success(`成功复制 ${copiedCount} 个片段`, {
        description: '请在文本编辑器中粘贴以查看完整内容',
      });

      addToHistory(text, true);
      onCopySuccess?.();
      return true;

    } catch (error: any) {
      console.error('Chunked copy failed:', error);

      if (showErrorToast) {
        toast.error('分块复制失败', {
          description: error.message,
        });
      }

      onCopyError?.(error instanceof Error ? error : new Error('Chunked copy failed'));
      return false;
    } finally {
      setIsCopying(false);
    }
  }, [showErrorToast, onCopySuccess, onCopyError, addToHistory]);

  // Batch copy multiple texts
  const batchCopy = useCallback(async (
    texts: string[],
    separator = '\n\n'
  ): Promise<boolean> => {
    const combinedText = texts.join(separator);
    const result = await copyToClipboard(combinedText);
    return result;
  }, [copyToClipboard]);

  // Clear history
  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  // Remove from history
  const removeFromHistory = useCallback((id: string) => {
    setHistory(prev => prev.filter(entry => entry.id !== id));
  }, []);

  return {
    // State
    isCopying,
    permission,
    history,

    // Actions
    copyToClipboard,
    copyLargeText,
    batchCopy,
    checkPermission,
    requestPermission,
    clearHistory,
    removeFromHistory,
    addToHistory,
  };
}

export default useClipboard;