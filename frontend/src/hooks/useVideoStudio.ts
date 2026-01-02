'use client';

/**
 * useVideoStudio Hook
 * Story 4.1: Video Studio UI & Mode Selection
 * 
 * Main business logic hook for Video Studio.
 * Combines configuration, layout state, and studio operations.
 */

import { useState, useCallback } from 'react';
import { useVideoConfig } from './useVideoConfig';

export interface VideoStudioState {
    isSettingsCollapsed: boolean;
    isGenerating: boolean;
    error: string | null;
}

export function useVideoStudio(workspaceId: string, productId: string) {
    const videoConfig = useVideoConfig(workspaceId, productId);

    const [state, setState] = useState<VideoStudioState>({
        isSettingsCollapsed: false,
        isGenerating: false,
        error: null,
    });

    const toggleSettings = useCallback(() => {
        setState((prev) => ({
            ...prev,
            isSettingsCollapsed: !prev.isSettingsCollapsed,
        }));
    }, []);

    const setSettingsCollapsed = useCallback((collapsed: boolean) => {
        setState((prev) => ({
            ...prev,
            isSettingsCollapsed: collapsed,
        }));
    }, []);

    const setError = useCallback((error: string | null) => {
        setState((prev) => ({
            ...prev,
            error,
        }));
    }, []);

    const clearError = useCallback(() => {
        setState((prev) => ({
            ...prev,
            error: null,
        }));
    }, []);

    // Placeholder for future video generation
    const startGeneration = useCallback(async () => {
        setState((prev) => ({
            ...prev,
            isGenerating: true,
            error: null,
        }));

        try {
            // TODO: Implement actual video generation API call
            // This will be implemented in Story 4.2
            // Video generation will be implemented in Story 4.2

            // Simulate a delay for demo purposes
            await new Promise((resolve) => setTimeout(resolve, 1000));

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : '生成视频时发生错误';
            setError(errorMessage);
        } finally {
            setState((prev) => ({
                ...prev,
                isGenerating: false,
            }));
        }
    }, [videoConfig.config, setError]);

    return {
        // Configuration
        config: videoConfig.config,
        isConfigLoaded: videoConfig.isLoaded,
        updateConfig: videoConfig.updateConfig,
        resetConfig: videoConfig.resetConfig,

        // Layout state
        isSettingsCollapsed: state.isSettingsCollapsed,
        toggleSettings,
        setSettingsCollapsed,

        // Generation state
        isGenerating: state.isGenerating,
        startGeneration,

        // Error handling
        error: state.error,
        setError,
        clearError,
    };
}
