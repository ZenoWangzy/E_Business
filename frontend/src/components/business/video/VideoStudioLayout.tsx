'use client';

/**
 * VideoStudioLayout Component
 * Story 4.1: Video Studio UI & Mode Selection
 * 
 * Triple-Sidebar Layout for the AI Video Studio.
 * Contains: GlobalNavRail (left) | VideoSettingsPanel (middle) | VideoPlayerPreview (right)
 * 
 * Responsive Breakpoints:
 * - Desktop (>1024px): Full three-column layout
 * - Tablet (768-1024px): Collapsible settings sidebar
 * - Mobile (<768px): Overlay drawer for settings
 */

import React, { useState, useCallback, useEffect } from 'react';
import { GlobalNavRail } from '@/components/business/copy/GlobalNavRail';
import { VideoSettingsPanel } from './VideoSettingsPanel';
import { VideoPlayerPreview } from './VideoPlayerPreview';
import { useVideoConfig } from '@/hooks/useVideoConfig';
import { cn } from '@/lib/utils';

export interface VideoStudioLayoutProps {
    workspaceId: string;
    productId: string;
}

export function VideoStudioLayout({ workspaceId, productId }: VideoStudioLayoutProps) {
    const [isSettingsCollapsed, setIsSettingsCollapsed] = useState(false);
    const [isMobile, setIsMobile] = useState(false);
    const [isTablet, setIsTablet] = useState(false);

    const { config, updateConfig } = useVideoConfig(workspaceId, productId);

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
                setIsSettingsCollapsed(true);
            }
        };

        checkBreakpoint();
        window.addEventListener('resize', checkBreakpoint);
        return () => window.removeEventListener('resize', checkBreakpoint);
    }, []);

    const handleToggleSettings = useCallback(() => {
        setIsSettingsCollapsed((prev) => !prev);
    }, []);

    return (
        <div className="flex h-screen bg-background">
            {/* Left Rail - Global Navigation (hidden on mobile) */}
            <div className={cn(isMobile && 'hidden')}>
                <GlobalNavRail
                    workspaceId={workspaceId}
                    productId={productId}
                    activeModule="video"
                />
            </div>

            {/* Middle Sidebar - Video Settings */}
            {/* On mobile: overlay mode (absolute positioning) */}
            <div className={cn(
                isMobile && !isSettingsCollapsed && 'absolute left-0 top-0 bottom-0 z-50 shadow-xl'
            )}>
                <VideoSettingsPanel
                    isCollapsed={isSettingsCollapsed}
                    onToggle={handleToggleSettings}
                    config={config}
                    onConfigChange={updateConfig}
                />
            </div>

            {/* Mobile overlay backdrop */}
            {isMobile && !isSettingsCollapsed && (
                <div
                    className="fixed inset-0 bg-black/50 z-40"
                    onClick={handleToggleSettings}
                    aria-hidden="true"
                />
            )}

            {/* Main Content Area - Video Preview */}
            <main
                role="main"
                aria-label="Video preview and timeline"
                className={cn(
                    'flex-1 flex flex-col overflow-hidden transition-all duration-300',
                    // Responsive padding
                    isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-6'
                )}
            >
                <div className="flex-1 overflow-auto">
                    <VideoPlayerPreview config={config} />
                </div>
            </main>
        </div>
    );
}
