/**
 * Hook for uploading reference images (Story 2.4)
 * Handles file validation, upload progress, and error management
 */

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { uploadAssetViaMinIO, type UploadResponse } from '@/lib/api/assets'
import type { ReferenceImage } from '@/types/editor'

interface UseReferenceUploadOptions {
  workspaceId: string
  token: string
  onSuccess?: (referenceImage: ReferenceImage) => void
  onError?: (error: Error) => void
}

interface UploadState {
  isUploading: boolean
  progress: number
  error: string | null
}

const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png']

export function useReferenceUpload({
  workspaceId,
  token,
  onSuccess,
  onError
}: UseReferenceUploadOptions) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    error: null
  })

  const fileInputRef = useRef<HTMLInputElement>(null)

  /**
   * Validate file before upload
   */
  const validateFile = useCallback((file: File): string | null => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return '只支持 JPG 和 PNG 格式的图片'
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return '文件大小不能超过 5MB'
    }

    // Check file extension matches type
    const extension = file.name.toLowerCase().split('.').pop()
    if (!extension || !['jpg', 'jpeg', 'png'].includes(extension)) {
      return '文件扩展名不正确'
    }

    return null
  }, [])

  /**
   * Generate thumbnail URL (for now, just return the original URL)
   * In a real implementation, you might want to generate actual thumbnails
   */
  const generateThumbnailUrl = useCallback((url: string): string => {
    // For MinIO, we can add query parameters to get a resized version
    // This is a simplified implementation
    return url
  }, [])

  /**
   * Create ReferenceImage object from upload response
   */
  const createReferenceImage = useCallback((
    uploadResponse: UploadResponse,
    file: File
  ): ReferenceImage => {
    const url = `/api/v1/workspaces/${workspaceId}/assets/${uploadResponse.id}/url`
    return {
      id: crypto.randomUUID(),
      url,
      thumbnailUrl: generateThumbnailUrl(url),
      assetId: uploadResponse.id
    }
  }, [workspaceId, generateThumbnailUrl])

  /**
   * Handle file upload
   */
  const uploadReference = useCallback(async (file: File): Promise<void> => {
    // Validate file
    const validationError = validateFile(file)
    if (validationError) {
      const error = new Error(validationError)
      setUploadState({
        isUploading: false,
        progress: 0,
        error: validationError
      })
      toast.error(validationError)
      onError?.(error)
      return
    }

    // Start upload
    setUploadState({
      isUploading: true,
      progress: 0,
      error: null
    })

    try {
      const uploadResponse = await uploadAssetViaMinIO(
        file,
        workspaceId,
        token,
        (progress) => {
          setUploadState(prev => ({ ...prev, progress }))
        }
      )

      const referenceImage = createReferenceImage(uploadResponse, file)

      // Reset upload state
      setUploadState({
        isUploading: false,
        progress: 0,
        error: null
      })

      toast.success('参考图片上传成功')
      onSuccess?.(referenceImage)
    } catch (error) {
      // Handle both Error objects and string errors
      const errorMessage = error instanceof Error
        ? error.message
        : (typeof error === 'string' ? error : '上传失败')
      setUploadState({
        isUploading: false,
        progress: 0,
        error: errorMessage
      })
      toast.error(errorMessage)
      onError?.(error instanceof Error ? error : new Error(errorMessage))
    }
  }, [validateFile, workspaceId, token, createReferenceImage, onSuccess, onError])

  /**
   * Handle file selection from input
   */
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      uploadReference(file)
    }
    // Reset input value to allow selecting the same file again
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }, [uploadReference])

  /**
   * Trigger file selection dialog
   */
  const selectFile = useCallback(() => {
    fileInputRef.current?.click()
  }, [])

  /**
   * Handle drag and drop
   */
  const handleDrop = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (file) {
      uploadReference(file)
    }
  }, [uploadReference])

  /**
   * Handle drag over
   */
  const handleDragOver = useCallback((event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
  }, [])

  /**
   * Reset upload state
   */
  const reset = useCallback(() => {
    setUploadState({
      isUploading: false,
      progress: 0,
      error: null
    })
  }, [])

  return {
    uploadState,
    fileInputRef,
    selectFile,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    reset,
    uploadReference
  }
}