/**
 * Billing Page E2E Tests
 * 
 * Story 5.2: User Usage Dashboard
 * Tests complete user flows including navigation, data display, error handling, and real-time updates.
 */

import { test, expect, type Page } from '@playwright/test';

// Helper: Navigate to billing settings
async function navigateToBillingSettings(page: Page, workspaceId: string = '1') {
    await page.goto(`/workspace/${workspaceId}/settings/billing`);
    await page.waitForLoadState('networkidle');
}

// Helper: Wait for billing data to load
async function waitForBillingData(page: Page) {
    // Wait for subscription card to appear (not skeleton)
    await page.waitForSelector('[data-testid="subscription-tier"]', {
        state: 'visible',
        timeout: 10000
    });
}

test.describe('Billing Page - Data Display', () => {
    test('displays FREE tier subscription correctly', async ({ page }) => {
        // Mock API to return FREE tier data
        await page.route('**/api/v1/billing/workspaces/*/subscription', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    tier: 'FREE',
                    credits: { total: 50, used: 35, remaining: 15 },
                    period_end: new Date(Date.now() + 12 * 24 * 60 * 60 * 1000).toISOString(),
                    features: ['基础 AI 生成', '标准支持'],
                }),
            });
        });

        await navigateToBillingSettings(page);
        await waitForBillingData(page);

        // Verify tier badge
        const tierBadge = page.locator('[data-testid="subscription-tier"]');
        await expect(tierBadge).toContainText('Free Plan');
        await expect(tierBadge).toHaveClass(/bg-gray-100/);

        // Verify credit usage
        await expect(page.locator('text=35 / 50 积分')).toBeVisible();
        await expect(page.locator('text=剩余: 15 积分')).toBeVisible();

        // Verify progress bar percentage
        await expect(page.locator('text=70%')).toBeVisible();

        // Verify features
        await expect(page.locator('text=基础 AI 生成')).toBeVisible();
        await expect(page.locator('text=标准支持')).toBeVisible();

        // Verify upgrade button is visible for FREE tier
        await expect(page.locator('[data-testid="upgrade-button"]')).toBeVisible();
        await expect(page.locator('text=升级到 Pro')).toBeVisible();
    });

    test('displays PRO tier subscription correctly', async ({ page }) => {
        await page.route('**/api/v1/billing/workspaces/*/subscription', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    tier: 'PRO',
                    credits: { total: 1000, used: 450, remaining: 550 },
                    period_end: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
                    features: ['高级 AI 生成', '优先支持', '自定义模型'],
                }),
            });
        });

        await navigateToBillingSettings(page);
        await waitForBillingData(page);

        // Verify tier badge
        const tierBadge = page.locator('[data-testid="subscription-tier"]');
        await expect(tierBadge).toContainText('Pro Plan');
        await expect(tierBadge).toHaveClass(/bg-blue-100/);

        // Verify credit usage (45% = green)
        await expect(page.locator('text=450 / 1000 积分')).toBeVisible();
        await expect(page.locator('text=45%')).toBeVisible();

        // Verify upgrade button shows Enterprise option
        await expect(page.locator('text=升级到 Enterprise')).toBeVisible();
    });

    test('displays ENTERPRISE tier without upgrade button', async ({ page }) => {
        await page.route('**/api/v1/billing/workspaces/*/subscription', async (route) => {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify({
                    tier: 'ENTERPRISE',
                    credits: { total: 5000, used: 1200, remaining: 3800 },
                    period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
                    features: ['无限生成', '专属支持', '自定义集成', 'SLA 保障'],
                }),
            });
        });

        await navigateToBillingSettings(page);
        await waitForBillingData(page);

        // Verify tier badge
        const tierBadge = page.locator('[data-testid="subscription-tier"]');
        await expect(tierBadge).toContainText('Enterprise');
        await expect(tierBadge).toHaveClass(/bg-purple-100/);

        // Verify no upgrade button for ENTERPRISE
        await expect(page.locator('[data-testid="upgrade-button"]')).not.toBeVisible();
    });
});

test.describe('Billing Page - Progress Bar Color Thresholds', () => {
    test('shows green color when usage below 70%', async ({ page }) => {
        await page.route('**/api/v1/billing/workspaces/*/subscription', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    tier: 'PRO',
                    credits: { total: 100, used: 50, remaining: 50 },
                    period_end: new Date().toISOString(),
                }),
            });
        });

        await navigateToBillingSettings(page);
        await waitForBillingData(page);

        const indicator = page.locator('[data-testid="usage-progress-indicator"]');
        await expect(indicator).toHaveClass(/bg-green-500/);
    });

    test('shows yellow color when usage at 70-90%', async ({ page }) => {
        await page.route('**/api/v1/billing/workspaces/*/subscription', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    tier: 'PRO',
                    credits: { total: 100, used: 80, remaining: 20 },
                    period_end: new Date().toISOString(),
                }),
            });
        });

        await navigateToBillingSettings(page);
        await waitForBillingData(page);

        const indicator = page.locator('[data-testid="usage-progress-indicator"]');
        await expect(indicator).toHaveClass(/bg-yellow-500/);
    });

    test('shows red color when usage above 90%', async ({ page }) => {
        await page.route('**/api/v1/billing/workspaces/*/subscription', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    tier: 'FREE',
                    credits: { total: 50, used: 48, remaining: 2 },
                    period_end: new Date().toISOString(),
                }),
            });
        });

        await navigateToBillingSettings(page);
        await waitForBillingData(page);

        const indicator = page.locator('[data-testid="usage-progress-indicator"]');
        await expect(indicator).toHaveClass(/bg-red-500/);
        await expect(page.locator('text=96%')).toBeVisible();
    });
});

test.describe('Billing Page - Upgrade Flow', () => {
    test('opens upgrade modal on button click', async ({ page }) => {
        await page.route('**/api/v1/billing/workspaces/*/subscription', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    tier: 'FREE',
                    credits: { total: 50, used: 35, remaining: 15 },
                    period_end: new Date().toISOString(),
                }),
            });
        });

        await navigateToBillingSettings(page);
        await waitForBillingData(page);

        // Click upgrade button
        await page.locator('[data-testid="upgrade-button"]').click();

        // Verify modal opens
        await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible();
        await expect(page.locator('text=升级到 Pro 计划')).toBeVisible();

        // Verify upgrade benefits are shown
        await expect(page.locator('text=每月 1000 积分')).toBeVisible();
        await expect(page.locator('text=高级 AI 生成模型')).toBeVisible();
    });

    test('closes modal on cancel', async ({ page }) => {
        await page.route('**/api/v1/billing/workspaces/*/subscription', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    tier: 'FREE',
                    credits: { total: 50, used: 35, remaining: 15 },
                    period_end: new Date().toISOString(),
                }),
            });
        });

        await navigateToBillingSettings(page);
        await waitForBillingData(page);

        // Open and close modal
        await page.locator('[data-testid="upgrade-button"]').click();
        await expect(page.locator('[data-testid="upgrade-modal"]')).toBeVisible();

        await page.locator('text=稍后再说').click();
        await expect(page.locator('[data-testid="upgrade-modal"]')).not.toBeVisible();
    });

    test('shows loading state during upgrade', async ({ page }) => {
        await page.route('**/api/v1/billing/workspaces/*/subscription', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    tier: 'FREE',
                    credits: { total: 50, used: 35, remaining: 15 },
                    period_end: new Date().toISOString(),
                }),
            });
        });

        await navigateToBillingSettings(page);
        await waitForBillingData(page);

        await page.locator('[data-testid="upgrade-button"]').click();
        await page.locator('text=立即升级').click();

        // Verify loading state
        await expect(page.locator('text=处理中...')).toBeVisible();
    });
});

test.describe('Billing Page - Error Handling', () => {
    test('displays error when API fails', async ({ page }) => {
        await page.route('**/api/v1/billing/workspaces/*/subscription', async (route) => {
            await route.fulfill({
                status: 500,
                body: JSON.stringify({ detail: '服务器错误' }),
            });
        });

        await navigateToBillingSettings(page);

        // Verify error message
        await expect(page.locator('text=服务器错误，请稍后再试')).toBeVisible({ timeout: 5000 });

        // Verify retry button exists
        await expect(page.locator('text=重试')).toBeVisible();
    });

    test('retries on network error', async ({ page }) => {
        let attempt = 0;

        await page.route('**/api/v1/billing/workspaces/*/subscription', async (route) => {
            attempt++;
            if (attempt < 2) {
                // First attempt fails
                await route.abort('failed');
            } else {
                // Second attempt succeeds
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify({
                        tier: 'PRO',
                        credits: { total: 1000, used: 450, remaining: 550 },
                        period_end: new Date().toISOString(),
                    }),
                });
            }
        });

        await navigateToBillingSettings(page);

        // Should eventually succeed after retry
        await waitForBillingData(page);
        await expect(page.locator('[data-testid="subscription-tier"]')).toContainText('Pro Plan');
    });

    test('manual retry works', async ({ page }) => {
        let shouldFail = true;

        await page.route('**/api/v1/billing/workspaces/*/subscription', async (route) => {
            if (shouldFail) {
                await route.fulfill({
                    status: 500,
                    body: JSON.stringify({ detail: '服务器错误' }),
                });
            } else {
                await route.fulfill({
                    status: 200,
                    body: JSON.stringify({
                        tier: 'FREE',
                        credits: { total: 50, used: 35, remaining: 15 },
                        period_end: new Date().toISOString(),
                    }),
                });
            }
        });

        await navigateToBillingSettings(page);

        // Wait for error
        await expect(page.locator('text=服务器错误')).toBeVisible();

        // Fix the error
        shouldFail = false;

        // Click retry
        await page.locator('text=重试').click();

        // Should now succeed
        await waitForBillingData(page);
        await expect(page.locator('[data-testid="subscription-tier"]')).toBeVisible();
    });
});

test.describe('Billing Page - Accessibility', () => {
    test('has proper ARIA labels on progress bar', async ({ page }) => {
        await page.route('**/api/v1/billing/workspaces/*/subscription', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    tier: 'PRO',
                    credits: { total: 100, used: 75, remaining: 25 },
                    period_end: new Date().toISOString(),
                }),
            });
        });

        await navigateToBillingSettings(page);
        await waitForBillingData(page);

        const progressBar = page.locator('[role="progressbar"]');
        await expect(progressBar).toHaveAttribute('aria-valuemin', '0');
        await expect(progressBar).toHaveAttribute('aria-valuemax', '100');
        await expect(progressBar).toHaveAttribute('aria-valuenow', '75');
        await expect(progressBar).toHaveAttribute('aria-label', /75%/);
    });

    test('progress bar is keyboard focusable', async ({ page }) => {
        await page.route('**/api/v1/billing/workspaces/*/subscription', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    tier: 'FREE',
                    credits: { total: 50, used: 35, remaining: 15 },
                    period_end: new Date().toISOString(),
                }),
            });
        });

        await navigateToBillingSettings(page);
        await waitForBillingData(page);

        // Tab to progress bar
        await page.keyboard.press('Tab');

        const progressBar = page.locator('[role="progressbar"]');
        await expect(progressBar).toBeFocused();
    });
});

test.describe('Billing Page - Real-time Updates', () => {
    test('auto-refreshes data every 60 seconds', async ({ page }) => {
        let requestCount = 0;

        await page.route('**/api/v1/billing/workspaces/*/subscription', async (route) => {
            requestCount++;
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    tier: 'PRO',
                    credits: {
                        total: 1000,
                        used: 450 + (requestCount * 10),
                        remaining: 550 - (requestCount * 10)
                    },
                    period_end: new Date().toISOString(),
                }),
            });
        });

        await navigateToBillingSettings(page);
        await waitForBillingData(page);

        // Initial load
        expect(requestCount).toBe(1);
        await expect(page.locator('text=450 / 1000 积分')).toBeVisible();

        // Wait for auto-refresh (60s + buffer)
        await page.waitForTimeout(62000);

        // Should have auto-refreshed
        expect(requestCount).toBeGreaterThan(1);
        await expect(page.locator('text=460 / 1000 积分')).toBeVisible();
    });
});
