/**
 * Image loading utilities for lazy loading and error handling
 */

import { useState, useEffect, RefObject } from 'react';

/**
 * Hook for lazy loading images with Intersection Observer
 * @param ref Element ref to observe
 * @param src Image source
 * @param threshold Intersection threshold (default: 0.1)
 */
export const useLazyImageLoad = (
  ref: RefObject<Element | null>,
  src: string,
  threshold: number = 0.1
): { isLoaded: boolean; hasError: boolean; imageSrc: string | null } => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setImageSrc(src);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => {
      if (ref.current) {
        observer.unobserve(ref.current);
      }
    };
  }, [ref, src, threshold]);

  useEffect(() => {
    if (imageSrc) {
      const img = new Image();

      img.onload = () => {
        setIsLoaded(true);
        setHasError(false);
      };

      img.onerror = () => {
        setIsLoaded(false);
        setHasError(true);
      };

      img.src = imageSrc;
    }
  }, [imageSrc]);

  return { isLoaded, hasError, imageSrc };
};

/**
 * Preload an image
 * @param src Image source URL
 * @returns Promise that resolves when image is loaded
 */
export const preloadImage = (src: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
};

/**
 * Generate a placeholder image URL with given dimensions
 * @param width Image width
 * @param height Image height
 * @param text Optional text to display
 * @returns Placeholder image URL
 */
export const generatePlaceholder = (
  width: number,
  height: number,
  text?: string
): string => {
  const encodedText = encodeURIComponent(text || `${width}×${height}`);
  return `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='${width}' height='${height}'%3E%3Crect width='100%25' height='100%25' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='system-ui' font-size='14' fill='%23666'%3E${encodedText}%3C/text%3E%3C/svg%3E`;
};