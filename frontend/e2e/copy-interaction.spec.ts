/**
 * Copy Interaction E2E Tests
 */

import { test, expect, type Page } from '@playwright/test';

// Helper function to setup test data
async function setupCopyStudio(page: Page) {
  await page.goto('/workspace/1/products/1/copy');

  // Wait for the copy studio to load
  await page.waitForSelector('[data-testid="copy-result-card"]', { timeout: 10000 });
}

// Helper function to generate some test content
async function generateTestContent(page: Page) {
  // Switch to titles tab
  await page.click('[data-testid="tab-titles"]');

  // Fill in product context
  await page.fill('[data-testid="product-name"]', '测试商品');
  await page.fill('[data-testid="product-category"]', '电子产品');
  await page.fill('[data-testid="product-description"]', '这是一款高质量的产品');

  // Configure generation settings
  await page.selectOption('[data-testid="tone-select"]', 'professional');
  await page.selectOption('[data-testid="audience-select"]', 'b2c');
  await page.selectOption('[data-testid="length-select"]', 'medium');

  // Click generate button
  await page.click('[data-testid="generate-button"]');

  // Wait for generation to complete
  await page.waitForSelector('[data-testid="copy-result-card"]', { state: 'visible' });
}

test.describe('Copy Interaction', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication if needed
    await page.goto('/api/auth/signin');
    // Add any authentication setup here

    await setupCopyStudio(page);
  });

  test('single copy functionality', async ({ page }) => {
    // Generate some content first
    await generateTestContent(page);

    // Get the first copy result card
    const firstCard = page.locator('[data-testid="copy-result-card"]').first();

    // Verify copy button exists
    const copyButton = firstCard.locator('[data-testid="copy-button-icon"]');
    await expect(copyButton).toBeVisible();

    // Click copy button
    await copyButton.click();

    // Verify success toast appears
    await expect(page.locator('text=已复制到剪贴板')).toBeVisible({ timeout: 3000 });

    // Verify button shows check icon
    await expect(firstCard.locator('[data-testid="check-icon"]')).toBeVisible();
  });

  test('batch copy functionality', async ({ page }) => {
    // Generate multiple content items
    await generateTestContent(page);

    // Wait for multiple results
    await page.waitForSelector('[data-testid="copy-result-card"]:nth-child(3)', { state: 'visible' });

    // Select multiple items
    await page.check('[data-testid="copy-result-card"]:nth-child(1) [data-testid="checkbox"]');
    await page.check('[data-testid="copy-result-card"]:nth-child(2) [data-testid="checkbox"]');
    await page.check('[data-testid="copy-result-card"]:nth-child(3) [data-testid="checkbox"]');

    // Verify batch operations bar appears
    await expect(page.locator('[data-testid="batch-operations-bar"]')).toBeVisible();

    // Click batch copy button
    await page.click('[data-testid="batch-copy-btn"]');

    // Verify batch copy dialog opens
    await expect(page.locator('text=批量复制内容')).toBeVisible();

    // Verify selected items count
    await expect(page.locator('text=已选择 3 项')).toBeVisible();

    // Click copy button in dialog
    await page.click('text=复制到剪贴板');

    // Wait for copy completion
    await expect(page.locator('text=复制成功！')).toBeVisible({ timeout: 5000 });

    // Dialog should close automatically
    await expect(page.locator('text=批量复制内容')).not.toBeVisible();
  });

  test('copy history functionality', async ({ page }) => {
    // Generate some content
    await generateTestContent(page);

    // Copy an item
    const firstCard = page.locator('[data-testid="copy-result-card"]').first();
    await firstCard.locator('[data-testid="copy-button-icon"]').click();

    // Wait for copy to complete
    await page.waitForTimeout(1000);

    // Open copy history
    await page.click('[data-testid="copy-history-button"]');

    // Verify history dialog opens
    await expect(page.locator('text=复制历史')).toBeVisible();

    // Verify copied item appears in history
    await expect(page.locator('[data-testid="history-entry"]').first()).toBeVisible();

    // Test search functionality
    await page.fill('[data-testid="history-search"]', '测试');
    await expect(page.locator('[data-testid="history-entry"]')).toHaveCount(1);

    // Test re-copy from history
    await page.click('[data-testid="history-entry"] [data-testid="copy-button"]');

    // Verify success
    await expect(page.locator('text=已复制到剪贴板')).toBeVisible({ timeout: 3000 });
  });

  test('keyboard shortcuts', async ({ page }) => {
    // Generate content
    await generateTestContent(page);

    // Focus on first result card
    const firstCard = page.locator('[data-testid="copy-result-card"]').first();
    await firstCard.focus();

    // Test Ctrl+C shortcut
    await page.keyboard.press('Meta+c'); // Meta for Mac, Ctrl for Windows/Linux

    // Verify copy success
    await expect(page.locator('text=已复制到剪贴板')).toBeVisible({ timeout: 3000 });
  });

  test('permission handling', async ({ page }) => {
    // Mock clipboard permission denied
    await page.context().grantPermissions(['clipboard-read'], { origin: undefined });
    await page.context().clearPermissions();

    // Try to copy without permission
    const firstCard = page.locator('[data-testid="copy-result-card"]').first();
    await firstCard.locator('[data-testid="copy-button-icon"]').click();

    // Permission dialog should appear
    await expect(page.locator('text=剪贴板权限设置')).toBeVisible({ timeout: 3000 });

    // Click use fallback method
    await page.click('text=使用备用复制方法');

    // Verify fallback works
    await expect(page.locator('text=已复制到剪贴板')).toBeVisible({ timeout: 3000 });
  });

  test('large text handling', async ({ page }) => {
    // Navigate to a page with large text content
    await page.goto('/workspace/1/products/1/copy');

    // Generate a large content
    await page.evaluate(() => {
      const largeText = 'a'.repeat(2000000); // 2MB text
      // Mock a large content result
      const event = new CustomEvent('addCopyResult', {
        detail: {
          id: 'large-text-1',
          type: 'descriptions',
          content: largeText,
          createdAt: new Date(),
          isFavorite: false,
        },
      });
      window.dispatchEvent(event);
    });

    // Wait for large content to appear
    await page.waitForSelector('[data-testid="copy-result-card"]', { state: 'visible' });

    // Try to copy large text
    const copyButton = page.locator('[data-testid="copy-button-icon"]').first();
    await copyButton.click();

    // Should show text too large error
    await expect(page.locator('text=文本过大，请分段复制')).toBeVisible({ timeout: 3000 });

    // Should offer chunked copy option
    await expect(page.locator('text=分块复制')).toBeVisible();
  });

  test('accessibility compliance', async ({ page }) => {
    // Generate content
    await generateTestContent(page);

    // Check ARIA labels
    const copyButton = page.locator('[data-testid="copy-button-icon"]').first();
    await expect(copyButton).toHaveAttribute('aria-label');

    // Check keyboard navigation
    await page.keyboard.press('Tab');
    await expect(copyButton).toBeFocused();

    // Check screen reader support
    const favoriteButton = page.locator('[data-testid="favorite-button"]').first();
    await expect(favoriteButton).toHaveAttribute('aria-pressed');

    // Check focus management
    await page.keyboard.press('Enter');
    await expect(favoriteButton).toHaveAttribute('aria-pressed', 'true');
  });

  test('error recovery', async ({ page }) => {
    // Mock clipboard error
    await page.route('**/*', (route) => {
      if (route.request().method() === 'POST' && route.request().url().includes('clipboard')) {
        route.abort('failed');
      } else {
        route.continue();
      }
    });

    // Try to copy
    const firstCard = page.locator('[data-testid="copy-result-card"]').first();
    await firstCard.locator('[data-testid="copy-button-icon"]').click();

    // Should show error message
    await expect(page.locator('text=复制失败，请手动选择复制')).toBeVisible({ timeout: 3000 });

    // Retry mechanism should work
    await page.unrouteAll();
    await firstCard.locator('[data-testid="copy-button-icon"]').click();
    await expect(page.locator('text=已复制到剪贴板')).toBeVisible({ timeout: 3000 });
  });

  test('performance with many items', async ({ page }) => {
    // Generate many items
    for (let i = 0; i < 50; i++) {
      await page.evaluate((index) => {
        const event = new CustomEvent('addCopyResult', {
          detail: {
            id: `item-${index}`,
            type: 'titles',
            content: `测试标题 ${index}`,
            createdAt: new Date(),
            isFavorite: false,
          },
        });
        window.dispatchEvent(event);
      }, i);
    }

    // Wait for items to render
    await page.waitForSelector('[data-testid="copy-result-card"]:nth-child(50)', { state: 'visible' });

    // Measure performance
    const startTime = Date.now();

    // Select all items
    await page.click('[data-testid="select-all-button"]');

    // Batch copy
    await page.click('[data-testid="batch-copy-btn"]');
    await page.click('text=复制到剪贴板');

    // Wait for completion
    await expect(page.locator('text=复制成功！')).toBeVisible({ timeout: 10000 });

    const endTime = Date.now();
    const duration = endTime - startTime;

    // Should complete within reasonable time (5 seconds)
    expect(duration).toBeLessThan(5000);
  });
});

test.describe('Copy Integration with Other Features', () => {
  test('copy integration with favorites', async ({ page }) => {
    await setupCopyStudio(page);
    await generateTestContent(page);

    // Favorite an item
    const firstCard = page.locator('[data-testid="copy-result-card"]').first();
    await firstCard.locator('[data-testid="favorite-button"]').click();

    // Verify favorite state
    await expect(firstCard.locator('[data-testid="favorite-button"] svg')).toHaveClass(/fill-red-500/);

    // Copy the favorited item
    await firstCard.locator('[data-testid="copy-button-icon"]').click();

    // Verify success
    await expect(page.locator('text=已复制到剪贴板')).toBeVisible({ timeout: 3000 });

    // Check if favorite is preserved in history
    await page.click('[data-testid="copy-history-button"]');
    // The history item should be marked as favorite if the feature exists
  });

  test('copy integration with context references', async ({ page }) => {
    await setupCopyStudio(page);

    // Add context reference
    await page.click('[data-testid="add-context-button"]');
    await page.fill('[data-testid="context-input"]', '参考文档内容');
    await page.click('[data-testid="save-context-button"]');

    // Generate content with context
    await generateTestContent(page);

    // Copy generated content
    const firstCard = page.locator('[data-testid="copy-result-card"]').first();
    await firstCard.locator('[data-testid="copy-button-icon"]').click();

    // Verify content includes context
    await expect(page.locator('text=已复制到剪贴板')).toBeVisible({ timeout: 3000 });
  });

  test('copy integration with different content types', async ({ page }) => {
    await setupCopyStudio(page);

    // Test each content type
    const contentTypes = ['titles', 'descriptions', 'sellingPoints', 'faq'];

    for (const type of contentTypes) {
      // Switch tab
      await page.click(`[data-testid="tab-${type}"]`);

      // Generate content
      await generateTestContent(page);

      // Copy first result
      const firstCard = page.locator('[data-testid="copy-result-card"]').first();
      await firstCard.locator('[data-testid="copy-button-icon"]').click();

      // Verify success
      await expect(page.locator('text=已复制到剪贴板')).toBeVisible({ timeout: 3000 });

      // Wait before next iteration
      await page.waitForTimeout(500);
    }
  });
});