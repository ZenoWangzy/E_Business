/**
 * Sentry client configuration for error tracking
 */

import * as Sentry from '@sentry/nextjs';

// Initialize Sentry in browser environment
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',

  // Environment
  environment: process.env.NODE_ENV || 'development',

  // Release version
  release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

  // Sample rate for performance monitoring
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,

  // Sample rate for error reporting
  sampleRate: 1.0,

  // Enable debug mode in development
  debug: process.env.NODE_ENV === 'development',

  // Configure integrations
  integrations: [
    // Next.js 已内置性能监控，不需要额外配置 BrowserTracing
  ],

  // beforeSend for error filtering
  beforeSend: (event, hint) => {
    // Filter out certain errors in development
    if (process.env.NODE_ENV === 'development') {
      // Don't send console errors in development
      const exception = hint?.originalException as Error | undefined;
      if (exception && 'name' in exception && exception.name === 'ChunkLoadError') {
        return null;
      }
    }

    // Add additional context (只在浏览器环境)
    if (event.exception && typeof window !== 'undefined') {
      event.contexts = {
        ...event.contexts,
        browser: {
          ...event.contexts?.browser,
          url: window.location?.href || '',
          userAgent: navigator?.userAgent || '',
        },
      };
    }

    return event;
  },

  // Custom tags
  initialScope: {
    tags: {
      frontend: 'nextjs',
      framework: 'react',
    },
  },

  // Configure allowed URLs
  allowUrls: [
    // Production domain
    process.env.NEXT_PUBLIC_APP_URL,
    // Local development
    'localhost',
    '127.0.0.1',
  ].filter(Boolean) as string[],
});