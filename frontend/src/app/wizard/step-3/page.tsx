/**
 * Wizard Step 3 - Style Selection & Generation Trigger Page
 * Story 2.1: User selects a visual style and triggers AI image generation
 *
 * Notes:
 * - Validates URL params (workspaceId/productId) as UUIDs.
 * - Hydrates missing wizard context (assetId/category) from Product API on reload/deep link.
 */

'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { useWizardStore } from '@/stores/wizardStore';
import { generateImages, getJobStatus } from '@/lib/api/images';
import { getProduct } from '@/lib/api/products';
import { isUuid } from '@/lib/utils';
import { StyleSelector } from '@/components/business/StyleSelector';
import { GenerationLoading } from '@/components/business/GenerationLoading';
import { Button } from '@/components/ui/button';

const POLL_INTERVAL_MS = 2000; // Poll every 2 seconds

export default function StyleSelectionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();
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
        setCurrentAssetId,
        setSelectedCategory,
        reset,
        resetGeneration,
    } = useWizardStore();

    // Initialize from URL params on first load
    useEffect(() => {
        const productIdParam = searchParams.get('productId');
        const workspaceIdParam = searchParams.get('workspaceId');

        // Validate critical params early
        if (productIdParam && !isUuid(productIdParam)) {
            setGenerationError('无效的 productId 参数');
            reset();
            router.replace('/dashboard');
            return;
        }
        if (workspaceIdParam && !isUuid(workspaceIdParam)) {
            setGenerationError('无效的 workspaceId 参数');
            reset();
            router.replace('/dashboard');
            return;
        }

        if (productIdParam && !currentProductId) {
            setCurrentProductId(productIdParam);
        }
        if (workspaceIdParam && !currentWorkspaceId) {
            setCurrentWorkspaceId(workspaceIdParam);
        }
    }, [searchParams, currentProductId, currentWorkspaceId, setCurrentProductId, setCurrentWorkspaceId, setGenerationError, reset, router]);

    // Redirect if required data is missing
    useEffect(() => {
        const productIdParam = searchParams.get('productId');
        const workspaceIdParam = searchParams.get('workspaceId');

        if ((!productIdParam && !currentProductId) || (!workspaceIdParam && !currentWorkspaceId)) {
            router.push('/wizard/step-2');
            return;
        }

        // If present, ensure UUID format
        const productId = currentProductId ?? productIdParam;
        const workspaceId = currentWorkspaceId ?? workspaceIdParam;

        if ((productId && !isUuid(productId)) || (workspaceId && !isUuid(workspaceId))) {
            setGenerationError('向导参数无效，请重新开始');
            reset();
            router.push('/dashboard');
        }
    }, [currentProductId, currentWorkspaceId, router, searchParams, setGenerationError, reset]);

    // Hydrate missing wizard context from Product API (supports page reload / deep links)
    useEffect(() => {
        const productIdParam = searchParams.get('productId');
        const workspaceIdParam = searchParams.get('workspaceId');
        const productId = currentProductId ?? productIdParam;
        const workspaceId = currentWorkspaceId ?? workspaceIdParam;

        if (!productId || !workspaceId) return;
        if (!isUuid(productId) || !isUuid(workspaceId)) return;

        const needsHydration = !currentAssetId || !selectedCategory;
        if (!needsHydration) return;

        let cancelled = false;

        (async () => {
            try {
                const product = await getProduct(workspaceId, productId);
                if (cancelled) return;

                if (product.workspaceId !== workspaceId) {
                    setGenerationError('产品不属于当前工作区');
                    reset();
                    router.replace('/dashboard');
                    return;
                }

                if (currentAssetId && product.originalAssetId !== currentAssetId) {
                    setGenerationError('产品上下文不一致，请重新开始');
                    reset();
                    router.replace('/dashboard');
                    return;
                }

                if (selectedCategory && product.category !== selectedCategory) {
                    setGenerationError('产品分类上下文不一致，请重新开始');
                    reset();
                    router.replace('/dashboard');
                    return;
                }

                if (!currentAssetId) {
                    setCurrentAssetId(product.originalAssetId);
                }

                if (!selectedCategory) {
                    setSelectedCategory(product.category);
                }
            } catch (error) {
                if (cancelled) return;
                setGenerationError(error instanceof Error ? error.message : '无法加载产品上下文');
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [currentProductId, currentWorkspaceId, currentAssetId, selectedCategory, searchParams, setCurrentAssetId, setSelectedCategory, setGenerationError, reset, router]);

    // Poll job status when generation is in progress
    const pollStatus = useCallback(async () => {
        if (!generationTaskId || !currentWorkspaceId) return;

        // Get token from session
        const token = (session?.user as any)?.accessToken;

        try {
            const status = await getJobStatus(currentWorkspaceId, generationTaskId, token);
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
    }, [generationTaskId, currentWorkspaceId, currentProductId, router, session, setGenerationProgress, setGenerationStatus, setGenerationResultUrls, setGenerationError]);

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
        if (!selectedStyle) {
            toast.error('请先选择一个风格');
            return;
        }
        if (!currentProductId || !currentWorkspaceId) {
            toast.error('缺少产品或工作区信息，请返回重试');
            return;
        }
        if (!currentAssetId || !selectedCategory) {
            toast.error('缺少产品上下文，请返回上一步重新选择');
            return;
        }

        resetGeneration();
        setGenerationStatus('pending');

        // Get token from session
        const token = (session?.user as any)?.accessToken;

        if (!token) {
            setGenerationStatus('failed');
            setGenerationError('未登录或登录已过期，请重新登录');
            toast.error('请重新登录');
            return;
        }

        try {
            const response = await generateImages(currentWorkspaceId, {
                styleId: selectedStyle,
                categoryId: selectedCategory,
                assetId: currentAssetId,
                productId: currentProductId,
            }, token);

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
