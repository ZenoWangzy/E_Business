'use client';

/**
 * CopyButton Component
 *
 * A versatile copy button component with multiple variants:
 * - icon: Small icon button (default)
 * - button: Full button with text
 * - inline: Inline text with icon
 *
 * Features:
 * - Loading states
 * - Success feedback
 * - Error handling
 * - Accessibility support
 * - Keyboard navigation
 * - Tooltip support
 */

import React, { useState, useEffect } from 'react';
import { Button } from './button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';
import { Copy, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClipboard } from '@/hooks/useClipboard';

// Types
export type CopyButtonVariant = 'icon' | 'button' | 'inline';
export type CopyButtonSize = 'sm' | 'md' | 'lg';

export interface CopyButtonProps {
  /** Text content to copy */
  text: string;
  /** Visual variant of the button */
  variant?: CopyButtonVariant;
  /** Size of the button */
  size?: CopyButtonSize;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show text label (for icon variant) */
  showLabel?: boolean;
  /** Custom success message */
  successMessage?: string;
  /** Callback when copy succeeds */
  onCopySuccess?: () => void;
  /** Callback when copy fails */
  onCopyError?: (error: Error) => void;
  /** Whether to disable toast notifications */
  disableToast?: boolean;
  /** Tooltip text */
  tooltip?: string;
  /** Whether to show keyboard shortcut hint */
  showShortcut?: boolean;
}

const sizeClasses = {
  sm: {
    icon: 'h-4 w-4',
    button: 'h-8 px-2',
    inline: 'text-sm',
  },
  md: {
    icon: 'h-4 w-4',
    button: 'h-9 px-3',
    inline: 'text-sm',
  },
  lg: {
    icon: 'h-5 w-5',
    button: 'h-10 px-4',
    inline: 'text-base',
  },
};

export function CopyButton({
  text,
  variant = 'icon',
  size = 'sm',
  className,
  showLabel = false,
  successMessage,
  onCopySuccess,
  onCopyError,
  disableToast = false,
  tooltip,
  showShortcut = false,
  ...props
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const [focused, setFocused] = useState(false);

  const { copyToClipboard, isCopying, permission } = useClipboard({
    timeout: 2000,
    showSuccessToast: !disableToast && !successMessage,
    showErrorToast: !disableToast,
    onCopySuccess: () => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onCopySuccess?.();
    },
    onCopyError,
  });

  // Handle keyboard shortcut
  useEffect(() => {
    if (!showShortcut || !focused) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'c' || e.key === 'C') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        void handleCopy();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showShortcut, focused, text]);

  const handleCopy = async () => {
    if (copied || isCopying) return;
    await copyToClipboard(text);
  };

  // Icon component
  const Icon = copied ? Check : isCopying ? Loader2 : Copy;
  const iconSizeClass = sizeClasses[size].icon;

  // Accessibility labels
  const getAriaLabel = () => {
    if (isCopying) return '正在复制';
    if (copied) return '已复制';
    if (permission === 'denied') return '剪贴板访问被拒绝';
    if (permission === 'unsupported') return '浏览器不支持复制功能';
    return '复制到剪贴板';
  };

  const getTooltipText = () => {
    if (tooltip) return tooltip;
    if (isCopying) return '正在复制...';
    if (copied) return '已复制！';
    if (showShortcut) return '复制 (Ctrl+C)';
    return '复制';
  };

  // Render icon variant
  if (variant === 'icon') {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size={size === 'sm' ? 'icon-sm' : size === 'lg' ? 'icon-lg' : 'icon'}
              className={cn(
                'transition-all duration-200',
                copied && 'text-green-600 hover:text-green-700',
                isCopying && 'animate-spin',
                className
              )}
              onClick={handleCopy}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              disabled={isCopying || permission === 'denied' || permission === 'unsupported'}
              aria-label={getAriaLabel()}
              data-testid="copy-button-icon"
              {...props}
            >
              <Icon className={cn(iconSizeClass, isCopying && 'animate-spin')} />
              {showLabel && !copied && !isCopying && (
                <span className="ml-1 text-xs">复制</span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="text-xs">{getTooltipText()}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Render inline variant
  if (variant === 'inline') {
    return (
      <button
        className={cn(
          'inline-flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded-sm',
          sizeClasses[size].inline,
          copied && 'text-green-600 hover:text-green-700',
          isCopying && 'opacity-70',
          className
        )}
        onClick={handleCopy}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        disabled={isCopying || permission === 'denied' || permission === 'unsupported'}
        aria-label={getAriaLabel()}
        data-testid="copy-button-inline"
        {...props}
      >
        <Icon className={cn(iconSizeClass, isCopying && 'animate-spin')} />
        <span>
          {copied ? '已复制' : showLabel ? '复制' : ''}
        </span>
      </button>
    );
  }

  // Render button variant
  // Map CopyButtonSize to valid Button size values
  const buttonSize = size === 'md' ? 'default' : size;
  return (
    <Button
      variant="outline"
      size={buttonSize}
      className={cn(
        'gap-2 transition-all duration-200',
        copied && 'border-green-600 text-green-600 hover:bg-green-50',
        isCopying && 'opacity-70',
        className
      )}
      onClick={handleCopy}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      disabled={isCopying || permission === 'denied' || permission === 'unsupported'}
      aria-label={getAriaLabel()}
      data-testid="copy-button"
      {...props}
    >
      <Icon className={cn(iconSizeClass, isCopying && 'animate-spin')} />
      {copied ? '已复制' : showLabel ? '复制' : ''}
    </Button>
  );
}

// Export with tooltip provider wrapper for convenience
export function CopyButtonWithTooltip(props: CopyButtonProps) {
  return (
    <TooltipProvider>
      <CopyButton {...props} />
    </TooltipProvider>
  );
}

export default CopyButton;