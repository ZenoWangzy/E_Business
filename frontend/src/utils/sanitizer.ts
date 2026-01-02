/**
 * SVG sanitization utilities to prevent XSS attacks
 */

import DOMPurify from 'dompurify';

/**
 * Sanitize SVG content to prevent XSS attacks
 * @param svgContent Raw SVG content
 * @returns Sanitized SVG content
 */
export const sanitizeSVG = (svgContent: string): string => {
  return DOMPurify.sanitize(svgContent, {
    USE_PROFILES: { svg: true, svgFilters: true },
    FORBID_ATTR: ['onclick', 'onerror', 'onload', 'onmouseover', 'onmouseout'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed'],
    ALLOW_DATA_ATTR: false
  });
};

/**
 * Check if content is SVG
 * @param content Content to check
 * @returns True if content is SVG
 */
export const isSVGContent = (content: string): boolean => {
  return content.startsWith('<svg') || content.endsWith('.svg');
};

/**
 * Detect asset type from source
 * @param src Source string
 * @param type Optional explicit type
 * @returns AssetType
 */
export const detectAssetType = (src: string, type?: 'image' | 'svg'): 'image' | 'svg' => {
  if (type) return type;
  if (src.startsWith('<svg')) return 'svg';
  if (src.endsWith('.svg')) return 'svg';
  return 'image';
};