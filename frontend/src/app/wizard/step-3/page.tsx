/**
 * Wizard Step 3 - Style Selection & Generation Trigger Page
 * Story 2.1: User selects a visual style and triggers AI image generation
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { useWizardStore } from '@/stores/wizardStore';
import { generateImages, getJobStatus } from '@/lib/api/images';
import { StyleSelector } from '@/components/business/StyleSelector';
import { GenerationLoading } from '@/components/business/GenerationLoading';
import { Button } from '@/components/ui/button';

const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds

export default function StyleSelectionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const {
        currentProductId,
        currentWorkspaceId,
        currentAssetId,
        selectedCategory,
        selectedStyle,
        availableStyles,
        generationStatus,
        generationProgress,
        generationTaskId,
        generationError,
        setSelectedStyle,
        setGenerationStatus,
        setGenerationProgress,
        setGenerationTaskId,
        setGenerationError,
        setGenerationResultUrls,
        setCurrentProductId,
        setCurrentWorkspaceId,
        resetGeneration,
    } = useWizardStore();

    // Initialize from URL params on first load
    useEffect(() => {
        const productId = searchParams.get('productId');
        const workspaceId = searchParams.get('workspaceId');

        if (productId && !currentProductId) {
            setCurrentProductId(productId);
        }
        if (workspaceId && !currentWorkspaceId) {
            setCurrentWorkspaceId(workspaceId);
        }
    }, [searchParams, currentProductId, currentWorkspaceId, setCurrentProductId, setCurrentWorkspaceId]);

    // Redirect if required data is missing
    useEffect(() => {
        const productId = searchParams.get('productId');
        const workspaceId = searchParams.get('workspaceId');

        if ((!productId && !currentProductId) || (!workspaceId && !currentWorkspaceId)) {
            router.push('/wizard/step-2');
        }
    }, [currentProductId, currentWorkspaceId, router, searchParams]);

    // Poll job status when generation is in progress
    const pollStatus = useCallback(async () => {
        if (!generationTaskId || !currentWorkspaceId) return;

        try {
            const status = await getJobStatus(currentWorkspaceId, generationTaskId);
            setGenerationProgress(status.progress);

            if (status.status === 'completed') {
                setGenerationStatus('completed');
                setGenerationResultUrls(status.resultUrls || []);
                toast.success('图像生成完成！');

                // Clear polling
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                }

                // Navigate to next step after a short delay
                setTimeout(() => {
                    router.push(`/wizard/step-4?productId=${currentProductId}&workspaceId=${currentWorkspaceId}`);
                }, 1500);
            } else if (status.status === 'failed') {
                setGenerationStatus('failed');
                setGenerationError(status.errorMessage || '生成失败');
                toast.error('图像生成失败');

                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                }
            } else {
                setGenerationStatus(status.status as 'pending' | 'processing');
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, [generationTaskId, currentWorkspaceId, currentProductId, router, setGenerationProgress, setGenerationStatus, setGenerationResultUrls, setGenerationError]);

    // Start/stop polling based on generation status
    useEffect(() => {
        if ((generationStatus === 'pending' || generationStatus === 'processing') && generationTaskId) {
            pollIntervalRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);
            return () => {
                if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                }
            };
        }
    }, [generationStatus, generationTaskId, pollStatus]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (pollIntervalRef.current) {
                clearInterval(pollIntervalRef.current);
            }
        };
    }, []);

    const handleStyleSelect = (styleId: string) => {
        setSelectedStyle(styleId as typeof selectedStyle);
    };

    const handleGenerate = async () => {
        if (!selectedStyle || !currentProductId || !currentWorkspaceId || !currentAssetId || !selectedCategory) {
            toast.error('请先选择一个风格');
            return;
        }

        resetGeneration();
        setGenerationStatus('pending');

        try {
            const response = await generateImages(currentWorkspaceId, {
                styleId: selectedStyle,
                categoryId: selectedCategory,
                assetId: currentAssetId,
                productId: currentProductId,
            });

            setGenerationTaskId(response.taskId);
            setGenerationStatus('pending');
        } catch (error) {
            console.error('Generation error:', error);
            setGenerationStatus('failed');
            setGenerationError(error instanceof Error ? error.message : '生成请求失败');
            toast.error('生成请求失败');
        }
    };

    const handleRetry = () => {
        resetGeneration();
    };

    const handleBack = () => {
        router.push(`/wizard/step-2?assetId=${currentAssetId}&workspaceId=${currentWorkspaceId}`);
    };

    const isGenerating = generationStatus !== 'idle' && generationStatus !== 'completed';

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Generation Loading Overlay */}
            {isGenerating && (
                <GenerationLoading
                    status={generationStatus}
                    progress={generationProgress}
                    errorMessage={generationError}
                    onRetry={handleRetry}
                />
            )}

            {/* Header */}
            <div className="mb-8">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="mb-4"
                    disabled={isGenerating}
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    返回
                </Button>

                <h1 className="text-3xl font-bold mb-2">选择视觉风格</h1>
                <p className="text-muted-foreground">
                    选择一种视觉风格，AI 将根据您的选择生成精美的产品图像
                </p>
            </div>

            {/* Style Selector */}
            <div className="mb-8">
                <StyleSelector
                    styles={availableStyles}
                    selectedStyle={selectedStyle}
                    onSelect={handleStyleSelect}
                    disabled={isGenerating}
                />
            </div>

            {/* Generate Button */}
            <div className="flex justify-center">
                <Button
                    size="lg"
                    onClick={handleGenerate}
                    disabled={!selectedStyle || isGenerating}
                    className="px-8 py-6 text-lg gap-2"
                >
                    <Sparkles className="w-5 h-5" />
                    开始生成
                </Button>
            </div>

            {/* Style Description */}
            {selectedStyle && (
                <div className="mt-8 text-center">
                    <p className="text-muted-foreground">
                        已选择: <span className="font-medium text-foreground">
                            {availableStyles.find(s => s.id === selectedStyle)?.name}
                        </span>
                    </p>
                </div>
            )}
        </div>
    );
}
