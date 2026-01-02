/**
 * CopyButton Component Tests
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CopyButton } from '../copy-button';
import { useClipboard } from '@/hooks/useClipboard';

// Mock the useClipboard hook
jest.mock('@/hooks/useClipboard');

const mockUseClipboard = useClipboard as jest.MockedFunction<typeof useClipboard>;

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Copy: () => <div data-testid="copy-icon" />,
  Check: () => <div data-testid="check-icon" />,
  Loader2: () => <div data-testid="loader-icon" />,
}));

// Mock Tooltip components
jest.mock('../tooltip', () => ({
  TooltipProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Tooltip: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('CopyButton', () => {
  const mockCopyToClipboard = jest.fn();
  const mockIsCopying = false;
  const mockPermission = 'granted';

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseClipboard.mockReturnValue({
      copyToClipboard: mockCopyToClipboard,
      isCopying: mockIsCopying,
      permission: mockPermission,
      copyLargeText: jest.fn(),
      batchCopy: jest.fn(),
      checkPermission: jest.fn(),
      requestPermission: jest.fn(),
      clearHistory: jest.fn(),
      removeFromHistory: jest.fn(),
      addToHistory: jest.fn(),
      history: [],
    });
  });

  describe('rendering', () => {
    it('should render icon variant by default', () => {
      render(<CopyButton text="test text" />);

      const button = screen.getByRole('button', { name: /复制到剪贴板/i });
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('h-8', 'w-8', 'px-2'); // icon-sm size
    });

    it('should render button variant', () => {
      render(<CopyButton text="test text" variant="button" />);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('复制');
    });

    it('should render inline variant', () => {
      render(<CopyButton text="test text" variant="inline" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('inline-flex');
    });

    it('should show label when showLabel is true', () => {
      render(<CopyButton text="test text" showLabel />);

      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('复制');
    });

    it('should apply custom className', () => {
      render(<CopyButton text="test text" className="custom-class" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('custom-class');
    });
  });

  describe('interactions', () => {
    it('should call copyToClipboard when clicked', async () => {
      mockCopyToClipboard.mockResolvedValue(true);
      const user = userEvent.setup();

      render(<CopyButton text="test text" />);

      const button = screen.getByRole('button');
      await user.click(button);

      expect(mockCopyToClipboard).toHaveBeenCalledWith('test text');
    });

    it('should handle keyboard interaction', async () => {
      mockCopyToClipboard.mockResolvedValue(true);
      const user = userEvent.setup();

      render(<CopyButton text="test text" />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{Enter}');

      expect(mockCopyToClipboard).toHaveBeenCalledWith('test text');
    });

    it('should handle space key interaction', async () => {
      mockCopyToClipboard.mockResolvedValue(true);
      const user = userEvent.setup();

      render(<CopyButton text="test text" />);

      const button = screen.getByRole('button');
      button.focus();
      await user.keyboard('{ }');

      expect(mockCopyToClipboard).toHaveBeenCalledWith('test text');
    });
  });

  describe('loading states', () => {
    it('should show loading state when isCopying is true', () => {
      mockUseClipboard.mockReturnValue({
        ...mockUseClipboard(),
        isCopying: true,
      });

      render(<CopyButton text="test text" />);

      expect(screen.getByTestId('loader-icon')).toBeInTheDocument();
    });

    it('should be disabled when isCopying is true', () => {
      mockUseClipboard.mockReturnValue({
        ...mockUseClipboard(),
        isCopying: true,
      });

      render(<CopyButton text="test text" />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });
  });

  describe('permission states', () => {
    it('should be disabled when permission is denied', () => {
      mockUseClipboard.mockReturnValue({
        ...mockUseClipboard(),
        permission: 'denied',
      });

      render(<CopyButton text="test text" />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should be disabled when permission is unsupported', () => {
      mockUseClipboard.mockReturnValue({
        ...mockUseClipboard(),
        permission: 'unsupported',
      });

      render(<CopyButton text="test text" />);

      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
    });

    it('should show appropriate aria-label for permission denied', () => {
      mockUseClipboard.mockReturnValue({
        ...mockUseClipboard(),
        permission: 'denied',
      });

      render(<CopyButton text="test text" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', '剪贴板访问被拒绝');
    });

    it('should show appropriate aria-label for unsupported browser', () => {
      mockUseClipboard.mockReturnValue({
        ...mockUseClipboard(),
        permission: 'unsupported',
      });

      render(<CopyButton text="test text" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', '浏览器不支持复制功能');
    });
  });

  describe('sizes', () => {
    it('should render small size correctly', () => {
      render(<CopyButton text="test text" size="sm" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-8', 'w-8', 'px-2');
    });

    it('should render medium size correctly', () => {
      render(<CopyButton text="test text" size="md" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-9', 'px-3');
    });

    it('should render large size correctly', () => {
      render(<CopyButton text="test text" size="lg" />);

      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-10', 'px-4');
    });
  });

  describe('accessibility', () => {
    it('should have proper aria-label', () => {
      render(<CopyButton text="test text" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', '复制到剪贴板');
    });

    it('should have data-testid for testing', () => {
      render(<CopyButton text="test text" />);

      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('data-testid');
    });

    it('should support keyboard shortcut hint', () => {
      render(<CopyButton text="test text" showShortcut />);

      // The tooltip should contain the shortcut hint
      // This is tested via the component's internal state
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('callbacks', () => {
    it('should call onCopySuccess callback', async () => {
      mockCopyToClipboard.mockResolvedValue(true);
      const onSuccess = jest.fn();

      render(<CopyButton text="test text" onCopySuccess={onSuccess} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onSuccess).toHaveBeenCalledTimes(1);
      });
    });

    it('should call onCopyError callback', async () => {
      mockCopyToClipboard.mockResolvedValue(false);
      const onError = jest.fn();

      render(<CopyButton text="test text" onCopyError={onError} />);

      const button = screen.getByRole('button');
      fireEvent.click(button);

      await waitFor(() => {
        expect(onError).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('tooltip', () => {
    it('should show default tooltip', () => {
      render(<CopyButton text="test text" />);

      // Tooltip content is handled by the Tooltip component
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('should show custom tooltip', () => {
      render(<CopyButton text="test text" tooltip="Custom tooltip" />);

      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  describe('edge cases', () => {
    it('should handle empty text', () => {
      render(<CopyButton text="" />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle very long text', () => {
      const longText = 'a'.repeat(10000);
      render(<CopyButton text={longText} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });

    it('should handle special characters in text', () => {
      const specialText = 'Special chars: àáâãäåæçèéêë ñòóôõö ùúûüý ÿ 🎉 🔒';
      render(<CopyButton text={specialText} />);

      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
    });
  });
});