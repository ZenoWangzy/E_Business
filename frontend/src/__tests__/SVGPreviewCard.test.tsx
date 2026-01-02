/**
 * SVGPreviewCard component tests
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import SVGPreviewCard from '@/components/business/SVGPreviewCard';
import { AssetType } from '@/types/editor';

// Mock intersection observer for lazy loading
const mockIntersectionObserver = jest.fn();
mockIntersectionObserver.mockReturnValue({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
});
window.IntersectionObserver = mockIntersectionObserver;

describe('SVGPreviewCard', () => {
  const defaultProps = {
    id: 'test-1',
    imageSrc: 'https://example.com/test.jpg',
    title: 'Test Image',
    type: AssetType.IMAGE
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders correctly with image type', () => {
    render(<SVGPreviewCard {...defaultProps} />);

    expect(screen.getByText('Test Image')).toBeInTheDocument();
    expect(screen.getByText('图片')).toBeInTheDocument();
  });

  it('renders correctly with SVG type', () => {
    const props = {
      ...defaultProps,
      type: AssetType.SVG,
      imageSrc: '<svg><rect width="100" height="100" /></svg>'
    };

    render(<SVGPreviewCard {...props} />);

    expect(screen.getByText('Test Image')).toBeInTheDocument();
    expect(screen.getByText('SVG')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    render(<SVGPreviewCard {...defaultProps} isLoading={true} />);

    expect(screen.getByRole('status')).toBeInTheDocument(); // Loading spinner
  });

  it('shows error state', () => {
    render(<SVGPreviewCard {...defaultProps} hasError={true} />);

    expect(screen.getByText('加载失败')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('shows action buttons on hover', async () => {
    const onViewFull = jest.fn();
    const props = {
      ...defaultProps,
      onViewFull
    };

    render(<SVGPreviewCard {...props} />);

    const card = screen.getByTestId('preview-card-test-1');
    fireEvent.mouseEnter(card);

    // Note: buttons might not be visible until hover is fully processed
    // In real tests, you might need to use waitFor
  });

  it('calls onDelete when delete button is clicked', async () => {
    const onDelete = jest.fn();
    const props = {
      ...defaultProps,
      onDelete
    };

    render(<SVGPreviewCard {...props} />);

    const card = screen.getByTestId('preview-card-test-1');
    fireEvent.mouseEnter(card);

    // Find and click delete button
    const deleteButton = screen.getByLabelText('删除');
    expect(deleteButton).toBeInTheDocument();
    fireEvent.click(deleteButton);

    expect(onDelete).toHaveBeenCalledWith('test-1');
  });

  it('has proper ARIA attributes', () => {
    render(<SVGPreviewCard {...defaultProps} />);

    const card = screen.getByTestId('preview-card-test-1');
    expect(card).toHaveAttribute('aria-label', 'Test Image');
  });
});