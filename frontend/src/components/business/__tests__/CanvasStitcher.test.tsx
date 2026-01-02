/**
 * Unit tests for CanvasStitcher component
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import CanvasStitcher from '../CanvasStitcher';
import { GridItem } from '@/types/editor';

// Mock html2canvas with delay
jest.mock('html2canvas', () => {
  return jest.fn(() =>
    new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          toDataURL: jest.fn(() => 'data:image/png;base64,mock-image-data'),
          width: 800,
          height: 1200
        });
      }, 200);
    })
  );
});

// Mock items
const mockItems: GridItem[] = [
  {
    id: 'item-1',
    src: 'https://example.com/image1.jpg',
    title: 'Image 1',
    type: 'image' as any
  },
  {
    id: 'item-2',
    src: 'https://example.com/image2.jpg',
    title: 'Image 2',
    type: 'image' as any
  }
];

describe('CanvasStitcher', () => {
  const defaultProps = {
    items: mockItems
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock Image constructor with proper async behavior
    const mockImageLoad = jest.fn();
    global.Image = class MockImage {
      src: string = '';
      width: number = 400;
      height: number = 300;
      crossOrigin: string = '';
      onload: (() => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;

      constructor() {
        // Simulate async image loading
        setTimeout(() => {
          if (this.onload) {
            mockImageLoad();
            this.onload();
          }
        }, 50);
      }
    } as any;

    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-blob-url');
    global.URL.revokeObjectURL = jest.fn();
    global.Blob = jest.fn().mockImplementation((content) => ({
      content,
      size: content.length
    })) as any;
  });

  it('renders initial state correctly', () => {
    render(<CanvasStitcher {...defaultProps} />);

    expect(screen.getByText('生成长图')).toBeInTheDocument();
    expect(screen.getByText(`将 ${mockItems.length} 张图片合成为一张长图`)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '生成预览' })).toBeInTheDocument();
  });

  it('disables button when no items provided', () => {
    render(<CanvasStitcher items={[]} />);

    expect(screen.getByRole('button', { name: '生成预览' })).toBeDisabled();
  });

  it('shows processing state when generating', async () => {
    const mockOnStart = jest.fn();
    render(<CanvasStitcher {...defaultProps} onProcessingStart={mockOnStart} />);

    const button = screen.getByRole('button', { name: '生成预览' });

    await act(async () => {
      fireEvent.click(button);
    });

    // Verify processing started via callback
    expect(mockOnStart).toHaveBeenCalledTimes(1);

    // Button should no longer be visible (replaced by processing UI)
    // or we should have some processing indicator
    await waitFor(() => {
      // Check for either progressbar or modal appearing
      const progressbar = screen.queryByRole('progressbar');
      const modal = screen.queryByText('长图预览');
      expect(progressbar !== null || modal !== null).toBe(true);
    }, { timeout: 2000 });
  });

  it('calls onProcessingStart when generation starts', async () => {
    const mockOnStart = jest.fn();
    render(<CanvasStitcher {...defaultProps} onProcessingStart={mockOnStart} />);

    const button = screen.getByRole('button', { name: '生成预览' });

    await act(async () => {
      fireEvent.click(button);
    });

    expect(mockOnStart).toHaveBeenCalledTimes(1);
  });

  it('calls onProcessingEnd with data URL when completed', async () => {
    const mockOnEnd = jest.fn();
    render(<CanvasStitcher {...defaultProps} onProcessingEnd={mockOnEnd} />);

    const button = screen.getByRole('button', { name: '生成预览' });

    await act(async () => {
      fireEvent.click(button);
    });

    // Wait for completion
    await waitFor(() => {
      expect(mockOnEnd).toHaveBeenCalledWith('data:image/png;base64,mock-image-data');
    }, { timeout: 1000 });
  });

  it('opens preview modal when generation completes', async () => {
    render(<CanvasStitcher {...defaultProps} />);

    const button = screen.getByRole('button', { name: '生成预览' });

    await act(async () => {
      fireEvent.click(button);
    });

    // Wait for modal to appear
    await waitFor(() => {
      expect(screen.getByText('长图预览')).toBeInTheDocument();
    }, { timeout: 1000 });
  });

  it('shows modal when showModal prop is true', () => {
    render(<CanvasStitcher {...defaultProps} showModal={true} />);

    expect(screen.getByText('长图预览')).toBeInTheDocument();
  });

  it('calls onCloseModal when modal close button is clicked', () => {
    const mockOnClose = jest.fn();
    render(
      <CanvasStitcher {...defaultProps} showModal={true} onCloseModal={mockOnClose} />
    );

    const closeButton = screen.getByRole('button', { name: '关闭' });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('displays image information correctly in modal', async () => {
    render(<CanvasStitcher {...defaultProps} />);

    const button = screen.getByRole('button', { name: '生成预览' });

    await act(async () => {
      fireEvent.click(button);
    });

    // Wait for modal and check image info labels
    await waitFor(() => {
      expect(screen.getByText('尺寸:')).toBeInTheDocument();
      expect(screen.getByText('图片数量:')).toBeInTheDocument();
      expect(screen.getByText('2 张')).toBeInTheDocument();
      expect(screen.getByText('文件大小:')).toBeInTheDocument();
      expect(screen.getByText('处理时间:')).toBeInTheDocument();
    }, { timeout: 2000 });
  });

  it('handles download button click in modal', async () => {
    // Save original before spy to avoid recursive call
    const originalCreateElement = Document.prototype.createElement;
    const mockClick = jest.fn();

    const createElementSpy = jest.spyOn(document, 'createElement').mockImplementation(function (this: Document, tagName: string) {
      if (tagName === 'a') {
        return {
          download: '',
          href: '',
          click: mockClick,
          setAttribute: jest.fn(),
          appendChild: jest.fn(),
          removeChild: jest.fn(),
          style: {}
        } as unknown as HTMLAnchorElement;
      }
      // Call original for other elements using saved reference
      return originalCreateElement.call(this, tagName);
    });

    render(<CanvasStitcher {...defaultProps} />);

    const button = screen.getByRole('button', { name: '生成预览' });

    await act(async () => {
      fireEvent.click(button);
    });

    // Wait for download button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /下载/ })).toBeInTheDocument();
    }, { timeout: 1000 });

    // Click download button
    const downloadButton = screen.getByRole('button', { name: /下载/ });
    fireEvent.click(downloadButton);

    expect(mockClick).toHaveBeenCalledTimes(1);

    // Restore mock
    createElementSpy.mockRestore();
  });

  it('respects custom options', () => {
    const customProps = {
      ...defaultProps,
      scale: 3,
      itemGap: 24,
      maxWidth: 1000,
      backgroundColor: '#f0f0f0'
    };

    render(<CanvasStitcher {...customProps} />);

    expect(screen.getByText('生成长图')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '生成预览' })).toBeInTheDocument();
  });

  it('handles external processing state', () => {
    render(
      <CanvasStitcher
        {...defaultProps}
        isProcessing={true}
      />
    );

    expect(screen.getByText('生成长图')).toBeInTheDocument();
    // Component should be in loading state
    const container = screen.getByText('生成长图').closest('.flex');
    expect(container).toHaveClass('pointer-events-none');
    expect(container).toHaveClass('opacity-75');
  });
});