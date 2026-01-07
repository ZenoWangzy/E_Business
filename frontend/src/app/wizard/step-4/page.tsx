/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Wizard Step 4 - Result Selection
 * Display generated images and allow user to select one for the next step.
 *
 * Story关联: Story 2.1 - generation result display
 *
 * [INPUT]:
 * - URL Params: productId, workspaceId
 * - Store: generationResultUrls, generationStatus
 *
 * [LINK]:
 * - Store -> @/stores/wizardStore.ts
 * - Previous Step -> /wizard/step-3
 * - Next Step -> /wizard/step-5 (or dashboard for now)
 *
 * [OUTPUT]:
 * - Selected image asset (potentially)
 * - Navigation
 *
 * [POS]: /frontend/src/app/wizard/step-4/page.tsx
 *
 * [PROTOCOL]:
 * 1. Validate URL params.
 * 2. Check store state; if empty/idle, try to fetch job status or redirect to step-3.
 * 3. Display images in a grid.
 * 4. Allow "Retry" (back to step 3) or "Next".
 *
 * === END HEADER ===
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, RefreshCw, Check, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

import { useWizardStore } from '@/stores/wizardStore';
import { getJobStatus } from '@/lib/api/images';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';

export default function ResultSelectionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();

    const {
        currentProductId,
        currentWorkspaceId,
        generationTaskId,
        generationResultUrls,
        generationStatus,
        setGenerationResultUrls,
        setGenerationStatus,
        setGenerationError
    } = useWizardStore();

    const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);
    const [isPolling, setIsPolling] = useState(false);

    // Initial check and hydration
    useEffect(() => {
        const productId = searchParams.get('productId');
        const workspaceId = searchParams.get('workspaceId');

        if (!productId || !workspaceId) {
            router.replace('/dashboard');
            return;
        }

        // If we have no results but have a task ID, try to recover status
        if (generationResultUrls.length === 0 && generationTaskId && workspaceId) {
            const token = (session?.user as any)?.accessToken;
            if (token) {
                recoverJobStatus(workspaceId, generationTaskId, token);
            }
        } else if (generationResultUrls.length === 0 && !generationTaskId) {
            // No results and no task ID -> redirect back to generation
            toast.error('未找到生成结果，请重新生成');
            router.replace(`/wizard/step-3?productId=${productId}&workspaceId=${workspaceId}`);
        }
    }, [searchParams, generationResultUrls.length, generationTaskId, session]);

    const recoverJobStatus = async (workspaceId: string, taskId: string, token: string) => {
        try {
            setIsPolling(true);
            const status = await getJobStatus(workspaceId, taskId, token);

            if (status.status === 'completed' && status.resultUrls) {
                setGenerationResultUrls(status.resultUrls);
                setGenerationStatus('completed');
            } else if (status.status === 'failed') {
                setGenerationStatus('failed');
                setGenerationError(status.errorMessage || '生成失败');
                toast.error('任务执行失败');
            }
        } catch (error) {
            console.error('Failed to recover job status:', error);
            toast.error('无法获取任务状态');
        } finally {
            setIsPolling(false);
        }
    };

    const handleSelect = (index: number) => {
        setSelectedImageIndex(index);
    };

    const handleRetry = () => {
        // Go back to step 3 to change style or regenerate
        router.push(`/wizard/step-3?productId=${currentProductId}&workspaceId=${currentWorkspaceId}`);
    };

    const handleNext = () => {
        if (selectedImageIndex === null) {
            toast.error('请先选择一张满意的图片');
            return;
        }

        const productId = searchParams.get('productId');
        const workspaceId = searchParams.get('workspaceId');

        // Navigate to step-5 with selected image index
        router.push(`/wizard/step-5?productId=${productId}&workspaceId=${workspaceId}&selectedIndex=${selectedImageIndex}`);
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-6xl">
            {/* Header */}
            <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <Button
                        variant="ghost"
                        onClick={handleRetry}
                        className="mb-2 pl-0 hover:pl-2 transition-all"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        返回调整风格
                    </Button>
                    <h1 className="text-3xl font-bold">选择生成结果</h1>
                    <p className="text-muted-foreground mt-1">
                        点击选择您最满意的图片，用于后续文案生成
                    </p>
                </div>

                <div className="flex gap-4">
                    <Button variant="outline" onClick={handleRetry}>
                        <RefreshCw className="w-4 h-4 mr-2" />
                        重新生成
                    </Button>
                    <Button
                        onClick={handleNext}
                        disabled={selectedImageIndex === null}
                        className="min-w-[120px]"
                    >
                        下一步
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </div>
            </div>

            {/* Content Grid */}
            {isPolling ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="aspect-square rounded-xl overflow-hidden">
                            <Skeleton className="w-full h-full" />
                        </div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Render Results */}
                    {generationResultUrls.map((url, index) => (
                        <Card
                            key={index}
                            className={`
                                group relative aspect-square rounded-xl overflow-hidden cursor-pointer border-2 transition-all
                                ${selectedImageIndex === index
                                    ? 'border-primary ring-2 ring-primary ring-offset-2'
                                    : 'border-transparent hover:border-muted-foreground/30'
                                }
                            `}
                            onClick={() => handleSelect(index)}
                        >
                            {/* Image */}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={url}
                                alt={`Generated result ${index + 1}`}
                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />

                            {/* Selection Overlay */}
                            <div className={`
                                absolute inset-0 bg-black/20 transition-opacity duration-200 flex items-center justify-center
                                ${selectedImageIndex === index ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                            `}>
                                {selectedImageIndex === index && (
                                    <div className="bg-primary text-primary-foreground p-3 rounded-full shadow-lg transform scale-100 transition-transform">
                                        <Check className="w-6 h-6" />
                                    </div>
                                )}
                            </div>
                        </Card>
                    ))}

                    {/* Empty State protection */}
                    {!isPolling && generationResultUrls.length === 0 && (
                        <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl">
                            <p className="text-muted-foreground mb-4">暂无生成结果</p>
                            <Button onClick={handleRetry}>返回生成</Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
