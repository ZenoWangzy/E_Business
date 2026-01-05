'use client';

/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Copy History State Management Store
 * Zustand-based store for clipboard copy history with LocalStorage persistence.
 *
 * Story关联: Story 2.3: Editor Grid (Copy functionality integration)
 *
 * [INPUT]:
 * - User Actions: Copy text, search history, delete entries
 * - Hook Integration -> @/hooks/useClipboard (addEntry triggers)
 * - Import Data: JSON format for history restoration
 *
 * [LINK]:
 * - 依赖类型 -> @/hooks/useClipboard (CopyHistoryEntry type)
 * - 使用组件 -> Clipboard buttons, CopyHistoryPanel
 * - 持久化 -> zustand/middleware.persist (localStorage)
 *
 * [OUTPUT]: Persistent clipboard history with search and export
 * [POS]: /frontend/src/stores/copyHistory.ts
 *
 * [PROTOCOL]:
 * 1. History Limit: Maximum 100 entries, FIFO eviction when exceeded
 * 2. Duplicate Handling: Updates timestamp if content already exists
 * 3. Custom Serialization: Handles Date object serialization to/from localStorage
 * 4. Search: Full-text case-insensitive search across entries
 * 5. Export/Import: JSON format with version and metadata
 * 6. Empty Content: Skips entries with only whitespace
 * 7. Storage Key: 'copy-history-storage'
 *
 * === END HEADER ===
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { type CopyHistoryEntry } from '@/hooks/useClipboard';

// Types
export interface CopyHistoryState {
  // History entries
  entries: CopyHistoryEntry[];

  // Search state
  searchQuery: string;

  // Actions
  addEntry: (content: string, truncated?: boolean) => void;
  removeEntry: (id: string) => void;
  clearHistory: () => void;
  setSearchQuery: (query: string) => void;
  searchHistory: (query: string) => CopyHistoryEntry[];
  exportHistory: () => string;
  importHistory: (data: string) => void;
  getEntryCount: () => number;
}

// Constants
const MAX_HISTORY_ENTRIES = 100;
const STORAGE_KEY = 'copy-history-storage';

export const useCopyHistoryStore = create<CopyHistoryState>()(
  persist(
    (set, get) => ({
      // Initial state
      entries: [],
      searchQuery: '',

      // Add new entry to history
      addEntry: (content: string, truncated = false) => {
        // Skip empty content
        if (!content.trim()) return;

        const entry: CopyHistoryEntry = {
          id: Date.now().toString(),
          content: content.trim(),
          timestamp: new Date(),
          truncated,
        };

        set((state) => {
          // Check for duplicates
          const existingIndex = state.entries.findIndex(
            (e) => e.content === entry.content
          );

          let newEntries: CopyHistoryEntry[];

          if (existingIndex >= 0) {
            // Update existing entry's timestamp
            newEntries = [...state.entries];
            newEntries[existingIndex] = entry;
          } else {
            // Add new entry at the beginning
            newEntries = [entry, ...state.entries];
          }

          // Limit history size
          if (newEntries.length > MAX_HISTORY_ENTRIES) {
            newEntries = newEntries.slice(0, MAX_HISTORY_ENTRIES);
          }

          return { entries: newEntries };
        });
      },

      // Remove entry from history
      removeEntry: (id: string) =>
        set((state) => ({
          entries: state.entries.filter((entry) => entry.id !== id),
        })),

      // Clear all history
      clearHistory: () => set({ entries: [] }),

      // Set search query
      setSearchQuery: (query: string) => set({ searchQuery: query }),

      // Search history entries
      searchHistory: (query: string) => {
        const state = get();
        if (!query.trim()) return state.entries;

        const lowerQuery = query.toLowerCase();
        return state.entries.filter((entry) =>
          entry.content.toLowerCase().includes(lowerQuery)
        );
      },

      // Export history as JSON
      exportHistory: () => {
        const state = get();
        const exportData = {
          version: '1.0',
          exportDate: new Date().toISOString(),
          entries: state.entries.map((entry) => ({
            id: entry.id,
            content: entry.content,
            timestamp: entry.timestamp.toISOString(),
            truncated: entry.truncated,
          })),
        };

        return JSON.stringify(exportData, null, 2);
      },

      // Import history from JSON
      importHistory: (data: string) => {
        try {
          const importData = JSON.parse(data);

          // Validate structure
          if (!importData.entries || !Array.isArray(importData.entries)) {
            throw new Error('Invalid format');
          }

          const rawEntries = importData.entries as Array<{
            id?: unknown;
            content?: unknown;
            timestamp?: unknown;
            truncated?: unknown;
          }>;

          const entries: CopyHistoryEntry[] = rawEntries
            .map((item) => ({
              id:
                typeof item.id === 'string'
                  ? item.id
                  : Date.now().toString() + Math.random(),
              content: typeof item.content === 'string' ? item.content : '',
              timestamp: new Date(
                typeof item.timestamp === 'string' || typeof item.timestamp === 'number'
                  ? item.timestamp
                  : Date.now()
              ),
              truncated: Boolean(item.truncated),
            }))
            .filter((entry) => entry.content.trim()) // Remove empty entries
            .slice(0, MAX_HISTORY_ENTRIES); // Limit entries

          set({ entries });
        } catch (error) {
          console.error('Failed to import history:', error);
          throw error;
        }
      },

      // Get entry count
      getEntryCount: () => {
        return get().entries.length;
      },
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage, {
        replacer: (_key: string, value: unknown) => {
          if (value instanceof Date) {
            return { __type: 'Date', value: value.toISOString() };
          }
          return value;
        },
        reviver: (_key: string, value: unknown) => {
          if (value && typeof value === 'object' && '__type' in value) {
            const tagged = value as { __type: unknown; value: unknown };
            if (tagged.__type === 'Date' && typeof tagged.value === 'string') {
              return new Date(tagged.value);
            }
          }
          return value;
        },
      }),
    }
  )
);

// Selector hooks for optimized re-renders
export const useCopyHistoryEntries = () =>
  useCopyHistoryStore((state) => state.entries);

export const useCopyHistoryQuery = () =>
  useCopyHistoryStore((state) => state.searchQuery);

export const useCopyHistoryActions = () =>
  useCopyHistoryStore((state) => ({
    addEntry: state.addEntry,
    removeEntry: state.removeEntry,
    clearHistory: state.clearHistory,
    setSearchQuery: state.setSearchQuery,
    searchHistory: state.searchHistory,
    exportHistory: state.exportHistory,
    importHistory: state.importHistory,
    getEntryCount: state.getEntryCount,
  }));

// Combined hook for history management
export const useCopyHistory = () => {
  const entries = useCopyHistoryEntries();
  const searchQuery = useCopyHistoryQuery();
  const {
    addEntry,
    removeEntry,
    clearHistory,
    setSearchQuery,
    searchHistory,
    exportHistory,
    importHistory,
    getEntryCount,
  } = useCopyHistoryActions();

  // Filtered entries based on search
  const filteredEntries = searchQuery
    ? searchHistory(searchQuery)
    : entries;

  return {
    entries: filteredEntries,
    allEntries: entries,
    searchQuery,
    entryCount: entries.length,
    filteredCount: filteredEntries.length,
    addEntry,
    removeEntry,
    clearHistory,
    setSearchQuery,
    exportHistory,
    importHistory,
    getEntryCount,
  };
};

export default useCopyHistoryStore;