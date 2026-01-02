/**
 * SmartDropzone Component Tests
 * Tests for workspace-aware file upload with drag-and-drop
 */
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SmartDropzone from '../SmartDropzone'
import { createMockFile } from '@/test-utils/mockFile'

// Mock dependencies
jest.mock('@/lib/security/fileValidator', () => ({
  validateFile: jest.fn().mockResolvedValue({ valid: true }),
  quickValidate: jest.fn().mockReturnValue({ valid: true }),
}))

jest.mock('@/lib/parsers', () => ({
  parseFile: jest.fn().mockResolvedValue({
    success: true,
    text: 'Parsed text content',
    metadata: { type: 'pdf', numPages: 1 },
  }),
  isParsableType: jest.fn().mockReturnValue(true),
}))

jest.mock('@/lib/api/assets', () => ({
  uploadAsset: jest.fn().mockResolvedValue({
    id: 'asset-123',
    workspaceId: 'workspace-123',
    name: 'test.pdf',
    size: 1024,
    mimeType: 'application/pdf',
    createdAt: new Date().toISOString(),
  }),
}))

// Import mocked modules
import * as fileValidator from '@/lib/security/fileValidator'
import * as parsers from '@/lib/parsers'
import * as assetsApi from '@/lib/api/assets'

const mockValidateFile = fileValidator.validateFile as jest.Mock
const mockQuickValidate = fileValidator.quickValidate as jest.Mock
const mockParseFile = parsers.parseFile as jest.Mock
const mockIsParsableType = parsers.isParsableType as jest.Mock
const mockUploadAsset = assetsApi.uploadAsset as jest.Mock

describe('SmartDropzone', () => {
  const defaultProps = {
    workspaceId: 'workspace-123',
    token: 'test-token-abc',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockValidateFile.mockResolvedValue({ valid: true })
    mockQuickValidate.mockReturnValue({ valid: true })
    mockParseFile.mockResolvedValue({ success: true, text: 'Content' })
    mockIsParsableType.mockReturnValue(true)
    mockUploadAsset.mockResolvedValue({
      id: 'asset-123',
      workspaceId: 'workspace-123',
      name: 'test.pdf',
      size: 1024,
      mimeType: 'application/pdf',
      createdAt: new Date().toISOString(),
    })
  })

  describe('Rendering', () => {
    it('renders dropzone with correct elements', () => {
      render(<SmartDropzone {...defaultProps} />)

      expect(screen.getByTestId('dropzone')).toBeInTheDocument()
      expect(screen.getByText('拖放文件到此处')).toBeInTheDocument()
    })

    it('shows supported file types', () => {
      render(<SmartDropzone {...defaultProps} />)

      expect(screen.getByText(/PDF, DOCX, XLSX, TXT/)).toBeInTheDocument()
    })

    it('shows file limits', () => {
      render(<SmartDropzone {...defaultProps} />)

      expect(screen.getByText(/最大 10MB/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<SmartDropzone {...defaultProps} />)

      const dropzone = screen.getByTestId('dropzone')
      expect(dropzone).toHaveAttribute('role', 'button')
      expect(dropzone).toHaveAttribute('tabIndex', '0')
      expect(dropzone).toHaveAttribute('aria-label')
    })

    it('can receive focus', () => {
      render(<SmartDropzone {...defaultProps} />)

      const dropzone = screen.getByTestId('dropzone')
      dropzone.focus()
      expect(dropzone).toHaveFocus()
    })

    it('responds to Enter key', () => {
      render(<SmartDropzone {...defaultProps} />)

      const dropzone = screen.getByTestId('dropzone')
      fireEvent.keyDown(dropzone, { key: 'Enter' })
      // The input should be triggered (click event)
    })

    it('responds to Space key', () => {
      render(<SmartDropzone {...defaultProps} />)

      const dropzone = screen.getByTestId('dropzone')
      fireEvent.keyDown(dropzone, { key: ' ' })
      // The input should be triggered (click event)
    })
  })

  describe('File Validation', () => {
    it('calls validateFile for dropped files', async () => {
      render(<SmartDropzone {...defaultProps} />)

      const file = createMockFile('test.pdf', '%PDF-1.4', 'application/pdf', 1024)
      const input = screen.getByTestId('dropzone').querySelector('input')

      if (input) {
        Object.defineProperty(input, 'files', { value: [file] })
        fireEvent.change(input)
      }

      await waitFor(() => {
        expect(mockValidateFile).toHaveBeenCalledWith(file)
      })
    })

    it('handles validation failure', async () => {
      const onUploadError = jest.fn()
      mockValidateFile.mockResolvedValue({
        valid: false,
        error: {
          code: 'INVALID_SIGNATURE',
          message: '文件头校验失败',
          retryable: false,
        },
      })

      render(<SmartDropzone {...defaultProps} onUploadError={onUploadError} />)

      // Use a valid MIME type so it passes react-dropzone, but fails our validation
      const file = createMockFile('fake.pdf', 'NOT-A-PDF', 'application/pdf', 1024)
      const input = screen.getByTestId('dropzone').querySelector('input')

      if (input) {
        Object.defineProperty(input, 'files', { value: [file] })
        fireEvent.change(input)
      }

      await waitFor(() => {
        expect(mockValidateFile).toHaveBeenCalled()
      })
    })
  })

  describe('File Parsing', () => {
    it('calls parseFile for parsable file types', async () => {
      render(<SmartDropzone {...defaultProps} />)

      const file = createMockFile('test.pdf', '%PDF-1.4', 'application/pdf', 1024)
      const input = screen.getByTestId('dropzone').querySelector('input')

      if (input) {
        Object.defineProperty(input, 'files', { value: [file] })
        fireEvent.change(input)
      }

      await waitFor(() => {
        expect(mockParseFile).toHaveBeenCalled()
      }, { timeout: 3000 })
    })

    it('skips parsing for non-parsable types', async () => {
      mockIsParsableType.mockReturnValue(false)

      render(<SmartDropzone {...defaultProps} />)

      const file = createMockFile('test.png', 'PNG', 'image/png', 1024)
      const input = screen.getByTestId('dropzone').querySelector('input')

      if (input) {
        Object.defineProperty(input, 'files', { value: [file] })
        fireEvent.change(input)
      }

      await waitFor(() => {
        expect(mockValidateFile).toHaveBeenCalled()
      })

      // parseFile should not be called for images
      expect(mockParseFile).not.toHaveBeenCalled()
    })
  })

  describe('File Upload', () => {
    it('calls uploadAsset with correct parameters', async () => {
      render(<SmartDropzone {...defaultProps} />)

      const file = createMockFile('test.pdf', '%PDF-1.4', 'application/pdf', 1024)
      const input = screen.getByTestId('dropzone').querySelector('input')

      if (input) {
        Object.defineProperty(input, 'files', { value: [file] })
        fireEvent.change(input)
      }

      await waitFor(() => {
        expect(mockUploadAsset).toHaveBeenCalled()
      }, { timeout: 3000 })

      // Check upload was called with correct workspace and token
      expect(mockUploadAsset).toHaveBeenCalledWith(
        expect.any(File),
        'workspace-123',
        'test-token-abc',
        expect.any(Function)
      )
    })

    it('triggers onUploadComplete callback on success', async () => {
      const onUploadComplete = jest.fn()

      render(<SmartDropzone {...defaultProps} onUploadComplete={onUploadComplete} />)

      const file = createMockFile('test.pdf', '%PDF-1.4', 'application/pdf', 1024)
      const input = screen.getByTestId('dropzone').querySelector('input')

      if (input) {
        Object.defineProperty(input, 'files', { value: [file] })
        fireEvent.change(input)
      }

      await waitFor(() => {
        expect(onUploadComplete).toHaveBeenCalled()
      }, { timeout: 3000 })
    })

    it('triggers onUploadError callback on failure', async () => {
      const onUploadError = jest.fn()
      mockUploadAsset.mockRejectedValue(new Error('Network error'))

      render(<SmartDropzone {...defaultProps} onUploadError={onUploadError} />)

      const file = createMockFile('test.pdf', '%PDF-1.4', 'application/pdf', 1024)
      const input = screen.getByTestId('dropzone').querySelector('input')

      if (input) {
        Object.defineProperty(input, 'files', { value: [file] })
        fireEvent.change(input)
      }

      await waitFor(() => {
        expect(onUploadError).toHaveBeenCalled()
      }, { timeout: 3000 })
    })
  })

  describe('Callbacks', () => {
    it('triggers onFilesAdded when files are dropped', async () => {
      const onFilesAdded = jest.fn()

      render(<SmartDropzone {...defaultProps} onFilesAdded={onFilesAdded} />)

      const file = createMockFile('test.pdf', '%PDF-1.4', 'application/pdf', 1024)
      const input = screen.getByTestId('dropzone').querySelector('input')

      if (input) {
        Object.defineProperty(input, 'files', { value: [file] })
        fireEvent.change(input)
      }

      await waitFor(() => {
        expect(onFilesAdded).toHaveBeenCalled()
      })
    })
  })

  describe('Multiple Files', () => {
    it('handles multiple files', async () => {
      const onFilesAdded = jest.fn()

      render(<SmartDropzone {...defaultProps} onFilesAdded={onFilesAdded} maxFiles={5} />)

      const files = [
        createMockFile('test1.pdf', '%PDF-1.4', 'application/pdf', 1024),
        createMockFile('test2.pdf', '%PDF-1.4', 'application/pdf', 2048),
      ]

      const input = screen.getByTestId('dropzone').querySelector('input')

      if (input) {
        Object.defineProperty(input, 'files', { value: files })
        fireEvent.change(input)
      }

      await waitFor(() => {
        expect(onFilesAdded).toHaveBeenCalled()
        const addedFiles = onFilesAdded.mock.calls[0][0]
        expect(addedFiles).toHaveLength(2)
      })
    })
  })
})