/**
 * useClipboard Hook Tests
 */

import { renderHook, act, waitFor } from '@testing-library/react';
import { toast } from 'sonner';
import { useClipboard } from '../useClipboard';

// Mock navigator.clipboard
const mockClipboard = {
  writeText: jest.fn(),
  readText: jest.fn(),
  read: jest.fn(),
};

// Mock document.execCommand
const mockExecCommand = jest.fn();

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

beforeEach(() => {
  // Reset mocks
  jest.clearAllMocks();

  // Mock navigator.clipboard
  Object.defineProperty(navigator, 'clipboard', {
    value: mockClipboard,
    writable: true,
  });

  // Mock document.execCommand
  Object.defineProperty(document, 'execCommand', {
    value: mockExecCommand,
    writable: true,
  });

  // Mock secure context
  Object.defineProperty(window, 'isSecureContext', {
    value: true,
    writable: true,
  });
});

describe('useClipboard', () => {
  describe('basic copy functionality', () => {
    it('should copy text successfully using clipboard API', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useClipboard());

      await act(async () => {
        const success = await result.current.copyToClipboard('test text');
        expect(success).toBe(true);
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith('test text');
      expect(toast.success).toHaveBeenCalledWith('已复制到剪贴板');
    });

    it('should handle empty text', async () => {
      const { result } = renderHook(() => useClipboard());

      await act(async () => {
        const success = await result.current.copyToClipboard('');
        expect(success).toBe(true);
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith('');
    });

    it('should sanitize text before copying', async () => {
      const maliciousText = '<script>alert("xss")</script>hello world';
      const sanitizedText = 'hello world';

      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useClipboard());

      await act(async () => {
        await result.current.copyToClipboard(maliciousText);
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith(sanitizedText);
    });
  });

  describe('error handling', () => {
    it('should handle clipboard permission denied', async () => {
      const error = new Error('NotAllowedError');
      error.name = 'NotAllowedError';
      mockClipboard.writeText.mockRejectedValue(error);

      const { result } = renderHook(() => useClipboard());

      await act(async () => {
        const success = await result.current.copyToClipboard('test text');
        expect(success).toBe(false);
      });

      expect(toast.error).toHaveBeenCalledWith(
        '剪贴板访问被拒绝，请允许访问权限',
        expect.any(Object)
      );
    });

    it('should handle large text error', async () => {
      const { result } = renderHook(() => useClipboard({ maxSize: 100 }));

      const largeText = 'a'.repeat(200);

      await act(async () => {
        const success = await result.current.copyToClipboard(largeText);
        expect(success).toBe(false);
      });

      expect(toast.error).toHaveBeenCalledWith('文本过大，请分段复制', expect.any(Object));
    });

    it('should use fallback method when clipboard API is not available', async () => {
      // Mock unsupported clipboard
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        writable: true,
      });

      // Mock DOM operations for fallback
      const mockTextArea = {
        value: '',
        style: { position: '', opacity: '', left: '', top: '' },
        focus: jest.fn(),
        select: jest.fn(),
      };

      const mockCreateElement = jest.spyOn(document, 'createElement');
      mockCreateElement.mockReturnValue(mockTextArea as any);

      const mockAppendChild = jest.spyOn(document.body, 'appendChild');
      const mockRemoveChild = jest.spyOn(document.body, 'removeChild');

      mockExecCommand.mockReturnValue(true);

      const { result } = renderHook(() => useClipboard());

      await act(async () => {
        const success = await result.current.copyToClipboard('test text');
        expect(success).toBe(true);
      });

      expect(mockCreateElement).toHaveBeenCalledWith('textarea');
      expect(mockTextArea.value).toBe('test text');
      expect(mockExecCommand).toHaveBeenCalledWith('copy');

      // Cleanup mocks
      mockAppendChild.mockRestore();
      mockRemoveChild.mockRestore();
    });
  });

  describe('batch copy functionality', () => {
    it('should batch copy multiple texts', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useClipboard());

      const texts = ['text1', 'text2', 'text3'];
      const separator = '\n\n';

      await act(async () => {
        const success = await result.current.batchCopy(texts, separator);
        expect(success).toBe(true);
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith('text1\n\ntext2\n\ntext3');
    });

    it('should handle empty array in batch copy', async () => {
      const { result } = renderHook(() => useClipboard());

      await act(async () => {
        const success = await result.current.batchCopy([]);
        expect(success).toBe(true);
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith('');
    });
  });

  describe('copy history', () => {
    it('should add entries to history', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useClipboard());

      await act(async () => {
        await result.current.copyToClipboard('test text');
      });

      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].content).toBe('test text');
      expect(result.current.history[0].truncated).toBe(false);
    });

    it('should limit history size', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useClipboard());

      // Add more entries than the limit
      for (let i = 0; i < 105; i++) {
        await act(async () => {
          await result.current.copyToClipboard(`text ${i}`);
        });
      }

      expect(result.current.history).toHaveLength(100);
    });

    it('should clear history', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useClipboard());

      // Add some entries
      await act(async () => {
        await result.current.copyToClipboard('test1');
        await result.current.copyToClipboard('test2');
      });

      expect(result.current.history).toHaveLength(2);

      // Clear history
      await act(async () => {
        result.current.clearHistory();
      });

      expect(result.current.history).toHaveLength(0);
    });
  });

  describe('permission management', () => {
    it('should check permission status', async () => {
      mockClipboard.read.mockResolvedValue([{ types: ['text/plain'] }]);

      const { result } = renderHook(() => useClipboard());

      await act(async () => {
        const permission = await result.current.checkPermission();
        expect(permission).toBe('granted');
      });

      expect(mockClipboard.read).toHaveBeenCalled();
    });

    it('should handle permission request', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useClipboard());

      await act(async () => {
        const permission = await result.current.requestPermission();
        expect(permission).toBe('granted');
      });

      expect(mockClipboard.writeText).toHaveBeenCalledWith('');
    });
  });

  describe('loading states', () => {
    it('should set loading state during copy', async () => {
      let resolvePromise: (value: void) => void;
      const copyPromise = new Promise<void>((resolve) => {
        resolvePromise = resolve;
      });

      mockClipboard.writeText.mockReturnValue(copyPromise);

      const { result } = renderHook(() => useClipboard());

      expect(result.current.isCopying).toBe(false);

      // Start copy
      const copyResult = result.current.copyToClipboard('test');

      expect(result.current.isCopying).toBe(true);

      // Resolve copy
      await act(async () => {
        resolvePromise!();
        await copyResult;
      });

      expect(result.current.isCopying).toBe(false);
    });
  });

  describe('debounce functionality', () => {
    jest.useFakeTimers();

    afterEach(() => {
      jest.clearAllTimers();
    });

    it('should debounce copy calls', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useClipboard({ debounceDelay: 100 }));

      // Make multiple rapid calls
      result.current.copyToClipboard('text1');
      result.current.copyToClipboard('text2');
      result.current.copyToClipboard('text3');

      // Should only be called once after debounce
      expect(mockClipboard.writeText).not.toHaveBeenCalled();

      // Fast forward time
      jest.advanceTimersByTime(100);

      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
        expect(mockClipboard.writeText).toHaveBeenCalledWith('text3');
      });
    });
  });

  describe('custom callbacks', () => {
    it('should call onCopySuccess callback', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const onSuccess = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(() =>
        useClipboard({ onCopySuccess: onSuccess, onCopyError: onError })
      );

      await act(async () => {
        await result.current.copyToClipboard('test text');
      });

      expect(onSuccess).toHaveBeenCalledTimes(1);
      expect(onError).not.toHaveBeenCalled();
    });

    it('should call onCopyError callback', async () => {
      mockClipboard.writeText.mockRejectedValue(new Error('Test error'));

      const onSuccess = jest.fn();
      const onError = jest.fn();

      const { result } = renderHook(() =>
        useClipboard({ onCopySuccess: onSuccess, onCopyError: onError })
      );

      await act(async () => {
        await result.current.copyToClipboard('test text');
      });

      expect(onSuccess).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('rate limiting', () => {
    it('should rate limit copy operations', async () => {
      mockClipboard.writeText.mockResolvedValue(undefined);

      const { result } = renderHook(() => useClipboard());

      // First copy should work
      await act(async () => {
        const success1 = await result.current.copyToClipboard('text1');
        expect(success1).toBe(true);
      });

      // Immediate second copy should be ignored
      await act(async () => {
        const success2 = await result.current.copyToClipboard('text2');
        expect(success2).toBe(false);
      });

      // Only first call should have been made
      expect(mockClipboard.writeText).toHaveBeenCalledTimes(1);
      expect(mockClipboard.writeText).toHaveBeenCalledWith('text1');
    });
  });
});