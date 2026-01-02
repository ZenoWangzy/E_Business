'use client';

/**
 * GlobalNavRail Component
 * 
 * Left navigation rail for module switching.
 * Modules: Product Visuals, Smart Copy, Batch Operations
 */

import React from 'react';
import Link from 'next/link';
import {
    ImageIcon,
    FileText,
    Layers,
    Video,
    ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export type ModuleType = 'visuals' | 'copy' | 'batch' | 'video';

export interface GlobalNavRailProps {
    workspaceId: string;
    productId: string;
    activeModule: ModuleType;
}

interface NavItem {
    id: ModuleType;
    label: string;
    icon: React.ReactNode;
    href: (workspaceId: string, productId: string) => string;
}

const navItems: NavItem[] = [
    {
        id: 'visuals',
        label: 'Product Visuals',
        icon: <ImageIcon className="h-5 w-5" />,
        href: (workspaceId, productId) =>
            `/workspace/${workspaceId}/products/${productId}/visuals`,
    },
    {
        id: 'copy',
        label: 'Smart Copy',
        icon: <FileText className="h-5 w-5" />,
        href: (workspaceId, productId) =>
            `/workspace/${workspaceId}/products/${productId}/copy`,
    },
    {
        id: 'video',
        label: 'Video Studio',
        icon: <Video className="h-5 w-5" />,
        href: (workspaceId, productId) =>
            `/workspace/${workspaceId}/products/${productId}/video`,
    },
    {
        id: 'batch',
        label: 'Batch Operations',
        icon: <Layers className="h-5 w-5" />,
        href: (workspaceId, productId) =>
            `/workspace/${workspaceId}/products/${productId}/batch`,
    },
];

export function GlobalNavRail({ workspaceId, productId, activeModule }: GlobalNavRailProps) {
    return (
        <TooltipProvider>
            <nav
                className="flex flex-col items-center py-4 px-2 bg-muted/50 border-r border-border w-16 shrink-0"
                aria-label="Global Navigation"
            >
                {/* Back to Workspace */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="mb-6"
                            asChild
                        >
                            <Link href={`/workspace/${workspaceId}`}>
                                <ChevronLeft className="h-5 w-5" />
                                <span className="sr-only">Back to Workspace</span>
                            </Link>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        Back to Workspace
                    </TooltipContent>
                </Tooltip>

                {/* Module Navigation */}
                <div className="flex flex-col gap-2">
                    {navItems.map((item) => {
                        const isActive = item.id === activeModule;
                        return (
                            <Tooltip key={item.id}>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant={isActive ? 'default' : 'ghost'}
                                        size="icon"
                                        className={cn(
                                            'w-10 h-10',
                                            isActive && 'bg-primary text-primary-foreground'
                                        )}
                                        asChild
                                    >
                                        <Link href={item.href(workspaceId, productId)}>
                                            {item.icon}
                                            <span className="sr-only">{item.label}</span>
                                        </Link>
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    {item.label}
                                </TooltipContent>
                            </Tooltip>
                        );
                    })}
                </div>
            </nav>
        </TooltipProvider>
    );
}
