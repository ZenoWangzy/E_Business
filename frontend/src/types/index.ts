/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Type Index Barrel
 * Central export point for commonly used types across the application.
 *
 * Story关联: N/A (Utility Module)
 *
 * [INPUT]:
 * - Re-exports: workspace, copy types
 *
 * [LINK]:
 * - 模块导出 -> ./workspace, ./copy, ./image, ./product, etc.
 * - 使用位置 -> All application modules
 *
 * [OUTPUT]: Convenient type imports from single entry point
 * [POS]: /frontend/src/types/index.ts
 *
 * [PROTOCOL]:
 * 1. Barrel pattern: Re-export commonly used types
 * 2. Import simplification: Use `import { X } from '@/types'` instead of deep paths
 * 3. Keep exports minimal: Only most common types
 * 4. Avoid circular dependencies by careful import ordering
 *
 * === END HEADER ===
 */

export * from './workspace';
export * from './copy';
