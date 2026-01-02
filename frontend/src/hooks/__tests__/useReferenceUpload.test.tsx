/**
 * useReferenceUpload Hook Tests
 * Story 2.4: Reference Image Attachment
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import { useReferenceUpload } from '../useReferenceUpload'
import { uploadAssetViaMinIO } from '@/lib/api/assets'
import type { ReferenceImage } from '@/types/editor'

// Mock dependencies
jest.mock('@/lib/api/assets')
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

const mockUploadAssetViaMinIO = uploadAssetViaMinIO as jest.MockedFunction<typeof uploadAssetViaMinIO>
const mockToast = toast as jest.Mocked<typeof toast>

describe('useReferenceUpload', () => {
  const mockWorkspaceId = 'workspace-123'
  const mockToken = 'test-token'
  const mockOnSuccess = jest.fn()
  const mockOnError = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    global.URL.createObjectURL = jest.fn(() => 'mock-url')
    global.fetch = jest.fn()
  })

  describe('File Validation', () => {
    test('should reject files larger than 5MB', async () => {
      const { result } = renderHook(() =>
        useReferenceUpload({
          workspaceId: mockWorkspaceId,
          token: mockToken,
          onSuccess: mockOnSuccess,
          onError: mockOnError
        })
      )

      // Create a large file (6MB)
      const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'large.jpg', {
        type: 'image/jpeg'
      })

      act(() => {
        result.current.uploadReference(largeFile)
      })

      await waitFor(() => {
        expect(result.current.uploadState.error).toBe('文件大小不能超过 5MB')
        expect(mockToast.error).toHaveBeenCalledWith('文件大小不能超过 5MB')
        expect(mockOnError).toHaveBeenCalledWith(expect.any(Error))
      })
    })

    test('should reject non-image files', async () => {
      const { result } = renderHook(() =>
        useReferenceUpload({
          workspaceId: mockWorkspaceId,
          token: mockToken,
          onSuccess: mockOnSuccess,
          onError: mockOnError
        })
      )

      // Create a non-image file
      const textFile = new File(['test'], 'test.txt', {
        type: 'text/plain'
      })

      act(() => {
        result.current.uploadReference(textFile)
      })

      await waitFor(() => {
        expect(result.current.uploadState.error).toBe('只支持 JPG 和 PNG 格式的图片')
        expect(mockToast.error).toHaveBeenCalledWith('只支持 JPG 和 PNG 格式的图片')
        expect(mockOnError).toHaveBeenCalledWith(expect.any(Error))
      })
    })

    test('should reject files with invalid extensions', async () => {
      const { result } = renderHook(() =>
        useReferenceUpload({
          workspaceId: mockWorkspaceId,
          token: mockToken,
          onSuccess: mockOnSuccess,
          onError: mockOnError
        })
      )

      // Create a file with wrong extension but correct mime type
      const wrongExtFile = new File(['test'], 'test.pdf', {
        type: 'image/jpeg'
      })

      act(() => {
        result.current.uploadReference(wrongExtFile)
      })

      await waitFor(() => {
        expect(result.current.uploadState.error).toBe('文件扩展名不正确')
        expect(mockToast.error).toHaveBeenCalledWith('文件扩展名不正确')
        expect(mockOnError).toHaveBeenCalledWith(expect.any(Error))
      })
    })
  })

  describe('Upload Success', () => {
    test('should successfully upload valid image file', async () => {
      const mockUploadResponse = {
        id: 'asset-123',
        workspaceId: mockWorkspaceId,
        name: 'test.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
        createdAt: new Date().toISOString()
      }

      mockUploadAssetViaMinIO.mockResolvedValue(mockUploadResponse)

      const { result } = renderHook(() =>
        useReferenceUpload({
          workspaceId: mockWorkspaceId,
          token: mockToken,
          onSuccess: mockOnSuccess,
          onError: mockOnError
        })
      )

      // Create a valid image file
      const validFile = new File(['test'], 'test.jpg', {
        type: 'image/jpeg'
      })

      act(() => {
        result.current.uploadReference(validFile)
      })

      expect(result.current.uploadState.isUploading).toBe(true)

      await waitFor(() => {
        expect(mockUploadAssetViaMinIO).toHaveBeenCalledWith(
          validFile,
          mockWorkspaceId,
          mockToken,
          expect.any(Function) // progress callback
        )
      })

      await waitFor(() => {
        expect(result.current.uploadState.isUploading).toBe(false)
        expect(result.current.uploadState.progress).toBe(0)
        expect(result.current.uploadState.error).toBe(null)
      })

      // Check onSuccess callback
      const expectedReference: ReferenceImage = {
        id: expect.any(String),
        url: `/api/v1/workspaces/${mockWorkspaceId}/assets/asset-123/url`,
        thumbnailUrl: `/api/v1/workspaces/${mockWorkspaceId}/assets/asset-123/url`,
        assetId: 'asset-123'
      }

      expect(mockOnSuccess).toHaveBeenCalledWith(expect.objectContaining({
        id: expect.any(String),
        url: expect.stringContaining('asset-123'),
        assetId: 'asset-123'
      }))
      expect(mockToast.success).toHaveBeenCalledWith('参考图片上传成功')
    })

    test('should track upload progress', async () => {
      const mockUploadResponse = {
        id: 'asset-123',
        workspaceId: mockWorkspaceId,
        name: 'test.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
        createdAt: new Date().toISOString()
      }

      let progressCallback: ((progress: number) => void) | null = null

      mockUploadAssetViaMinIO.mockImplementation(
        (file, workspaceId, token, onProgress) => {
          progressCallback = onProgress || null
          return Promise.resolve(mockUploadResponse)
        }
      )

      const { result } = renderHook(() =>
        useReferenceUpload({
          workspaceId: mockWorkspaceId,
          token: mockToken,
          onSuccess: mockOnSuccess,
          onError: mockOnError
        })
      )

      const validFile = new File(['test'], 'test.jpg', {
        type: 'image/jpeg'
      })

      act(() => {
        result.current.uploadReference(validFile)
      })

      // Simulate progress updates
      if (progressCallback) {
        act(() => {
          progressCallback!(25)
        })
        expect(result.current.uploadState.progress).toBe(25)

        act(() => {
          progressCallback!(50)
        })
        expect(result.current.uploadState.progress).toBe(50)

        act(() => {
          progressCallback!(100)
        })
        expect(result.current.uploadState.progress).toBe(100)
      }
    })
  })

  describe('Upload Error', () => {
    test('should handle upload failure', async () => {
      const uploadError = new Error('Upload failed')
      mockUploadAssetViaMinIO.mockRejectedValue(uploadError)

      const { result } = renderHook(() =>
        useReferenceUpload({
          workspaceId: mockWorkspaceId,
          token: mockToken,
          onSuccess: mockOnSuccess,
          onError: mockOnError
        })
      )

      const validFile = new File(['test'], 'test.jpg', {
        type: 'image/jpeg'
      })

      act(() => {
        result.current.uploadReference(validFile)
      })

      await waitFor(() => {
        expect(result.current.uploadState.isUploading).toBe(false)
        expect(result.current.uploadState.error).toBe('Upload failed')
        expect(mockToast.error).toHaveBeenCalledWith('Upload failed')
        expect(mockOnError).toHaveBeenCalledWith(uploadError)
      })
    })

    test('should handle non-Error objects in upload failure', async () => {
      mockUploadAssetViaMinIO.mockRejectedValue('String error')

      const { result } = renderHook(() =>
        useReferenceUpload({
          workspaceId: mockWorkspaceId,
          token: mockToken,
          onSuccess: mockOnSuccess,
          onError: mockOnError
        })
      )

      const validFile = new File(['test'], 'test.jpg', {
        type: 'image/jpeg'
      })

      act(() => {
        result.current.uploadReference(validFile)
      })

      await waitFor(() => {
        expect(result.current.uploadState.error).toBe('String error')
        expect(mockToast.error).toHaveBeenCalledWith('String error')
        expect(mockOnError).toHaveBeenCalledWith(expect.any(Error))
      })
    })
  })

  describe('File Selection', () => {
    test('should call selectFile to trigger file input', () => {
      const { result } = renderHook(() =>
        useReferenceUpload({
          workspaceId: mockWorkspaceId,
          token: mockToken
        })
      )

      // Mock file input click
      const mockClick = jest.fn()
      Object.defineProperty(result.current.fileInputRef, 'current', {
        value: { click: mockClick },
        writable: true
      })

      act(() => {
        result.current.selectFile()
      })

      expect(mockClick).toHaveBeenCalled()
    })
  })

  describe('Reset', () => {
    test('should reset upload state', () => {
      const { result } = renderHook(() =>
        useReferenceUpload({
          workspaceId: mockWorkspaceId,
          token: mockToken
        })
      )

      // Set error state
      act(() => {
        result.current.uploadState = {
          isUploading: true,
          progress: 50,
          error: 'Test error'
        }
      })

      // Reset state
      act(() => {
        result.current.reset()
      })

      expect(result.current.uploadState).toEqual({
        isUploading: false,
        progress: 0,
        error: null
      })
    })
  })

  describe('Thumbnail URL Generation', () => {
    test('should return original URL as thumbnail for now', async () => {
      const mockUploadResponse = {
        id: 'asset-123',
        workspaceId: mockWorkspaceId,
        name: 'test.jpg',
        size: 1024,
        mimeType: 'image/jpeg',
        createdAt: new Date().toISOString()
      }

      mockUploadAssetViaMinIO.mockResolvedValue(mockUploadResponse)

      const { result } = renderHook(() =>
        useReferenceUpload({
          workspaceId: mockWorkspaceId,
          token: mockToken,
          onSuccess: mockOnSuccess
        })
      )

      const validFile = new File(['test'], 'test.jpg', {
        type: 'image/jpeg'
      })

      act(() => {
        result.current.uploadReference(validFile)
      })

      await waitFor(() => {
        const referenceImage = mockOnSuccess.mock.calls[0][0] as ReferenceImage
        expect(referenceImage.thumbnailUrl).toBe(referenceImage.url)
      })
    })
  })
})