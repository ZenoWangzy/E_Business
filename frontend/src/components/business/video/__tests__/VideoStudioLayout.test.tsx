/**
 * VideoStudioLayout Component Tests
 * Story 4.1: Video Studio UI & Mode Selection
 */

import { render, screen, fireEvent, act } from '@testing-library/react';
import { VideoStudioLayout } from '../VideoStudioLayout';

// Mock GlobalNavRail
jest.mock('../../copy/GlobalNavRail', () => ({
    GlobalNavRail: ({ activeModule }: { activeModule: string }) => (
        <nav data-testid="global-nav-rail" data-active-module={activeModule}>
            Global Nav Rail
        </nav>
    ),
}));

// Mock VideoSettingsPanel
jest.mock('../VideoSettingsPanel', () => ({
    VideoSettingsPanel: ({
        isCollapsed,
        onToggle,
    }: {
        isCollapsed: boolean;
        onToggle: () => void;
    }) => (
        <aside data-testid="video-settings-panel" data-collapsed={isCollapsed}>
            <button onClick={onToggle} data-testid="toggle-settings">
                Toggle
            </button>
        </aside>
    ),
}));

// Mock VideoPlayerPreview
jest.mock('../VideoPlayerPreview', () => ({
    VideoPlayerPreview: () => (
        <div data-testid="video-player-preview">Video Player Preview</div>
    ),
}));

// Mock useVideoConfig hook
jest.mock('@/hooks/useVideoConfig', () => ({
    useVideoConfig: () => ({
        config: {
            mode: 'creative-ad',
            duration: 15,
            music: 'upbeat-corporate',
        },
        updateConfig: jest.fn(),
        isLoaded: true,
    }),
}));

describe('VideoStudioLayout', () => {
    const defaultProps = {
        workspaceId: 'ws-123',
        productId: 'prod-456',
    };

    beforeEach(() => {
        // Mock window.innerWidth for responsive tests
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: 1200,
        });

        // Mock resize event
        window.dispatchEvent = jest.fn();
    });

    describe('Rendering', () => {
        it('should render GlobalNavRail', () => {
            render(<VideoStudioLayout {...defaultProps} />);

            expect(screen.getByTestId('global-nav-rail')).toBeInTheDocument();
        });

        it('should render VideoSettingsPanel', () => {
            render(<VideoStudioLayout {...defaultProps} />);

            expect(screen.getByTestId('video-settings-panel')).toBeInTheDocument();
        });

        it('should render VideoPlayerPreview', () => {
            render(<VideoStudioLayout {...defaultProps} />);

            expect(screen.getByTestId('video-player-preview')).toBeInTheDocument();
        });

        it('should pass video as activeModule to GlobalNavRail', () => {
            render(<VideoStudioLayout {...defaultProps} />);

            const navRail = screen.getByTestId('global-nav-rail');
            expect(navRail).toHaveAttribute('data-active-module', 'video');
        });
    });

    describe('Layout Structure', () => {
        it('should have main landmark region', () => {
            render(<VideoStudioLayout {...defaultProps} />);

            expect(screen.getByRole('main')).toBeInTheDocument();
        });

        it('should have proper aria-label on main', () => {
            render(<VideoStudioLayout {...defaultProps} />);

            expect(
                screen.getByRole('main', { name: /video preview and timeline/i })
            ).toBeInTheDocument();
        });
    });

    describe('Settings Panel Toggle', () => {
        it('should toggle settings panel collapsed state', () => {
            render(<VideoStudioLayout {...defaultProps} />);

            const toggleButton = screen.getByTestId('toggle-settings');
            const settingsPanel = screen.getByTestId('video-settings-panel');

            expect(settingsPanel).toHaveAttribute('data-collapsed', 'false');

            fireEvent.click(toggleButton);
            expect(settingsPanel).toHaveAttribute('data-collapsed', 'true');

            fireEvent.click(toggleButton);
            expect(settingsPanel).toHaveAttribute('data-collapsed', 'false');
        });
    });

    describe('Responsive Behavior', () => {
        it('should auto-collapse on mobile width', () => {
            // Set mobile width
            Object.defineProperty(window, 'innerWidth', {
                writable: true,
                configurable: true,
                value: 600,
            });

            render(<VideoStudioLayout {...defaultProps} />);

            // Trigger resize event manually
            act(() => {
                window.dispatchEvent(new Event('resize'));
            });

            const settingsPanel = screen.getByTestId('video-settings-panel');
            expect(settingsPanel).toHaveAttribute('data-collapsed', 'true');
        });
    });
});
