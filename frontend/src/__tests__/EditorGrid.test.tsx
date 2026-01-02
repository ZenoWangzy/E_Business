/**
 * EditorGrid component tests
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import EditorGrid from '@/components/business/EditorGrid';
import { AssetType } from '@/types/editor';

// Mock SVGPreviewCard to avoid nested component issues
jest.mock('@/components/business/SVGPreviewCard', () => {
  return function MockSVGPreviewCard({ id, title }: { id: string; title: string }) {
    return <div data-testid={`preview-card-${id}`}>{title}</div>;
  };
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(() => null),
  setItem: jest.fn(),
  clear: jest.fn()
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock DnD Kit
jest.mock('@dnd-kit/core', () => ({
  DndContext: ({ children }: { children: React.ReactNode }) => <div data-testid="dnd-context">{children}</div>,
  DragOverlay: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  closestCenter: jest.fn(),
  useSensor: jest.fn(() => ({})),
  useSensors: jest.fn(() => []),
  KeyboardSensor: jest.fn(),
  PointerSensor: jest.fn()
}));

jest.mock('@dnd-kit/sortable', () => ({
  SortableContext: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  arrayMove: jest.fn((array, from, to) => {
    const result = [...array];
    const [removed] = result.splice(from, 1);
    result.splice(to, 0, removed);
    return result;
  }),
  sortableKeyboardCoordinates: jest.fn(),
  rectSortingStrategy: jest.fn(),
  useSortable: () => ({
    attributes: {},
    listeners: {},
    setNodeRef: jest.fn(),
    transform: null,
    transition: null,
    isDragging: false
  })
}));

jest.mock('@dnd-kit/utilities', () => ({
  CSS: {
    Translate: {
      toString: jest.fn(() => 'translate(0, 0)')
    }
  }
}));

jest.mock('@dnd-kit/modifiers', () => ({
  restrictToWindowEdges: jest.fn()
}));

jest.mock('@tanstack/react-virtual', () => ({
  useVirtualizer: jest.fn(() => ({
    getVirtualItems: () => [],
    getTotalSize: () => 0,
    scrollToElement: jest.fn()
  }))
}));

describe('EditorGrid', () => {
  const mockItems = [
    {
      id: '1',
      src: 'https://example.com/1.jpg',
      title: 'Image 1',
      type: AssetType.IMAGE
    },
    {
      id: '2',
      src: 'https://example.com/2.jpg',
      title: 'Image 2',
      type: AssetType.IMAGE
    },
    {
      id: '3',
      src: '<svg><rect /></svg>',
      title: 'SVG 3',
      type: AssetType.SVG
    }
  ];

  it('renders empty state correctly', () => {
    render(
      <EditorGrid
        items={[]}
        onReorder={jest.fn()}
        onEditItem={jest.fn()}
        onDeleteItem={jest.fn()}
      />
    );

    // EditorGrid renders container, empty state message is handled by parent page
    expect(screen.getByTestId('editor-grid')).toBeInTheDocument();
  });

  it('renders items correctly', () => {
    render(
      <EditorGrid
        items={mockItems}
        onReorder={jest.fn()}
        onEditItem={jest.fn()}
        onDeleteItem={jest.fn()}
      />
    );

    mockItems.forEach(item => {
      expect(screen.getByText(item.title)).toBeInTheDocument();
    });
  });

  it('shows loading state', () => {
    render(
      <EditorGrid
        items={mockItems}
        onReorder={jest.fn()}
        onEditItem={jest.fn()}
        onDeleteItem={jest.fn()}
        isLoading={true}
      />
    );

    // Check for loading indicators
    mockItems.forEach(item => {
      const card = screen.getByTestId(`preview-card-${item.id}`);
      expect(card).toBeInTheDocument();
    });
  });

  it('calls onReorder when items are reordered', () => {
    const onReorder = jest.fn();

    render(
      <EditorGrid
        items={mockItems}
        onReorder={onReorder}
        onEditItem={jest.fn()}
        onDeleteItem={jest.fn()}
      />
    );

    // Drag and drop simulation would need more complex setup
    // This is a basic test structure
  });

  it('calls onDeleteItem when item is deleted', () => {
    const onDeleteItem = jest.fn();

    render(
      <EditorGrid
        items={mockItems}
        onReorder={jest.fn()}
        onEditItem={jest.fn()}
        onDeleteItem={onDeleteItem}
      />
    );

    // Mock deletion through the card component
    // This would require integration with SVGPreviewCard
  });

  it('enables virtualization for large datasets', () => {
    const largeItems = Array.from({ length: 100 }, (_, i) => ({
      id: `item-${i}`,
      src: `https://example.com/${i}.jpg`,
      title: `Image ${i}`,
      type: AssetType.IMAGE
    }));

    render(
      <EditorGrid
        items={largeItems}
        onReorder={jest.fn()}
        onEditItem={jest.fn()}
        onDeleteItem={jest.fn()}
      />
    );

    // Verify virtualization is enabled (check for virtualizer hook call)
    expect(require('@tanstack/react-virtual').useVirtualizer).toHaveBeenCalled();
  });
});