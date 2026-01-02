'use client';

/**
 * TitleGenerator Component
 * 
 * Generates product titles with AI assistance.
 * Includes configuration controls, generate button, and results display.
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles } from 'lucide-react';
import { ConfigurationControls } from './ConfigurationControls';
import { CopyResultCard } from './CopyResultCard';
import { GenerationProgress } from './GenerationProgress';
import {
    useCopyStudio,
    useCopyResults,
    useCopyIsGenerating,
    useCopyConfig,
    type CopyResult,
} from '@/hooks/useCopyStudio';
import { generateCopy, getCopyJobStatus } from '@/lib/api/copy';
import { toast } from 'sonner';

export interface TitleGeneratorProps {
    workspaceId: string;
    productId: string;
}

export function TitleGenerator({ workspaceId, productId }: TitleGeneratorProps) {
    const { addResult, setIsGenerating } = useCopyStudio();
    const results = useCopyResults();
    const isGenerating = useCopyIsGenerating();
    const config = useCopyConfig();

    // Filter results for titles only
    const titleResults = results.filter((r: CopyResult) => r.type === 'titles');

    // Additional context input
    const [additionalContext, setAdditionalContext] = React.useState('');

    const handleGenerate = async () => {
        setIsGenerating(true);

        try {
            // Call real API to trigger generation
            const response = await generateCopy(
                workspaceId,
                productId,
                'titles',
                config,
                additionalContext ? [additionalContext] : []
            );

            // Poll for results
            const pollInterval = setInterval(async () => {
                try {
                    const status = await getCopyJobStatus(workspaceId, response.taskId);

                    if (status.status === 'completed' && status.results) {
                        clearInterval(pollInterval);
                        // Add results to store
                        status.results.forEach((title: string, index: number) => {
                            addResult({
                                id: `title-${Date.now()}-${index}`,
                                type: 'titles',
                                content: title,
                                createdAt: new Date(),
                                isFavorite: false,
                            });
                        });
                        setIsGenerating(false);
                        toast.success(`成功生成 ${status.results.length} 个标题`);
                    } else if (status.status === 'failed') {
                        clearInterval(pollInterval);
                        setIsGenerating(false);
                        toast.error(status.error || '生成失败');
                    }
                } catch (pollError) {
                    clearInterval(pollInterval);
                    setIsGenerating(false);
                    toast.error(pollError instanceof Error ? pollError.message : '状态查询失败');
                }
            }, 1000);

            // Timeout after 60 seconds
            setTimeout(() => {
                clearInterval(pollInterval);
                if (isGenerating) {
                    setIsGenerating(false);
                    toast.error('生成超时，请稍后重试');
                }
            }, 60000);

        } catch (error) {
            setIsGenerating(false);
            toast.error(error instanceof Error ? error.message : '生成请求失败');
        }
    };

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-primary" />
                        标题生成
                    </CardTitle>
                    <CardDescription>
                        根据产品信息生成吸引眼球的标题，支持多种风格和目标受众
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Configuration */}
                    <ConfigurationControls disabled={isGenerating} />

                    {/* Additional Context */}
                    <div className="space-y-2">
                        <Label htmlFor="title-context">补充信息（可选）</Label>
                        <Textarea
                            id="title-context"
                            placeholder="添加产品卖点、促销信息或其他需要突出的内容..."
                            value={additionalContext}
                            onChange={(e) => setAdditionalContext(e.target.value)}
                            disabled={isGenerating}
                            rows={3}
                            data-testid="title-context-input"
                        />
                    </div>

                    {/* Generate Button */}
                    <Button
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full"
                        size="lg"
                        data-testid="generate-titles-button"
                    >
                        <Sparkles className="h-4 w-4 mr-2" />
                        {isGenerating ? '生成中...' : '生成标题'}
                    </Button>
                </CardContent>
            </Card>

            {/* Generation Progress */}
            <GenerationProgress isGenerating={isGenerating} message="AI 正在生成标题..." />

            {/* Results */}
            {titleResults.length > 0 && (
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                        生成结果 ({titleResults.length})
                    </h3>
                    <ScrollArea className="h-[400px]">
                        <div className="space-y-3 pr-4">
                            {titleResults.map((result: CopyResult) => (
                                <CopyResultCard key={result.id} result={result} />
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            )}

            {/* Empty State */}
            {titleResults.length === 0 && !isGenerating && (
                <div className="text-center py-12 text-muted-foreground">
                    <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>点击"生成标题"开始创作</p>
                </div>
            )}
        </div>
    );
}
