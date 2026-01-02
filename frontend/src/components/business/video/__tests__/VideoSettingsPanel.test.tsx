/**
 * VideoSettingsPanel Component Tests
 * Story 4.1: Video Studio UI & Mode Selection
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { VideoSettingsPanel } from '../VideoSettingsPanel';
import {
    VIDEO_MODE_OPTIONS,
    DURATION_OPTIONS,
    MUSIC_OPTIONS,
    DEFAULT_VIDEO_CONFIG,
} from '@/types/video';
import type { VideoConfig, VideoMode } from '@/types/video';

describe('VideoSettingsPanel', () => {
    const mockOnToggle = jest.fn();
    const mockOnConfigChange = jest.fn();
    const defaultConfig: VideoConfig = DEFAULT_VIDEO_CONFIG;

    beforeEach(() => {
        mockOnToggle.mockClear();
        mockOnConfigChange.mockClear();
    });

    describe('Rendering', () => {
        it('should render all mode options', () => {
            render(
                <VideoSettingsPanel
                    isCollapsed={false}
                    onToggle={mockOnToggle}
                    config={defaultConfig}
                    onConfigChange={mockOnConfigChange}
                />
            );

            VIDEO_MODE_OPTIONS.forEach((option) => {
                expect(screen.getByTestId(`mode-${option.value}`)).toBeInTheDocument();
            });
        });

        it('should display mode labels in Chinese', () => {
            render(
                <VideoSettingsPanel
                    isCollapsed={false}
                    onToggle={mockOnToggle}
                    config={defaultConfig}
                    onConfigChange={mockOnConfigChange}
                />
            );

            expect(screen.getByText('创意广告')).toBeInTheDocument();
            expect(screen.getByText('功能介绍')).toBeInTheDocument();
        });

        it('should render duration select', () => {
            render(
                <VideoSettingsPanel
                    isCollapsed={false}
                    onToggle={mockOnToggle}
                    config={defaultConfig}
                    onConfigChange={mockOnConfigChange}
                />
            );

            expect(screen.getByTestId('duration-select')).toBeInTheDocument();
        });

        it('should render music select', () => {
            render(
                <VideoSettingsPanel
                    isCollapsed={false}
                    onToggle={mockOnToggle}
                    config={defaultConfig}
                    onConfigChange={mockOnConfigChange}
                />
            );

            expect(screen.getByTestId('music-select')).toBeInTheDocument();
        });
    });

    describe('Mode Selection', () => {
        it('should handle mode selection', () => {
            render(
                <VideoSettingsPanel
                    isCollapsed={false}
                    onToggle={mockOnToggle}
                    config={defaultConfig}
                    onConfigChange={mockOnConfigChange}
                />
            );

            fireEvent.click(screen.getByTestId('mode-functional-intro'));
            expect(mockOnConfigChange).toHaveBeenCalledWith({ mode: 'functional-intro' });
        });

        it('should highlight selected mode', () => {
            const configWithMode: VideoConfig = {
                ...defaultConfig,
                mode: 'functional-intro' as VideoMode,
            };

            render(
                <VideoSettingsPanel
                    isCollapsed={false}
                    onToggle={mockOnToggle}
                    config={configWithMode}
                    onConfigChange={mockOnConfigChange}
                />
            );

            const modeButton = screen.getByTestId('mode-functional-intro');
            expect(modeButton).toHaveAttribute('aria-checked', 'true');
        });
    });

    describe('Accessibility', () => {
        it('should have proper ARIA labels on mode options', () => {
            render(
                <VideoSettingsPanel
                    isCollapsed={false}
                    onToggle={mockOnToggle}
                    config={defaultConfig}
                    onConfigChange={mockOnConfigChange}
                />
            );

            const creativeAdButton = screen.getByTestId('mode-creative-ad');
            expect(creativeAdButton).toHaveAttribute('role', 'radio');
            expect(creativeAdButton).toHaveAttribute('aria-label');
        });

        it('should have role radiogroup on mode container', () => {
            render(
                <VideoSettingsPanel
                    isCollapsed={false}
                    onToggle={mockOnToggle}
                    config={defaultConfig}
                    onConfigChange={mockOnConfigChange}
                />
            );

            expect(screen.getByRole('radiogroup')).toBeInTheDocument();
        });

        it('should have complementary role on aside', () => {
            render(
                <VideoSettingsPanel
                    isCollapsed={false}
                    onToggle={mockOnToggle}
                    config={defaultConfig}
                    onConfigChange={mockOnConfigChange}
                />
            );

            expect(screen.getByRole('complementary')).toBeInTheDocument();
        });
    });

    describe('Collapsed State', () => {
        it('should hide content when collapsed', () => {
            render(
                <VideoSettingsPanel
                    isCollapsed={true}
                    onToggle={mockOnToggle}
                    config={defaultConfig}
                    onConfigChange={mockOnConfigChange}
                />
            );

            expect(screen.queryByText('视频模式')).not.toBeInTheDocument();
        });

        it('should show toggle button when collapsed', () => {
            render(
                <VideoSettingsPanel
                    isCollapsed={true}
                    onToggle={mockOnToggle}
                    config={defaultConfig}
                    onConfigChange={mockOnConfigChange}
                />
            );

            const toggleButton = screen.getByRole('button', { name: /展开设置面板/i });
            expect(toggleButton).toBeInTheDocument();
        });

        it('should call onToggle when toggle button clicked', () => {
            render(
                <VideoSettingsPanel
                    isCollapsed={false}
                    onToggle={mockOnToggle}
                    config={defaultConfig}
                    onConfigChange={mockOnConfigChange}
                />
            );

            fireEvent.click(screen.getByRole('button', { name: /收起设置面板/i }));
            expect(mockOnToggle).toHaveBeenCalled();
        });
    });
});
