'use client';

/**
 * useCopyStudio Hook
 *
 * Custom hook for managing Copy Studio state.
 * Extends workspace context with copy-specific state management.
 * Enhanced with batch operations and selection features.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Types
export type CopyType = 'titles' | 'sellingPoints' | 'faq' | 'descriptions';
export type ToneType = 'professional' | 'casual' | 'playful' | 'luxury';
export type AudienceType = 'b2b' | 'b2c' | 'technical';
export type LengthType = 'short' | 'medium' | 'long';

export interface GenerationConfig {
    tone: ToneType;
    audience: AudienceType;
    length: LengthType;
}

export interface CopyResult {
    id: string;
    type: CopyType;
    content: string;
    createdAt: Date;
    isFavorite: boolean;
}

export interface ProductContext {
    name: string;
    category: string;
    description: string;
    features: string[];
}

export interface CopyStudioState {
    // Active tab
    activeTab: CopyType;

    // Generation configuration
    generationConfig: GenerationConfig;

    // Results
    results: CopyResult[];

    // Selection state for batch operations
    selectedResults: Set<string>;

    // Batch selection mode
    isSelectionMode: boolean;

    // Loading states
    isGenerating: boolean;

    // Context references
    contextReferences: string[];

    // Product context
    productContext: ProductContext | null;

    // Actions
    setActiveTab: (tab: CopyType) => void;
    setGenerationConfig: (config: Partial<GenerationConfig>) => void;
    addResult: (result: CopyResult) => void;
    removeResult: (id: string) => void;
    toggleFavorite: (id: string) => void;
    setIsGenerating: (isGenerating: boolean) => void;
    addToContext: (content: string) => void;
    removeFromContext: (index: number) => void;
    clearContext: () => void;
    setProductContext: (context: ProductContext | null) => void;
    clearResults: () => void;

    // Selection actions
    toggleSelection: (id: string) => void;
    setSelected: (ids: string[]) => void;
    selectAll: () => void;
    clearSelection: () => void;
    setSelectionMode: (enabled: boolean) => void;
    getSelectedResults: () => CopyResult[];
    hasSelectedItems: () => boolean;
}

const useCopyStudioStore = create<CopyStudioState>()(
    persist(
        (set, get) => ({
            // Initial state
            activeTab: 'titles',
            generationConfig: {
                tone: 'professional',
                audience: 'b2c',
                length: 'medium',
            },
            results: [],
            selectedResults: new Set(),
            isSelectionMode: false,
            isGenerating: false,
            contextReferences: [],
            productContext: null,

            // Actions
            setActiveTab: (tab) => set({ activeTab: tab }),

            setGenerationConfig: (config) =>
                set((state) => ({
                    generationConfig: { ...state.generationConfig, ...config },
                })),

            addResult: (result) =>
                set((state) => ({
                    results: [result, ...state.results],
                })),

            removeResult: (id) =>
                set((state) => ({
                    results: state.results.filter((r) => r.id !== id),
                    selectedResults: new Set([...state.selectedResults].filter(selectedId => selectedId !== id)),
                })),

            toggleFavorite: (id) =>
                set((state) => ({
                    results: state.results.map((r) =>
                        r.id === id ? { ...r, isFavorite: !r.isFavorite } : r
                    ),
                })),

            setIsGenerating: (isGenerating) => set({ isGenerating }),

            addToContext: (content) =>
                set((state) => ({
                    contextReferences: [...state.contextReferences, content],
                })),

            removeFromContext: (index) =>
                set((state) => ({
                    contextReferences: state.contextReferences.filter((_, i) => i !== index),
                })),

            clearContext: () => set({ contextReferences: [] }),

            setProductContext: (context) => set({ productContext: context }),

            clearResults: () => set({ results: [], selectedResults: new Set() }),

            // Selection actions
            toggleSelection: (id) =>
                set((state) => {
                    const newSelected = new Set(state.selectedResults);
                    if (newSelected.has(id)) {
                        newSelected.delete(id);
                    } else {
                        newSelected.add(id);
                    }
                    return { selectedResults: newSelected };
                }),

            setSelected: (ids) =>
                set(() => ({
                    selectedResults: new Set(ids),
                })),

            selectAll: () =>
                set((state) => ({
                    selectedResults: new Set(state.results.map(r => r.id)),
                })),

            clearSelection: () =>
                set(() => ({
                    selectedResults: new Set(),
                })),

            setSelectionMode: (enabled) =>
                set(() => ({
                    isSelectionMode: enabled,
                    // Clear selection when disabling mode
                    selectedResults: enabled ? get().selectedResults : new Set(),
                })),

            getSelectedResults: () => {
                const state = get();
                return state.results.filter(r => state.selectedResults.has(r.id));
            },

            hasSelectedItems: () => {
                return get().selectedResults.size > 0;
            },
        }),
        {
            name: 'copy-studio-storage',
            storage: createJSONStorage(() => localStorage),
            // Convert Set to Array for persistence
            serialize: (state) => JSON.stringify(state),
            deserialize: (str) => {
                const parsed = JSON.parse(str);
                // Convert Array back to Set
                if (parsed.state?.selectedResults) {
                    parsed.state.selectedResults = new Set(parsed.state.selectedResults);
                }
                return parsed;
            },
            partialize: (state) => ({
                activeTab: state.activeTab,
                generationConfig: state.generationConfig,
                results: state.results,
                contextReferences: state.contextReferences,
                // Convert Set to Array for persistence
                selectedResults: Array.from(state.selectedResults),
                isSelectionMode: state.isSelectionMode,
            }),
        }
    )
);

// Hook wrapper with selectors
export function useCopyStudio() {
    const store = useCopyStudioStore();
    return store;
}

// Selector hooks for optimized re-renders
export const useCopyActiveTab = () => useCopyStudioStore((state) => state.activeTab);
export const useCopyConfig = () => useCopyStudioStore((state) => state.generationConfig);
export const useCopyResults = () => useCopyStudioStore((state) => state.results);
export const useCopyIsGenerating = () => useCopyStudioStore((state) => state.isGenerating);
export const useCopyContext = () => useCopyStudioStore((state) => state.contextReferences);
export const useProductContext = () => useCopyStudioStore((state) => state.productContext);
export const useSelectedResults = () => useCopyStudioStore((state) => state.selectedResults);
export const useSelectionMode = () => useCopyStudioStore((state) => state.isSelectionMode);

// Selection hooks
export const useSelectionActions = () =>
    useCopyStudioStore((state) => ({
        toggleSelection: state.toggleSelection,
        setSelected: state.setSelected,
        selectAll: state.selectAll,
        clearSelection: state.clearSelection,
        setSelectionMode: state.setSelectionMode,
        getSelectedResults: state.getSelectedResults,
        hasSelectedItems: state.hasSelectedItems,
    }));

// Actions hook
export const useCopyActions = () =>
    useCopyStudioStore((state) => ({
        setActiveTab: state.setActiveTab,
        setGenerationConfig: state.setGenerationConfig,
        addResult: state.addResult,
        removeResult: state.removeResult,
        toggleFavorite: state.toggleFavorite,
        setIsGenerating: state.setIsGenerating,
        addToContext: state.addToContext,
        removeFromContext: state.removeFromContext,
        clearContext: state.clearContext,
        setProductContext: state.setProductContext,
        clearResults: state.clearResults,
        toggleSelection: state.toggleSelection,
        setSelected: state.setSelected,
        selectAll: state.selectAll,
        clearSelection: state.clearSelection,
        setSelectionMode: state.setSelectionMode,
    }));

// Combined hook for selection state
export const useSelection = () => {
    const selectedResults = useSelectedResults();
    const isSelectionMode = useSelectionMode();
    const {
        toggleSelection,
        selectAll,
        clearSelection,
        setSelectionMode,
        getSelectedResults,
        hasSelectedItems,
    } = useSelectionActions();

    return {
        selectedResults,
        selectedCount: selectedResults.size,
        isSelectionMode,
        toggleSelection,
        selectAll,
        clearSelection,
        setSelectionMode,
        getSelectedResults,
        hasSelectedItems: hasSelectedItems(),
    };
};

export default useCopyStudioStore;
