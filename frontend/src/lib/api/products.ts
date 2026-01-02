/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Products API Client
 * Frontend API service for product management.
 *
 * Story关联: Story 1.2 - Product Catalog
 *
 * [INPUT]:
 * - workspaceId: string
 * - ProductCreateRequest, ProductUpdateRequest
 *
 * [LINK]:
 * - Backend API -> /api/v1/workspaces/{workspaceId}/products
 * - Type Definitions -> @/types/product.ts
 *
 * [OUTPUT]:
 * - createProduct(): Product
 * - listProducts(): Product[]
 *
 * [POS]: /frontend/src/lib/api/products.ts
 *
 * [PROTOCOL]:
 * 1. Uses credentials: 'include'.
 * 2. Matches existing pattern in assets.ts (Fetch API).
 *
 * === END HEADER ===
 */

import type { Product, ProductCreateRequest, ProductUpdateRequest } from '@/types/product';

const API_BASE = '/api/v1';

/**
 * Create a new product in a workspace
 */
export async function createProduct(
    workspaceId: string,
    data: ProductCreateRequest
): Promise<Product> {
    const response = await fetch(
        `${API_BASE}/workspaces/${workspaceId}/products`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to create product');
    }

    return response.json();
}

/**
 * Get a product by ID
 */
export async function getProduct(
    workspaceId: string,
    productId: string
): Promise<Product> {
    const response = await fetch(
        `${API_BASE}/workspaces/${workspaceId}/products/${productId}`,
        {
            method: 'GET',
            credentials: 'include',
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to get product');
    }

    return response.json();
}

/**
 * Update a product (name or category)
 */
export async function updateProduct(
    workspaceId: string,
    productId: string,
    data: ProductUpdateRequest
): Promise<Product> {
    const response = await fetch(
        `${API_BASE}/workspaces/${workspaceId}/products/${productId}`,
        {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify(data),
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to update product');
    }

    return response.json();
}

/**
 * List all products in a workspace
 */
export async function listProducts(
    workspaceId: string,
    skip: number = 0,
    limit: number = 100
): Promise<Product[]> {
    const response = await fetch(
        `${API_BASE}/workspaces/${workspaceId}/products?skip=${skip}&limit=${limit}`,
        {
            method: 'GET',
            credentials: 'include',
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to list products');
    }

    return response.json();
}
