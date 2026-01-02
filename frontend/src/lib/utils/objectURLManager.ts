/**
 * Object URL Manager - Memory management for blob URLs (AC: 40-43)
 * @module lib/utils/objectURLManager
 * 
 * Prevents memory leaks by tracking and revoking Object URLs
 */

class ObjectURLManager {
    private urls = new Set<string>();

    /**
     * Create an Object URL and track it for later cleanup
     */
    create(object: Blob | MediaSource): string {
        const url = URL.createObjectURL(object);
        this.urls.add(url);
        return url;
    }

    /**
     * Revoke a specific Object URL
     */
    revoke(url: string): void {
        if (this.urls.has(url)) {
            URL.revokeObjectURL(url);
            this.urls.delete(url);
        }
    }

    /**
     * Revoke all tracked Object URLs
     */
    revokeAll(): void {
        this.urls.forEach(url => URL.revokeObjectURL(url));
        this.urls.clear();
    }

    /**
     * Get count of active URLs (for debugging)
     */
    get activeCount(): number {
        return this.urls.size;
    }
}

// Singleton instance
export const objectURLManager = new ObjectURLManager();
