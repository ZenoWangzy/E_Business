'use client';

/**
 * AudioRegenerationPanel Component Tests
 * Story 4.4: Video Preview & TTS Integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AudioRegenerationPanel } from '../AudioRegenerationPanel';
import { DEFAULT_AUDIO_CONFIG, VOICE_OPTIONS } from '@/types/video';

// Mock next/navigation
jest.mock('next/navigation', () => ({
    useRouter: () => ({
        push: jest.fn(),
        refresh: jest.fn(),
    }),
}));

describe('AudioRegenerationPanel', () => {
    const mockOnRegenerate = jest.fn().mockResolvedValue(undefined);
    const defaultProps = {
        projectId: 'test-project-id',
        currentConfig: DEFAULT_AUDIO_CONFIG,
        onRegenerate: mockOnRegenerate,
        isRegenerating: false,
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders audio configuration panel with all controls', () => {
        render(<AudioRegenerationPanel {...defaultProps} />);

        // Check title
        expect(screen.getByText('音频配置')).toBeInTheDocument();

        // Check voice selection
        expect(screen.getByText('AI 声音')).toBeInTheDocument();

        // Check speed slider
        expect(screen.getByText('播放速度')).toBeInTheDocument();

        // Check volume slider
        expect(screen.getByText('音量')).toBeInTheDocument();

        // Check regenerate button
        expect(screen.getByText('重新生成音频')).toBeInTheDocument();
    });

    it('displays current audio configuration', () => {
        render(<AudioRegenerationPanel {...defaultProps} />);

        // Check default speed value
        expect(screen.getByText('1x')).toBeInTheDocument();

        // Check default volume value
        expect(screen.getByText('100%')).toBeInTheDocument();
    });

    it('disables regenerate button when no changes made', () => {
        render(<AudioRegenerationPanel {...defaultProps} />);

        const button = screen.getByRole('button', { name: /重新生成音频/i });
        expect(button).toBeDisabled();
    });

    it('enables regenerate button when changes are made', async () => {
        render(<AudioRegenerationPanel {...defaultProps} />);

        // Find and interact with the voice select
        const voiceSelect = screen.getByRole('combobox');
        fireEvent.click(voiceSelect);

        // Wait for dropdown and select a different voice
        await waitFor(() => {
            const option = screen.getByText('Alloy (温和)');
            fireEvent.click(option);
        });

        // Button should be enabled now
        const button = screen.getByRole('button', { name: /重新生成音频/i });
        expect(button).not.toBeDisabled();
    });

    it('shows loading state during regeneration', () => {
        render(
            <AudioRegenerationPanel
                {...defaultProps}
                isRegenerating={true}
            />
        );

        expect(screen.getByText('正在重新生成...')).toBeInTheDocument();
    });

    it('calls onRegenerate with correct params when button clicked', async () => {
        const { rerender } = render(<AudioRegenerationPanel {...defaultProps} />);

        // Change voice to enable the button
        const voiceSelect = screen.getByRole('combobox');
        fireEvent.click(voiceSelect);

        await waitFor(() => {
            const option = screen.getByText('Echo (深沉)');
            fireEvent.click(option);
        });

        // Click regenerate button
        const button = screen.getByRole('button', { name: /重新生成音频/i });
        fireEvent.click(button);

        await waitFor(() => {
            expect(mockOnRegenerate).toHaveBeenCalledWith({
                voiceId: 'echo',
                speed: 1.0,
                volume: 1.0,
            });
        });
    });

    it('displays cost estimation', () => {
        render(<AudioRegenerationPanel {...defaultProps} />);

        expect(screen.getByText(/预计费用/)).toBeInTheDocument();
    });

    it('shows unsaved changes indicator when config modified', async () => {
        render(<AudioRegenerationPanel {...defaultProps} />);

        // Initially no indicator
        expect(screen.queryByText('* 有未保存的更改')).not.toBeInTheDocument();

        // Change voice
        const voiceSelect = screen.getByRole('combobox');
        fireEvent.click(voiceSelect);

        await waitFor(() => {
            const option = screen.getByText('Nova (活泼)');
            fireEvent.click(option);
        });

        // Indicator should appear
        expect(screen.getByText('* 有未保存的更改')).toBeInTheDocument();
    });

    it('disables controls during regeneration', () => {
        render(
            <AudioRegenerationPanel
                {...defaultProps}
                isRegenerating={true}
            />
        );

        const voiceSelect = screen.getByRole('combobox');
        expect(voiceSelect).toBeDisabled();
    });

    it('has accessible screen reader status', () => {
        render(<AudioRegenerationPanel {...defaultProps} />);

        const status = screen.getByRole('status');
        expect(status).toHaveTextContent('音频配置未修改');
    });

    it('announces regenerating status to screen readers', () => {
        render(
            <AudioRegenerationPanel
                {...defaultProps}
                isRegenerating={true}
            />
        );

        const status = screen.getByRole('status');
        expect(status).toHaveTextContent('正在重新生成音频');
    });
});
