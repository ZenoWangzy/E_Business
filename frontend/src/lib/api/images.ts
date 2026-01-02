/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Images API Client
 * Frontend API service for AI image generation features.
 *
 * Story关联: Story 2.1 - Style Selection & Generation Trigger
 *
 * [INPUT]:
 * - workspaceId: string - Current workspace ID
 * - GenerationParams: { styleId, categoryId, assetId, productId }
 *
 * [LINK]:
 * - Backend API -> /api/v1/images/workspaces/{workspaceId}/generate
 * - Type Definitions -> @/types/image.ts
 *
 * [OUTPUT]:
 * - generateImages(): Returns { taskId, status, message }
 * - getJobStatus(): Returns { taskId, status, results, progress }
 *
 * [POS]: /frontend/src/lib/api/images.ts
 *
 * [PROTOCOL]:
 * 1. All requests use credentials: 'include' for auth cookie.
 * 2. Error responses are standardized as { detail: string } or similar.
 * 3. Successful responses are camelCased where possible in frontend logic.
 * 4. Job status requires polling via getJobStatus().
 *
 * === END HEADER ===
 */

import type {
    GenerationParams,
    GenerationResponse,
    JobStatusResponse
} from '@/types/image';

const API_BASE = '/api/v1';

/**
 * Trigger image generation for a product
 * Returns 202 Accepted with task_id for polling
 */
export async function generateImages(
    workspaceId: string,
    params: GenerationParams
): Promise<GenerationResponse> {
    const response = await fetch(
        `${API_BASE}/images/workspaces/${workspaceId}/generate`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                style_id: params.styleId,
                category_id: params.categoryId,
                asset_id: params.assetId,
                product_id: params.productId,
            }),
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to trigger generation');
    }

    const data = await response.json();
    return {
        taskId: data.task_id,
        status: data.status,
        message: data.message,
    };
}

/**
 * Poll job status for a generation task
 */
export async function getJobStatus(
    workspaceId: string,
    taskId: string
): Promise<JobStatusResponse> {
    const response = await fetch(
        `${API_BASE}/images/workspaces/${workspaceId}/jobs/${taskId}`,
        {
            method: 'GET',
            credentials: 'include',
        }
    );

    if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(error.detail || 'Failed to get job status');
    }

    const data = await response.json();
    return {
        taskId: data.task_id,
        status: data.status,
        progress: data.progress,
        errorMessage: data.error_message,
        resultUrls: data.result_urls,
        createdAt: data.created_at,
        startedAt: data.started_at,
        completedAt: data.completed_at,
    };
}
