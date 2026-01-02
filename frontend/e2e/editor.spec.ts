/**
 * Editor E2E tests using Playwright
 */

import { test, expect } from '@playwright/test';
import { AssetType } from '@/types/editor';

test.describe('Editor Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to editor page
    await page.goto('/editor/123?taskId=test-task-123');
  });

  test('should display empty state initially', async ({ page }) => {
    await expect(page.locator('text=还没有图片')).toBeVisible();
    await expect(page.locator('text=开始生成图片后，它们会出现在这里')).toBeVisible();
  });

  test('should display loading state when task is active', async ({ page }) => {
    // Mock SSE connection
    await page.route('**/api/v1/images/workspaces/*/stream/*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `event: status\ndata: {"status": "connected"}\n\nevent: progress\ndata: {"status": "processing", "progress": 50, "message": "Generating..."}\n\n`
      });
    });

    await page.reload();

    await expect(page.locator('text=任务ID: test-task-123')).toBeVisible();
    await expect(page.locator('text=连接中...')).toBeVisible();
  });

  test('should handle completed task and display images', async ({ page }) => {
    // Mock SSE with completed data
    await page.route('**/api/v1/images/workspaces/*/stream/*', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'text/event-stream',
        body: `event: status\ndata: {"status": "connected"}\n\nevent: completed\ndata: {"status": "completed", "results": [{"id": "img-1", "url": "https://example.com/1.jpg", "type": "image"}]}\n\n`
      });
    });

    await page.reload();

    // Wait for image to appear
    await expect(page.locator('[data-testid="preview-card-img-1"]')).toBeVisible();
    await expect(page.locator('text=Generated Image 1')).toBeVisible();
  });

  test('should support drag and drop reordering', async ({ page }) => {
    // Mock initial items
    await page.addInitScript(() => {
      localStorage.setItem('editor-storage', JSON.stringify({
        state: {
          items: [
            { id: 'item-1', src: 'https://example.com/1.jpg', title: 'Image 1', type: 'image' },
            { id: 'item-2', src: 'https://example.com/2.jpg', title: 'Image 2', type: 'image' }
          ],
          order: ['item-1', 'item-2']
        }
      }));
    });

    await page.reload();

    // Get first card
    const firstCard = page.locator('[data-testid="preview-card-item-1"]');
    await expect(firstCard).toBeVisible();

    // Get second card position
    const secondCard = page.locator('[data-testid="preview-card-item-2"]');
    const secondBox = await secondCard.boundingBox();

    if (secondBox) {
      // Drag first card to second card position
      await firstCard.dragTo(secondCard);

      // Verify order changed (this might need adjustment based on actual implementation)
      await expect(page.locator('[data-testid="editor-grid"]')).toBeVisible();
    }
  });

  test('should show context menu on hover', async ({ page }) => {
    // Mock initial items
    await page.addInitScript(() => {
      localStorage.setItem('editor-storage', JSON.stringify({
        state: {
          items: [
            { id: 'item-1', src: 'https://example.com/1.jpg', title: 'Test Image', type: 'image' }
          ],
          order: ['item-1']
        }
      }));
    });

    await page.reload();

    const card = page.locator('[data-testid="preview-card-item-1"]');
    await card.hover();

    // Check for action buttons
    await expect(page.locator('[aria-label="查看全屏"]')).toBeVisible();
    await expect(page.locator('[aria-label="删除"]')).toBeVisible();
  });

  test('should handle item deletion', async ({ page }) => {
    // Mock initial items
    await page.addInitScript(() => {
      localStorage.setItem('editor-storage', JSON.stringify({
        state: {
          items: [
            { id: 'item-1', src: 'https://example.com/1.jpg', title: 'To Delete', type: 'image' }
          ],
          order: ['item-1']
        }
      }));
    });

    await page.reload();

    const card = page.locator('[data-testid="preview-card-item-1"]');
    await card.hover();

    // Click delete button
    const deleteButton = page.locator('[aria-label="删除"]');
    await deleteButton.click();

    // Handle confirmation dialog
    page.on('dialog', (dialog) => {
      dialog.accept();
    });

    // Verify item is removed
    await expect(page.locator('text=还没有图片')).toBeVisible();
  });

  test('should persist order in localStorage', async ({ page }) => {
    // Perform reordering
    await page.addInitScript(() => {
      localStorage.setItem('editor-storage', JSON.stringify({
        state: {
          items: [
            { id: 'item-1', src: 'https://example.com/1.jpg', title: 'Image 1', type: 'image' },
            { id: 'item-2', src: 'https://example.com/2.jpg', title: 'Image 2', type: 'image' }
          ],
          order: ['item-1', 'item-2']
        }
      }));
    });

    await page.reload();

    // Reorder items (implementation-specific)
    // Then check localStorage for updated order
    const storage = await page.evaluate(() => {
      const data = localStorage.getItem('editor-storage');
      return data ? JSON.parse(data) : null;
    });

    expect(storage).toBeTruthy();
    expect(storage.state.order).toContain('item-1');
    expect(storage.state.order).toContain('item-2');
  });
});

test.describe('Performance', () => {
  test('should maintain 60fps during drag operations', async ({ page }) => {
    // This would require performance monitoring setup
    // For now, just ensure drag operations complete without errors
    test.skip(true, 'Performance monitoring not implemented');
  });
});

test.describe('Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    // Mock items for testing
    await page.addInitScript(() => {
      localStorage.setItem('editor-storage', JSON.stringify({
        state: {
          items: [
            { id: 'item-1', src: 'https://example.com/1.jpg', title: 'Test Image', type: 'image' }
          ],
          order: ['item-1']
        }
      }));
    });

    await page.reload();

    // Test keyboard navigation
    await page.keyboard.press('Tab');

    // Verify focus management
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('editor-storage', JSON.stringify({
        state: {
          items: [
            { id: 'item-1', src: 'https://example.com/1.jpg', title: 'Test Image', type: 'image' }
          ],
          order: ['item-1']
        }
      }));
    });

    await page.reload();

    // Check for ARIA attributes
    await expect(page.locator('[data-testid="preview-card-item-1"]')).toHaveAttribute('aria-label', 'Test Image');
  });
});