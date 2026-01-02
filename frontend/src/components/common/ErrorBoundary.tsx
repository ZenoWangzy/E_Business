/**
 * ErrorBoundary - React error boundary component for catching and handling errors
 * Integrates with Sentry for error reporting
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showRetry?: boolean;
  className?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryCount = 0;
  private maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Try to import and use Sentry
    try {
      // Dynamic import to avoid SSR issues
      import('@sentry/nextjs').then((Sentry) => {
        Sentry.captureException(error, {
          contexts: {
            react: {
              componentStack: errorInfo.componentStack
            }
          },
          tags: {
            errorBoundary: true
          }
        });
      }).catch(() => {
        // Sentry not available, just log to console
        console.warn('Sentry not available for error reporting');
      });
    } catch (err) {
      console.warn('Failed to import Sentry:', err);
    }

    // Call custom error handler
    this.props.onError?.(error, errorInfo);
  }

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.retryCount++;
      this.setState({
        hasError: false,
        error: null,
        errorInfo: null
      });
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          className={this.props.className || "flex flex-col items-center justify-center min-h-[200px] p-6 text-center"}
          role="alert"
          aria-live="polite"
        >
          <div className="max-w-md space-y-4">
            {/* Error Icon */}
            <div className="flex justify-center">
              <svg
                className="w-16 h-16 text-destructive"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold text-foreground">
                出现了意外错误
              </h2>
              <p className="text-muted-foreground">
                很抱歉，页面遇到了一个错误。我们已经被通知了这个问题。
              </p>
            </div>

            {/* Error Details (Development Only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="text-left">
                <summary className="cursor-pointer text-sm text-muted-foreground hover:text-foreground">
                  查看错误详情
                </summary>
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <pre className="text-xs text-foreground overflow-auto max-h-32">
                    {this.state.error.toString()}
                    {this.state.errorInfo?.componentStack && (
                      <>
                        {'\n\nComponent Stack:\n'}
                        {this.state.errorInfo.componentStack}
                      </>
                    )}
                  </pre>
                </div>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {this.props.showRetry && this.retryCount < this.maxRetries && (
                <button
                  onClick={this.handleRetry}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                  aria-label="重试加载内容"
                >
                  重试 ({this.maxRetries - this.retryCount} 次剩余)
                </button>
              )}

              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2"
                aria-label="刷新页面"
              >
                刷新页面
              </button>
            </div>

            {/* Retry Limit Reached */}
            {this.retryCount >= this.maxRetries && (
              <p className="text-sm text-muted-foreground">
                已达到最大重试次数。请尝试刷新页面或稍后再试。
              </p>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

// Hook version for functional components
export const useErrorBoundary = () => {
  // This is a placeholder hook that could be used for more advanced error handling
  // In most cases, the ErrorBoundary component should be sufficient
  return {
    reset: () => {
      // Error boundary reset logic would go here
      // This is mainly for documentation purposes
    }
  };
};

// Higher-order component for wrapping components with ErrorBoundary
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
};