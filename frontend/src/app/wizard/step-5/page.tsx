/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Wizard Step 5 - Copy Generation / Completion
 * Final step of the wizard - generate marketing copy or complete the process.
 *
 * [INPUT]:
 * - URL Params: productId, workspaceId
 * - Store: selected image from step-4, generationResultUrls
 *
 * [LINK]:
 * - Store -> @/stores/wizardStore.ts
 * - Previous Step -> /wizard/step-4
 * - Next -> /dashboard (completion)
 *
 * [OUTPUT]:
 * - Generated marketing copy (optional)
 * - Navigation to dashboard
 *
 * [POS]: /frontend/src/app/wizard/step-5/page.tsx
 *
 * [PROTOCOL]:
 * 1. Validate URL params.
 * 2. Display selected image from step-4.
 * 3. Option to generate marketing copy or finish.
 * 4. Complete wizard and redirect to dashboard.
 *
 * === END HEADER ===
 */

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Check, Sparkles, Home } from 'lucide-react';
import { toast } from 'sonner';

import { useWizardStore } from '@/stores/wizardStore';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

export default function WizardCompletionPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { data: session } = useSession();

    const {
        generationResultUrls,
        reset
    } = useWizardStore();

    const productId = searchParams.get('productId');
    const workspaceId = searchParams.get('workspaceId');
    const selectedIndexParam = searchParams.get('selectedIndex');
    const selectedIndex = selectedIndexParam ? parseInt(selectedIndexParam, 10) : 0;

    // Validate params
    useEffect(() => {
        if (!productId || !workspaceId) {
            router.replace('/dashboard');
            return;
        }
    }, [productId, workspaceId, router]);

    const selectedImageUrl = generationResultUrls[selectedIndex] || generationResultUrls[0];

    const handleBack = () => {
        router.push(`/wizard/step-4?productId=${productId}&workspaceId=${workspaceId}`);
    };

    const handleComplete = () => {
        toast.success('🎉 恭喜！商品图片生成完成');
        reset(); // Clear wizard state
        router.push('/dashboard');
    };

    return (
        <div className="container mx-auto px-4 py-8 max-w-4xl">
            {/* Header */}
            <div className="mb-8">
                <Button
                    variant="ghost"
                    onClick={handleBack}
                    className="mb-2 pl-0 hover:pl-2 transition-all"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    返回选择图片
                </Button>
                <h1 className="text-3xl font-bold">生成完成</h1>
                <p className="text-muted-foreground mt-1">
                    您的商品图片已生成完成
                </p>
            </div>

            {/* Success Card */}
            <Card className="p-8 mb-8">
                <div className="flex flex-col md:flex-row gap-8 items-center">
                    {/* Selected Image Preview */}
                    {selectedImageUrl && (
                        <div className="w-full md:w-1/2">
                            <div className="aspect-square rounded-xl overflow-hidden border-2 border-primary/20">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                    src={selectedImageUrl}
                                    alt="Selected result"
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                    )}

                    {/* Completion Message */}
                    <div className="w-full md:w-1/2 text-center md:text-left">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
                            <Check className="w-8 h-8 text-green-600 dark:text-green-400" />
                        </div>
                        <h2 className="text-2xl font-semibold mb-2">图片生成成功！</h2>
                        <p className="text-muted-foreground mb-6">
                            您选择的图片已保存。您可以返回工作台查看所有生成的素材，或继续生成更多商品图片。
                        </p>

                        <div className="flex flex-col sm:flex-row gap-3">
                            <Button onClick={handleComplete} size="lg" className="flex-1">
                                <Home className="w-4 h-4 mr-2" />
                                返回工作台
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={() => router.push(`/wizard/step-2?workspaceId=${workspaceId}`)}
                                className="flex-1"
                            >
                                <Sparkles className="w-4 h-4 mr-2" />
                                生成更多
                            </Button>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Tips */}
            <div className="bg-muted/50 rounded-xl p-6">
                <h3 className="font-medium mb-3">💡 接下来您可以：</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li>• 在工作台查看和管理所有生成的商品图片</li>
                    <li>• 下载图片用于电商平台上架</li>
                    <li>• 使用文案工作室生成配套的营销文案</li>
                    <li>• 继续为其他商品生成创意图片</li>
                </ul>
            </div>
        </div>
    );
}
