/**
 * SVGPreviewCard - A card component for displaying and interacting with SVG/image assets
 * Extended for Story 2.4: Reference Image Attachment
 */

import React, { useState, useRef } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  GripVertical,
  Edit,
  Trash2,
  Eye,
  RotateCcw,
  AlertTriangle,
  Plus,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AssetType, SVGPreviewCardProps, type ReferenceImage } from '@/types/editor';
import { sanitizeSVG, detectAssetType } from '@/utils/sanitizer';
import { useLazyImageLoad, generatePlaceholder } from '@/utils/imageLoader';
import { useReferenceUpload } from '@/hooks/useReferenceUpload';

const SVGPreviewCard: React.FC<SVGPreviewCardProps> = ({
  id,
  imageSrc,
  title,
  type,
  textOverlays = [],
  referenceImage,
  onEdit,
  onDelete,
  onViewFull,
  onAttachReference,
  onRemoveReference,
  isLoading = false,
  hasError = false,
  workspaceId = '',
  authToken = ''
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const contentRef = useRef<HTMLDivElement>(null);

  // Story 2.4: Reference upload hook
  const { uploadState, fileInputRef, selectFile, handleFileSelect, handleDrop, handleDragOver } =
    useReferenceUpload({
      workspaceId,
      token: authToken,
      onSuccess: (refImage) => onAttachReference?.(id, refImage),
      onError: (error) => console.error('Reference upload error:', error)
    });

  // Detect actual type if not provided
  const actualType = detectAssetType(imageSrc, type);

  // Use lazy loading for images
  const { isLoaded, hasError: loadError, imageSrc: lazySrc } = useLazyImageLoad(
    contentRef,
    actualType === AssetType.IMAGE ? imageSrc : ''
  );

  // Handle retry functionality - increment counter to trigger re-render
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  // Render asset based on type
  const renderAsset = () => {
    if (hasError || loadError) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-4 text-center" role="alert">
          <AlertTriangle className="h-8 w-8 text-red-500 mb-2" />
          <p className="text-sm text-red-600 mb-2">加载失败</p>
          {actualType === AssetType.IMAGE && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRetry}
              className="mt-2"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              重试
            </Button>
          )}
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="flex items-center justify-center h-full" role="status" aria-label="加载中">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
        </div>
      );
    }

    if (actualType === AssetType.SVG) {
      const sanitizedSVG = sanitizeSVG(imageSrc);
      return (
        <div
          ref={contentRef}
          className="w-full h-full flex items-center justify-center p-2"
          dangerouslySetInnerHTML={{ __html: sanitizedSVG }}
          role="img"
          aria-label={title}
          data-testid="svg-content"
        />
      );
    }

    // Image type
    const src = lazySrc || generatePlaceholder(300, 200, title);
    return (
      <div
        ref={contentRef}
        className="w-full h-full flex items-center justify-center p-2"
      >
        <img
          src={src}
          alt={title}
          className={cn(
            "w-full h-full object-contain transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0"
          )}
          loading="lazy"
          data-testid="image-content"
        />
      </div>
    );
  };

  // Render text overlays
  const renderTextOverlays = () => {
    if (textOverlays.length === 0) return null;

    return (
      <div className="absolute inset-0 pointer-events-none">
        {textOverlays.map((overlay) => (
          <div
            key={overlay.id}
            className="absolute text-sm font-medium"
            style={{
              left: `${overlay.x}%`,
              top: `${overlay.y}%`,
              fontSize: overlay.fontSize || 14,
              color: overlay.color || '#000000'
            }}
          >
            {overlay.text}
          </div>
        ))}
      </div>
    );
  };

  // Story 2.4: Render reference image thumbnail
  const renderReferenceImage = () => {
    if (!referenceImage) return null;

    return (
      <div className="absolute bottom-2 right-2 z-20">
        <div className="relative group">
          {/* Reference image thumbnail */}
          <div className="w-16 h-16 rounded-lg overflow-hidden border-2 border-white shadow-lg bg-white/90">
            <img
              src={referenceImage.thumbnailUrl}
              alt="参考图片"
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to original URL if thumbnail fails
                const target = e.target as HTMLImageElement;
                target.src = referenceImage.url;
              }}
            />
          </div>

          {/* Remove button on hover */}
          <Button
            variant="destructive"
            size="sm"
            className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            onClick={() => onRemoveReference?.(id)}
            aria-label="移除参考图片"
          >
            <X className="h-3 w-3" />
          </Button>

          {/* Upload progress overlay */}
          {uploadState.isUploading && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <div className="w-10 h-10 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
            </div>
          )}

          {/* Upload error indicator */}
          {uploadState.error && (
            <div className="absolute inset-0 bg-red-500/80 rounded-lg flex items-center justify-center">
              <AlertTriangle className="h-4 w-4 text-white" />
            </div>
          )}
        </div>
      </div>
    );
  };

  // Story 2.4: Render add reference button
  const renderAddReferenceButton = () => {
    if (referenceImage || !isHovered || hasError) return null;

    return (
      <div className="absolute bottom-2 right-2 z-20">
        <Button
          variant="secondary"
          size="sm"
          className="h-10 w-10 rounded-full bg-white/90 hover:bg-white shadow-lg"
          onClick={selectFile}
          aria-label="添加参考图片"
          disabled={uploadState.isUploading}
        >
          {uploadState.isUploading ? (
            <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
          ) : (
            <Plus className="h-4 w-4" />
          )}
        </Button>
      </div>
    );
  };

  // Render action buttons
  const renderActions = () => {
    if (!isHovered || hasError) return null;

    return (
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        {onViewFull && (
          <Button
            variant="secondary"
            size="sm"
            className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
            onClick={() => onViewFull(imageSrc)}
            aria-label="查看全屏"
          >
            <Eye className="h-4 w-4" />
          </Button>
        )}
        {onEdit && actualType === AssetType.SVG && (
          <Button
            variant="secondary"
            size="sm"
            className="h-8 w-8 p-0 bg-white/90 hover:bg-white"
            onClick={() => onEdit(id, textOverlays)}
            aria-label="编辑文本"
          >
            <Edit className="h-4 w-4" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="destructive"
            size="sm"
            className="h-8 w-8 p-0 bg-red-500/90 hover:bg-red-500"
            onClick={() => onDelete(id)}
            aria-label="删除"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    );
  };

  return (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all duration-200 hover:shadow-lg",
        hasError && "border-red-300 bg-red-50",
        uploadState.isUploading && "ring-2 ring-blue-500",
        "cursor-default"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      data-testid={`preview-card-${id}`}
      aria-label={title}
    >
      {/* Hidden file input for reference upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png"
        onChange={handleFileSelect}
        className="hidden"
        aria-label="选择参考图片文件"
      />

      {/* Drag handle */}
      <div className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <div className="cursor-grab active:cursor-grabbing bg-white/90 rounded p-1 shadow-sm">
          <GripVertical className="h-4 w-4 text-gray-600" />
        </div>
      </div>

      {/* Card header with title */}
      <div className="px-3 py-2 bg-gray-50 border-b">
        <h3 className="text-sm font-medium text-gray-900 truncate" title={title}>
          {title}
        </h3>
        <p className="text-xs text-gray-500 flex items-center gap-2">
          <span>{actualType === AssetType.SVG ? 'SVG' : '图片'}</span>
          {referenceImage && (
            <span className="text-blue-600 font-medium">
              • 有参考图片
            </span>
          )}
        </p>
      </div>

      {/* Card content */}
      <CardContent className="p-0 h-64 relative">
        {renderAsset()}
        {renderTextOverlays()}
        {renderActions()}

        {/* Story 2.4: Reference image components */}
        {renderReferenceImage()}
        {renderAddReferenceButton()}
      </CardContent>

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-300"></div>
        </div>
      )}

      {/* Story 2.4: Upload progress overlay for reference image */}
      {uploadState.isUploading && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-30">
          <div className="bg-white rounded-lg p-4 shadow-lg">
            <div className="text-sm font-medium text-gray-900 mb-2">上传参考图片...</div>
            <div className="w-48 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${uploadState.progress}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {Math.round(uploadState.progress)}%
            </div>
          </div>
        </div>
      )}

      {/* Story 2.4: Drag overlay for reference images */}
      {isHovered && !referenceImage && !hasError && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-25 pointer-events-none">
          <div className="bg-white/90 rounded-lg px-3 py-2 shadow-sm">
            <p className="text-sm text-blue-600 font-medium">拖拽图片到此处作为参考</p>
          </div>
        </div>
      )}
    </Card>
  );
};

export default SVGPreviewCard;