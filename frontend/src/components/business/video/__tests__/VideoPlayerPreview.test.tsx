/**
 * VideoPlayerPreview Component Tests
 * Story 4.1: Video Studio UI & Mode Selection
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { VideoPlayerPreview } from '../VideoPlayerPreview';
import { DEFAULT_VIDEO_CONFIG, VIDEO_MODE_OPTIONS } from '@/types/video';
import type { VideoConfig } from '@/types/video';

describe('VideoPlayerPreview', () => {
    const defaultConfig: VideoConfig = DEFAULT_VIDEO_CONFIG;

    describe('Rendering', () => {
        it('should render video preview area', () => {
            render(<VideoPlayerPreview config={defaultConfig} />);

            expect(screen.getByTestId('video-preview-area')).toBeInTheDocument();
        });

        it('should display current mode label', () => {
            render(<VideoPlayerPreview config={defaultConfig} />);

            const modeOption = VIDEO_MODE_OPTIONS.find(o => o.value === defaultConfig.mode);
            expect(screen.getByText(modeOption!.label)).toBeInTheDocument();
        });

        it('should display duration badge', () => {
            render(<VideoPlayerPreview config={defaultConfig} />);

            expect(screen.getByText(`${defaultConfig.duration}秒`)).toBeInTheDocument();
        });

        it('should render play/pause button', () => {
            render(<VideoPlayerPreview config={defaultConfig} />);

            expect(screen.getByTestId('play-pause-button')).toBeInTheDocument();
        });

        it('should render timeline slider', () => {
            render(<VideoPlayerPreview config={defaultConfig} />);

            expect(screen.getByTestId('timeline-slider')).toBeInTheDocument();
        });
    });

    describe('Playback Controls', () => {
        it('should toggle play/pause state on button click', () => {
            render(<VideoPlayerPreview config={defaultConfig} />);

            const playButton = screen.getByTestId('play-pause-button');
            expect(playButton).toHaveAttribute('aria-label', '播放');

            fireEvent.click(playButton);
            expect(playButton).toHaveAttribute('aria-label', '暂停');

            fireEvent.click(playButton);
            expect(playButton).toHaveAttribute('aria-label', '播放');
        });

        it('should render skip back button', () => {
            render(<VideoPlayerPreview config={defaultConfig} />);

            expect(screen.getByTestId('skip-back-button')).toBeInTheDocument();
        });

        it('should render skip forward button', () => {
            render(<VideoPlayerPreview config={defaultConfig} />);

            expect(screen.getByTestId('skip-forward-button')).toBeInTheDocument();
        });

        it('should render fullscreen button', () => {
            render(<VideoPlayerPreview config={defaultConfig} />);

            expect(screen.getByTestId('fullscreen-button')).toBeInTheDocument();
        });
    });

    describe('Accessibility', () => {
        it('should have region role on preview area', () => {
            render(<VideoPlayerPreview config={defaultConfig} />);

            expect(screen.getByRole('region', { name: /video preview/i })).toBeInTheDocument();
        });

        it('should have aria-label on play button', () => {
            render(<VideoPlayerPreview config={defaultConfig} />);

            const playButton = screen.getByTestId('play-pause-button');
            expect(playButton).toHaveAttribute('aria-label');
        });

        it('should have aria-valuenow on timeline slider', () => {
            render(<VideoPlayerPreview config={defaultConfig} />);

            const slider = screen.getByTestId('timeline-slider');
            expect(slider).toHaveAttribute('aria-valuenow');
        });

        it('should have screen reader status announcements', () => {
            render(<VideoPlayerPreview config={defaultConfig} />);

            expect(screen.getByTestId('player-status')).toBeInTheDocument();
        });
    });

    describe('Different Configurations', () => {
        it('should display 30 second duration', () => {
            const config30s: VideoConfig = {
                ...defaultConfig,
                duration: 30,
            };

            render(<VideoPlayerPreview config={config30s} />);

            expect(screen.getByText('30秒')).toBeInTheDocument();
        });

        it('should display functional intro mode', () => {
            const configFunctional: VideoConfig = {
                ...defaultConfig,
                mode: 'functional-intro',
            };

            render(<VideoPlayerPreview config={configFunctional} />);

            const modeOption = VIDEO_MODE_OPTIONS.find(o => o.value === 'functional-intro');
            expect(screen.getByText(modeOption!.label)).toBeInTheDocument();
        });
    });
});
