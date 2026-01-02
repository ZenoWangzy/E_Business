/**
 * useVideoStudio Hook Tests
 * Story 4.1: Video Studio UI & Mode Selection
 */

import { renderHook, act } from '@testing-library/react';
import { useVideoStudio } from '@/hooks/useVideoStudio';

// Mock useVideoConfig
jest.mock('@/hooks/useVideoConfig', () => ({
    useVideoConfig: () => ({
        config: {
            mode: 'creative-ad',
            duration: 15,
            music: 'upbeat-corporate',
        },
        isLoaded: true,
        updateConfig: jest.fn(),
        resetConfig: jest.fn(),
    }),
}));

describe('useVideoStudio', () => {
    const workspaceId = 'ws-test-123';
    const productId = 'prod-test-456';

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should return initial state correctly', () => {
            const { result } = renderHook(() =>
                useVideoStudio(workspaceId, productId)
            );

            expect(result.current.isSettingsCollapsed).toBe(false);
            expect(result.current.isGenerating).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it('should return config from useVideoConfig', () => {
            const { result } = renderHook(() =>
                useVideoStudio(workspaceId, productId)
            );

            expect(result.current.config.mode).toBe('creative-ad');
            expect(result.current.config.duration).toBe(15);
        });
    });

    describe('Settings Panel', () => {
        it('should toggle settings collapsed state', () => {
            const { result } = renderHook(() =>
                useVideoStudio(workspaceId, productId)
            );

            expect(result.current.isSettingsCollapsed).toBe(false);

            act(() => {
                result.current.toggleSettings();
            });

            expect(result.current.isSettingsCollapsed).toBe(true);

            act(() => {
                result.current.toggleSettings();
            });

            expect(result.current.isSettingsCollapsed).toBe(false);
        });

        it('should set settings collapsed directly', () => {
            const { result } = renderHook(() =>
                useVideoStudio(workspaceId, productId)
            );

            act(() => {
                result.current.setSettingsCollapsed(true);
            });

            expect(result.current.isSettingsCollapsed).toBe(true);
        });
    });

    describe('Error Handling', () => {
        it('should set error message', () => {
            const { result } = renderHook(() =>
                useVideoStudio(workspaceId, productId)
            );

            act(() => {
                result.current.setError('Test error message');
            });

            expect(result.current.error).toBe('Test error message');
        });

        it('should clear error', () => {
            const { result } = renderHook(() =>
                useVideoStudio(workspaceId, productId)
            );

            act(() => {
                result.current.setError('Test error');
            });

            expect(result.current.error).toBe('Test error');

            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });

    describe('Generation', () => {
        it('should set isGenerating during startGeneration', async () => {
            const { result } = renderHook(() =>
                useVideoStudio(workspaceId, productId)
            );

            expect(result.current.isGenerating).toBe(false);

            let promise: Promise<void>;
            act(() => {
                promise = result.current.startGeneration();
            });

            // During generation
            expect(result.current.isGenerating).toBe(true);

            await act(async () => {
                await promise;
            });

            // After generation
            expect(result.current.isGenerating).toBe(false);
        });
    });
});
