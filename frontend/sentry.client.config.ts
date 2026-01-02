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
    // Browser performance monitoring
    new Sentry.BrowserTracing({
      // Custom routing instrumentation
      routingInstrumentation: Sentry.reactRouterV6Instrumentation(
        React.useEffect,
        React.useLocation,
        React.useNavigationType,
        React.createRoutesFromChildren,
        React.matchRoutes
      ),
    }),
  ],

  // beforeSend for error filtering
  beforeSend: (event, hint) => {
    // Filter out certain errors in development
    if (process.env.NODE_ENV === 'development') {
      // Don't send console errors in development
      if (hint?.originalException?.name === 'ChunkLoadError') {
        return null;
      }
    }

    // Add additional context
    if (event.exception) {
      event.contexts = {
        ...event.contexts,
        browser: {
          ...event.contexts?.browser,
          url: window.location.href,
          userAgent: navigator.userAgent,
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