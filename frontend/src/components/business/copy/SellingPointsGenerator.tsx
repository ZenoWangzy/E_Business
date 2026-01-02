'use client';

/**
 * SellingPointsGenerator Component
 * 
 * Generates product selling points with AI assistance.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { List } from 'lucide-react';
import { ConfigurationControls } from './ConfigurationControls';
import { CopyResultCard } from './CopyResultCard';
import { GenerationProgress } from './GenerationProgress';
import {
    useCopyStudio,
    useCopyResults,
    useCopyIsGenerating,
    type CopyResult,
} from '@/hooks/useCopyStudio';

export interface SellingPointsGeneratorProps {
    workspaceId: string;
    productId: string;
}

export function SellingPointsGenerator({ workspaceId, productId }: SellingPointsGeneratorProps) {
    const { addResult, setIsGenerating } = useCopyStudio();
    const results = useCopyResults();
    const isGenerating = useCopyIsGenerating();

    const sellingPointsResults = results.filter((r: CopyResult) => r.type === 'sellingPoints');
    const [additionalContext, setAdditionalContext] = React.useState('');

    const handleGenerate = async () => {
        setIsGenerating(true);

        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));

            const mockSellingPoints = [
                '✓ 优质材料精选，品质卓越保障\n✓ 专业工艺打造，细节完美呈现\n✓ 安全认证通过，使用更安心\n✓ 贴心售后服务，无忧购物体验',
                '• 高效能设计 - 提升使用效率50%\n• 人体工学 - 符合人体工程学设计\n• 耐用持久 - 使用寿命长达5年\n• 环保材质 - 绿色环保无污染',
                '【核心卖点】\n1. 创新技术加持\n2. 多功能一体化\n3. 时尚外观设计\n4. 性价比之选',
            ];

            mockSellingPoints.forEach((points, index) => {
                addResult({
                    id: `sp-${Date.now()}-${index}`,
                    type: 'sellingPoints',
                    content: points,
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
                        <List className="h-5 w-5 text-primary" />
                        卖点生成
                    </CardTitle>
                    <CardDescription>
                        提炼产品核心卖点，突出产品优势和价值
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <ConfigurationControls disabled={isGenerating} />

                    <div className="space-y-2">
                        <Label htmlFor="sp-context">产品特点（可选）</Label>
                        <Textarea
                            id="sp-context"
                            placeholder="描述产品的独特功能、优势或用户痛点解决方案..."
                            value={additionalContext}
                            onChange={(e) => setAdditionalContext(e.target.value)}
                            disabled={isGenerating}
                            rows={3}
                            data-testid="sp-context-input"
                        />
                    </div>

                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full"
                        size="lg"
                        data-testid="generate-selling-points-button"
                    >
                        <List className="h-4 w-4 mr-2" />
                        {isGenerating ? '生成中...' : '生成卖点'}
                    </Button>
                </CardContent>
            </Card>

            <GenerationProgress isGenerating={isGenerating} message="AI 正在提炼卖点..." />

            {sellingPointsResults.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                        生成结果 ({sellingPointsResults.length})
                    </h3>
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-3 pr-4">
                            {sellingPointsResults.map((result: CopyResult) => (
                                <CopyResultCard key={result.id} result={result} />
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}

            {sellingPointsResults.length === 0 && !isGenerating && (
                <div className="text-center py-12 text-muted-foreground">
                    <List className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>点击"生成卖点"开始创作</p>
                </div>
            )}
        </div>
    );
}
