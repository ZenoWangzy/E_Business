import { test, expect } from '@playwright/test'
import { injectAxe, checkA11y } from 'axe-playwright'

test.describe('Accessibility Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Inject axe-core for accessibility testing
    await injectAxe(page)

    // Login
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', 'test@example.com')
    await page.fill('[data-testid="password-input"]', 'password123')
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('/dashboard')
  })

  test('file upload component accessibility', async ({ page }) => {
    // Navigate to upload section
    await page.locator('[data-testid="upload-section"]').scrollIntoViewIfNeeded()

    // Check initial accessibility
    await checkA11y(page, {
      detailedReport: true,
      detailedReportOptions: { html: true },
      rules: {
        // Custom rule configurations
        'color-contrast': { enabled: true },
        'keyboard-navigation': { enabled: true },
        'aria-labels': { enabled: true },
      },
    })

    // Test keyboard navigation
    await page.keyboard.press('Tab')
    const dropzone = page.locator('[data-testid="dropzone"]')
    await expect(dropzone).toBeFocused()

    // Test Space key activation
    await page.keyboard.press('Space')
    await expect(page.locator('[data-testid="file-input"]')).toBeVisible()

    // Test Enter key activation
    await page.keyboard.press('Enter')
    await expect(page.locator('[data-testid="file-input"]')).toBeVisible()

    // Verify ARIA attributes
    await expect(dropzone).toHaveAttribute('aria-label')
    await expect(dropzone).toHaveAttribute('aria-describedby')
    await expect(dropzone).toHaveAttribute('role', 'button')
  })

  test('screen reader compatibility', async ({ page }) => {
    // Enable screen reader mode
    await page.emulateMedia({ reducedMotion: 'reduce' })

    const dropzone = page.locator('[data-testid="dropzone"]')

    // Test focus management
    await dropzone.focus()
    await expect(dropzone).toBeFocused()

    // Test drag over announcements
    await dropzone.hover()
    await expect(page.locator('[data-testid="sr-announcements"]')).toBeVisible()

    // Test status announcements
    await page.locator('[data-testid="status-announcer"]').waitFor({ state: 'visible' })

    // Verify live region
    const statusAnnouncer = page.locator('[data-testid="status-announcer"]')
    await expect(statusAnnouncer).toHaveAttribute('aria-live', 'polite')
    await expect(statusAnnouncer).toHaveAttribute('aria-atomic', 'true')
  })

  test('high contrast mode', async ({ page }) => {
    // Enable high contrast
    await page.emulateMedia({ forcedColors: 'active' })

    // Toggle high contrast mode in the app
    await page.click('[data-testid="accessibility-menu"]')
    await page.click('[data-testid="high-contrast-toggle"]')

    // Verify contrast adjustments
    const dropzone = page.locator('[data-testid="dropzone"]')
    await expect(dropzone).toHaveClass(/high-contrast/)

    // Check accessibility in high contrast mode
    await checkA11y(page, {
      rules: {
        'color-contrast': { enabled: true },
      },
    })
  })

  test('reduced motion support', async ({ page }) => {
    // Enable reduced motion
    await page.emulateMedia({ reducedMotion: 'reduce' })

    // Upload a file to test animations
    const fileInput = page.locator('[data-testid="file-input"]')
    await fileInput.setInputFiles({
      name: 'test.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4'),
    })

    // Verify progress animations are reduced
    const progressBar = page.locator('[data-testid="progress-bar"]')
    await expect(progressBar).toHaveClass(/reduced-motion/)

    // Check no unnecessary animations
    const computedStyle = await progressBar.evaluate(el => {
      return window.getComputedStyle(el)
    })
    expect(computedStyle.animationDuration).toBe('0s')
  })

  test('focus management', async ({ page }) => {
    // Test focus trap in modals
    await page.click('[data-testid="file-details-button"]')
    const modal = page.locator('[data-testid="file-modal"]')
    await expect(modal).toBeVisible()

    // Verify focus is trapped in modal
    await page.keyboard.press('Tab')
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName)
    expect(['BUTTON', 'INPUT', 'SELECT', 'TEXTAREA', 'A']).toContain(focusedElement)

    // Test modal close with Escape
    await page.keyboard.press('Escape')
    await expect(modal).not.toBeVisible()

    // Test focus returns to trigger
    await expect(page.locator('[data-testid="file-details-button"]')).toBeFocused()
  })

  test('keyboard shortcuts', async ({ page }) => {
    // Test Ctrl+U for upload
    await page.keyboard.press('Control+u')
    await expect(page.locator('[data-testid="file-input"]')).toBeVisible()

    // Test Escape to cancel upload
    await page.keyboard.press('Escape')
    await expect(page.locator('[data-testid="upload-cancelled"]')).toBeVisible()

    // Test Ctrl+A to select all
    await page.locator('[data-testid="upload-file"]').first().waitFor()
    await page.keyboard.press('Control+a')
    await expect(page.locator('[data-testid="all-selected"]')).toBeVisible()
  })

  test('voice control compatibility', async () => {
    // Add voice control attributes
    await page.addStyleTag({
      content: `
        [data-voice-command] {
          position: relative;
        }
        [data-voice-command]::after {
          content: attr(data-voice-command);
          position: absolute;
          top: -20px;
          left: 0;
          font-size: 12px;
          color: #666;
        }
      `,
    })

    // Verify voice commands are exposed
    const dropzone = page.locator('[data-testid="dropzone"]')
    await expect(dropzone).toHaveAttribute('data-voice-command')
  })

  test('text scaling and zoom', async ({ page }) => {
    // Test 200% zoom
    await page.evaluate(() => {
      document.body.style.zoom = '200%'
    })

    // Verify everything is still accessible
    await checkA11y(page)

    // Test text-only scaling
    await page.evaluate(() => {
      document.body.style.zoom = '100%'
      document.body.style.fontSize = '200%'
    })

    // Verify accessibility with large text
    await checkA11y(page)
  })
})