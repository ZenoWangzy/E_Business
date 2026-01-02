/**
 * useVideoConfig Hook Tests
 * Story 4.1: Video Studio UI & Mode Selection
 */

import { renderHook, act } from '@testing-library/react';
import { useVideoConfig } from '@/hooks/useVideoConfig';
import { DEFAULT_VIDEO_CONFIG } from '@/types/video';

// Mock localStorage
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: jest.fn((key: string) => store[key] || null),
        setItem: jest.fn((key: string, value: string) => {
            store[key] = value;
        }),
        removeItem: jest.fn((key: string) => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
    };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('useVideoConfig', () => {
    const workspaceId = 'ws-test-123';
    const productId = 'prod-test-456';

    beforeEach(() => {
        localStorageMock.clear();
        jest.clearAllMocks();
    });

    describe('Initialization', () => {
        it('should return default config on first load', () => {
            const { result } = renderHook(() =>
                useVideoConfig(workspaceId, productId)
            );

            expect(result.current.config).toEqual(DEFAULT_VIDEO_CONFIG);
        });

        it('should set isLoaded to true after initialization', async () => {
            const { result } = renderHook(() =>
                useVideoConfig(workspaceId, productId)
            );

            // Wait for effect to run
            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 0));
            });

            expect(result.current.isLoaded).toBe(true);
        });
    });

    describe('Config Updates', () => {
        it('should update mode correctly', async () => {
            const { result } = renderHook(() =>
                useVideoConfig(workspaceId, productId)
            );

            await act(async () => {
                result.current.setMode('functional-intro');
            });

            expect(result.current.config.mode).toBe('functional-intro');
        });

        it('should update duration correctly', async () => {
            const { result } = renderHook(() =>
                useVideoConfig(workspaceId, productId)
            );

            await act(async () => {
                result.current.setDuration(30);
            });

            expect(result.current.config.duration).toBe(30);
        });

        it('should update music correctly', async () => {
            const { result } = renderHook(() =>
                useVideoConfig(workspaceId, productId)
            );

            await act(async () => {
                result.current.setMusic('modern-tech');
            });

            expect(result.current.config.music).toBe('modern-tech');
        });

        it('should handle partial updates via updateConfig', async () => {
            const { result } = renderHook(() =>
                useVideoConfig(workspaceId, productId)
            );

            await act(async () => {
                result.current.updateConfig({
                    mode: 'functional-intro',
                    duration: 30,
                });
            });

            expect(result.current.config.mode).toBe('functional-intro');
            expect(result.current.config.duration).toBe(30);
            expect(result.current.config.music).toBe(DEFAULT_VIDEO_CONFIG.music);
        });
    });

    describe('Reset', () => {
        it('should reset config to defaults', async () => {
            const { result } = renderHook(() =>
                useVideoConfig(workspaceId, productId)
            );

            // Change config
            await act(async () => {
                result.current.updateConfig({
                    mode: 'functional-intro',
                    duration: 30,
                    music: 'modern-tech',
                });
            });

            // Reset
            await act(async () => {
                result.current.resetConfig();
            });

            expect(result.current.config).toEqual(DEFAULT_VIDEO_CONFIG);
        });
    });

    describe('Persistence', () => {
        it('should save to localStorage when config changes', async () => {
            const { result } = renderHook(() =>
                useVideoConfig(workspaceId, productId)
            );

            await act(async () => {
                await new Promise((resolve) => setTimeout(resolve, 0));
            });

            await act(async () => {
                result.current.setMode('functional-intro');
            });

            expect(localStorageMock.setItem).toHaveBeenCalled();
        });
    });
});
