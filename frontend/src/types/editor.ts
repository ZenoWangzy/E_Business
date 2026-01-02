/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Editor Component Types
 * Type definitions for image editor grid, canvas stitcher, and state management.
 *
 * Story关联: Story 2.3: Editor Grid, Story 2.4: Reference Image, Story 2.5: Canvas Stitcher
 *
 * [INPUT]:
 * - Items: GridItem[] (images and SVGs)
 * - Callbacks: onReorder, onEditItem, onDeleteItem, onViewFull
 * - Reference Image: Optional attachment for generation
 *
 * [LINK]:
 * - 使用组件 -> @/components/business/EditorGrid, CanvasStitcher
 * - 状态管理 -> @/stores/editorStore (Zustand)
 * - 依赖类型 -> ./canvas (CanvasStitcherProps)
 *
 * [OUTPUT]: Complete type system for editor state and actions
 * [POS]: /frontend/src/types/editor.ts
 *
 * [PROTOCOL]:
 * 1. AssetType enum distinguishes IMAGE vs SVG content
 * 2. Story 2.4 adds ReferenceImage attachment capability
 * 3. Story 2.5 adds CanvasStitcher for long image export
 * 4. SSE types for real-time generation progress updates
 *
 * === END HEADER ===
 */

export enum AssetType {
  IMAGE = 'image',
  SVG = 'svg'
}

export interface TextOverlay {
  id: string
  text: string
  x: number
  y: number
  fontSize?: number
  color?: string
}

// Story 2.4: Reference Image attachment
export interface ReferenceImage {
  id: string
  url: string
  thumbnailUrl: string
  assetId: string
}

export interface GridItem {
  id: string
  src: string // 支持图片URL或SVG内容
  title: string
  type: AssetType // 新增类型字段
  textOverlays?: TextOverlay[]
  referenceImage?: ReferenceImage // Story 2.4: Reference image attachment
  isLoading?: boolean
  hasError?: boolean
  metadata?: {
    originalUrl?: string // 原始图片URL
    svgContent?: string // SVG内容（如果是SVG类型）
    dimensions?: { width: number; height: number }
  }
}

export interface EditorGridProps {
  items: GridItem[]
  onReorder: (oldIndex: number, newIndex: number) => void
  onEditItem: (id: string, overlays: TextOverlay[]) => void
  onDeleteItem: (id: string) => void
  onViewFull?: (imageSrc: string) => void
  // Story 2.4: Reference image callbacks
  onAttachReference?: (id: string, referenceImage: ReferenceImage) => void
  onRemoveReference?: (id: string) => void
  isLoading?: boolean
}

export interface SVGPreviewCardProps {
  id: string
  imageSrc: string
  title: string
  type: AssetType
  textOverlays?: TextOverlay[]
  referenceImage?: ReferenceImage // Story 2.4: Reference image attachment
  onEdit?: (id: string, overlays: TextOverlay[]) => void
  onDelete?: (id: string) => void
  onViewFull?: (imageSrc: string) => void
  onAttachReference?: (id: string, referenceImage: ReferenceImage) => void // Story 2.4
  onRemoveReference?: (id: string) => void // Story 2.4
  isLoading?: boolean
  hasError?: boolean
  // Story 2.4: Required for reference image upload
  workspaceId?: string
  authToken?: string
}

// SSE相关类型定义
export interface SSEMessage {
  taskId: string
  event: 'status' | 'progress' | 'completed' | 'error' | 'close'
  data: SSEData
  timestamp: number
}

export interface SSEData {
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'connected' | 'error' | 'closed'
  progress?: number
  message?: string
  results?: Array<{
    id: string
    url: string
    type: 'image' | 'svg'
    metadata?: any
  }>
  error?: string
}

// Editor状态管理类型
export interface EditorState {
  items: GridItem[]
  order: string[]
  isLoading: boolean
  error: string | null
  taskId?: string
  // Story 2.5: Canvas Stitcher state
  stitcherState: StitcherState
}

export interface EditorActions {
  setItems: (items: GridItem[]) => void
  reorderItems: (oldIndex: number, newIndex: number) => void
  addItem: (item: GridItem) => void
  removeItem: (id: string) => void
  updateItem: (id: string, updates: Partial<GridItem>) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  clearItems: () => void
  setTaskId: (taskId: string) => void
  // Story 2.4: Reference image management
  attachReference: (id: string, referenceImage: ReferenceImage) => void
  removeReference: (id: string) => void
  // Story 2.5: Canvas Stitcher actions
  setStitcherState: (state: Partial<StitcherState>) => void
  setStitcherGenerating: (isGenerating: boolean) => void
  setStitcherProgress: (progress: number) => void
  setStitcherPreview: (previewUrl: string | null) => void
  setStitcherError: (error: any) => void
  clearStitcherState: () => void
}

export type EditorStore = EditorState & EditorActions

// Story 2.5: Canvas Stitcher Types
export interface ImageItem {
  id: string
  url: string
  title: string
  metadata?: Record<string, unknown>
}

export type StitcherErrorType = 'CORS' | 'MEMORY' | 'CANVAS_LIMIT' | 'NETWORK' | 'TIMEOUT'

export interface StitcherError {
  type: StitcherErrorType
  message: string
  retryable: boolean
}

export interface CanvasStitcherProps {
  items: ImageItem[]
  onPreview?: (previewUrl: string) => void
  onDownload?: (blob: Blob, filename: string) => void
  onError?: (error: StitcherError) => void
  maxCanvasHeight?: number
  quality?: number
  className?: string
}

export interface StitcherState {
  isGenerating: boolean
  progress: number
  previewUrl: string | null
  error: StitcherError | null
}