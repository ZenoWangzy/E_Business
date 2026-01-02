'use client';

/**
 * UpgradeButton Component
 * 
 * Story 5.2: User Usage Dashboard
 * CTA button for upgrading subscription tier.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SubscriptionTier } from '@/types/billing';

interface UpgradeButtonProps {
    /** Current subscription tier */
    currentTier: SubscriptionTier;
    /** Additional class names */
    className?: string;
}

/**
 * Get upgrade target based on current tier.
 */
function getUpgradeTarget(tier: SubscriptionTier): { label: string; description: string } | null {
    switch (tier) {
        case 'FREE':
            return {
                label: 'Pro',
                description: '升级到 Pro 计划，获得 1000 积分/月和高级功能',
            };
        case 'PRO':
            return {
                label: 'Enterprise',
                description: '升级到企业版，获得无限积分和专属支持',
            };
        case 'ENTERPRISE':
            return null; // Already at highest tier
    }
}

export function UpgradeButton({ currentTier, className }: UpgradeButtonProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const upgradeTarget = getUpgradeTarget(currentTier);

    // Don't show button for Enterprise tier
    if (!upgradeTarget) {
        return null;
    }

    const handleUpgradeClick = () => {
        setIsModalOpen(true);
    };

    const handleConfirmUpgrade = async () => {
        setIsLoading(true);

        // Mock upgrade action - in production, this would call the payment API
        await new Promise(resolve => setTimeout(resolve, 1000));

        setIsLoading(false);
        setIsModalOpen(false);

        // TODO: Redirect to pricing page or payment flow
        console.info('[Billing] Upgrade initiated for tier:', upgradeTarget.label);
    };

    return (
        <>
            <Button
                onClick={handleUpgradeClick}
                className={cn(
                    'bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70',
                    'shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30',
                    'transition-all duration-200',
                    className,
                )}
                data-testid="upgrade-button"
            >
                <Sparkles className="mr-2 h-4 w-4" />
                升级到 {upgradeTarget.label}
                <ArrowRight className="ml-2 h-4 w-4" />
            </Button>

            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent data-testid="upgrade-modal">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="h-5 w-5 text-primary" />
                            升级到 {upgradeTarget.label} 计划
                        </DialogTitle>
                        <DialogDescription className="pt-2">
                            {upgradeTarget.description}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
                            <h4 className="font-medium">升级后您将获得：</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                {currentTier === 'FREE' && (
                                    <>
                                        <li>• 每月 1000 积分（原 50 积分）</li>
                                        <li>• 高级 AI 生成模型</li>
                                        <li>• 优先客户支持</li>
                                        <li>• 最多 5 个工作空间</li>
                                    </>
                                )}
                                {currentTier === 'PRO' && (
                                    <>
                                        <li>• 无限积分</li>
                                        <li>• 专属客户经理</li>
                                        <li>• 自定义 API 集成</li>
                                        <li>• SLA 保障</li>
                                    </>
                                )}
                            </ul>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setIsModalOpen(false)}
                            disabled={isLoading}
                        >
                            稍后再说
                        </Button>
                        <Button
                            onClick={handleConfirmUpgrade}
                            disabled={isLoading}
                            className="bg-gradient-to-r from-primary to-primary/80"
                        >
                            {isLoading ? '处理中...' : '立即升级'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
