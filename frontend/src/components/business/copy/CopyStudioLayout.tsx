'use client';

/**
 * CopyStudioLayout Component
 * 
 * Triple-Sidebar Layout for the AI Copywriting Studio.
 * Contains: GlobalNavRail (left) | ProductContextPanel (middle) | Main Content (right)
 * 
 * Responsive Breakpoints:
 * - Desktop (>1024px): Full three-column layout
 * - Tablet (768-1024px): Collapsible middle sidebar, default collapsed
 * - Mobile (<768px): Overlay drawer for context panel
 */

import React, { useState, useCallback, useEffect } from 'react';
import { GlobalNavRail } from './GlobalNavRail';
import { ProductContextPanel } from './ProductContextPanel';
import { CopyGeneratorTabs } from './CopyGeneratorTabs';
import { cn } from '@/lib/utils';

export interface CopyStudioLayoutProps {
    workspaceId: string;
    productId: string;
}

export function CopyStudioLayout({ workspaceId, productId }: CopyStudioLayoutProps) {
    const [isContextCollapsed, setIsContextCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);

    // Responsive breakpoint detection
    useEffect(() => {
        const checkBreakpoint = () => {
            const width = window.innerWidth;
            const mobile = width < 768;
            const tablet = width >= 768 && width < 1024;

            setIsMobile(mobile);
            setIsTablet(tablet);

            // Auto-collapse on tablet/mobile
            if (mobile || tablet) {
                setIsContextCollapsed(true);
            }
        };

        checkBreakpoint();
        window.addEventListener('resize', checkBreakpoint);
        return () => window.removeEventListener('resize', checkBreakpoint);
    }, []);

    const handleToggleContext = useCallback(() => {
        setIsContextCollapsed((prev) => !prev);
    }, []);

    return (
        <div className="flex h-screen bg-background">
            {/* Left Rail - Global Navigation (hidden on mobile) */}
            <div className={cn(isMobile && 'hidden')}>
                <GlobalNavRail
                    workspaceId={workspaceId}
                    productId={productId}
                    activeModule="copy"
                />
            </div>

            {/* Middle Sidebar - Product Context */}
            {/* On mobile: overlay mode (absolute positioning) */}
            <div className={cn(
                isMobile && !isContextCollapsed && 'absolute left-0 top-0 bottom-0 z-50 shadow-xl'
            )}>
                <ProductContextPanel
                    workspaceId={workspaceId}
                    productId={productId}
                    isCollapsed={isContextCollapsed}
                    onToggle={handleToggleContext}
                />
            </div>

            {/* Mobile overlay backdrop */}
            {isMobile && !isContextCollapsed && (
                <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={handleToggleContext}
                    aria-hidden="true"
                />
            )}

            {/* Main Content Area */}
            <main
                className={cn(
                    'flex-1 flex flex-col overflow-hidden transition-all duration-300',
                    // Responsive padding
                    isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-6'
                )}
            >
                <div className="flex-1 overflow-auto">
                    <CopyGeneratorTabs
                        workspaceId={workspaceId}
                        productId={productId}
                    />
                </div>
            </main>
        </div>
    );
}
