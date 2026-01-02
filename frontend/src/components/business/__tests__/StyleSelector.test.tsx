/**
 * StyleSelector Component Tests
 * Story 2.1: Style Selection & Generation Trigger
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { StyleSelector } from '../StyleSelector';
import { STYLE_OPTIONS } from '@/types/image';
import type { StyleType } from '@/types/image';

describe('StyleSelector', () => {
    const mockOnSelect = jest.fn();

    beforeEach(() => {
        mockOnSelect.mockClear();
    });

    it('should render 6 style options', () => {
        render(
            <StyleSelector
                styles={STYLE_OPTIONS}
                selectedStyle={null}
                onSelect={mockOnSelect}
            />
        );

        // Check all 6 styles are rendered
        expect(screen.getByTestId('style-modern')).toBeInTheDocument();
        expect(screen.getByTestId('style-luxury')).toBeInTheDocument();
        expect(screen.getByTestId('style-fresh')).toBeInTheDocument();
        expect(screen.getByTestId('style-tech')).toBeInTheDocument();
        expect(screen.getByTestId('style-warm')).toBeInTheDocument();
        expect(screen.getByTestId('style-business')).toBeInTheDocument();
    });

    it('should display style names in Chinese', () => {
        render(
            <StyleSelector
                styles={STYLE_OPTIONS}
                selectedStyle={null}
                onSelect={mockOnSelect}
            />
        );

        expect(screen.getByText('现代')).toBeInTheDocument();
        expect(screen.getByText('奢华')).toBeInTheDocument();
        expect(screen.getByText('清新')).toBeInTheDocument();
        expect(screen.getByText('科技')).toBeInTheDocument();
        expect(screen.getByText('温暖')).toBeInTheDocument();
        expect(screen.getByText('商务')).toBeInTheDocument();
    });

    it('should handle style selection', () => {
        render(
            <StyleSelector
                styles={STYLE_OPTIONS}
                selectedStyle={null}
                onSelect={mockOnSelect}
            />
        );

        fireEvent.click(screen.getByTestId('style-modern'));
        expect(mockOnSelect).toHaveBeenCalledWith('modern');

        fireEvent.click(screen.getByTestId('style-luxury'));
        expect(mockOnSelect).toHaveBeenCalledWith('luxury');
    });

    it('should highlight selected style with ring', () => {
        render(
            <StyleSelector
                styles={STYLE_OPTIONS}
                selectedStyle={'tech' as StyleType}
                onSelect={mockOnSelect}
            />
        );

        const techCard = screen.getByTestId('style-tech');
        expect(techCard.className).toContain('ring-2');
        expect(techCard.className).toContain('ring-primary');
    });

    it('should not call onSelect when disabled', () => {
        render(
            <StyleSelector
                styles={STYLE_OPTIONS}
                selectedStyle={null}
                onSelect={mockOnSelect}
                disabled={true}
            />
        );

        fireEvent.click(screen.getByTestId('style-modern'));
        expect(mockOnSelect).not.toHaveBeenCalled();
    });

    it('should apply disabled styling', () => {
        render(
            <StyleSelector
                styles={STYLE_OPTIONS}
                selectedStyle={null}
                onSelect={mockOnSelect}
                disabled={true}
            />
        );

        const modernCard = screen.getByTestId('style-modern');
        expect(modernCard.className).toContain('opacity-50');
        expect(modernCard.className).toContain('cursor-not-allowed');
    });
});
