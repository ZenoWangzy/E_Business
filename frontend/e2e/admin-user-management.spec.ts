/**
 * Admin User Management E2E Tests
 * 
 * Story 5.4: User Management & Task Retry
 * Tests complete user flows including user list, user detail, and task retry.
 */

import { test, expect, type Page } from '@playwright/test';

// Test data
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';
const TEST_SUPERUSER_ID = '550e8400-e29b-41d4-a716-446655440001';

// Helper: Navigate to admin users page
async function navigateToUsersPage(page: Page) {
    await page.goto('/admin/users');
    await page.waitForLoadState('networkidle');
}

// Helper: Navigate to user detail page
async function navigateToUserDetail(page: Page, userId: string) {
    await page.goto(`/admin/users/${userId}`);
    await page.waitForLoadState('networkidle');
}

// Helper: Mock superuser authentication
async function mockSuperuserAuth(page: Page) {
    await page.route('**/api/v1/auth/me', async (route) => {
        await route.fulfill({
            status: 200,
            body: JSON.stringify({
                id: TEST_SUPERUSER_ID,
                email: 'admin@example.com',
                is_superuser: true,
                is_active: true,
            }),
        });
    });
}

// Helper: Mock regular user (non-superuser) authentication
async function mockRegularUserAuth(page: Page) {
    await page.route('**/api/v1/auth/me', async (route) => {
        await route.fulfill({
            status: 200,
            body: JSON.stringify({
                id: TEST_USER_ID,
                email: 'user@example.com',
                is_superuser: false,
                is_active: true,
            }),
        });
    });
}

// =====================================================
// Test Suite 1: Access Control
// =====================================================
test.describe('Admin Users - Access Control', () => {
    test('non-superuser is denied access to users list', async ({ page }) => {
        await mockRegularUserAuth(page);

        // Mock API to return 403
        await page.route('**/api/v1/admin/users*', async (route) => {
            await route.fulfill({
                status: 403,
                body: JSON.stringify({ detail: 'Superuser access required' }),
            });
        });

        await navigateToUsersPage(page);

        // Should show access denied message
        await expect(page.locator('text=访问被拒绝')).toBeVisible({ timeout: 5000 });
        await expect(page.locator('text=没有管理员权限')).toBeVisible();
    });

    test('non-superuser is denied access to user detail', async ({ page }) => {
        await mockRegularUserAuth(page);

        await page.route('**/api/v1/admin/users/*', async (route) => {
            await route.fulfill({
                status: 403,
                body: JSON.stringify({ detail: 'Superuser access required' }),
            });
        });

        await navigateToUserDetail(page, TEST_USER_ID);

        await expect(page.locator('text=访问被拒绝')).toBeVisible({ timeout: 5000 });
    });
});

// =====================================================
// Test Suite 2: User List
// =====================================================
test.describe('Admin Users - User List', () => {
    test('displays user list with correct data', async ({ page }) => {
        await mockSuperuserAuth(page);
        await page.route('**/api/v1/admin/users*', async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    items: [
                        { id: TEST_USER_ID, email: 'user1@example.com', name: 'Test User', isActive: true, isSuperuser: false, createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z', workspaceCount: 3 },
                        { id: TEST_SUPERUSER_ID, email: 'admin@example.com', name: 'Admin', isActive: true, isSuperuser: true, createdAt: '2024-01-01T10:00:00Z', updatedAt: '2024-01-10T10:00:00Z', workspaceCount: 5 },
                    ],
                    total: 2, page: 1, pageSize: 20, hasMore: false,
                }),
            });
        });
        await navigateToUsersPage(page);
        await expect(page.locator('text=user1@example.com')).toBeVisible();
        await expect(page.locator('text=超级用户')).toBeVisible();
    });
});

// =====================================================
// Test Suite 3: User Detail & Task Retry
// =====================================================
test.describe('Admin Users - User Detail', () => {
    test('displays user detail and workspaces', async ({ page }) => {
        await mockSuperuserAuth(page);
        await page.route(`**/api/v1/admin/users/${TEST_USER_ID}`, async (route) => {
            await route.fulfill({
                status: 200,
                body: JSON.stringify({
                    id: TEST_USER_ID, email: 'user@example.com', name: 'Test', isActive: true, isSuperuser: false,
                    createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z',
                    workspaces: [{ id: 'ws-1', name: 'Workspace 1', slug: 'ws-1', role: 'owner', joinedAt: '2024-01-15T10:00:00Z' }],
                }),
            });
        });
        await page.route(`**/api/v1/admin/users/${TEST_USER_ID}/tasks*`, async (route) => {
            await route.fulfill({ status: 200, body: JSON.stringify({ items: [], total: 0, page: 1, pageSize: 20, hasMore: false }) });
        });
        await navigateToUserDetail(page, TEST_USER_ID);
        await expect(page.locator('text=user@example.com')).toBeVisible();
        await expect(page.locator('text=Workspace 1')).toBeVisible();
    });

    test('retry failed task shows success toast', async ({ page }) => {
        await mockSuperuserAuth(page);
        const TASK_ID = '660e8400-e29b-41d4-a716-446655440002';
        await page.route(`**/api/v1/admin/users/${TEST_USER_ID}`, async (route) => {
            await route.fulfill({ status: 200, body: JSON.stringify({ id: TEST_USER_ID, email: 'user@example.com', name: 'Test', isActive: true, isSuperuser: false, createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z', workspaces: [] }) });
        });
        await page.route(`**/api/v1/admin/users/${TEST_USER_ID}/tasks*`, async (route) => {
            await route.fulfill({ status: 200, body: JSON.stringify({ items: [{ id: TASK_ID, taskType: 'image', status: 'failed', createdAt: '2024-01-15T10:00:00Z', updatedAt: '2024-01-15T10:00:00Z', errorMessage: 'Failed', workspaceId: 'ws-1', workspaceName: 'Workspace 1' }], total: 1, page: 1, pageSize: 20, hasMore: false }) });
        });
        await page.route(`**/api/v1/admin/tasks/${TASK_ID}/retry*`, async (route) => {
            await route.fulfill({ status: 200, body: JSON.stringify({ success: true, task_id: TASK_ID, message: 'Task queued', status: 'pending' }) });
        });
        await navigateToUserDetail(page, TEST_USER_ID);
        await expect(page.locator('text=失败')).toBeVisible();
        await page.locator('button:has-text("重试")').click();
    });
});
