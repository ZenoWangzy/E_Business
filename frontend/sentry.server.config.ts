/**
 * Sentry server configuration for error tracking
 */

import * as Sentry from '@sentry/nextjs';

// Initialize Sentry in server environment
Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Release version
  release: process.env.APP_VERSION || '1.0.0',

  // Sample rate for performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Sample rate for error reporting
  sampleRate: 1.0,

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // beforeSend for error filtering
  beforeSend: (event, hint) => {
    // Filter out certain errors
    if (process.env.NODE_ENV === 'development') {
      // Don't send certain internal errors in development
      if ((hint?.originalException as { name?: unknown } | undefined)?.name === 'AbortError') {
        return null;
      }
    }

    // Add server context
    event.contexts = {
      ...event.contexts,
      server: {
        ...event.contexts?.server,
        runtime: process.env.RUNTIME || 'node',
      },
    };

    return event;
  },

  // Custom tags
  initialScope: {
    tags: {
      backend: 'nextjs',
      runtime: 'node',
    },
  },

  // Configure error URLs
  allowUrls: [
    // Server domains
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.API_BASE_URL,
  ].filter(Boolean) as string[],
});
