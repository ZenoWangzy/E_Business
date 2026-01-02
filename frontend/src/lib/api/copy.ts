/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Copy Generation API Client
 * Frontend API client for AI copywriting generation with SSE streaming support.
 *
 * Story关联: Story 3.1: AI Copywriting Studio UI
 *
 * [INPUT]:
 * - workspaceId: string (Workspace UUID)
 * - productId: string (Product UUID)
 * - type: CopyType (Type of copy to generate)
 * - config: GenerationConfig (Tone, audience, length settings)
 * - context?: string[] (Optional context array)
 *
 * [LINK]:
 * - 依赖类型 -> @/types/copy (CopyGenerationRequest, CopyJobStatus, CopyResult)
 * - 后端API -> /api/v1/copy/workspaces/{workspaceId}/*
 * - 实时通信 -> EventSource for SSE streaming
 *
 * [OUTPUT]: Copy generation task results with polling/SSE updates
 * [POS]: /frontend/src/lib/api/copy.ts
 *
 * [PROTOCOL]:
 * 1. Async task pattern: generateCopy returns task_id for polling
 * 2. SSE streaming: createCopyJobSSE for real-time progress updates
 * 3. Error handling: Retry logic with exponential backoff (retryWithBackoff)
 * 4. Converts snake_case from backend to camelCase for frontend
 * 5. Uses credentials: 'include' for cookie-based authentication
 *
 * === END HEADER ===
 */

import type {
  CopyGenerationRequest,
  CopyGenerationResponse,
  CopyJobStatus,
  CopyResult,
  CopyType,
  GenerationConfig
} from '@/types/copy';

const API_BASE = '/api/v1';

/**
 * Trigger copy generation for a product
 * Returns 202 Accepted with task_id for polling
 */
export async function generateCopy(
  workspaceId: string,
  productId: string,
  type: CopyType,
  config: GenerationConfig,
  context?: string[]
): Promise<{ taskId: string; status: string; message: string }> {
  const requestBody: CopyGenerationRequest = {
    workspaceId,
    productId,
    type,
    config,
    context: context || []
  };

  const response = await fetch(
    `${API_BASE}/copy/workspaces/${workspaceId}/products/${productId}/generate`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(requestBody),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to trigger copy generation');
  }

  const data = await response.json();
  return {
    taskId: data.task_id,
    status: data.status,
    message: data.message,
  };
}

/**
 * Poll job status for a copy generation task
 */
export async function getCopyJobStatus(
  workspaceId: string,
  taskId: string
): Promise<CopyJobStatus> {
  const response = await fetch(
    `${API_BASE}/copy/workspaces/${workspaceId}/jobs/${taskId}`,
    {
      method: 'GET',
      credentials: 'include',
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to get copy job status');
  }

  const data = await response.json();
  return {
    id: data.task_id,
    status: data.status,
    progress: data.progress,
    results: data.results,
    error: data.error,
    createdAt: new Date(data.created_at),
    startedAt: data.started_at ? new Date(data.started_at) : undefined,
    completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
  };
}

/**
 * Get saved copy results for a product
 */
export async function getCopyResults(
  workspaceId: string,
  productId: string,
  type?: CopyType
): Promise<CopyResult[]> {
  const url = type
    ? `${API_BASE}/copy/workspaces/${workspaceId}/products/${productId}/results?type=${type}`
    : `${API_BASE}/copy/workspaces/${workspaceId}/products/${productId}/results`;

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to get copy results');
  }

  const data = await response.json();
  return data.results.map((item: any) => ({
    id: item.id,
    content: item.content,
    type: item.type,
    config: item.config,
    createdAt: new Date(item.created_at),
    isFavorite: item.is_favorite,
  }));
}

/**
 * Save a copy result
 */
export async function saveCopyResult(
  workspaceId: string,
  productId: string,
  content: string,
  type: CopyType,
  config: GenerationConfig
): Promise<CopyResult> {
  const response = await fetch(
    `${API_BASE}/copy/workspaces/${workspaceId}/products/${productId}/results`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({
        content,
        type,
        config,
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to save copy result');
  }

  const data = await response.json();
  return {
    id: data.id,
    content: data.content,
    type: data.type,
    config: data.config,
    createdAt: new Date(data.created_at),
    isFavorite: data.is_favorite,
  };
}

/**
 * Toggle favorite status of a copy result
 */
export async function toggleCopyFavorite(
  workspaceId: string,
  copyId: string
): Promise<{ isFavorite: boolean }> {
  const response = await fetch(
    `${API_BASE}/copy/workspaces/${workspaceId}/results/${copyId}/favorite`,
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to toggle favorite status');
  }

  const data = await response.json();
  return {
    isFavorite: data.is_favorite,
  };
}

/**
 * Delete a copy result
 */
export async function deleteCopyResult(
  workspaceId: string,
  copyId: string
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/copy/workspaces/${workspaceId}/results/${copyId}`,
    {
      method: 'DELETE',
      credentials: 'include',
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to delete copy result');
  }
}

/**
 * Get user quota usage
 */
export async function getQuotaUsage(workspaceId: string): Promise<{
  used: number;
  limit: number;
  remaining: number;
}> {
  const response = await fetch(
    `${API_BASE}/copy/workspaces/${workspaceId}/quota`,
    {
      method: 'GET',
      credentials: 'include',
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'Failed to get quota usage');
  }

  const data = await response.json();
  return {
    used: data.used,
    limit: data.limit,
    remaining: data.remaining,
  };
}

/**
 * Create Server-Sent Events connection for real-time updates
 */
export function createCopyJobSSE(
  workspaceId: string,
  taskId: string,
  onProgress: (status: CopyJobStatus) => void,
  onError: (error: Error) => void
): EventSource {
  const eventSource = new EventSource(
    `${API_BASE}/copy/workspaces/${workspaceId}/jobs/${taskId}/stream`,
    {
      withCredentials: true,
    }
  );

  eventSource.onopen = () => {
    console.log('SSE connection opened for copy job:', taskId);
  };

  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      const status: CopyJobStatus = {
        id: data.task_id,
        status: data.status,
        progress: data.progress,
        results: data.results,
        error: data.error,
        createdAt: new Date(data.created_at),
        startedAt: data.started_at ? new Date(data.started_at) : undefined,
        completedAt: data.completed_at ? new Date(data.completed_at) : undefined,
      };
      onProgress(status);
    } catch (error) {
      console.error('Error parsing SSE message:', error);
      onError(new Error('Failed to parse server update'));
    }
  };

  eventSource.onerror = (error) => {
    console.error('SSE connection error:', error);
    onError(new Error('Connection to server lost'));
  };

  return eventSource;
}

/**
 * Retry logic with exponential backoff
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        break;
      }

      // Calculate exponential backoff delay
      const delay = baseDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}