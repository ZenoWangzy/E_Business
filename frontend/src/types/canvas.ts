/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Canvas Stitcher Types
 * Type definitions for canvas image stitching functionality.
 *
 * Story关联: Story 2.5: Canvas Stitching & Export
 *
 * [INPUT]:
 * - Props: GridItem[], callbacks, processing options
 * - 配置: itemGap, scale, maxWidth, backgroundColor
 *
 * [LINK]:
 * - 依赖类型 -> ./editor (GridItem for source items)
 * - 使用组件 -> @/components/business/CanvasStitcher
 *
 * [OUTPUT]: Type definitions for canvas stitching props and results
 * [POS]: /frontend/src/types/canvas.ts
 *
 * [PROTOCOL]:
 * 1. Props interface defines component input contract
 * 2. Options interface provides configuration parameters
 * 3. State tracking for processing progress and errors
 * 4. Result interface contains final stitched image data
 *
 * === END HEADER ===
 */

import { GridItem } from './editor';

export interface CanvasStitcherProps {
  /** Items to stitch into a long image */
  items: GridItem[];
  /** Whether the component is currently processing */
  isProcessing?: boolean;
  /** Callback when processing starts */
  onProcessingStart?: () => void;
  /** Callback when processing ends */
  onProcessingEnd?: (dataUrl: string) => void;
  /** Callback when an error occurs */
  onError?: (error: Error) => void;
  /** Gap between items in pixels */
  itemGap?: number;
  /** Output scale factor for high-quality images */
  scale?: number;
  /** Maximum width of the output image */
  maxWidth?: number;
  /** Background color of the canvas */
  backgroundColor?: string;
  /** Whether to show a preview modal */
  showModal?: boolean;
  /** Callback to close the modal */
  onCloseModal?: () => void;
}

export interface CanvasStitcherOptions {
  /** Gap between items in pixels */
  itemGap?: number;
  /** Output scale factor for high-quality images */
  scale?: number;
  /** Maximum width of the output image */
  maxWidth?: number;
  /** Background color of the canvas */
  backgroundColor?: string;
  /** Timeout for image loading in milliseconds */
  imageLoadTimeout?: number;
  /** Whether to use CORS for images */
  useCORS?: boolean;
}

export interface ProcessingState {
  isProcessing: boolean;
  progress: number; // 0-100
  currentStep: string;
  error?: string;
}

export interface StitchedImageResult {
  /** Base64 data URL of the stitched image */
  dataUrl: string;
  /** Width of the output image */
  width: number;
  /** Height of the output image */
  height: number;
  /** File size in bytes */
  fileSize: number;
  /** Number of items stitched */
  itemCount: number;
  /** Processing time in milliseconds */
  processingTime: number;
}