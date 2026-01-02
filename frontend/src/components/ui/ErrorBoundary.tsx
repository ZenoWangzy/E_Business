'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface ErrorBoundaryProps {
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error, errorInfo: ErrorInfo) => void;
    showDetails?: boolean;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary 组件
 * 捕获子组件的 JavaScript 错误并显示回退 UI。
 * 
 * @example
 * <ErrorBoundary>
 *   <ChildComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
        };
    }

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
        // Log error to console (可以替换为其他日志服务)
        console.error('ErrorBoundary caught an error:', error, errorInfo);

        this.setState({ errorInfo });

        // Call custom error handler if provided
        this.props.onError?.(error, errorInfo);
    }

    handleRetry = (): void => {
        this.setState({
            hasError: false,
            error: null,
            errorInfo: null,
        });
    };

    render(): ReactNode {
        const { hasError, error, errorInfo } = this.state;
        const { children, fallback, showDetails = false } = this.props;

        if (hasError) {
            // Use custom fallback if provided
            if (fallback) {
                return fallback;
            }

            // Default error UI
            return (
                <Card className="w-full max-w-lg mx-auto mt-8" data-testid="error-boundary-fallback">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-destructive">
                            <span className="text-2xl">⚠️</span>
                            出现了一些问题
                        </CardTitle>
                        <CardDescription>
                            您可以尝试刷新页面或重试操作。
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {showDetails && error && (
                            <div className="bg-muted p-4 rounded-md overflow-auto max-h-48">
                                <p className="font-mono text-sm text-destructive">{error.message}</p>
                                {errorInfo && (
                                    <pre className="mt-2 text-xs text-muted-foreground whitespace-pre-wrap">
                                        {errorInfo.componentStack}
                                    </pre>
                                )}
                            </div>
                        )}
                    </CardContent>
                    <CardFooter className="gap-2">
                        <Button onClick={this.handleRetry} variant="default" data-testid="error-boundary-retry">
                            重试
                        </Button>
                        <Button onClick={() => window.location.reload()} variant="outline">
                            刷新页面
                        </Button>
                    </CardFooter>
                </Card>
            );
        }

        return children;
    }
}

/**
 * Hook-based error boundary wrapper for functional components
 */
export function withErrorBoundary<P extends object>(
    WrappedComponent: React.ComponentType<P>,
    errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
) {
    const displayName = WrappedComponent.displayName || WrappedComponent.name || 'Component';

    const ComponentWithErrorBoundary = (props: P) => (
        <ErrorBoundary {...errorBoundaryProps}>
            <WrappedComponent {...props} />
        </ErrorBoundary>
    );

    ComponentWithErrorBoundary.displayName = `withErrorBoundary(${displayName})`;

    return ComponentWithErrorBoundary;
}

export default ErrorBoundary;
