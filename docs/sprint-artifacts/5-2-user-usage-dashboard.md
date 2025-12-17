# Story 5.2: User Usage Dashboard

Status: validated

## Story

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

- [ ] **1. API Integration**
  - [ ] Create `frontend/src/lib/api/billing.ts`:
    - [ ] Implement `getSubscriptionDetails(workspaceId)` using existing patterns
    - [ ] Reuse `handleResponse` and `buildUrl` from existing API files
    - [ ] Type definitions for `SubscriptionFromAPI` (see Dev Notes)
    - [ ] Mock response wrapper (if backend 5.1 not ready)
    - [ ] Proper error handling with user-friendly messages

- [ ] **2. Billing UI Components**
  - [ ] Create `frontend/src/components/billing/SubscriptionCard.tsx`:
    - [ ] Display Tier Name & Badge
    - [ ] Display Renewal Date
  - [ ] Create `frontend/src/components/billing/UsageProgressBar.tsx`:
    - [ ] Use `shadcn/ui` Progress component
    - [ ] Implement color logic based on percentage
    - [ ] Add numeric labels

- [ ] **3. Settings Page Implementation**
  - [ ] Update `frontend/src/app/(dashboard)/settings/billing/page.tsx`:
    - [ ] Layout the components following existing settings page pattern
    - [ ] Fetch data via custom hook (see Dev Notes below)
    - [ ] Handle loading and error states (Skeleton loader)
    - [ ] Maintain consistent navigation with existing Settings tabs

- [ ] **4. Testing**
  - [ ] Unit Tests:
    - [ ] Test `UsageProgressBar` color logic (thresholds: 70%, 90%)
    - [ ] Test empty/loading states with proper Jest patterns
    - [ ] Test subscription tier badge rendering
    - [ ] Mock API responses following existing patterns (see SmartDropzone.test.tsx)
  - [ ] E2E Tests:
    - [ ] Verify navigation to Billing settings from dashboard
    - [ ] Check if usage bar appears with correct data
    - [ ] Test upgrade button interaction (even if mocked)
    - [ ] Verify real-time data refresh on page reload

## Dev Notes

### Technical Implementation Guide

#### API Integration Pattern
Reuse existing patterns from `frontend/src/lib/api/workspaces.ts`:
```typescript
// Reuse these utility functions
import { buildUrl, handleResponse } from './api-utils'

export async function getSubscriptionDetails(workspaceId: string): Promise<SubscriptionDetails> {
  const response = await fetch(buildUrl(`/billing/subscription?workspaceId=${workspaceId}`), {
    credentials: 'include',
  });
  return handleResponse<SubscriptionDetails>(response);
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

#### Error Handling Pattern
```typescript
// In billing page component
const { data, loading, error } = useSubscriptionDetails(workspaceId);

if (error) {
  return (
    <Alert variant="destructive">
      <AlertTitle>Billing Error</AlertTitle>
      <AlertDescription>
        Unable to load subscription details. Please refresh the page or contact support.
      </AlertDescription>
    </Alert>
  );
}
```

#### Loading State Pattern
```typescript
// Use Skeleton loader consistent with existing pages
import { Skeleton } from "@/components/ui/skeleton";

if (loading) {
  return (
    <div className="space-y-4">
      <Skeleton className="h-32 w-full" />
      <Skeleton className="h-16 w-full" />
    </div>
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

## Testing Pattern Examples

### Unit Test Example
```typescript
// UsageProgressBar.test.tsx
import { render, screen } from '@testing-library/react'
import { UsageProgressBar } from '../UsageProgressBar'

describe('UsageProgressBar', () => {
  it('displays green color when below 70%', () => {
    render(<UsageProgressBar percentage={50} />)
    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveClass('bg-green-500')
  })

  it('displays yellow color when between 70-90%', () => {
    render(<UsageProgressBar percentage={80} />)
    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveClass('bg-yellow-500')
  })

  it('displays red color when above 90%', () => {
    render(<UsageProgressBar percentage={95} />)
    const progress = screen.getByRole('progressbar')
    expect(progress).toHaveClass('bg-red-500')
  })
})
```

### Mock Pattern Example
```typescript
// Follow SmartDropzone.test.tsx pattern
jest.mock('@/lib/api/billing', () => ({
  getSubscriptionDetails: jest.fn().mockResolvedValue({
    tier: 'PRO',
    credits: { total: 1000, used: 750, remaining: 250 },
    period_end: '2024-01-01T00:00:00Z'
  })
}))
```

## Dev Agent Record

### Context Reference
- **Analysis**: Dependent on Story 5.1 backend, but can be developed in parallel with mock API.
- **Pattern**: Standard Dashboard/Settings page pattern.
- **Key Files**:
  - API integration: `frontend/src/lib/api/billing.ts`
  - Custom hook: `frontend/src/hooks/useSubscriptionDetails.ts`
  - Types: `frontend/src/types/billing.ts`

### Completion Notes List
- [ ] Billing page implemented with consistent Settings layout
- [ ] API integration following existing patterns
- [ ] Custom hook created (not React Query)
- [ ] Error handling with user-friendly messages
- [ ] Tests written following project conventions
