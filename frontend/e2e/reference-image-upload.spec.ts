/**
 * E2E Tests for Reference Image Upload (Story 2.4)
 * Tests the complete user flow from uploading reference image to generation
 */

import { test, expect } from '@playwright/test'
import path from 'path'

test.describe('Reference Image Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to editor
    await page.goto('/login')
    await page.fill('input[name="email"]', 'test@example.com')
    await page.fill('input[name="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForURL('/dashboard')

    // Navigate to editor page (assuming there's a way to get there)
    await page.goto('/workspace/test/editor')
  })

  test('should upload and display reference image', async ({ page }) => {
    // Find the first preview card
    const previewCard = page.locator('[data-testid^="preview-card-"]').first()
    await expect(previewCard).toBeVisible()

    // Hover over the card to show controls
    await previewCard.hover()

    // Check for add reference button
    const addReferenceBtn = page.locator('button[aria-label="添加参考图片"]')
    await expect(addReferenceBtn).toBeVisible()

    // Click to open file dialog
    // Since we can't interact with actual file dialog in E2E,
    // we'll test the drag and drop functionality
    const testImagePath = path.join(__dirname, 'fixtures', 'test-reference-image.jpg')

    // Simulate drag and drop
    await previewCard.dispatchEvent('dragover')
    await previewCard.dispatchEvent('drop', {
      dataTransfer: {
        files: [testImagePath]
      }
    })

    // Verify upload progress appears
    await expect(page.locator('text=上传参考图片...')).toBeVisible()
    await expect(page.locator('text=100%')).toBeVisible({ timeout: 10000 })

    // Verify reference image is displayed
    await expect(page.locator('img[alt="参考图片"]')).toBeVisible()

    // Check card header shows reference indicator
    await expect(page.locator('text=有参考图片')).toBeVisible()
  })

  test('should show error for invalid file type', async ({ page }) => {
    const previewCard = page.locator('[data-testid^="preview-card-"]').first()
    await previewCard.hover()

    const addReferenceBtn = page.locator('button[aria-label="添加参考图片"]')
    await addReferenceBtn.click()

    // Mock file selection with invalid file
    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      if (input) {
        const file = new File(['test'], 'test.txt', { type: 'text/plain' })
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })

    // Verify error message
    await expect(page.locator('.toast-error')).toContainText('只支持 JPG 和 PNG 格式的图片')
  })

  test('should remove reference image', async ({ page }) => {
    // First upload a reference image
    const previewCard = page.locator('[data-testid^="preview-card-"]').first()
    await previewCard.hover()

    // Simulate successful upload by directly setting state
    await page.evaluate(() => {
      // Simulate reference image being attached
      const card = document.querySelector('[data-testid^="preview-card-"]')
      if (card) {
        card.setAttribute('data-reference-image', 'true')
      }
    })

    // Hover over reference image to show remove button
    const refImage = page.locator('img[alt="参考图片"]')
    await refImage.hover()

    // Click remove button
    const removeBtn = page.locator('button[aria-label="移除参考图片"]')
    await removeBtn.click()

    // Verify reference image is removed
    await expect(refImage).not.toBeVisible()
    await expect(page.locator('text=有参考图片')).not.toBeVisible()
  })

  test('should maintain reference image after page refresh', async ({ page }) => {
    // Upload a reference image first
    const previewCard = page.locator('[data-testid^="preview-card-"]').first()
    await previewCard.hover()

    // Simulate successful upload
    await page.evaluate(() => {
      // Store reference image in localStorage (simulating Zustand persist)
      const refImage = {
        id: 'test-ref-1',
        url: '/api/test-ref.jpg',
        thumbnailUrl: '/api/test-ref-thumb.jpg',
        assetId: 'asset-123'
      }
      localStorage.setItem(
        'editor-storage',
        JSON.stringify({
          state: {
            items: [{
              id: 'test-card-1',
              referenceImage: refImage
            }]
          }
        })
      })
    })

    // Refresh page
    await page.reload()

    // Wait for page to load
    await page.waitForLoadState('networkidle')

    // Verify reference image is still displayed
    await expect(page.locator('img[alt="参考图片"]')).toBeVisible()
  })

  test('should use reference image in generation', async ({ page }) => {
    // Upload a reference image
    const previewCard = page.locator('[data-testid^="preview-card-"]').first()
    await previewCard.hover()

    // Simulate successful upload
    await page.evaluate(() => {
      const refImage = {
        id: 'test-ref-1',
        url: '/api/test-ref.jpg',
        thumbnailUrl: '/api/test-ref-thumb.jpg',
        assetId: 'asset-123'
      }
      localStorage.setItem(
        'editor-storage',
        JSON.stringify({
          state: {
            items: [{
              id: 'test-card-1',
              referenceImage: refImage
            }]
          }
        })
      })
    })

    // Click regenerate button
    const regenerateBtn = page.locator('button[aria-label="重新生成"]')
    await expect(regenerateBtn).toBeVisible()
    await regenerateBtn.click()

    // Verify generation request includes reference image
    // This would require intercepting network requests
    await page.waitForRequest(request => {
      if (request.url().includes('/generate')) {
        const postData = request.postDataJSON()
        return postData.reference_image_id === 'asset-123'
      }
      return false
    })
  })

  test('should show drag overlay on hover when no reference', async ({ page }) => {
    const previewCard = page.locator('[data-testid^="preview-card-"]').first()

    // Hover over the card
    await previewCard.hover()

    // Check for drag overlay message
    await expect(page.locator('text=拖拽图片到此处作为参考')).toBeVisible()
  })

  test('should not show drag overlay when reference exists', async ({ page }) => {
    const previewCard = page.locator('[data-testid^="preview-card-"]').first()

    // Simulate reference image attached
    await page.evaluate(() => {
      const refImage = {
        id: 'test-ref-1',
        url: '/api/test-ref.jpg',
        thumbnailUrl: '/api/test-ref-thumb.jpg',
        assetId: 'asset-123'
      }
      localStorage.setItem(
        'editor-storage',
        JSON.stringify({
          state: {
            items: [{
              id: 'test-card-1',
              referenceImage: refImage
            }]
          }
        })
      })
    })

    await page.reload()
    await page.waitForLoadState('networkidle')

    // Hover over the card
    await previewCard.hover()

    // Should not show drag overlay
    await expect(page.locator('text=拖拽图片到此处作为参考')).not.toBeVisible()
  })
})

test.describe('Reference Image Error States', () => {
  test('should handle upload failure gracefully', async ({ page }) => {
    // Mock upload failure
    await page.route('**/assets/upload/presigned', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Upload failed' })
      })
    })

    const previewCard = page.locator('[data-testid^="preview-card-"]').first()
    await previewCard.hover()

    // Try to upload
    const addReferenceBtn = page.locator('button[aria-label="添加参考图片"]')
    await addReferenceBtn.click()

    // Mock file selection
    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      if (input) {
        const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })

    // Verify error message
    await expect(page.locator('.toast-error')).toContainText('上传失败')
  })

  test('should handle oversized file', async ({ page }) => {
    const previewCard = page.locator('[data-testid^="preview-card-"]').first()
    await previewCard.hover()

    // Mock file selection with oversized file
    await page.evaluate(() => {
      const input = document.querySelector('input[type="file"]') as HTMLInputElement
      if (input) {
        // Create a 6MB file (exceeds 5MB limit)
        const largeArray = new Uint8Array(6 * 1024 * 1024)
        const file = new File([largeArray], 'large.jpg', { type: 'image/jpeg' })
        const dataTransfer = new DataTransfer()
        dataTransfer.items.add(file)
        input.files = dataTransfer.files
        input.dispatchEvent(new Event('change', { bubbles: true }))
      }
    })

    // Verify error message
    await expect(page.locator('.toast-error')).toContainText('文件大小不能超过 5MB')
  })
})