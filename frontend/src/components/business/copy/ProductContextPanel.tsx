'use client';

/**
 * ProductContextPanel Component
 * 
 * Collapsible middle sidebar showing product context.
 * Displays: product metadata, parsed text, image thumbnails, quick actions.
 */

import React, { useEffect, useState } from 'react';
import {
    ChevronLeft,
    ChevronRight,
    FileText,
    Image,
    Package,
    ClipboardCopy,
    Loader2,
    AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { useCopyStudio } from '@/hooks/useCopyStudio';
import { getProduct } from '@/lib/api/products';
import type { Product } from '@/types/product';

export interface ParsedContent {
    sections: {
        title: string;
        content: string;
        images?: string[];
    }[];
}

export interface ProductContextPanelProps {
    productId: string;
    workspaceId: string;
    isCollapsed: boolean;
    onToggle: () => void;
}

export function ProductContextPanel({
    productId,
    workspaceId,
    isCollapsed,
    onToggle,
}: ProductContextPanelProps) {
    const { productContext, addToContext, setProductContext } = useCopyStudio();
    const [expandedSections, setExpandedSections] = React.useState<Set<number>>(
        new Set([0])
    );
    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch product data on mount
    useEffect(() => {
        async function fetchProduct() {
            if (!workspaceId || !productId) return;

            setLoading(true);
            setError(null);
            try {
                const data = await getProduct(workspaceId, productId);
                setProduct(data);
                // Update Zustand store with product context
                setProductContext({
                    name: data.name,
                    category: data.category || 'Uncategorized',
                    description: data.description || '',
                    features: [],
                });
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load product');
            } finally {
                setLoading(false);
            }
        }
        fetchProduct();
    }, [workspaceId, productId, setProductContext]);

    const toggleSection = (index: number) => {
        setExpandedSections((prev) => {
            const next = new Set(prev);
            if (next.has(index)) {
                next.delete(index);
            } else {
                next.add(index);
            }
            return next;
        });
    };

    const handleQuickReference = (content: string) => {
        addToContext(content);
    };

    // Build sections from real product data
    const sections: ParsedContent['sections'] = product ? [
        {
            title: '产品描述',
            content: product.description || '暂无描述',
            images: [],
        },
        {
            title: '基本信息',
            content: `名称: ${product.name}\n分类: ${product.category || '未分类'}\nID: ${product.id}`,
        },
    ] : [];

    return (
        <aside
            className={cn(
                'flex flex-col border-r border-border bg-muted/30 transition-all duration-300 shrink-0',
                isCollapsed ? 'w-0 overflow-hidden' : 'w-80'
            )}
            aria-label="Product Context"
        >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
                <div className={cn('flex items-center gap-2', isCollapsed && 'hidden')}>
                    <Package className="h-5 w-5 text-muted-foreground" />
                    <span className="font-semibold text-sm">Product Context</span>
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggle}
                    className="shrink-0"
                    aria-label={isCollapsed ? 'Expand context panel' : 'Collapse context panel'}
                >
                    {isCollapsed ? (
                        <ChevronRight className="h-4 w-4" />
                    ) : (
                        <ChevronLeft className="h-4 w-4" />
                    )}
                </Button>
            </div>

            {/* Content */}
            <ScrollArea className={cn('flex-1', isCollapsed && 'hidden')}>
                <div className="p-4 space-y-4">
                    {/* Loading State */}
                    {loading && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    )}

                    {/* Error State */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
                            <AlertCircle className="h-4 w-4 shrink-0" />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* Product Metadata */}
                    {product && !loading && (
                        <>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Package className="h-4 w-4" />
                                        {product.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary">{product.category || 'Uncategorized'}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        ID: {product.id.slice(0, 8)}...
                                    </p>
                                </CardContent>
                            </Card>

                            <Separator />

                            {/* Parsed Content Sections */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                                    产品信息
                                </h3>
                                {sections.map((section: ParsedContent['sections'][0], index: number) => (
                                    <Collapsible
                                        key={index}
                                        open={expandedSections.has(index)}
                                        onOpenChange={() => toggleSection(index)}
                                    >
                                        <CollapsibleTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                className="w-full justify-between p-2 h-auto"
                                            >
                                                <span className="flex items-center gap-2 text-sm">
                                                    <FileText className="h-4 w-4" />
                                                    {section.title}
                                                </span>
                                                <ChevronRight
                                                    className={cn(
                                                        'h-4 w-4 transition-transform',
                                                        expandedSections.has(index) && 'rotate-90'
                                                    )}
                                                />
                                            </Button>
                                        </CollapsibleTrigger>
                                        <CollapsibleContent className="px-2">
                                            <div className="rounded-md bg-muted p-3 text-xs font-mono whitespace-pre-wrap">
                                                {section.content}
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="mt-2 w-full text-xs"
                                                onClick={() => handleQuickReference(section.content)}
                                            >
                                                <ClipboardCopy className="h-3 w-3 mr-1" />
                                                添加到上下文
                                            </Button>
                                        </CollapsibleContent>
                                    </Collapsible>
                                ))}
                            </div>

                            <Separator />

                            {/* Image Thumbnails */}
                            <div className="space-y-2">
                                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Image className="h-4 w-4" />
                                    产品图片 (0)
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                    暂无上传图片
                                </p>
                            </div>
                        </>
                    )}
                </div>
            </ScrollArea>
        </aside>
    );
}
