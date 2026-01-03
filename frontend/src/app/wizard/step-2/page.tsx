/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Category Selection Page (Wizard Step 2)
 * User selects a product category to provide AI context.
 *
 * Story关联: Story 1.2 - Product Context
 *
 * [INPUT]:
 * - URL params: assetId, workspaceId
 * - User Interaction: Select Category
 *
 * [LINK]:
 * - Store -> @/stores/wizardStore.ts
 * - API -> @/lib/api/products.ts
 * - Components -> @/components/business/CategoryGrid
 *
 * [OUTPUT]:
 * - Creates Product via API
 * - Updates wizardStore state
 * - Navigates to Step 3
 *
 * [POS]: /frontend/src/app/wizard/step-2/page.tsx
 *
 * [PROTOCOL]:
 * 1. Checks for required URL params, redirects to step-1 if missing.
 * 2. Handles loading state during product creation.
 * 3. Shows error feedback if API fails.
 *
 * === END HEADER ===
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search } from 'lucide-react';
import { useWizardStore } from '@/stores/wizardStore';
import { createProduct } from '@/lib/api/products';
import { CategoryGrid } from '@/components/business/CategoryGrid';
import { CategorySidebar } from '@/components/business/CategorySidebar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import type { ProductCategory } from '@/types/product';

export default function CategorySelectionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    const {
        currentAssetId,
        currentWorkspaceId,
        selectedCategory,
        setSelectedCategory,
        setCurrentProductId,
        setCurrentAssetId,
        setCurrentWorkspaceId,
        nextStep,
        availableCategories,
        isLoading,
        setIsLoading,
        error,
        setError,
    } = useWizardStore();

    const [searchQuery, setSearchQuery] = useState('');

    // Initialize from URL params on first load
    useEffect(() => {
        const assetId = searchParams.get('assetId');
        const workspaceId = searchParams.get('workspaceId');
        const category = searchParams.get('category');

        if (assetId && !currentAssetId) {
            setCurrentAssetId(assetId);
        }
        if (workspaceId && !currentWorkspaceId) {
            setCurrentWorkspaceId(workspaceId);
        }
        // Restore category from URL if available
        if (category && !selectedCategory) {
            setSelectedCategory(category as ProductCategory);
        }
    }, [searchParams, currentAssetId, currentWorkspaceId, selectedCategory, setCurrentAssetId, setCurrentWorkspaceId, setSelectedCategory]);

    // Sync Store → URL when category changes (use replace to avoid history bloat)
    useEffect(() => {
        if (selectedCategory && currentAssetId && currentWorkspaceId) {
            const currentCategory = searchParams.get('category');
            // Only update URL if category actually changed
            if (currentCategory !== selectedCategory) {
                router.replace(
                    `/wizard/step-2?assetId=${currentAssetId}&workspaceId=${currentWorkspaceId}&category=${selectedCategory}`,
                    { scroll: false }
                );
            }
        }
    }, [selectedCategory, currentAssetId, currentWorkspaceId, router, searchParams]);

    // Redirect if asset/workspace not selected
    useEffect(() => {
        if (!currentAssetId || !currentWorkspaceId) {
            // Check URL params before redirecting
            const assetId = searchParams.get('assetId');
            const workspaceId = searchParams.get('workspaceId');

            if (!assetId || !workspaceId) {
                router.push('/dashboard');
            }
        }
    }, [currentAssetId, currentWorkspaceId, router, searchParams]);

    const handleCategorySelect = async (category: ProductCategory) => {
        if (!currentAssetId || !currentWorkspaceId || isLoading) return;

        setIsLoading(true);
        setError(null);

        try {
            // Create product with selected category
            const product = await createProduct(currentWorkspaceId, {
                name: `Product-${Date.now()}`, // Temporary name
                category: category,
                original_asset_id: currentAssetId,
            });

            setCurrentProductId(product.id);
            setSelectedCategory(category);

            // Navigate to next step
            nextStep();
            router.push(`/wizard/step-3?productId=${product.id}&workspaceId=${currentWorkspaceId}`);
        } catch (err) {
            console.error('Failed to create product:', err);
            setError(err instanceof Error ? err.message : 'Failed to create product');
        } finally {
            setIsLoading(false);
        }
    };

    const filteredCategories = availableCategories.filter((cat: { label: string }) =>
        cat.label.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleBack = () => {
        router.push('/dashboard');
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-7xl">
            {/* Header */}
            <div className="mb-8">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    返回
                </Button>

                <h1 className="text-3xl font-bold mb-2">选择产品类别</h1>
                <p className="text-muted-foreground">
                    选择最适合您产品的类别，这将帮助AI生成更准确的结果
                </p>
            </div>

            {/* Error message */}
            {error && (
                <div className="mb-6 p-4 bg-destructive/10 text-destructive rounded-lg">
                    {error}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                {/* Sidebar */}
                <div className="lg:col-span-1 hidden lg:block">
                    <CategorySidebar
                        categories={availableCategories}
                        selectedCategory={selectedCategory}
                        onSelect={handleCategorySelect}
                    />
                </div>

                {/* Main Content */}
                <div className="lg:col-span-3">
                    {/* Search Bar */}
                    <div className="relative max-w-md mb-8">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                            type="text"
                            placeholder="搜索类别..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Loading overlay */}
                    {isLoading && (
                        <div className="fixed inset-0 bg-background/80 flex items-center justify-center z-50">
                            <div className="flex flex-col items-center gap-4">
                                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                                <p className="text-muted-foreground">正在创建产品...</p>
                            </div>
                        </div>
                    )}

                    {/* Category Grid */}
                    <CategoryGrid
                        categories={filteredCategories}
                        selectedCategory={selectedCategory}
                        onSelect={handleCategorySelect}
                        disabled={isLoading}
                    />

                    {/* Empty state */}
                    {filteredCategories.length === 0 && (
                        <div className="text-center py-12">
                            <p className="text-muted-foreground">未找到匹配的类别</p>
                            <Button
                                variant="link"
                                onClick={() => setSearchQuery('')}
                            >
                                清除搜索
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
