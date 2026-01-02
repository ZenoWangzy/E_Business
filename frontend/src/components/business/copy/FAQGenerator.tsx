'use client';

/**
 * FAQGenerator Component
 * 
 * Generates product FAQ with AI assistance.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { HelpCircle } from 'lucide-react';
import { ConfigurationControls } from './ConfigurationControls';
import { CopyResultCard } from './CopyResultCard';
import { GenerationProgress } from './GenerationProgress';
import {
    useCopyStudio,
    useCopyResults,
    useCopyIsGenerating,
    type CopyResult,
} from '@/hooks/useCopyStudio';

export interface FAQGeneratorProps {
    workspaceId: string;
    productId: string;
}

export function FAQGenerator({ workspaceId, productId }: FAQGeneratorProps) {
    const { addResult, setIsGenerating } = useCopyStudio();
    const results = useCopyResults();
    const isGenerating = useCopyIsGenerating();

    const faqResults = results.filter((r: CopyResult) => r.type === 'faq');
    const [additionalContext, setAdditionalContext] = React.useState('');

    const handleGenerate = async () => {
        setIsGenerating(true);

        try {
            await new Promise((resolve) => setTimeout(resolve, 1500));

            const mockFAQs = [
                'Q: 这款产品的材质是什么？\nA: 我们采用优质环保材料，经过严格质检，安全可靠。\n\nQ: 支持退换货吗？\nA: 是的，7天无理由退换，15天质量问题包换。\n\nQ: 发货时间是多久？\nA: 下单后24小时内发货，顺丰/京东物流配送。',
                'Q: 产品保修多久？\nA: 全国联保，享受一年质保服务。\n\nQ: 如何联系售后？\nA: 可通过旺旺客服或拨打400热线获取帮助。\n\nQ: 有安装服务吗？\nA: 提供详细图文教程，也可预约上门安装。',
            ];

            mockFAQs.forEach((faq, index) => {
                addResult({
                    id: `faq-${Date.now()}-${index}`,
                    type: 'faq',
                    content: faq,
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
                        <HelpCircle className="h-5 w-5 text-primary" />
                        FAQ 生成
                    </CardTitle>
                    <CardDescription>
                        生成常见问题解答，提升用户购买信心
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <ConfigurationControls disabled={isGenerating} />

                    <div className="space-y-2">
                        <Label htmlFor="faq-context">常见问题主题（可选）</Label>
                        <Textarea
                            id="faq-context"
                            placeholder="指定需要覆盖的问题类型，如：发货、退换货、保修、使用方法..."
                            value={additionalContext}
                            onChange={(e) => setAdditionalContext(e.target.value)}
                            disabled={isGenerating}
                            rows={3}
                            data-testid="faq-context-input"
                        />
                    </div>

                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full"
                        size="lg"
                        data-testid="generate-faq-button"
                    >
                        <HelpCircle className="h-4 w-4 mr-2" />
                        {isGenerating ? '生成中...' : '生成 FAQ'}
                    </Button>
                </CardContent>
            </Card>

            <GenerationProgress isGenerating={isGenerating} message="AI 正在生成 FAQ..." />

            {faqResults.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                        生成结果 ({faqResults.length})
                    </h3>
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-3 pr-4">
                            {faqResults.map((result: CopyResult) => (
                                <CopyResultCard key={result.id} result={result} />
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}

            {faqResults.length === 0 && !isGenerating && (
                <div className="text-center py-12 text-muted-foreground">
                    <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>点击"生成 FAQ"开始创作</p>
                </div>
            )}
        </div>
    );
}
