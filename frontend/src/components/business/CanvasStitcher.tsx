/**
 * CanvasStitcher - Component to stitch multiple images into a single long image
 * Uses html2canvas to capture DOM elements and merge them
 */

'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import html2canvas from 'html2canvas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  CanvasStitcherProps,
  CanvasStitcherOptions,
  ProcessingState,
  StitchedImageResult
} from '@/types/canvas';
import { cn } from '@/lib/utils';
import { Download, Loader2, Image as ImageIcon, X } from 'lucide-react';

const CanvasStitcher: React.FC<CanvasStitcherProps> = ({
  items,
  isProcessing: externalIsProcessing = false,
  onProcessingStart,
  onProcessingEnd,
  onError,
  itemGap = 16,
  scale = 2,
  maxWidth = 800,
  backgroundColor = '#ffffff',
  showModal = false,
  onCloseModal
}) => {
  const [processingState, setProcessingState] = useState<ProcessingState>({
    isProcessing: false,
    progress: 0,
    currentStep: ''
  });
  const [stitchedImage, setStitchedImage] = useState<StitchedImageResult | null>(null);
  const [previewModalOpen, setPreviewModalOpen] = useState(false);

  // Refs for the hidden container and canvas
  const hiddenContainerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const processingStartTime = useRef<number>(0);

  // Default options
  const options: CanvasStitcherOptions = {
    itemGap,
    scale,
    maxWidth,
    backgroundColor,
    imageLoadTimeout: 10000,
    useCORS: true
  };

  // Helper function to preload images
  const preloadImages = useCallback(async (items: CanvasStitcherProps['items']): Promise<HTMLImageElement[]> => {
    const imagePromises = items.map((item, index) => {
      return new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';

        const timeout = setTimeout(() => {
          reject(new Error(`Image ${index + 1} loading timeout`));
        }, options.imageLoadTimeout);

        img.onload = () => {
          clearTimeout(timeout);
          resolve(img);
        };

        img.onerror = () => {
          clearTimeout(timeout);
          reject(new Error(`Failed to load image ${index + 1}`));
        };

        img.src = item.src;
      });
    });

    return Promise.all(imagePromises);
  }, [options.imageLoadTimeout]);

  // Main stitch function
  const stitchImages = useCallback(async () => {
    if (items.length === 0) {
      onError?.(new Error('No items to stitch'));
      return;
    }

    try {
      // Start processing
      processingStartTime.current = Date.now();
      setProcessingState({
        isProcessing: true,
        progress: 0,
        currentStep: '准备中...'
      });
      onProcessingStart?.();

      // Step 1: Preload all images
      setProcessingState(prev => ({
        ...prev,
        progress: 10,
        currentStep: `加载图片中... (0/${items.length})`
      }));

      const images = await preloadImages(items);

      // Step 2: Calculate dimensions
      setProcessingState(prev => ({
        ...prev,
        progress: 30,
        currentStep: '计算布局中...'
      }));

      const itemWidth = Math.min(options.maxWidth!, images[0].width);
      const itemHeight = (images[0].height / images[0].width) * itemWidth;
      const totalHeight = images.reduce((sum, img, index) => {
        const imgHeight = (img.height / img.width) * itemWidth;
        return sum + imgHeight + (index < images.length - 1 ? options.itemGap! : 0);
      }, 0);

      const canvasWidth = itemWidth * options.scale!;
      const canvasHeight = totalHeight * options.scale!;

      // Step 3: Create hidden container with all items
      setProcessingState(prev => ({
        ...prev,
        progress: 50,
        currentStep: '渲染元素中...'
      }));

      if (!hiddenContainerRef.current) {
        throw new Error('Hidden container not found');
      }

      // Clear previous content
      hiddenContainerRef.current.innerHTML = '';

      // Create a wrapper div for proper sizing
      const wrapper = document.createElement('div');
      wrapper.style.width = `${itemWidth}px`;
      wrapper.style.backgroundColor = options.backgroundColor;
      wrapper.style.position = 'relative';

      items.forEach((item, index) => {
        const img = images[index];
        const imgHeight = (img.height / img.width) * itemWidth;

        // Create image element with proper sizing
        const imgEl = document.createElement('img');
        imgEl.src = item.src;
        imgEl.style.width = `${itemWidth}px`;
        imgEl.style.height = `${imgHeight}px`;
        imgEl.style.display = 'block';
        imgEl.style.objectFit = 'contain';

        // Add gap except for last item
        if (index < items.length - 1) {
          imgEl.style.marginBottom = `${options.itemGap}px`;
        }

        wrapper.appendChild(imgEl);
      });

      hiddenContainerRef.current.appendChild(wrapper);

      // Step 4: Capture with html2canvas
      setProcessingState(prev => ({
        ...prev,
        progress: 70,
        currentStep: '生成图片中...'
      }));

      const canvas = await html2canvas(wrapper, {
        scale: options.scale,
        backgroundColor: options.backgroundColor,
        useCORS: options.useCORS,
        allowTaint: false,
        logging: false,
        width: itemWidth,
        height: totalHeight,
        windowWidth: itemWidth,
        windowHeight: totalHeight
      });

      // Step 5: Get data URL
      setProcessingState(prev => ({
        ...prev,
        progress: 90,
        currentStep: '处理输出中...'
      }));

      const dataUrl = canvas.toDataURL('image/png', 1.0);

      // Calculate file size
      const base64Data = dataUrl.split(',')[1];
      const fileSize = Math.round(base64Data.length * 0.75);

      // Step 6: Create result
      const result: StitchedImageResult = {
        dataUrl,
        width: canvas.width,
        height: canvas.height,
        fileSize,
        itemCount: items.length,
        processingTime: Date.now() - processingStartTime.current
      };

      setProcessingState(prev => ({
        ...prev,
        progress: 100,
        currentStep: '完成！'
      }));

      // Update state and callback
      setStitchedImage(result);
      setPreviewModalOpen(true);

      setTimeout(() => {
        setProcessingState({ isProcessing: false, progress: 0, currentStep: '' });
        onProcessingEnd?.(dataUrl);
      }, 500);

    } catch (error) {
      const err = error instanceof Error ? error : new Error('Unknown error occurred');
      setProcessingState({
        isProcessing: false,
        progress: 0,
        currentStep: '',
        error: err.message
      });
      onError?.(err);
    }
  }, [items, options, onProcessingStart, onProcessingEnd, onError, preloadImages]);

  // Download function
  const downloadImage = useCallback(() => {
    if (!stitchedImage) return;

    const link = document.createElement('a');
    link.download = `stitched-image-${Date.now()}.png`;
    link.href = stitchedImage.dataUrl;
    link.click();
  }, [stitchedImage]);

  // Handle modal close
  const handleCloseModal = useCallback(() => {
    setPreviewModalOpen(false);
    onCloseModal?.();
  }, [onCloseModal]);

  // Format file size
  const formatFileSize = useCallback((bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }, []);

  // Format processing time
  const formatProcessingTime = useCallback((ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }, []);

  return (
    <>
      {/* Hidden container for rendering */}
      <div
        ref={hiddenContainerRef}
        style={{
          position: 'absolute',
          top: -9999,
          left: -9999,
          width: '1px',
          height: '1px',
          overflow: 'hidden'
        }}
      />

      {/* Main component */}
      <div className={cn(
        "flex flex-col items-center justify-center p-6",
        (processingState.isProcessing || externalIsProcessing) && "pointer-events-none opacity-75"
      )}>
        {!processingState.isProcessing && !stitchedImage && (
          <div className="text-center">
            <ImageIcon className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-semibold mb-2">生成长图</h3>
            <p className="text-muted-foreground mb-4">
              将 {items.length} 张图片合成为一张长图
            </p>
            <Button onClick={stitchImages} disabled={items.length === 0}>
              生成预览
            </Button>
          </div>
        )}

        {processingState.isProcessing && (
          <div className="w-full max-w-sm">
            <div className="flex items-center justify-center mb-4">
              <Loader2 className="w-8 h-8 animate-spin" />
            </div>
            <div className="text-center mb-2">
              <p className="font-medium">{processingState.currentStep}</p>
            </div>
            <Progress value={processingState.progress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2 text-center">
              {processingState.progress}%
            </p>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      <Dialog open={previewModalOpen || showModal} onOpenChange={handleCloseModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>长图预览</DialogTitle>
          </DialogHeader>

          {stitchedImage && (
            <div className="space-y-4">
              {/* Image preview */}
              <div className="border rounded-lg overflow-hidden bg-gray-50 p-2">
                <img
                  src={stitchedImage.dataUrl}
                  alt="Stitched preview"
                  className="w-full h-auto max-h-[60vh] object-contain"
                />
              </div>

              {/* Image info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">尺寸:</span>
                  <div className="font-medium">
                    {stitchedImage.width} × {stitchedImage.height}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">图片数量:</span>
                  <div className="font-medium">{stitchedImage.itemCount} 张</div>
                </div>
                <div>
                  <span className="text-muted-foreground">文件大小:</span>
                  <div className="font-medium">{formatFileSize(stitchedImage.fileSize)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">处理时间:</span>
                  <div className="font-medium">{formatProcessingTime(stitchedImage.processingTime)}</div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              <X className="w-4 h-4 mr-2" />
              关闭
            </Button>
            {stitchedImage && (
              <Button onClick={downloadImage}>
                <Download className="w-4 h-4 mr-2" />
                下载图片
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CanvasStitcher;