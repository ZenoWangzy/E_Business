'use client';

import { useAccessibility } from '@/components/providers/AccessibilityProvider';
import { Button } from '@/components/ui/button';

interface HighContrastToggleProps {
    className?: string;
    showLabel?: boolean;
}

/**
 * HighContrastToggle
 * 高对比度模式切换按钮
 * data-testid="high-contrast-toggle" 用于 E2E 测试
 */
export function HighContrastToggle({ className, showLabel = true }: HighContrastToggleProps) {
    const { highContrast, toggleHighContrast } = useAccessibility();

    return (
        <Button
            variant={highContrast ? 'default' : 'outline'}
            size="sm"
            onClick={toggleHighContrast}
            className={className}
            data-testid="high-contrast-toggle"
            aria-pressed={highContrast}
            aria-label={highContrast ? '关闭高对比度模式' : '开启高对比度模式'}
        >
            <span className="text-lg mr-1" aria-hidden="true">
                {highContrast ? '◐' : '◑'}
            </span>
            {showLabel && (
                <span>{highContrast ? '标准模式' : '高对比度'}</span>
            )}
        </Button>
    );
}

export default HighContrastToggle;
