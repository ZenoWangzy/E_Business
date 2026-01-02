import { test, expect } from '@playwright/test'

// Test data
const testFiles = {
  pdf: {
    name: 'test-document.pdf',
    mimeType: 'application/pdf',
    size: 1024 * 1024, // 1MB
  },
  docx: {
    name: 'test-document.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    size: 512 * 1024, // 512KB
  },
  image: {
    name: 'test-image.jpg',
    mimeType: 'image/jpeg',
    size: 2 * 1024 * 1024, // 2MB
  },
  oversized: {
    name: 'large-file.pdf',
    mimeType: 'application/pdf',
    size: 11 * 1024 * 1024, // 11MB (exceeds 10MB limit)
  },
  malicious: {
    name: 'malware.exe',
    mimeType: 'application/x-executable',
    size: 1024,
  },
}

test.describe('File Upload E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')

    // Navigate to dashboard
    await page.waitForURL('/dashboard')
    await expect(page.locator('[data-testid="dashboard-container"]')).toBeVisible()
  })

  test('complete upload flow with PDF', async ({ page }) => {
    // Navigate to upload section
    await page.locator('[data-testid="upload-section"]').scrollIntoViewIfNeeded()

    // Create a test PDF file
    const fileBytes = Buffer.from('%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n')

    // Upload the file
    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles({
      name: testFiles.pdf.name,
      mimeType: testFiles.pdf.mimeType,
      buffer: fileBytes,
    })

    // Verify upload progress
    await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible()
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible()

    // Wait for parsing to complete
    await expect(page.locator('[data-testid="parsing-status"]')).toBeVisible()

    // Verify successful upload
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="file-list"]')).toContainText(testFiles.pdf.name)

    // Verify extracted text is displayed
    await expect(page.locator('[data-testid="extracted-text"]')).toBeVisible()
  })

  test('complete upload flow with DOCX', async ({ page }) => {
    // Create a test DOCX file
    const docxBytes = Buffer.from('PK\x03\x04\x14\x00\x06\x00')

    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles({
      name: testFiles.docx.name,
      mimeType: testFiles.docx.mimeType,
      buffer: docxBytes,
    })

    // Verify successful upload
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="file-list"]')).toContainText(testFiles.docx.name)
  })

  test('complete upload flow with images', async ({ page }) => {
    // Test multiple image formats
    const imageFormats = [
      { name: 'test.jpg', type: 'image/jpeg' },
      { name: 'test.png', type: 'image/png' },
      { name: 'test.gif', type: 'image/gif' },
      { name: 'test.webp', type: 'image/webp' },
    ]

    for (const image of imageFormats) {
      const imageBytes = Buffer.from('fake-image-data')

      const fileInput = page.locator('[data-testid="file-input"]')
      await fileInput.setInputFiles({
        name: image.name,
        mimeType: image.type,
        buffer: imageBytes,
      })

      // Wait for upload to complete
      await expect(page.locator('[data-testid="upload-success"]')).toBeVisible()

      // Verify image preview
      await expect(page.locator('[data-testid="image-preview"]')).toBeVisible()

      // Clear for next test
      await page.click('[data-testid="clear-all-button"]')
    }
  })

  test('error handling for invalid files', async ({ page }) => {
    // Test oversized file
    const largeFileBytes = Buffer.alloc(testFiles.oversized.size, 'x')

    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles({
      name: testFiles.oversized.name,
      mimeType: testFiles.oversized.mimeType,
      buffer: largeFileBytes,
    })

    // Verify error message
    await expect(page.locator('[data-testid="error-message"]')).toContainText('File size exceeds 10MB limit')
    await expect(page.locator('[data-testid="retry-button"]')).toBeVisible()
  })

  test('error handling for malicious files', async ({ page }) => {
    // Test executable file
    const exeBytes = Buffer.from('MZ\x90\x00\x03\x00\x00\x00')

    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles({
      name: testFiles.malicious.name,
      mimeType: testFiles.malicious.mimeType,
      buffer: exeBytes,
    })

    // Verify security error
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Unsupported file type')
    await expect(page.locator('[data-testid="security-warning"]')).toBeVisible()
  })

  test('multi-file upload', async ({ page }) => {
    // Create multiple test files
    const files = [
      {
        name: 'doc1.pdf',
        mimeType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4'),
      },
      {
        name: 'doc2.jpg',
        mimeType: 'image/jpeg',
        buffer: Buffer.from('\xff\xd8\xff\xe0'),
      },
      {
        name: 'doc3.txt',
        mimeType: 'text/plain',
        buffer: Buffer.from('Text content'),
      },
    ]

    // Set multiple files
    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles(files)

    // Verify all files are in queue
    await expect(page.locator('[data-testid="file-queue"]')).toBeVisible()

    // Wait for all uploads to complete
    await expect(page.locator('[data-testid="upload-success"]').first()).toBeVisible()

    // Verify all files appear in list
    for (const file of files) {
      await expect(page.locator('[data-testid="file-list"]')).toContainText(file.name)
    }

    // Verify batch operations
    await expect(page.locator('[data-testid="batch-actions"]')).toBeVisible()
    await expect(page.locator('[data-testid="download-all-button"]')).toBeVisible()
  })

  test('upload with network interruption', async ({ page }) => {
    // Simulate network interruption
    await page.route('**/api/v1/workspaces/*/assets/', async route => {
      // Fail first request
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Network error' }),
      })
    })

    const fileBytes = Buffer.from('%PDF-1.4')

    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: fileBytes,
    })

    // Verify error is shown
    await expect(page.locator('[data-testid="error-message"]')).toContainText('Upload failed')

    // Remove network interruption
    await page.unroute('**/api/v1/workspaces/*/assets/')

    // Mock successful upload
    await page.route('**/api/v1/workspaces/*/assets/', async route => {
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({ id: '1', filename: 'test.pdf', status: 'completed' }),
      })
    })

    // Click retry
    await page.click('[data-testid="retry-button"]')

    // Verify successful retry
    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible()
  })

  test('upload across workspace switching', async ({ page }) => {
    // Upload file in initial workspace
    const fileBytes = Buffer.from('%PDF-1.4')

    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles({
      name: 'workspace1-file.pdf',
      mimeType: 'application/pdf',
      buffer: fileBytes,
    })

    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible()

    // Switch workspace
    await page.click('[data-testid="workspace-switcher"]')
    await page.click('[data-testid="workspace-option-2"]')

    // Wait for workspace switch
    await expect(page.locator('[data-testid="current-workspace"]')).toContainText('Workspace 2')

    // Verify file list is empty in new workspace
    await expect(page.locator('[data-testid="file-list"]')).not.toContainText('workspace1-file.pdf')

    // Upload file in new workspace
    await fileInput.setInputFiles({
      name: 'workspace2-file.pdf',
      mimeType: 'application/pdf',
      buffer: fileBytes,
    })

    await expect(page.locator('[data-testid="upload-success"]')).toBeVisible()
    await expect(page.locator('[data-testid="file-list"]')).toContainText('workspace2-file.pdf')

    // Switch back to original workspace
    await page.click('[data-testid="workspace-switcher"]')
    await page.click('[data-testid="workspace-option-1"]')

    // Verify original file is still there
    await expect(page.locator('[data-testid="file-list"]')).toContainText('workspace1-file.pdf')
  })

  test('accessibility compliance', async ({ page }) => {
    // Test keyboard navigation
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="dropzone"]')).toBeFocused()

    // Test screen reader announcements
    const dropzone = page.locator('[data-testid="dropzone"]')
    await expect(dropzone).toHaveAttribute('aria-label', 'File upload area')
    await expect(dropzone).toHaveAttribute('role', 'button')

    // Test ARIA live regions
    await dropzone.hover()
    await expect(page.locator('[data-testid="status-announcer"]')).toHaveAttribute('aria-live', 'polite')

    // Test contrast mode
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.click('[data-testid="high-contrast-toggle"]')
    await expect(dropzone).toHaveClass(/high-contrast/)
  })
})