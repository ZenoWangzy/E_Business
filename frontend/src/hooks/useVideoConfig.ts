'use client';

/**
 * useVideoConfig Hook
 * Story 4.1: Video Studio UI & Mode Selection
 * 
 * Manages video configuration state with localStorage persistence.
 * Resets to defaults when workspace changes.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
    VideoConfig,
    VideoMode,
    VideoDuration,
    BackgroundMusic,
    DEFAULT_VIDEO_CONFIG,
} from '@/types/video';

const STORAGE_KEY_PREFIX = 'video-config';
const STORAGE_EXPIRY_DAYS = 30;

interface StoredConfig {
    config: VideoConfig;
    workspaceId: string;
    productId: string;
    timestamp: number;
}

function getStorageKey(workspaceId: string, productId: string): string {
    return `${STORAGE_KEY_PREFIX}-${workspaceId}-${productId}`;
}

function isExpired(timestamp: number): boolean {
    const expiryMs = STORAGE_EXPIRY_DAYS * 24 * 60 * 60 * 1000;
    return Date.now() - timestamp > expiryMs;
}

function loadFromStorage(workspaceId: string, productId: string): VideoConfig | null {
    if (typeof window === 'undefined') return null;

    try {
        const key = getStorageKey(workspaceId, productId);
        const stored = localStorage.getItem(key);

        if (!stored) return null;

        const parsed: StoredConfig = JSON.parse(stored);

        // Check if stored config matches current workspace/product
        if (parsed.workspaceId !== workspaceId || parsed.productId !== productId) {
            return null;
        }

        // Check expiry
        if (isExpired(parsed.timestamp)) {
            localStorage.removeItem(key);
            return null;
        }

        return parsed.config;
    } catch {
        return null;
    }
}

function saveToStorage(
    workspaceId: string,
    productId: string,
    config: VideoConfig
): void {
    if (typeof window === 'undefined') return;

    try {
        const key = getStorageKey(workspaceId, productId);
        const stored: StoredConfig = {
            config,
            workspaceId,
            productId,
            timestamp: Date.now(),
        };
        localStorage.setItem(key, JSON.stringify(stored));
    } catch {
        // Silently fail if localStorage is full or unavailable
    }
}

export function useVideoConfig(workspaceId: string, productId: string) {
    const [config, setConfig] = useState<VideoConfig>(DEFAULT_VIDEO_CONFIG);
    const [isLoaded, setIsLoaded] = useState(false);
    const prevWorkspaceRef = useRef<string>(workspaceId);
    const prevProductRef = useRef<string>(productId);

    // Load config from storage on mount
    useEffect(() => {
        const stored = loadFromStorage(workspaceId, productId);
        if (stored) {
            setConfig(stored);
        }
        setIsLoaded(true);
    }, [workspaceId, productId]);

    // Reset to defaults when workspace/product changes
    useEffect(() => {
        if (
            isLoaded &&
            (prevWorkspaceRef.current !== workspaceId || prevProductRef.current !== productId)
        ) {
            setConfig(DEFAULT_VIDEO_CONFIG);
            prevWorkspaceRef.current = workspaceId;
            prevProductRef.current = productId;
        }
    }, [workspaceId, productId, isLoaded]);

    // Save to storage whenever config changes
    useEffect(() => {
        if (isLoaded) {
            saveToStorage(workspaceId, productId, config);
        }
    }, [config, workspaceId, productId, isLoaded]);

    // Cross-tab synchronization (M3 fix - AC7 requirement)
    useEffect(() => {
        const handleStorageChange = (event: StorageEvent) => {
            const key = getStorageKey(workspaceId, productId);
            if (event.key === key && event.newValue) {
                try {
                    const parsed: StoredConfig = JSON.parse(event.newValue);
                    if (
                        parsed.workspaceId === workspaceId &&
                        parsed.productId === productId &&
                        !isExpired(parsed.timestamp)
                    ) {
                        setConfig(parsed.config);
                    }
                } catch {
                    // Ignore parse errors
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [workspaceId, productId]);

    const updateConfig = useCallback((updates: Partial<VideoConfig>) => {
        setConfig((prev) => ({ ...prev, ...updates }));
    }, []);

    const setMode = useCallback((mode: VideoMode) => {
        updateConfig({ mode });
    }, [updateConfig]);

    const setDuration = useCallback((duration: VideoDuration) => {
        updateConfig({ duration });
    }, [updateConfig]);

    const setMusic = useCallback((music: BackgroundMusic) => {
        updateConfig({ music });
    }, [updateConfig]);

    const resetConfig = useCallback(() => {
        setConfig(DEFAULT_VIDEO_CONFIG);
    }, []);

    return {
        config,
        isLoaded,
        updateConfig,
        setMode,
        setDuration,
        setMusic,
        resetConfig,
    };
}
