/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Image Generation Type Definitions
 * Frontend type definitions for AI image generation feature.
 *
 * Story关联: Story 2.1 - Style Selection & Generation Trigger
 *
 * [INPUT]: N/A (Type Definition File)
 *
 * [LINK]:
 * - Backend Schemas -> backend/app/schemas/image.py
 * - API Client -> @/lib/api/images.ts
 * - Dependency -> @/types/product.ts
 *
 * [OUTPUT]:
 * - StyleType, GenerationParams, GenerationResponse, JobStatusResponse
 *
 * [POS]: /frontend/src/types/image.ts
 *
 * [PROTOCOL]:
 * 1. Exported types must match Backend Pydantic models.
 * 2. Field names converted: snake_case (Backend) -> camelCase (Frontend).
 * 3. Type changes require recursive updates in components and API clients.
 *
 * === END HEADER ===
 */

/**
 * Visual style types for image generation
 */
export type StyleType = 'modern' | 'luxury' | 'fresh' | 'tech' | 'warm' | 'business';

/**
 * Generation job status
 */
export type GenerationStatus = 'idle' | 'pending' | 'processing' | 'completed' | 'failed';

/**
 * Style option for UI display
 */
export interface StyleOption {
    id: StyleType;
    name: string;
    gradient: string;
    description?: string;
}

/**
 * Parameters for image generation request
 */
export interface GenerationParams {
    styleId: StyleType;
    categoryId: string;
    assetId: string;
    productId: string;
}

/**
 * Response from image generation API
 */
export interface GenerationResponse {
    taskId: string;
    status: GenerationStatus;
    message?: string;
}

/**
 * Job status response for polling
 */
export interface JobStatusResponse {
    taskId: string;
    status: GenerationStatus;
    progress: number;
    errorMessage?: string;
    resultUrls?: string[];
    createdAt: string;
    startedAt?: string;
    completedAt?: string;
}

/**
 * Default style options with CSS gradients
 * Based on UX specifications in Story 2.1
 */
export const STYLE_OPTIONS: StyleOption[] = [
    {
        id: 'modern',
        name: '现代',
        gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        description: '简约、干净的现代风格'
    },
    {
        id: 'luxury',
        name: '奢华',
        gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        description: '高端、精致的奢华感'
    },
    {
        id: 'fresh',
        name: '清新',
        gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
        description: '活力、年轻的清新感'
    },
    {
        id: 'tech',
        name: '科技',
        gradient: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)',
        description: '未来感、科技感'
    },
    {
        id: 'warm',
        name: '温暖',
        gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
        description: '温馨、舒适的暖色调'
    },
    {
        id: 'business',
        name: '商务',
        gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
        description: '专业、可信赖的商务风'
    }
];
