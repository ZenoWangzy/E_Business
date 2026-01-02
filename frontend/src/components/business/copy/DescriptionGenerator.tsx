'use client';

/**
 * DescriptionGenerator Component
 * 
 * Generates product descriptions with AI assistance.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText } from 'lucide-react';
import { ConfigurationControls } from './ConfigurationControls';
import { CopyResultCard } from './CopyResultCard';
import { GenerationProgress } from './GenerationProgress';
import {
    useCopyStudio,
    useCopyResults,
    useCopyIsGenerating,
    type CopyResult,
} from '@/hooks/useCopyStudio';

export interface DescriptionGeneratorProps {
    workspaceId: string;
    productId: string;
}

export function DescriptionGenerator({ workspaceId, productId }: DescriptionGeneratorProps) {
    const { addResult, setIsGenerating } = useCopyStudio();
    const results = useCopyResults();
    const isGenerating = useCopyIsGenerating();

    const descriptionResults = results.filter((r: CopyResult) => r.type === 'descriptions');
    const [additionalContext, setAdditionalContext] = React.useState('');

    const handleGenerate = async () => {
        setIsGenerating(true);

        try {
            await new Promise((resolve) => setTimeout(resolve, 2000));

            const mockDescriptions = [
                '【产品亮点】\n精选优质材料，匠心工艺打造每一个细节。我们深知品质是用户的第一选择，因此从选材到生产的每一个环节都经过严格把控。\n\n【设计理念】\n简约而不简单，时尚与实用的完美结合。无论是日常使用还是特殊场合，都能展现您的独特品味。\n\n【贴心服务】\n7×24小时客服在线，为您解答任何疑问。30天无忧退换，让您购物无后顾之忧。',
                '这款产品专为追求品质生活的您而设计。\n\n采用行业领先技术，在保证卓越性能的同时，也注重环保和可持续发展。每一个细节都体现了我们对品质的不懈追求。\n\n无论您是资深用户还是新手小白，都能轻松上手。直观的操作界面，详细的使用指南，让您的使用体验更加顺畅。\n\n选择我们，就是选择放心。严格的品控标准，完善的售后体系，为您的每一次购买保驾护航。',
            ];

            mockDescriptions.forEach((desc, index) => {
                addResult({
                    id: `desc-${Date.now()}-${index}`,
                    type: 'descriptions',
                    content: desc,
                    createdAt: new Date(),
                    isFavorite: false,
                });
            });
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        详情描述
                    </CardTitle>
                    <CardDescription>
                        生成详细的产品描述，全面展示产品价值
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <ConfigurationControls disabled={isGenerating} />

                    <div className="space-y-2">
                        <Label htmlFor="desc-context">重点描述方向（可选）</Label>
                        <Textarea
                            id="desc-context"
                            placeholder="指定需要重点描述的内容，如：产品工艺、使用场景、对比优势..."
                            value={additionalContext}
                            onChange={(e) => setAdditionalContext(e.target.value)}
                            disabled={isGenerating}
                            rows={3}
                            data-testid="desc-context-input"
                        />
                    </div>

                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full"
                        size="lg"
                        data-testid="generate-description-button"
                    >
                        <FileText className="h-4 w-4 mr-2" />
                        {isGenerating ? '生成中...' : '生成描述'}
                    </Button>
                </CardContent>
            </Card>

            <GenerationProgress isGenerating={isGenerating} message="AI 正在生成产品描述..." />

            {descriptionResults.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                        生成结果 ({descriptionResults.length})
                    </h3>
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-3 pr-4">
                            {descriptionResults.map((result: CopyResult) => (
                                <CopyResultCard key={result.id} result={result} />
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}

            {descriptionResults.length === 0 && !isGenerating && (
                <div className="text-center py-12 text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>点击"生成描述"开始创作</p>
                </div>
            )}
        </div>
    );
}
