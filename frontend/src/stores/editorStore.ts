/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Editor State Management Store
 * Zustand-based store for image editor state with LocalStorage persistence.
 *
 * Story关联: Story 2.3: Editor Grid, Story 2.4: Reference Image, Story 2.5: Canvas Stitcher
 *
 * [INPUT]:
 * - User Actions: Add/remove/reorder items, update reference image
 * - API Responses: Task ID for async generation tracking
 * - Component Events: Drag/drop, selection, export triggers
 *
 * [LINK]:
 * - 依赖类型 -> @/types/editor (EditorStore, GridItem, ReferenceImage, StitcherState)
 * - 使用组件 -> @/components/business/EditorGrid, @/components/business/SVGPreviewCard
 * - 持久化 -> zustand/middleware.persist (localStorage)
 *
 * [OUTPUT]: Centralized editor state with optimized selector hooks
 * [POS]: /frontend/src/stores/editorStore.ts
 *
 * [PROTOCOL]:
 * 1. Grid Layout: Manages GridItem array with order tracking for drag-drop
 * 2. Reference Images: Supports multiple reference images with active selection
 * 3. Stitcher State: Tracks canvas generation progress (Story 2.5)
 * 4. Persistence: Uses partialize to persist only fields needed across sessions
 * 5. Selectors: Provides useEditorStoreSelector for optimized re-renders
 * 6. Task Tracking: Monitors async generation task ID and status
 *
 * === END HEADER ===
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { EditorStore, GridItem, AssetType, ReferenceImage, StitcherState } from '@/types/editor';

// Generate a unique ID for new items
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const useEditorStore = create<EditorStore>()(
  persist(
    (set, get) => ({
      // Initial state
      items: [],
      order: [],
      isLoading: false,
      error: null,
      taskId: undefined,

      // Story 2.5: Canvas Stitcher state
      stitcherState: {
        isGenerating: false,
        progress: 0,
        previewUrl: null,
        error: null
      },

      // Actions
      setItems: (items: GridItem[]) => {
        set({ items });
        // Update order based on new items
        const newOrder = items.map(item => item.id);
        set({ order: newOrder });
      },

      reorderItems: (oldIndex: number, newIndex: number) => {
        const { items } = get();
        const newItems = [...items];
        const [removed] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, removed);

        set({ items: newItems });

        // Update order
        const newOrder = newItems.map(item => item.id);
        set({ order: newOrder });
      },

      addItem: (item: GridItem) => {
        const { items } = get();
        const newItem = {
          ...item,
          id: item.id || generateId()
        };

        const newItems = [...items, newItem];
        set({ items: newItems });

        // Update order
        const newOrder = newItems.map(item => item.id);
        set({ order: newOrder });
      },

      removeItem: (id: string) => {
        const { items } = get();
        const newItems = items.filter(item => item.id !== id);
        set({ items: newItems });

        // Update order
        const newOrder = newItems.map(item => item.id);
        set({ order: newOrder });
      },

      updateItem: (id: string, updates: Partial<GridItem>) => {
        const { items } = get();
        const newItems = items.map(item =>
          item.id === id ? { ...item, ...updates } : item
        );
        set({ items: newItems });
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      setError: (error: string | null) => {
        set({ error });
      },

      clearItems: () => {
        set({ items: [], order: [] });
      },

      setTaskId: (taskId: string) => {
        set({ taskId });
      },

      // Story 2.4: Reference image management
      attachReference: (id: string, referenceImage: ReferenceImage) => {
        const { items } = get();
        const newItems = items.map(item =>
          item.id === id ? { ...item, referenceImage } : item
        );
        set({ items: newItems });
      },

      removeReference: (id: string) => {
        const { items } = get();
        const newItems = items.map(item =>
          item.id === id ? { ...item, referenceImage: undefined } : item
        );
        set({ items: newItems });
      },

      // Story 2.5: Canvas Stitcher actions
      setStitcherState: (state: Partial<StitcherState>) => {
        set((prev) => ({
          stitcherState: { ...prev.stitcherState, ...state }
        }));
      },

      setStitcherGenerating: (isGenerating: boolean) => {
        set((prev) => ({
          stitcherState: { ...prev.stitcherState, isGenerating }
        }));
      },

      setStitcherProgress: (progress: number) => {
        set((prev) => ({
          stitcherState: { ...prev.stitcherState, progress }
        }));
      },

      setStitcherPreview: (previewUrl: string | null) => {
        set((prev) => ({
          stitcherState: { ...prev.stitcherState, previewUrl, error: null }
        }));
      },

      setStitcherError: (error: any) => {
        set((prev) => ({
          stitcherState: { ...prev.stitcherState, error, isGenerating: false }
        }));
      },

      clearStitcherState: () => {
        set({
          stitcherState: {
            isGenerating: false,
            progress: 0,
            previewUrl: null,
            error: null
          }
        });
      }
    }),
    {
      name: 'editor-storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist items and order, not loading states
      partialize: (state) => ({
        items: state.items,
        order: state.order,
        taskId: state.taskId
      }),
      // Versioning for migrations
      version: 1,
      // Migration function if needed
      migrate: (persistedState: any, version: number) => {
        // Handle state migrations here if needed
        if (version === 0) {
          // Migration from version 0 to 1
          return {
            ...persistedState,
            order: persistedState.items?.map((item: GridItem) => item.id) || []
          };
        }
        return persistedState;
      }
    }
  )
);

// Selector hooks for optimized re-renders
export const useEditorItems = () => useEditorStore((state) => state.items);
export const useEditorOrder = () => useEditorStore((state) => state.order);
export const useEditorLoading = () => useEditorStore((state) => state.isLoading);
export const useEditorError = () => useEditorStore((state) => state.error);
export const useEditorTaskId = () => useEditorStore((state) => state.taskId);

// Story 2.5: Canvas Stitcher hooks
export const useStitcherState = () => useEditorStore((state) => state.stitcherState);
export const useStitcherGenerating = () => useEditorStore((state) => state.stitcherState.isGenerating);
export const useStitcherProgress = () => useEditorStore((state) => state.stitcherState.progress);
export const useStitcherPreview = () => useEditorStore((state) => state.stitcherState.previewUrl);
export const useStitcherError = () => useEditorStore((state) => state.stitcherState.error);

// Action hooks
export const useEditorActions = () => useEditorStore((state) => ({
  setItems: state.setItems,
  reorderItems: state.reorderItems,
  addItem: state.addItem,
  removeItem: state.removeItem,
  updateItem: state.updateItem,
  setLoading: state.setLoading,
  setError: state.setError,
  clearItems: state.clearItems,
  setTaskId: state.setTaskId,
  attachReference: state.attachReference,
  removeReference: state.removeReference,
  setStitcherState: state.setStitcherState,
  setStitcherGenerating: state.setStitcherGenerating,
  setStitcherProgress: state.setStitcherProgress,
  setStitcherPreview: state.setStitcherPreview,
  setStitcherError: state.setStitcherError,
  clearStitcherState: state.clearStitcherState
}));

// Helper hooks
export const useEditorItemById = (id: string) => {
  const items = useEditorItems();
  return items.find(item => item.id === id);
};

export const useEditorItemsByType = (type: AssetType) => {
  const items = useEditorItems();
  return items.filter(item => item.type === type);
};

// Story 2.4: Reference image helper hooks
export const useEditorItemsWithReference = () => {
  const items = useEditorItems();
  return items.filter(item => item.referenceImage);
};

export const useEditorItemReference = (id: string) => {
  const item = useEditorItemById(id);
  return item?.referenceImage;
};

// Initialize store with localStorage data if needed
export const initializeEditorStore = () => {
  // This can be called from app initialization
  // to handle any initial setup needed
};

// Export the main store hook
export default useEditorStore;