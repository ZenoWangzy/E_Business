/**
 * EditorGrid - A sortable grid container for SVGPreviewCard components
 */

'use client';

import React, { useMemo, useState, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import {
  restrictToWindowEdges
} from '@dnd-kit/modifiers';
import { CSS } from '@dnd-kit/utilities';
import { useVirtualizer } from '@tanstack/react-virtual';
import SVGPreviewCard from './SVGPreviewCard';
import CanvasStitcher from './CanvasStitcher';
import { EditorGridProps, GridItem } from '@/types/editor';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useEditorItems, useStitcherGenerating, useEditorActions } from '@/stores/editorStore';
import { ImageIcon } from 'lucide-react';

// Sortable item wrapper
const SortableItem: React.FC<{
  item: GridItem;
  onEdit?: (id: string, overlays: any[]) => void;
  onDelete?: (id: string) => void;
  onViewFull?: (imageSrc: string) => void;
}> = ({ item, onEdit, onDelete, onViewFull }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="h-full"
      {...attributes}
    >
      <SVGPreviewCard
        id={item.id}
        imageSrc={item.src}
        title={item.title}
        type={item.type}
        textOverlays={item.textOverlays}
        onEdit={onEdit}
        onDelete={onDelete}
        onViewFull={onViewFull}
        isLoading={item.isLoading}
        hasError={item.hasError}
      />
    </div>
  );
};

const EditorGrid: React.FC<EditorGridProps> = ({
  items,
  onReorder,
  onEditItem,
  onDeleteItem,
  onViewFull,
  isLoading = false
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [parentRef, setParentRef] = useState<HTMLDivElement | null>(null);
  const [showStitcherModal, setShowStitcherModal] = useState(false);

  // Store hooks
  const editorItems = useEditorItems();
  const isStitcherGenerating = useStitcherGenerating();
  const { setStitcherGenerating, setStitcherPreview, setStitcherError } = useEditorActions();

  // Sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Sortable items array
  const sortableItems = useMemo(
    () => items.map(item => ({
      id: item.id,
      ...item
    })),
    [items]
  );

  // Virtualization setup (only enable for 50+ items)
  const shouldVirtualize = items.length > 50;
  const virtualizer = useVirtualizer({
    count: Math.ceil(items.length / 3), // 3 columns
    getScrollElement: () => parentRef,
    estimateSize: () => 280, // Card height + margin
  });

  // Drag start handler
  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  // Drag over handler
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeIndex = items.findIndex(item => item.id === active.id);
    const overIndex = items.findIndex(item => item.id === over.id);

    // No reordering needed if same position
    if (activeIndex === overIndex) return;
  }, [items]);

  // Drag end handler
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveId(null);
      return;
    }

    const activeIndex = items.findIndex(item => item.id === active.id);
    const overIndex = items.findIndex(item => item.id === over.id);

    if (activeIndex !== overIndex) {
      const newItems = arrayMove(items, activeIndex, overIndex);
      onReorder(activeIndex, overIndex);

      // Save to localStorage
      const order = newItems.map(item => item.id);
      localStorage.setItem('grid-order', JSON.stringify(order));
    }

    setActiveId(null);
  }, [items, onReorder]);

  // Canvas Stitcher handlers
  const handleStitcherStart = useCallback(() => {
    setStitcherGenerating(true);
    setStitcherError(null);
  }, [setStitcherGenerating, setStitcherError]);

  const handleStitcherEnd = useCallback((dataUrl: string) => {
    setStitcherGenerating(false);
    setStitcherPreview(dataUrl);
  }, [setStitcherGenerating, setStitcherPreview]);

  const handleStitcherError = useCallback((error: Error) => {
    setStitcherGenerating(false);
    setStitcherError(error);
  }, [setStitcherGenerating, setStitcherError]);

  const handleCloseStitcherModal = useCallback(() => {
    setShowStitcherModal(false);
  }, []);

  // Load order from localStorage on mount
  React.useEffect(() => {
    const savedOrder = localStorage.getItem('grid-order');
    if (savedOrder) {
      try {
        const order = JSON.parse(savedOrder);
        // Reorder items based on saved order
        const orderedItems = order
          .map((id: string) => items.find(item => item.id === id))
          .filter(Boolean) as GridItem[];

        // Add any new items that weren't in the saved order
        const newItems = items.filter(item => !order.includes(item.id));

        if (orderedItems.length > 0 || newItems.length > 0) {
          // This would typically be handled by the parent component
          // through a callback or state update
        }
      } catch (error) {
        console.error('Failed to load grid order:', error);
      }
    }
  }, [items]);

  // Get active item for drag overlay
  const activeItem = useMemo(
    () => items.find(item => item.id === activeId),
    [activeId, items]
  );

  // Render grid content
  const renderContent = () => {
    if (shouldVirtualize) {
      // Virtualized rendering for large datasets
      return (
        <div
          ref={virtualizer.scrollToElement}
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative'
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const startIndex = virtualItem.index * 3;
            const endIndex = Math.min(startIndex + 3, items.length);
            const rowItems = items.slice(startIndex, endIndex);

            return (
              <div
                key={virtualItem.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: `${virtualItem.size}px`,
                  transform: `translateY(${virtualItem.start}px)`
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4 h-full">
                  {rowItems.map((item) => (
                    <SortableItem
                      key={item.id}
                      item={item}
                      onEdit={onEditItem}
                      onDelete={onDeleteItem}
                      onViewFull={onViewFull}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      );
    }

    // Regular rendering for smaller datasets
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
        <SortableContext items={sortableItems} strategy={rectSortingStrategy}>
          {items.map((item) => (
            <SortableItem
              key={item.id}
              item={item}
              onEdit={onEditItem}
              onDelete={onDeleteItem}
              onViewFull={onViewFull}
            />
          ))}
        </SortableContext>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Preview Long Image Button */}
      {items.length > 0 && (
        <div className="p-4 border-b">
          <Button
            onClick={() => setShowStitcherModal(true)}
            disabled={isStitcherGenerating}
            className="w-full"
            variant="outline"
          >
            <ImageIcon className="w-4 h-4 mr-2" />
            {isStitcherGenerating ? '生成中...' : `预览长图 (${items.length}张)`}
          </Button>
        </div>
      )}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToWindowEdges]}
      >
        <div
          ref={setParentRef}
          className={cn(
            "flex-1 overflow-auto",
            shouldVirtualize ? "" : "min-h-0"
          )}
          data-testid="editor-grid"
        >
          {renderContent()}
        </div>

        <DragOverlay>
          {activeId && activeItem ? (
            <div className="w-80 opacity-90">
              <SVGPreviewCard
                id={activeItem.id}
                imageSrc={activeItem.src}
                title={activeItem.title}
                type={activeItem.type}
                textOverlays={activeItem.textOverlays}
                isLoading={activeItem.isLoading}
                hasError={activeItem.hasError}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Canvas Stitcher Modal */}
      {showStitcherModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">生成长图</h2>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCloseStitcherModal}
                  disabled={isStitcherGenerating}
                >
                  关闭
                </Button>
              </div>
              <CanvasStitcher
                items={items}
                showModal={true}
                onCloseModal={handleCloseStitcherModal}
                onProcessingStart={handleStitcherStart}
                onProcessingEnd={handleStitcherEnd}
                onError={handleStitcherError}
                isProcessing={isStitcherGenerating}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditorGrid;