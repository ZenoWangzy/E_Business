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
 * 1. Dual-Auth strategy: Bearer Token (Primary) + Cookie (Fallback).
 * 2. Client-side calls MUST provide token parameter.
 * 3. Uses credentials: 'include' for Cookie fallback.
 * 4. Matches pattern in workspaces.ts (explicit token param).
 * 5. Normalizes backend responses (snake_case/camelCase) into frontend Product type.
 * 6. Validates critical fields (UUIDs, category enum) to fail fast on contract drift.
 *
 * === END HEADER ===
 */

import type { Product, ProductCreateRequest, ProductUpdateRequest } from '@/types/product';
import { isProductCategory } from '@/types/product';
import { isUuid } from '@/lib/utils';

const API_BASE = '/api/v1';

function normalizeProduct(data: any): Product {
    const id = data?.id;
    const workspaceId = data?.workspaceId ?? data?.workspace_id;
    const originalAssetId = data?.originalAssetId ?? data?.original_asset_id;
    const category = data?.category;
    const createdAt = data?.createdAt ?? data?.created_at;
    const updatedAt = data?.updatedAt ?? data?.updated_at;

    if (!isUuid(id) || !isUuid(workspaceId) || !isUuid(originalAssetId)) {
        throw new Error('Invalid product response (UUID fields)');
    }
    if (!isProductCategory(category)) {
        throw new Error('Invalid product response (category)');
    }
    if (typeof data?.name !== 'string' || data.name.length === 0) {
        throw new Error('Invalid product response (name)');
    }
    if (typeof createdAt !== 'string' || typeof updatedAt !== 'string') {
        throw new Error('Invalid product response (timestamps)');
    }

    return {
        id,
        workspaceId,
        name: data.name,
        category,
        description: typeof data?.description === 'string' ? data.description : undefined,
        originalAssetId,
        status: data?.status,
        createdAt,
        updatedAt,
    };
}

/**
 * Create a new product in a workspace
 * @param workspaceId - Workspace UUID
 * @param data - Product creation payload
 * @param token - Optional access token (required for client-side calls)
 */
export async function createProduct(
    workspaceId: string,
    data: ProductCreateRequest,
    token?: string
): Promise<Product> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    // Add Authorization header if token provided (primary auth)
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    } else if (typeof window !== 'undefined') {
        // Warn in browser context when token is missing
        console.warn('[products.ts] createProduct called without token - relying on Cookie fallback');
    }

    const response = await fetch(
        `${API_BASE}/workspaces/${workspaceId}/products`,
        {
            method: 'POST',
            headers,
            credentials: 'include',  // Cookie fallback
            body: JSON.stringify(data),
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to create product');
    }

    const json = await response.json();
    return normalizeProduct(json);
}

/**
 * Get a product by ID
 * @param token - Optional access token (required for client-side calls)
 */
export async function getProduct(
    workspaceId: string,
    productId: string,
    token?: string
): Promise<Product> {
    const headers: Record<string, string> = {};

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE}/workspaces/${workspaceId}/products/${productId}`,
        {
            method: 'GET',
            headers,
            credentials: 'include',
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to get product');
    }

    const data = await response.json();
    return normalizeProduct(data);
}

/**
 * Update a product (name or category)
 * @param token - Optional access token (required for client-side calls)
 */
export async function updateProduct(
    workspaceId: string,
    productId: string,
    payload: ProductUpdateRequest,
    token?: string
): Promise<Product> {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE}/workspaces/${workspaceId}/products/${productId}`,
        {
            method: 'PATCH',
            headers,
            credentials: 'include',
            body: JSON.stringify(payload),
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to update product');
    }

    const json = await response.json();
    return normalizeProduct(json);
}

/**
 * List all products in a workspace
 * @param token - Optional access token (required for client-side calls)
 */
export async function listProducts(
    workspaceId: string,
    skip: number = 0,
    limit: number = 100,
    token?: string
): Promise<Product[]> {
    const headers: Record<string, string> = {};

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(
        `${API_BASE}/workspaces/${workspaceId}/products?skip=${skip}&limit=${limit}`,
        {
            method: 'GET',
            headers,
            credentials: 'include',
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to list products');
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
        throw new Error('Invalid products list response');
    }
    return data.map(normalizeProduct);
}
