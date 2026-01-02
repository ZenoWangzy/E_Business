/**
 * UsageProgressBar Component Tests
 * 
 * Story 5.2: User Usage Dashboard
 */

import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UsageProgressBar } from '../UsageProgressBar';

describe('UsageProgressBar', () => {
    // Color threshold tests
    describe('Color thresholds', () => {
        it('displays green color when below 70%', () => {
            render(<UsageProgressBar credits={{ total: 100, used: 50, remaining: 50 }} />);
            const progress = screen.getByRole('progressbar');
            expect(progress).toHaveAttribute('aria-valuenow', '50');
            // Check indicator has green class
            const indicator = screen.getByTestId('usage-progress-indicator');
            expect(indicator).toHaveClass('bg-green-500');
        });

        it('displays yellow color exactly at 70%', () => {
            render(<UsageProgressBar credits={{ total: 100, used: 70, remaining: 30 }} />);
            const indicator = screen.getByTestId('usage-progress-indicator');
            expect(indicator).toHaveClass('bg-yellow-500');
        });

        it('displays yellow color between 70-90%', () => {
            render(<UsageProgressBar credits={{ total: 100, used: 80, remaining: 20 }} />);
            const indicator = screen.getByTestId('usage-progress-indicator');
            expect(indicator).toHaveClass('bg-yellow-500');
        });

        it('displays red color exactly at 90%', () => {
            render(<UsageProgressBar credits={{ total: 100, used: 90, remaining: 10 }} />);
            const indicator = screen.getByTestId('usage-progress-indicator');
            expect(indicator).toHaveClass('bg-red-500');
        });

        it('displays red color above 90%', () => {
            render(<UsageProgressBar credits={{ total: 100, used: 95, remaining: 5 }} />);
            const indicator = screen.getByTestId('usage-progress-indicator');
            expect(indicator).toHaveClass('bg-red-500');
        });
    });

    // Accessibility tests
    describe('Accessibility', () => {
        it('has proper ARIA labels', () => {
            render(<UsageProgressBar credits={{ total: 100, used: 75, remaining: 25 }} />);
            const progress = screen.getByRole('progressbar');
            expect(progress).toHaveAttribute('aria-valuemin', '0');
            expect(progress).toHaveAttribute('aria-valuemax', '100');
            expect(progress).toHaveAttribute('aria-valuenow', '75');
            expect(progress).toHaveAttribute('aria-label', expect.stringContaining('75%'));
        });

        it('is keyboard focusable', () => {
            render(<UsageProgressBar credits={{ total: 100, used: 50, remaining: 50 }} />);
            const progress = screen.getByRole('progressbar');
            expect(progress).toHaveAttribute('tabIndex', '0');
        });
    });

    // Display tests
    describe('Display', () => {
        it('shows credits used and total', () => {
            render(<UsageProgressBar credits={{ total: 1000, used: 450, remaining: 550 }} />);
            expect(screen.getByText('450 / 1000 积分')).toBeInTheDocument();
        });

        it('shows remaining credits', () => {
            render(<UsageProgressBar credits={{ total: 1000, used: 450, remaining: 550 }} />);
            expect(screen.getByText(/剩余: 550 积分/)).toBeInTheDocument();
        });

        it('shows percentage', () => {
            render(<UsageProgressBar credits={{ total: 100, used: 45, remaining: 55 }} />);
            expect(screen.getByText('45%')).toBeInTheDocument();
        });
    });

    // Edge cases
    describe('Edge cases', () => {
        it('handles 0 percentage correctly', () => {
            render(<UsageProgressBar credits={{ total: 100, used: 0, remaining: 100 }} />);
            expect(screen.getByText('0 / 100 积分')).toBeInTheDocument();
            expect(screen.getByText('0%')).toBeInTheDocument();
        });

        it('handles 100 percentage correctly', () => {
            render(<UsageProgressBar credits={{ total: 100, used: 100, remaining: 0 }} />);
            expect(screen.getByText('100 / 100 积分')).toBeInTheDocument();
            expect(screen.getByText('100%')).toBeInTheDocument();
        });

        it('handles total of 0 without crashing', () => {
            render(<UsageProgressBar credits={{ total: 0, used: 0, remaining: 0 }} />);
            expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });
    });

    // Hover state tests
    describe('Hover interaction', () => {
        it('shows hover tooltip on mouse enter', () => {
            render(<UsageProgressBar credits={{ total: 100, used: 75, remaining: 25 }} />);
            const progress = screen.getByRole('progressbar');

            fireEvent.mouseEnter(progress);
            expect(screen.getByText('75 积分已使用')).toBeInTheDocument();

            fireEvent.mouseLeave(progress);
            expect(screen.queryByText('75 积分已使用')).not.toBeInTheDocument();
        });
    });
});
