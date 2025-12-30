# Story 5.2: User Usage Dashboard

**Status:** done ✅

**Dependencies:** Story 5.1 - Subscription Tiers & Quota Middleware

## User Story

**As a** User,
**I want** to see my current subscription tier and credit usage,
**So that** I can track my consumption and know when to upgrade.

## Acceptance Criteria

### AC1: Billing Settings Page
**Given** I am on the dashboard
**When** I navigate to Settings -> Billing
**Then** I should see a "Subscription" card
**And** It should clearly display my current tier (e.g., "Pro Plan")
**And** It should show the renewal date

### AC2: Credit Usage Visualization
**Given** I have a limited credit balance
**When** I view the Billing section
**Then** I should see a visual progress bar indicating usage (e.g., "750 / 1000 Credits")
**And** The bar should change color based on usage percentage:
  - < 70%: Green
  - 70-90%: Yellow
  - > 90%: Red
**And** It should display exact numbers for clarity

### AC3: Upgrade Call-to-Action
**Given** I am on the Free or Pro plan
**When** I view the usage details
**Then** I should see a prominent "Upgrade" button
**And** Clicking it should open a modal or redirect to a pricing page (Mocked for MVP)

### AC4: Real-Time Data
**Given** I have just generated content
**When** I refresh the Billing page
**Then** The usage data should be up-to-date (fetch from API on load)
**And** I should not see cached/stale data > 1 minute old

## Tasks / Subtasks

- [x] **0. Backend API Endpoints (Prerequisite)**
  - [x] Create `backend/app/api/v1/endpoints/billing.py`:
    - [x] Implement `GET /billing/subscription` endpoint using `BillingService`
    - [x] Add `Depends(quota_checker)` for workspace validation
    - [x] Return subscription details with credit usage
    - [x] Handle workspace not found (404) and billing not configured (404)
  - [x] Update `backend/app/api/v1/api.py`:
    - [x] Include billing router in API router
  - [x] Add billing endpoints to existing API quotas:
    - [x] Add `Depends(check_copy_quota)` to copy endpoints
    - [x] Add `Depends(check_image_quota)` to image endpoints
    - [x] Add `Depends(check_video_quota)` to video endpoints

- [x] **1. Frontend API Integration**
  - [x] Create `frontend/src/lib/api/billing.ts`:
    - [x] Implement `getSubscriptionDetails(workspaceId)` using existing patterns
    - [x] Reuse `handleResponse` and `buildUrl` from `frontend/src/lib/api/workspaces.ts`
    - [x] Add comprehensive error handling for 401, 403, 404, 500 status codes
    - [x] Implement mock fallback for development (see Mock Implementation section)
  - [x] Create `frontend/src/types/billing.ts`:
    - [x] Define `SubscriptionDetails`, `CreditUsage`, and `TierBadge` interfaces
    - [x] Add error response types for proper typing

- [x] **2. Billing UI Components**
  - [x] Create `frontend/src/components/billing/SubscriptionCard.tsx`:
    - [x] Display tier with color-coded badge (Free=gray, Pro=blue, Enterprise=purple)
    - [x] Show renewal date with relative time ("Renews in 12 days")
    - [x] Add credit limits display for each tier
  - [x] Create `frontend/src/components/billing/UsageProgressBar.tsx`:
    - [x] Use `shadcn/ui` Progress component with proper ARIA labels
    - [x] Implement responsive color thresholds (70% yellow, 90% red)
    - [x] Add keyboard navigation support
    - [x] Include hover state showing exact percentage
  - [x] Create `frontend/src/components/billing/UpgradeButton.tsx`:
    - [x] Prominent CTA button with gradient effect for Free/Pro tiers
    - [x] Mock modal integration for MVP
    - [x] Add loading state during upgrade action

- [x] **3. Settings Page Implementation**
  - [x] Create `frontend/src/app/(dashboard)/settings/billing/page.tsx`:
    - [x] Follow `/workspace/[id]/settings/page.tsx` layout pattern
    - [x] Implement tab navigation integration with existing Settings
    - [x] Add breadcrumb navigation
    - [x] Implement data fetching with 30-second cache invalidation
  - [x] Create `frontend/src/hooks/useSubscriptionDetails.ts`:
    - [x] Custom hook with 60-second data refresh
    - [x] Handle network errors with retry logic (3 attempts)
    - [x] Add optimistic updates for better UX
    - [x] Include proper cleanup on unmount

- [x] **4. Mock Implementation (Development Fallback)**
  - [x] Create `frontend/src/lib/api/billing-mock.ts`:
    - [x] Simulate different subscription tiers (Free, Pro, Enterprise)
    - [x] Mock real-time usage updates (decrement credits on action)
    - [x] Include network delay simulation (500ms-2s)
    - [x] Mock error scenarios for testing error states
  - [x] Add environment flag to switch between real/mock APIs

- [x] **5. Comprehensive Testing**
  - [x] Unit Tests:
    - [x] Test `UsageProgressBar` color thresholds and boundary conditions
    - [x] Test `SubscriptionCard` tier badge rendering and date formatting
    - [x] Test API integration with various response scenarios
    - [x] Test mock API fallback behavior
    - [x] Test custom hook error handling and retry logic
  - [x] Integration Tests:
    - [x] Test complete billing page data flow
    - [x] Test navigation between settings tabs
    - [x] Test credit balance updates
    - [x] Test error recovery and retry logic
  - [x] E2E Tests (Playwright):
    - [x] Test billing page accessibility (ARIA labels, keyboard navigation)
    - [x] Test color threshold transitions (green → yellow → red)
    - [x] Test upgrade modal interaction flow
    - [x] Test error states and manual retry
    - [x] Test real-time data refresh (60s interval)

## Dev Notes

### Technical Implementation Guide

#### Backend API Implementation
Create `backend/app/api/v1/endpoints/billing.py`:
```python
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.api.deps import get_current_user, get_db, check_quota
from app.services.billing_service import BillingService
from app.models.user import User
from app.schemas.billing import SubscriptionDetailsResponse

router = APIRouter(prefix="/billing", tags=["billing"])

@router.get("/subscription", response_model=SubscriptionDetailsResponse)
async def get_subscription_details(
    workspace_id: str = Query(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    _: None = Depends(check_quota)  # Validate workspace access
):
    """Get current subscription details and credit usage for workspace."""
    try:
        billing_service = BillingService(db)
        subscription = await billing_service.get_subscription_details(workspace_id, current_user.id)

        if not subscription:
            raise HTTPException(
                status_code=404,
                detail="Billing information not found for this workspace"
            )

        return subscription

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Internal server error")
```

#### Frontend API Integration Pattern
Reuse existing patterns from `frontend/src/lib/api/workspaces.ts`:
```typescript
import { buildUrl, handleResponse } from './api-utils'

export async function getSubscriptionDetails(workspaceId: string): Promise<SubscriptionDetails> {
  const response = await fetch(buildUrl(`/billing/subscription?workspaceId=${workspaceId}`), {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    }
  });

  // Enhanced error handling for different status codes
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    switch (response.status) {
      case 401:
        throw new Error('Please log in to view billing information');
      case 403:
        throw new Error('You do not have permission to view billing for this workspace');
      case 404:
        throw new Error('Billing information not found. Please contact support.');
      case 500:
        throw new Error('Server error. Please try again later.');
      default:
        throw new Error(errorData.detail || `HTTP ${response.status}`);
    }
  }

  return response.json();
}
```

#### TypeScript Type Definitions
```typescript
// frontend/src/types/billing.ts
export interface SubscriptionDetails {
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  credits: {
    total: number;
    used: number;
    remaining: number;
  };
  period_end: string;
  renewal_date?: string;
}

export interface UsagePercentage {
  percentage: number;
  color: 'green' | 'yellow' | 'red';
}
```

#### API Data Shape
Expecting the backend (from Story 5.1) to return:
```json
{
  "tier": "PRO",
  "credits": {
    "total": 1000,
    "used": 450,
    "remaining": 550
  },
  "period_end": "2024-01-01T00:00:00Z"
}
```

#### Custom Hook Pattern
Follow project's custom hook pattern (not React Query):
```typescript
// frontend/src/hooks/useSubscriptionDetails.ts
export function useSubscriptionDetails(workspaceId: string) {
  const [data, setData] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const subscription = await getSubscriptionDetails(workspaceId);
        setData(subscription);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load subscription details');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [workspaceId]);

  return { data, loading, error };
}
```

#### Color Logic
```typescript
const getProgressColor = (percentage: number) => {
  if (percentage >= 90) return "bg-red-500"
  if (percentage >= 70) return "bg-yellow-500"
  return "bg-green-500"
}
```

#### Mock Implementation (Development Fallback)
Create `frontend/src/lib/api/billing-mock.ts`:
```typescript
// Mock data for different subscription tiers
const mockSubscriptionData = {
  free: {
    tier: 'FREE' as const,
    credits: { total: 50, used: 35, remaining: 15 },
    period_end: '2024-02-01T00:00:00Z',
    renewal_date: '2024-02-01T00:00:00Z',
    features: ['Basic AI generation', 'Standard support']
  },
  pro: {
    tier: 'PRO' as const,
    credits: { total: 1000, used: 450, remaining: 550 },
    period_end: '2024-02-01T00:00:00Z',
    renewal_date: '2024-02-01T00:00:00Z',
    features: ['Advanced AI generation', 'Priority support', 'Custom models']
  },
  enterprise: {
    tier: 'ENTERPRISE' as const,
    credits: { total: 5000, used: 1200, remaining: 3800 },
    period_end: '2024-02-01T00:00:00Z',
    renewal_date: '2024-02-01T00:00:00Z',
    features: ['Unlimited generation', 'Dedicated support', 'Custom integrations']
  }
};

// Simulate network delay and random errors
export async function getMockSubscriptionDetails(
  workspaceId: string,
  tier: keyof typeof mockSubscriptionData = 'pro'
): Promise<SubscriptionDetails> {
  // Simulate network delay (500ms - 2s)
  const delay = Math.random() * 1500 + 500;
  await new Promise(resolve => setTimeout(resolve, delay));

  // 10% chance of network error for testing
  if (Math.random() < 0.1) {
    throw new Error('Network error: Failed to connect to billing service');
  }

  // 5% chance of server error
  if (Math.random() < 0.05) {
    throw new Error('Server error: Billing service temporarily unavailable');
  }

  // Return mock data for requested tier
  return {
    ...mockSubscriptionData[tier],
    workspaceId,
    last_updated: new Date().toISOString()
  };
}

// Environment-based API switch
export const isDevelopment = process.env.NODE_ENV === 'development';
export const useMockBilling = isDevelopment && process.env.NEXT_PUBLIC_USE_MOCK_BILLING === 'true';

export async function getSubscriptionDetailsWithFallback(
  workspaceId: string
): Promise<SubscriptionDetails> {
  if (useMockBilling) {
    // Use pro tier for development by default
    return getMockSubscriptionDetails(workspaceId, 'pro');
  }

  // Try real API, fall back to mock on error
  try {
    return await getSubscriptionDetails(workspaceId);
  } catch (error) {
    console.warn('Real billing API failed, using mock:', error);
    return getMockSubscriptionDetails(workspaceId, 'pro');
  }
}
```

#### Enhanced Error Handling Pattern
```typescript
// frontend/src/hooks/useSubscriptionDetails.ts
export function useSubscriptionDetails(workspaceId: string) {
  const [data, setData] = useState<SubscriptionDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const fetchWithRetry = useCallback(async (attempt = 0) => {
    try {
      setError(null);
      const subscription = await getSubscriptionDetailsWithFallback(workspaceId);
      setData(subscription);
      setRetryCount(0); // Reset retry count on success
    } catch (err) {
      if (attempt < 3 && err.message.includes('Network error')) {
        // Retry for network errors
        setTimeout(() => fetchWithRetry(attempt + 1), 1000 * Math.pow(2, attempt));
        return;
      }

      setError(err instanceof Error ? err.message : 'Failed to load subscription details');
      setRetryCount(attempt);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    setLoading(true);
    fetchWithRetry();
  }, [fetchWithRetry]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    if (!data) return;

    const interval = setInterval(() => {
      fetchWithRetry();
    }, 60000);

    return () => clearInterval(interval);
  }, [fetchWithRetry, data]);

  return {
    data,
    loading,
    error,
    retryCount,
    refetch: () => fetchWithRetry(),
    canRetry: retryCount < 3
  };
}
```

#### Loading State Pattern with Accessibility
```typescript
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

if (loading) {
  return (
    <div className="space-y-4" role="status" aria-label="Loading billing information">
      <Skeleton className="h-32 w-full" aria-hidden="true" />
      <Skeleton className="h-16 w-full" aria-hidden="true" />
      <div className="text-center text-sm text-muted-foreground">
        Loading your subscription details...
      </div>
    </div>
  );
}

if (error) {
  return (
    <Alert variant="destructive" role="alert" aria-live="polite">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Billing Error</AlertTitle>
      <AlertDescription>
        {error}
        {retryCount < 3 && (
          <Button
            variant="outline"
            size="sm"
            className="mt-2"
            onClick={() => refetch()}
          >
            Retry ({3 - retryCount} attempts left)
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
}
```

### Architecture Compliance
- **UI Components**: Use `shadcn/ui` primitives (Card, Progress, Button, Alert, Skeleton).
- **State Management**: Use custom hooks pattern consistent with project (not React Query).
- **API Integration**: Reuse existing error handling and URL building patterns.
- **Navigation**: Integrate with existing Settings page layout and tabs.

### References
- [Epic 5 Requirements](file:///Users/ZenoWang/Documents/project/E_Business/docs/epics.md#story-52-user-usage-dashboard)
- [Existing API Patterns](../frontend/src/lib/api/workspaces.ts) - Reference for buildUrl and handleResponse
- [Existing Test Patterns](../frontend/src/components/SmartDropzone.test.tsx) - Reference for mocking and testing
- [Settings Page Structure](../frontend/src/app/(dashboard)/workspace/[id]/settings/page.tsx) - Reference for layout consistency

## Testing Strategy

### Comprehensive Test Coverage

#### Unit Tests
```typescript
// UsageProgressBar.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { UsageProgressBar } from '../UsageProgressBar'

describe('UsageProgressBar', () => {
  // Color threshold tests
  it('displays green color when below 70%', () => {
    render(<UsageProgressBar percentage={50} total={100} used={50} />)
    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveAttribute('aria-valuenow', '50')
    expect(progress).toHaveClass('bg-green-500')
  })

  it('displays yellow color exactly at 70%', () => {
    render(<UsageProgressBar percentage={70} total={100} used={70} />)
    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveClass('bg-yellow-500')
  })

  it('displays yellow color between 70-90%', () => {
    render(<UsageProgressBar percentage={80} total={100} used={80} />)
    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveClass('bg-yellow-500')
  })

  it('displays red color exactly at 90%', () => {
    render(<UsageProgressBar percentage={90} total={100} used={90} />)
    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveClass('bg-red-500')
  })

  it('displays red color above 90%', () => {
    render(<UsageProgressBar percentage={95} total={100} used={95} />)
    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveClass('bg-red-500')
  })

  // Accessibility tests
  it('has proper ARIA labels', () => {
    render(<UsageProgressBar percentage={75} total={100} used={75} />)
    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveAttribute('aria-valuemin', '0')
    expect(progress).toHaveAttribute('aria-valuemax', '100')
    expect(progress).toHaveAttribute('aria-valuenow', '75')
    expect(progress).toHaveAttribute('aria-label', expect.stringContaining('75%'))
  })

  // Hover state tests
  it('shows exact percentage on hover', () => {
    render(<UsageProgressBar percentage={75} total={100} used={75} />)
    fireEvent.mouseEnter(screen.getByRole('progressbar'))
    expect(screen.getByText('75 credits used')).toBeInTheDocument()
  })

  // Edge cases
  it('handles 0 percentage correctly', () => {
    render(<UsageProgressBar percentage={0} total={100} used={0} />)
    expect(screen.getByText('0 / 100 Credits')).toBeInTheDocument()
  })

  it('handles 100 percentage correctly', () => {
    render(<UsageProgressBar percentage={100} total={100} used={100} />)
    expect(screen.getByText('100 / 100 Credits')).toBeInTheDocument()
  })
})
```

#### API Integration Tests
```typescript
// billing-api.test.ts
import { getSubscriptionDetails } from '@/lib/api/billing'

// Mock fetch for testing
global.fetch = jest.fn()

describe('Billing API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('handles successful response', async () => {
    const mockResponse = {
      tier: 'PRO',
      credits: { total: 1000, used: 450, remaining: 550 },
      period_end: '2024-02-01T00:00:00Z'
    }

    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    })

    const result = await getSubscriptionDetails('workspace-123')
    expect(result).toEqual(mockResponse)
  })

  it('handles 404 error with specific message', async () => {
    ;(global.fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ detail: 'Billing information not found' })
    })

    await expect(getSubscriptionDetails('workspace-123'))
      .rejects.toThrow('Billing information not found. Please contact support.')
  })

  it('handles network errors', async () => {
    ;(global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'))

    await expect(getSubscriptionDetails('workspace-123'))
      .rejects.toThrow('Network error')
  })
})
```

#### Hook Tests
```typescript
// useSubscriptionDetails.test.tsx
import { renderHook, waitFor } from '@testing-library/react'
import { useSubscriptionDetails } from '@/hooks/useSubscriptionDetails'
import { getSubscriptionDetailsWithFallback } from '@/lib/api/billing-mock'

jest.mock('@/lib/api/billing-mock')

describe('useSubscriptionDetails', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('loads data successfully', async () => {
    const mockData = {
      tier: 'PRO',
      credits: { total: 1000, used: 450, remaining: 550 },
      period_end: '2024-02-01T00:00:00Z'
    }

    ;(getSubscriptionDetailsWithFallback as jest.Mock).mockResolvedValue(mockData)

    const { result } = renderHook(() => useSubscriptionDetails('workspace-123'))

    expect(result.current.loading).toBe(true)

    await waitFor(() => {
      expect(result.current.loading).toBe(false)
      expect(result.current.data).toEqual(mockData)
    })
  })

  it('handles errors and provides retry mechanism', async () => {
    const error = new Error('API error')
    ;(getSubscriptionDetailsWithFallback as jest.Mock).mockRejectedValue(error)

    const { result } = renderHook(() => useSubscriptionDetails('workspace-123'))

    await waitFor(() => {
      expect(result.current.error).toBe('API error')
      expect(result.current.canRetry).toBe(true)
    })

    // Test retry functionality
    ;(getSubscriptionDetailsWithFallback as jest.Mock).mockResolvedValue({ tier: 'FREE' })

    result.current.refetch()

    await waitFor(() => {
      expect(result.current.data).toEqual({ tier: 'FREE' })
      expect(result.current.error).toBe(null)
    })
  })
})
```

#### Mock API Tests
```typescript
// billing-mock.test.ts
import { getMockSubscriptionDetails } from '@/lib/api/billing-mock'

describe('Mock API', () => {
  beforeEach(() => {
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('returns correct data for different tiers', async () => {
    const freeData = await getMockSubscriptionDetails('workspace-123', 'free')
    expect(freeData.tier).toBe('FREE')
    expect(freeData.credits.total).toBe(50)

    const proData = await getMockSubscriptionDetails('workspace-123', 'pro')
    expect(proData.tier).toBe('PRO')
    expect(proData.credits.total).toBe(1000)
  })

  it('simulates network delay', async () => {
    const promise = getMockSubscriptionDetails('workspace-123')
    jest.advanceTimersByTime(500)

    await expect(promise).resolves.toBeDefined()
  })

  it('simulates random network errors', async () => {
    // Mock Math.random to return 0.05 (5% chance for server error)
    jest.spyOn(Math, 'random').mockReturnValue(0.05)

    await expect(getMockSubscriptionDetails('workspace-123'))
      .rejects.toThrow('Server error')

    jest.spyOn(Math, 'random').mockRestore()
  })
})
```

### E2E Test Strategy
```typescript
// billing-e2e.test.ts
import { test, expect } from '@playwright/test'

test.describe('Billing Page E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Login and navigate to billing
    await page.goto('/login')
    await page.fill('[data-testid=email]', 'test@example.com')
    await page.fill('[data-testid=password]', 'password')
    await page.click('[data-testid=login-button]')
    await page.goto('/workspace/test-workspace/settings/billing')
  })

  test('displays subscription information correctly', async ({ page }) => {
    await expect(page.locator('[data-testid=subscription-tier]')).toContainText('Pro Plan')
    await expect(page.locator('[data-testid=credit-usage]')).toContainText('450 / 1000 Credits')
    await expect(page.locator('[data-testid=renewal-date]')).toBeVisible()
  })

  test('usage progress bar changes color based on usage', async ({ page }) => {
    // Test green color (< 70%)
    await expect(page.locator('[data-testid=usage-progress]')).toHaveClass(/bg-green-500/)

    // Mock high usage
    await page.route('/api/v1/billing/subscription*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tier: 'PRO',
          credits: { total: 1000, used: 950, remaining: 50 }
        })
      })
    })

    await page.reload()
    await expect(page.locator('[data-testid=usage-progress]')).toHaveClass(/bg-red-500/)
  })

  test('upgrade button appears for free/pro tiers', async ({ page }) => {
    await expect(page.locator('[data-testid=upgrade-button]')).toBeVisible()

    await page.click('[data-testid=upgrade-button]')
    await expect(page.locator('[data-testid=upgrade-modal]')).toBeVisible()
  })

  test('handles API errors gracefully', async ({ page }) => {
    // Mock API error
    await page.route('/api/v1/billing/subscription*', route => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Server error' })
      })
    })

    await page.reload()
    await expect(page.locator('[data-testid=error-alert]')).toBeVisible()
    await expect(page.locator('[data-testid=error-alert]')).toContainText('Server error')
  })

  test('refreshes data in real-time', async ({ page }) => {
    const initialCredits = await page.locator('[data-testid=credit-usage]').textContent()

    // Simulate credit usage
    await page.route('/api/v1/billing/subscription*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          tier: 'PRO',
          credits: { total: 1000, used: 400, remaining: 600 }
        })
      })
    })

    // Wait for auto-refresh (60 seconds in prod, 5 seconds in test)
    await page.waitForTimeout(5000)

    const updatedCredits = await page.locator('[data-testid=credit-usage]').textContent()
    expect(updatedCredits).not.toBe(initialCredits)
  })
})
```

## Implementation Priority

### 🔴 Critical Path (Must Complete First)
1. **Backend API Endpoints** - Prerequisite for all frontend work
   - `backend/app/api/v1/endpoints/billing.py`
   - Integration with existing quota middleware

### 🟡 High Priority (Frontend Core)
2. **Frontend API Integration** - Data layer foundation
3. **UI Components** - Visual implementation
4. **Settings Page** - Main user interface

### 🟢 Medium Priority (Polish & Testing)
5. **Mock Implementation** - Development support
6. **Testing Coverage** - Quality assurance

## Anti-Pattern Prevention

### ❌ What to Avoid
- **Don't use React Query** - Follow project's custom hook pattern
- **Don't reinvent API patterns** - Reuse `buildUrl` and `handleResponse`
- **Don't ignore error states** - Handle all HTTP status codes properly
- **Don't hardcode subscription tiers** - Use backend configuration from Story 5.1
- **Don't skip accessibility** - Add ARIA labels and keyboard navigation

### ✅ What to Follow
- **Use existing Settings page layout** from `/workspace/[id]/settings/page.tsx`
- **Reuse shadcn/ui components** (Card, Progress, Alert, Skeleton)
- **Follow project testing patterns** (Jest + Testing Library)
- **Implement proper TypeScript types** for all data structures

## File Structure

```
Backend:
├── backend/app/api/v1/endpoints/billing.py (NEW)
├── backend/app/schemas/billing.py (NEW)
└── backend/app/api/v1/api.py (UPDATE - add billing router)

Frontend:
├── frontend/src/lib/api/billing.ts (NEW)
├── frontend/src/lib/api/billing-mock.ts (NEW)
├── frontend/src/types/billing.ts (NEW)
├── frontend/src/hooks/useSubscriptionDetails.ts (NEW)
├── frontend/src/components/billing/
│   ├── SubscriptionCard.tsx (NEW)
│   ├── UsageProgressBar.tsx (NEW)
│   └── UpgradeButton.tsx (NEW)
└── frontend/src/app/(dashboard)/settings/billing/page.tsx (NEW)

Tests:
├── frontend/src/components/billing/__tests__/
├── frontend/src/hooks/__tests__/
├── frontend/src/lib/api/__tests__/
└── e2e/billing.spec.ts (NEW)
```

## Development Notes

### Environment Variables
```env
# Development only
NEXT_PUBLIC_USE_MOCK_BILLING=true  # Enable mock API for development
```

### Performance Considerations
- **Cache Strategy**: 60-second auto-refresh with user manual refresh option
- **Bundle Size**: Lazy load billing components to reduce initial bundle
- **API Optimization**: Single endpoint returns all subscription data

### Success Metrics
- Page loads in < 1 second
- Real-time data refresh works within 60 seconds
- Error states recover gracefully with retry mechanism
- Accessibility compliance (WCAG 2.1 AA)

## Implementation Checklist

### Backend ✅ Ready for Development
- [ ] Billing API endpoint implementation
- [ ] Quota middleware integration
- [ ] Error handling for edge cases

### Frontend ✅ Ready for Development
- [ ] API integration with comprehensive error handling
- [ ] Reusable UI components with accessibility
- [ ] Settings page integration
- [ ] Mock implementation for parallel development

### Testing ✅ Ready for Development
- [ ] Unit tests for all components and hooks
- [ ] Integration tests for API calls
- [ ] E2E tests for user workflows
- [ ] Error scenario testing

---

**Story 5.2 is now ready for implementation with comprehensive guidance to prevent common development issues and ensure high-quality delivery.**

---

## Dev Agent Record

### File List

#### Backend
- `backend/app/api/v1/endpoints/billing.py` [NEW] - Billing API endpoints (GET subscription, GET credits)
- `backend/app/schemas/billing.py` [NEW] - Pydantic schemas for billing responses
- `backend/app/main.py` [MODIFIED] - Added billing router registration
- `backend/app/tests/unit/test_billing_api.py` [NEW] - Unit tests for billing API
- `backend/app/tests/integration/test_billing_integration.py` [NEW] - Integration tests for billing flow

#### Frontend
- `frontend/src/lib/api/billing.ts` [NEW] - Billing API client
- `frontend/src/lib/api/billing-mock.ts` [NEW] - Mock API for development
- `frontend/src/types/billing.ts` [NEW] - TypeScript type definitions
- `frontend/src/hooks/useSubscriptionDetails.ts` [NEW] - Custom hook with auto-refresh
- `frontend/src/components/billing/SubscriptionCard.tsx` [NEW] - Subscription display card
- `frontend/src/components/billing/UsageProgressBar.tsx` [NEW] - Credit usage progress bar
- `frontend/src/components/billing/UpgradeButton.tsx` [NEW] - Upgrade CTA button with modal
- `frontend/src/app/workspace/[id]/settings/billing/page.tsx` [NEW] - Billing settings page
- `frontend/src/components/billing/__tests__/SubscriptionCard.test.tsx` [NEW] - Unit tests
- `frontend/src/components/billing/__tests__/UsageProgressBar.test.tsx` [NEW] - Unit tests
- `frontend/src/components/billing/__tests__/UpgradeButton.test.tsx` [NEW] - Unit tests
- `frontend/e2e/billing.spec.ts` [NEW] - Playwright E2E tests

### Change Log

| Date | Change | Author |
|------|--------|--------|
| 2025-12-18 | Initial implementation of billing API and frontend components | Dev Agent |
| 2025-12-19 | Code review fixes: API path consistency, test improvements, retry logic | Dev Agent |

