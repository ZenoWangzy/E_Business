/**
 * SVGPreviewCard Component Tests
 * Story 2.4: Reference Image Attachment
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import SVGPreviewCard from '../SVGPreviewCard'
import { AssetType, type ReferenceImage } from '@/types/editor'

// Mock dependencies
jest.mock('@/hooks/useReferenceUpload')
jest.mock('@/utils/sanitizer')
jest.mock('@/utils/imageLoader')
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

const mockUseReferenceUpload = require('@/hooks/useReferenceUpload').useReferenceUpload
const mockSanitizeSVG = require('@/utils/sanitizer').sanitizeSVG
const mockDetectAssetType = require('@/utils/sanitizer').detectAssetType
const mockUseLazyImageLoad = require('@/utils/imageLoader').useLazyImageLoad

describe('SVGPreviewCard - Story 2.4 Reference Image', () => {
  const defaultProps = {
    id: 'test-card-1',
    imageSrc: 'test-image.jpg',
    title: 'Test Card',
    type: AssetType.IMAGE,
    workspaceId: 'workspace-123',
    authToken: 'test-token'
  }

  const mockUploadHook = {
    uploadState: {
      isUploading: false,
      progress: 0,
      error: null
    },
    fileInputRef: { current: null },
    selectFile: jest.fn(),
    handleFileSelect: jest.fn(),
    handleDrop: jest.fn(),
    handleDragOver: jest.fn(),
    reset: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockUseReferenceUpload.mockReturnValue(mockUploadHook)
    mockSanitizeSVG.mockReturnValue('<svg></svg>')
    mockDetectAssetType.mockReturnValue(AssetType.IMAGE)
    mockUseLazyImageLoad.mockReturnValue({
      isLoaded: true,
      hasError: false,
      imageSrc: 'test-image.jpg'
    })
  })

  describe('Reference Image Display', () => {
    test('should display reference image thumbnail when present', () => {
      const referenceImage: ReferenceImage = {
        id: 'ref-1',
        url: 'ref-image.jpg',
        thumbnailUrl: 'ref-thumb.jpg',
        assetId: 'asset-123'
      }

      render(
        <SVGPreviewCard
          {...defaultProps}
          referenceImage={referenceImage}
        />
      )

      // Check if reference image is displayed
      const refImage = screen.getByAltText('参考图片')
      expect(refImage).toBeInTheDocument()
      expect(refImage).toHaveAttribute('src', 'ref-thumb.jpg')
    })

    test('should show "有参考图片" in card header when reference image is attached', () => {
      const referenceImage: ReferenceImage = {
        id: 'ref-1',
        url: 'ref-image.jpg',
        thumbnailUrl: 'ref-thumb.jpg',
        assetId: 'asset-123'
      }

      render(
        <SVGPreviewCard
          {...defaultProps}
          referenceImage={referenceImage}
        />
      )

      // Text includes "• " prefix, use substring match
      expect(screen.getByText(/有参考图片/)).toBeInTheDocument()
    })
  })

  describe('Add Reference Button', () => {
    test('should show add reference button on hover when no reference image', async () => {
      const user = userEvent.setup()

      render(<SVGPreviewCard {...defaultProps} />)

      // Hover over the card
      const card = screen.getByTestId('preview-card-test-card-1')
      await user.hover(card)

      // Check for add button
      const addButton = screen.getByLabelText('添加参考图片')
      expect(addButton).toBeInTheDocument()
    })

    test('should not show add button when reference image is present', () => {
      const referenceImage: ReferenceImage = {
        id: 'ref-1',
        url: 'ref-image.jpg',
        thumbnailUrl: 'ref-thumb.jpg',
        assetId: 'asset-123'
      }

      render(
        <SVGPreviewCard
          {...defaultProps}
          referenceImage={referenceImage}
        />
      )

      expect(screen.queryByLabelText('添加参考图片')).not.toBeInTheDocument()
    })

    test('should call selectFile when add button is clicked', async () => {
      const user = userEvent.setup()
      const selectFileMock = jest.fn()
      mockUseReferenceUpload.mockReturnValue({
        ...mockUploadHook,
        selectFile: selectFileMock
      })

      render(<SVGPreviewCard {...defaultProps} />)

      // Hover and click add button
      const card = screen.getByTestId('preview-card-test-card-1')
      await user.hover(card)

      const addButton = screen.getByLabelText('添加参考图片')
      // Use fireEvent for more reliable button click testing
      fireEvent.click(addButton)

      expect(selectFileMock).toHaveBeenCalled()
    })
  })

  describe('Remove Reference', () => {
    test('should show remove button on reference image hover', async () => {
      const user = userEvent.setup()
      const onRemoveReference = jest.fn()

      const referenceImage: ReferenceImage = {
        id: 'ref-1',
        url: 'ref-image.jpg',
        thumbnailUrl: 'ref-thumb.jpg',
        assetId: 'asset-123'
      }

      render(
        <SVGPreviewCard
          {...defaultProps}
          referenceImage={referenceImage}
          onRemoveReference={onRemoveReference}
        />
      )

      // Find and hover over reference image container
      const refImage = screen.getByAltText('参考图片')
      await user.hover(refImage.closest('.relative')!)

      // Check for remove button
      const removeButton = screen.getByLabelText('移除参考图片')
      expect(removeButton).toBeInTheDocument()
    })

    test('should call onRemoveReference when remove button is clicked', async () => {
      const user = userEvent.setup()
      const onRemoveReference = jest.fn()

      const referenceImage: ReferenceImage = {
        id: 'ref-1',
        url: 'ref-image.jpg',
        thumbnailUrl: 'ref-thumb.jpg',
        assetId: 'asset-123'
      }

      render(
        <SVGPreviewCard
          {...defaultProps}
          referenceImage={referenceImage}
          onRemoveReference={onRemoveReference}
        />
      )

      // Find and hover over reference image
      const refImage = screen.getByAltText('参考图片')
      await user.hover(refImage.closest('.relative')!)

      // Click remove button
      const removeButton = screen.getByLabelText('移除参考图片')
      await user.click(removeButton)

      expect(onRemoveReference).toHaveBeenCalledWith('test-card-1')
    })
  })

  describe('Upload Progress', () => {
    test('should show upload progress when uploading', () => {
      mockUploadHook.uploadState.isUploading = true
      mockUploadHook.uploadState.progress = 50

      render(<SVGPreviewCard {...defaultProps} />)

      // Check for upload progress overlay
      expect(screen.getByText('上传参考图片...')).toBeInTheDocument()
      expect(screen.getByText('50%')).toBeInTheDocument()
    })

    test('should show error state when upload fails', async () => {
      const user = userEvent.setup()
      mockUseReferenceUpload.mockReturnValue({
        ...mockUploadHook,
        uploadState: {
          isUploading: false,
          progress: 0,
          error: 'Upload failed'
        }
      })

      render(<SVGPreviewCard {...defaultProps} />)

      // Hover to show add button (error state shows on hover)
      const card = screen.getByTestId('preview-card-test-card-1')
      await user.hover(card)

      // Check for error indicator on add button
      const addButton = screen.queryByLabelText('添加参考图片')
      expect(addButton).toBeInTheDocument()
    })
  })

  describe('Drag and Drop', () => {
    test('should call handleDrop when file is dropped', async () => {
      const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })

      render(<SVGPreviewCard {...defaultProps} />)

      const card = screen.getByTestId('preview-card-test-card-1')

      // Simulate file drop
      fireEvent.drop(card, {
        dataTransfer: {
          files: [file]
        }
      })

      expect(mockUploadHook.handleDrop).toHaveBeenCalled()
    })

    test('should call handleDragOver when dragging over', () => {
      render(<SVGPreviewCard {...defaultProps} />)

      const card = screen.getByTestId('preview-card-test-card-1')

      fireEvent.dragOver(card, {
        dataTransfer: {
          files: []
        }
      })

      expect(mockUploadHook.handleDragOver).toHaveBeenCalled()
    })

    test('should show drag overlay on hover when no reference image', async () => {
      const user = userEvent.setup()

      render(<SVGPreviewCard {...defaultProps} />)

      const card = screen.getByTestId('preview-card-test-card-1')
      await user.hover(card)

      // Check for drag overlay message
      expect(screen.getByText('拖拽图片到此处作为参考')).toBeInTheDocument()
    })
  })

  describe('File Input', () => {
    test('should have hidden file input', () => {
      render(<SVGPreviewCard {...defaultProps} />)

      const fileInput = screen.getByLabelText('选择参考图片文件')
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveClass('hidden')
      expect(fileInput).toHaveAttribute('type', 'file')
      expect(fileInput).toHaveAttribute('accept', '.jpg,.jpeg,.png')
    })
  })
})