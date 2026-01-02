/**
 * ErrorBoundary Provider - Client component wrapper for error boundary
 */

'use client';

import ErrorBoundary from '../common/ErrorBoundary';
import { ReactNode } from 'react';

interface ErrorBoundaryProviderProps {
  children: ReactNode;
}

export default function ErrorBoundaryProvider({ children }: ErrorBoundaryProviderProps) {
  return (
    <ErrorBoundary
      showRetry={true}
      onError={(error, errorInfo) => {
        // Custom error handling logic can be added here
        // For example, show toast notifications, logging to custom services, etc.
        console.error('Global error boundary caught error:', {
          error: error.message,
          stack: error.stack,
          componentStack: errorInfo.componentStack,
        });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}