/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Wizard State Management Store
 * Zustand store managing multi-step product creation workflow.
 *
 * Story关联: Story 2.1 - Style Selection & Generation Trigger
 *
 * [INPUT]:
 * - Actions: setXXX(), nextStep(), previousStep(), reset()
 *
 * [LINK]:
 * - API -> @/lib/api/products.ts
 * - Types -> @/types/product.ts, @/types/image.ts
 *
 * [OUTPUT]:
 * - State: { currentStep, selectedCategory, selectedStyle, generationStatus, ... }
 * - Actions: setters and navigation helpers
 *
 * [POS]: /frontend/src/stores/wizardStore.ts
 *
 * [PROTOCOL]:
 * 1. State updates must be immutable (Zustand default).
 * 2. Uses devtools middleware for debugging.
 * 3. reset() clears all form data; resetGeneration() clears only AI task state.
 *
 * === END HEADER ===
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type { ProductCategory, CategoryInfo } from '@/types/product';
import type { StyleType, GenerationStatus } from '@/types/image';
import { STYLE_OPTIONS } from '@/types/image';

interface WizardState {
    // Current step and IDs
    currentStep: number;
    currentAssetId: string | null;
    currentProductId: string | null;
    currentWorkspaceId: string | null;

    // Category selection (Step 2)
    selectedCategory: ProductCategory | null;
    availableCategories: CategoryInfo[];

    // Style selection (Step 3) - Story 2.1
    selectedStyle: StyleType | null;
    availableStyles: typeof STYLE_OPTIONS;

    // Generation state (Step 3) - Story 2.1
    generationTaskId: string | null;
    generationStatus: GenerationStatus;
    generationProgress: number;
    generationError: string | null;
    generationResultUrls: string[];

    // Loading state
    isLoading: boolean;
    error: string | null;

    // Actions
    setCurrentStep: (step: number) => void;
    setCurrentAssetId: (assetId: string | null) => void;
    setCurrentProductId: (productId: string | null) => void;
    setCurrentWorkspaceId: (workspaceId: string | null) => void;
    setSelectedCategory: (category: ProductCategory | null) => void;
    setSelectedStyle: (style: StyleType | null) => void;
    setGenerationTaskId: (taskId: string | null) => void;
    setGenerationStatus: (status: GenerationStatus) => void;
    setGenerationProgress: (progress: number) => void;
    setGenerationError: (error: string | null) => void;
    setGenerationResultUrls: (urls: string[]) => void;
    setIsLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    nextStep: () => void;
    previousStep: () => void;
    reset: () => void;
    resetGeneration: () => void;
}

// Default category list with Chinese labels
const defaultCategories: CategoryInfo[] = [
    { id: 'clothing', label: '服装', icon: 'Shirt' },
    { id: 'electronics', label: '电子产品', icon: 'Laptop' },
    { id: 'beauty', label: '美妆', icon: 'Sparkles' },
    { id: 'home', label: '家居', icon: 'Home' },
    { id: 'food', label: '食品', icon: 'Apple' },
    { id: 'sports', label: '运动', icon: 'Trophy' },
    { id: 'toys', label: '玩具', icon: 'Gamepad2' },
    { id: 'books', label: '图书', icon: 'BookOpen' },
    { id: 'automotive', label: '汽车', icon: 'Car' },
    { id: 'health', label: '健康', icon: 'Heart' },
    { id: 'other', label: '其他', icon: 'MoreHorizontal' },
];

export const useWizardStore = create<WizardState>()(
    persist(
        devtools(
            (set, get) => ({
                // Initial state
                currentStep: 1,
                currentAssetId: null,
                currentProductId: null,
                currentWorkspaceId: null,
                selectedCategory: null,
                availableCategories: defaultCategories,

                // Style selection - Story 2.1
                selectedStyle: null,
                availableStyles: STYLE_OPTIONS,

                // Generation state - Story 2.1
                generationTaskId: null,
                generationStatus: 'idle',
                generationProgress: 0,
                generationError: null,
                generationResultUrls: [],

                isLoading: false,
                error: null,

                // Actions
                setCurrentStep: (step: number) => set({ currentStep: step }),
                setCurrentAssetId: (assetId: string | null) => set({ currentAssetId: assetId }),
                setCurrentProductId: (productId: string | null) => set({ currentProductId: productId }),
                setCurrentWorkspaceId: (workspaceId: string | null) => set({ currentWorkspaceId: workspaceId }),
                setSelectedCategory: (category: ProductCategory | null) => set({ selectedCategory: category }),
                setSelectedStyle: (style: StyleType | null) => set({ selectedStyle: style }),
                setGenerationTaskId: (taskId: string | null) => set({ generationTaskId: taskId }),
                setGenerationStatus: (status: GenerationStatus) => set({ generationStatus: status }),
                setGenerationProgress: (progress: number) => set({ generationProgress: progress }),
                setGenerationError: (error: string | null) => set({ generationError: error }),
                setGenerationResultUrls: (urls: string[]) => set({ generationResultUrls: urls }),
                setIsLoading: (loading: boolean) => set({ isLoading: loading }),
                setError: (error: string | null) => set({ error }),

                nextStep: () => {
                    const currentStep = get().currentStep;
                    set({ currentStep: Math.min(currentStep + 1, 5) }); // 5 steps total
                },

                previousStep: () => {
                    const currentStep = get().currentStep;
                    set({ currentStep: Math.max(currentStep - 1, 1) });
                },

                reset: () =>
                    set({
                        currentStep: 1,
                        currentAssetId: null,
                        currentProductId: null,
                        currentWorkspaceId: null,
                        selectedCategory: null,
                        selectedStyle: null,
                        generationTaskId: null,
                        generationStatus: 'idle',
                        generationProgress: 0,
                        generationError: null,
                        generationResultUrls: [],
                        isLoading: false,
                        error: null,
                    }),

                resetGeneration: () =>
                    set({
                        generationTaskId: null,
                        generationStatus: 'idle',
                        generationProgress: 0,
                        generationError: null,
                        generationResultUrls: [],
                    }),
            }),
            { name: 'wizard-store' }
        ),
        {
            name: 'wizard-storage',
            partialize: (state) => ({
                currentStep: state.currentStep,
                selectedCategory: state.selectedCategory,
                currentAssetId: state.currentAssetId,
                currentWorkspaceId: state.currentWorkspaceId,
                currentProductId: state.currentProductId,
            }),
        }
    )
);
