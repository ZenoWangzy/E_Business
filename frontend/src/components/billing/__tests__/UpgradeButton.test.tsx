/**
 * UpgradeButton Component Tests
 * 
 * Story 5.2: User Usage Dashboard
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UpgradeButton } from '../UpgradeButton';

describe('UpgradeButton', () => {
    describe('Button visibility', () => {
        it('renders for FREE tier', () => {
            render(<UpgradeButton currentTier="FREE" />);
            expect(screen.getByTestId('upgrade-button')).toBeInTheDocument();
            expect(screen.getByText(/升级到 Pro/)).toBeInTheDocument();
        });

        it('renders for PRO tier', () => {
            render(<UpgradeButton currentTier="PRO" />);
            expect(screen.getByTestId('upgrade-button')).toBeInTheDocument();
            expect(screen.getByText(/升级到 Enterprise/)).toBeInTheDocument();
        });

        it('does not render for ENTERPRISE tier', () => {
            render(<UpgradeButton currentTier="ENTERPRISE" />);
            expect(screen.queryByTestId('upgrade-button')).not.toBeInTheDocument();
        });
    });

    describe('Modal interaction', () => {
        it('opens modal on button click', () => {
            render(<UpgradeButton currentTier="FREE" />);

            fireEvent.click(screen.getByTestId('upgrade-button'));
            expect(screen.getByTestId('upgrade-modal')).toBeInTheDocument();
        });

        it('closes modal on cancel', () => {
            render(<UpgradeButton currentTier="FREE" />);

            fireEvent.click(screen.getByTestId('upgrade-button'));
            fireEvent.click(screen.getByText('稍后再说'));

            expect(screen.queryByTestId('upgrade-modal')).not.toBeInTheDocument();
        });

        it('shows loading state during upgrade', async () => {
            render(<UpgradeButton currentTier="FREE" />);

            fireEvent.click(screen.getByTestId('upgrade-button'));
            fireEvent.click(screen.getByText('立即升级'));

            expect(screen.getByText('处理中...')).toBeInTheDocument();

            await waitFor(() => {
                expect(screen.queryByTestId('upgrade-modal')).not.toBeInTheDocument();
            }, { timeout: 2000 });
        });
    });

    describe('Upgrade benefits display', () => {
        it('shows FREE to PRO upgrade benefits', () => {
            render(<UpgradeButton currentTier="FREE" />);

            fireEvent.click(screen.getByTestId('upgrade-button'));

            expect(screen.getByText(/每月 1000 积分/)).toBeInTheDocument();
            expect(screen.getByText(/高级 AI 生成模型/)).toBeInTheDocument();
        });

        it('shows PRO to ENTERPRISE upgrade benefits', () => {
            render(<UpgradeButton currentTier="PRO" />);

            fireEvent.click(screen.getByTestId('upgrade-button'));

            // Use getAllByText since "无限积分" appears in both description and list
            expect(screen.getAllByText(/无限积分/).length).toBeGreaterThanOrEqual(1);
            expect(screen.getByText(/专属客户经理/)).toBeInTheDocument();
        });
    });
});
