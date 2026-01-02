'use client';

/**
 * CopyGeneratorTabs Component
 * 
 * Tabbed interface for different copy generation types:
 * Titles, Selling Points, FAQ, Descriptions
 */

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Type,
    List,
    HelpCircle,
    FileText
} from 'lucide-react';
import { useCopyStudio, CopyType } from '@/hooks/useCopyStudio';
import { TitleGenerator } from './TitleGenerator';
import { SellingPointsGenerator } from './SellingPointsGenerator';
import { FAQGenerator } from './FAQGenerator';
import { DescriptionGenerator } from './DescriptionGenerator';

export interface CopyGeneratorTabsProps {
    workspaceId: string;
    productId: string;
}

interface TabConfig {
    id: CopyType;
    label: string;
    icon: React.ReactNode;
    component: React.ComponentType<{ workspaceId: string; productId: string }>;
}

const tabs: TabConfig[] = [
    {
        id: 'titles',
        label: 'Titles',
        icon: <Type className="h-4 w-4" />,
        component: TitleGenerator,
    },
    {
        id: 'sellingPoints',
        label: 'Selling Points',
        icon: <List className="h-4 w-4" />,
        component: SellingPointsGenerator,
    },
    {
        id: 'faq',
        label: 'FAQ',
        icon: <HelpCircle className="h-4 w-4" />,
        component: FAQGenerator,
    },
    {
        id: 'descriptions',
        label: 'Descriptions',
        icon: <FileText className="h-4 w-4" />,
        component: DescriptionGenerator,
    },
];

export function CopyGeneratorTabs({ workspaceId, productId }: CopyGeneratorTabsProps) {
    const { activeTab, setActiveTab } = useCopyStudio();

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold tracking-tight">AI Copywriting Studio</h1>
                <p className="text-muted-foreground">
                    Generate compelling product content with AI assistance
                </p>
            </div>

            {/* Tabs */}
            <Tabs
                value={activeTab}
                onValueChange={(value) => setActiveTab(value as CopyType)}
                className="space-y-4"
            >
                <TabsList className="grid w-full grid-cols-4">
                    {tabs.map((tab) => (
                        <TabsTrigger
                            key={tab.id}
                            value={tab.id}
                            className="flex items-center gap-2"
                        >
                            {tab.icon}
                            <span className="hidden sm:inline">{tab.label}</span>
                        </TabsTrigger>
                    ))}
                </TabsList>

                {tabs.map((tab) => (
                    <TabsContent key={tab.id} value={tab.id} className="space-y-4">
                        <tab.component workspaceId={workspaceId} productId={productId} />
                    </TabsContent>
                ))}
            </Tabs>
        </div>
    );
}
