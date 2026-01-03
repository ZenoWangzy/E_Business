/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: CSRF Token Manager
 * Manages CSRF tokens for protecting state-changing API requests.
 *
 * [INPUT]:
 * - API endpoint: GET /api/v1/csrf-token
 *
 * [LINK]:
 * - API -> @/lib/api/client.ts
 * - Backend -> backend/app/api/v1/endpoints/csrf.py
 *
 * [OUTPUT]:
 * - CSRF token string
 * - Request header attachment
 *
 * [POS]: /frontend/src/lib/api/csrf.ts
 *
 * [PROTOCOL]:
 * 1. Token is cached in memory with expiration tracking.
 * 2. Auto-refreshes token before expiration.
 * 3. Attaches X-CSRF-Token header to state-changing requests.
 *
 * === END HEADER ===
 */

const CSRF_HEADER_NAME = 'X-CSRF-Token';
const CSRF_COOKIE_NAME = 'csrf_token';
const TOKEN_REFRESH_BUFFER = 5 * 60 * 1000; // 5 minutes before expiration

interface CSRFTokenData {
    token: string;
    expiresAt: Date;
}

/**
 * CSRF Token Manager
 * 
 * Handles token retrieval, caching, and request attachment.
 */
class CSRFManager {
    private tokenData: CSRFTokenData | null = null;
    private fetchPromise: Promise<string> | null = null;

    /**
     * Get a valid CSRF token.
     * 
     * Returns cached token if still valid, otherwise fetches a new one.
     */
    async getToken(): Promise<string> {
        // Check if we have a valid cached token
        if (this.tokenData && this.isTokenValid()) {
            return this.tokenData.token;
        }

        // Prevent concurrent fetches
        if (this.fetchPromise) {
            return this.fetchPromise;
        }

        // Fetch new token
        this.fetchPromise = this.fetchToken();

        try {
            const token = await this.fetchPromise;
            return token;
        } finally {
            this.fetchPromise = null;
        }
    }

    /**
     * Fetch a new CSRF token from the API.
     */
    private async fetchToken(): Promise<string> {
        try {
            const response = await fetch('/api/v1/csrf-token', {
                method: 'GET',
                credentials: 'include', // Include cookies
            });

            if (!response.ok) {
                throw new Error(`Failed to fetch CSRF token: ${response.status}`);
            }

            const data = await response.json();

            this.tokenData = {
                token: data.csrf_token,
                expiresAt: new Date(data.expires_at),
            };

            return this.tokenData.token;
        } catch (error) {
            console.error('CSRF token fetch failed:', error);
            throw error;
        }
    }

    /**
     * Check if the cached token is still valid.
     */
    private isTokenValid(): boolean {
        if (!this.tokenData) return false;

        const now = new Date();
        const bufferTime = new Date(this.tokenData.expiresAt.getTime() - TOKEN_REFRESH_BUFFER);

        return now < bufferTime;
    }

    /**
     * Get token from cookie (if available).
     */
    getTokenFromCookie(): string | null {
        if (typeof document === 'undefined') return null;

        const cookies = document.cookie.split(';');
        for (const cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === CSRF_COOKIE_NAME) {
                return decodeURIComponent(value);
            }
        }
        return null;
    }

    /**
     * Attach CSRF token to request headers.
     * 
     * @param headers - Existing headers object or Headers instance
     * @returns Headers with CSRF token attached
     */
    async attachToHeaders(headers: HeadersInit = {}): Promise<Headers> {
        const token = await this.getToken();
        const newHeaders = new Headers(headers);
        newHeaders.set(CSRF_HEADER_NAME, token);
        return newHeaders;
    }

    /**
     * Create a fetch wrapper that automatically includes CSRF token.
     * 
     * Use this for state-changing requests (POST, PUT, DELETE, PATCH).
     */
    async csrfFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
        const method = init.method?.toUpperCase() || 'GET';

        // Only attach CSRF for state-changing methods
        if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
            const headers = await this.attachToHeaders(init.headers);
            return fetch(input, { ...init, headers, credentials: 'include' });
        }

        return fetch(input, { ...init, credentials: 'include' });
    }

    /**
     * Clear cached token (useful for logout).
     */
    clearToken(): void {
        this.tokenData = null;
    }
}

// Export singleton instance
export const csrfManager = new CSRFManager();

// Export convenience functions
export const getCSRFToken = () => csrfManager.getToken();
export const csrfFetch = (input: RequestInfo | URL, init?: RequestInit) =>
    csrfManager.csrfFetch(input, init);
