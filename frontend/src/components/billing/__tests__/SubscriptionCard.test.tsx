/**
 * SubscriptionCard Component Tests
 * 
 * Story 5.2: User Usage Dashboard
 */

import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SubscriptionCard } from '../SubscriptionCard';
import type { SubscriptionDetails } from '@/types/billing';

const mockSubscription: SubscriptionDetails = {
    tier: 'PRO',
    credits: { total: 1000, used: 450, remaining: 550 },
    periodEnd: '2024-02-15T00:00:00Z',
    renewalDate: '2024-02-15T00:00:00Z',
    features: ['高级 AI 生成', '优先支持', '自定义模型'],
};

describe('SubscriptionCard', () => {
    describe('Tier badge rendering', () => {
        it('renders FREE tier with correct styling', () => {
            const freeSub: SubscriptionDetails = { ...mockSubscription, tier: 'FREE' };
            render(<SubscriptionCard subscription={freeSub} />);

            const badge = screen.getByTestId('subscription-tier');
            expect(badge).toHaveTextContent('Free Plan');
            expect(badge).toHaveClass('bg-gray-100');
        });

        it('renders PRO tier with correct styling', () => {
            render(<SubscriptionCard subscription={mockSubscription} />);

            const badge = screen.getByTestId('subscription-tier');
            expect(badge).toHaveTextContent('Pro Plan');
            expect(badge).toHaveClass('bg-blue-100');
        });

        it('renders ENTERPRISE tier with correct styling', () => {
            const enterpriseSub: SubscriptionDetails = { ...mockSubscription, tier: 'ENTERPRISE' };
            render(<SubscriptionCard subscription={enterpriseSub} />);

            const badge = screen.getByTestId('subscription-tier');
            expect(badge).toHaveTextContent('Enterprise');
            expect(badge).toHaveClass('bg-purple-100');
        });
    });

    describe('Date formatting', () => {
        it('displays relative renewal time', () => {
            // Mock a date in the future
            const futureDate = new Date();
            futureDate.setDate(futureDate.getDate() + 12);
            const sub: SubscriptionDetails = {
                ...mockSubscription,
                periodEnd: futureDate.toISOString(),
            };

            render(<SubscriptionCard subscription={sub} />);
            expect(screen.getByText(/天后续费/)).toBeInTheDocument();
        });
    });

    describe('Features display', () => {
        it('renders all features', () => {
            render(<SubscriptionCard subscription={mockSubscription} />);

            expect(screen.getByText('高级 AI 生成')).toBeInTheDocument();
            expect(screen.getByText('优先支持')).toBeInTheDocument();
            expect(screen.getByText('自定义模型')).toBeInTheDocument();
        });

        it('does not render features section when features is empty', () => {
            const subWithoutFeatures: SubscriptionDetails = {
                ...mockSubscription,
                features: [],
            };

            render(<SubscriptionCard subscription={subWithoutFeatures} />);
            expect(screen.queryByText('包含功能')).not.toBeInTheDocument();
        });

        it('does not render features section when features is undefined', () => {
            const subWithoutFeatures: SubscriptionDetails = {
                ...mockSubscription,
                features: undefined,
            };

            render(<SubscriptionCard subscription={subWithoutFeatures} />);
            expect(screen.queryByText('包含功能')).not.toBeInTheDocument();
        });
    });

    describe('Credit usage', () => {
        it('includes UsageProgressBar component', () => {
            render(<SubscriptionCard subscription={mockSubscription} />);
            expect(screen.getByRole('progressbar')).toBeInTheDocument();
        });

        it('displays correct credit values', () => {
            render(<SubscriptionCard subscription={mockSubscription} />);
            expect(screen.getByText('450 / 1000 积分')).toBeInTheDocument();
        });
    });
});
