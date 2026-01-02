/**
 * [IDENTITY]: 带超时的 fetch 包装器
 * 为 API 请求提供超时控制，防止无限等待
 * 
 * [INPUT]:
 *   - url: string - 请求 URL
 *   - options: RequestInit - fetch 选项
 *   - timeout: number - 超时时间（毫秒）
 * 
 * [LINK]:
 *   - API Client -> ./workspaces.ts
 *   - Context -> ../../components/workspace/WorkspaceContext.tsx
 * 
 * [OUTPUT]: Promise<Response>
 * [POS]: /frontend/src/lib/api/fetchWithTimeout.ts
 * 
 * [PROTOCOL]:
 *   1. 使用 AbortController 实现超时控制
 *   2. 超时后抛出明确的错误信息
 */

export async function fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeout: number = 10000
): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === 'AbortError') {
            throw new Error(`请求超时（${timeout}ms）`);
        }
        throw error;
    }
}
