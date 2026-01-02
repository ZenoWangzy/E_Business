/**
 * Dashboard Layout
 *
 * Main layout for authenticated dashboard pages.
 * Includes ErrorBoundary for error handling and Sentry integration.
 */

import ErrorBoundaryProvider from '@/components/providers/ErrorBoundaryProvider';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ErrorBoundaryProvider>
      {children}
    </ErrorBoundaryProvider>
  );
}