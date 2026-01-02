/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Product Types
 * Frontend type definitions for product management.
 *
 * Story关联: Story 1.2 - Product Catalog
 *
 * [INPUT]: N/A (Type Definition)
 *
 * [LINK]:
 * - Backend Schemas -> backend/app/schemas/product.py
 * - API Client -> @/lib/api/products.ts
 *
 * [OUTPUT]:
 * - Product, ProductCategory, ProductStatus
 *
 * [POS]: /frontend/src/types/product.ts
 *
 * [PROTOCOL]:
 * 1. ProductStatus must align with Backend Enum.
 *
 * === END HEADER ===
 */

export type ProductCategory =
    | 'clothing'
    | 'electronics'
    | 'beauty'
    | 'home'
    | 'food'
    | 'sports'
    | 'toys'
    | 'books'
    | 'automotive'
    | 'health'
    | 'other';

export type ProductStatus =
    | 'draft'
    | 'ready'
    | 'processing'
    | 'completed'
    | 'archived';

export interface CategoryInfo {
    id: ProductCategory;
    label: string;
    icon: string; // Lucide icon name
    description?: string;
    gradient?: string; // For card styling
}

export interface Product {
    id: string;
    workspaceId: string;
    name: string;
    category: ProductCategory;
    description?: string;
    originalAssetId: string;
    status: ProductStatus;
    createdAt: string;
    updatedAt: string;
}

export interface ProductCreateRequest {
    name: string;
    category: ProductCategory;
    original_asset_id: string;
}

export interface ProductUpdateRequest {
    name?: string;
    category?: ProductCategory;
}
