/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Copy Generation Types
 * Type definitions for AI copywriting generation and job management.
 *
 * Story关联: Story 3.1: AI Copywriting Studio UI
 *
 * [INPUT]:
 * - CopyType: 'titles' | 'sellingPoints' | 'faq' | 'descriptions'
 * - Config: Tone, audience, length settings
 * - Product context: Optional reference data
 *
 * [LINK]:
 * - 依赖API -> @/lib/api/copy
 * - 使用组件 -> @/components/business/CopyGeneratorTabs
 * - 后端模型 -> backend/app/models/copy.py
 *
 * [OUTPUT]: Complete copy generation type system
 * [POS]: /frontend/src/types/copy.ts
 *
 * [PROTOCOL]:
 * 1. Four generation types supported
 * 2. Tone options: professional, casual, playful, luxury
 * 3. Audience options: b2b, b2c, technical
 * 4. Length options: short, medium, long
 * 5. Async job pattern with status polling
 *
 * === END HEADER ===
 */

export type CopyType = 'titles' | 'sellingPoints' | 'faq' | 'descriptions';

export type Tone = 'professional' | 'casual' | 'playful' | 'luxury';
export type Audience = 'b2b' | 'b2c' | 'technical';
export type Length = 'short' | 'medium' | 'long';

export interface GenerationConfig {
  tone: Tone;
  audience: Audience;
  length: Length;
}

export interface CopyGenerationRequest {
  workspaceId: string;
  productId: string;
  type: CopyType;
  config: GenerationConfig;
  context?: string[];
}

export interface CopyGenerationResponse {
  id: string;
  results: string[];
  usage: QuotaUsage;
}

export interface QuotaUsage {
  used: number;
  limit: number;
  remaining: number;
}

export interface CopyResult {
  id: string;
  content: string;
  type: CopyType;
  config: GenerationConfig;
  createdAt: Date;
  isFavorite: boolean;
}

export interface CopyJobStatus {
  id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results?: string[];
  error?: string;
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ParsedContent {
  sections: {
    title: string;
    content: string;
    images?: string[];
  }[];
}

export interface ProductContextPanelProps {
  productId: string;
  workspaceId: string;
  isCollapsed: boolean;
  onToggle: () => void;
}

export interface CopyStudioState {
  activeTab: CopyType;
  generationConfig: GenerationConfig;
  results: CopyResult[];
  isGenerating: boolean;
  currentJob?: CopyJobStatus;
}