/**
 * === HIGH-INTEGRITY HEADER ===
 *
 * [IDENTITY]: Studio Selection Cards
 * Client component for AI studio navigation cards on Dashboard.
 *
 * [INPUT]:
 * - User Interaction: Click on studio card
 *
 * [LINK]:
 * - Context -> @/components/workspace/WorkspaceContext.tsx
 * - Toast -> sonner
 *
 * [OUTPUT]:
 * - Scrolls to file upload section
 * - Shows toast notification
 *
 * [POS]: /frontend/src/components/business/StudioCards.tsx
 *
 * [PROTOCOL]:
 * 1. Checks for selected workspace before proceeding.
 * 2. Guides user to file upload section for new product creation.
 *
 * === END HEADER ===
 */
'use client';

import { useWorkspace } from '@/components/workspace';

import { toast } from 'sonner';
import { useWizardStore } from '@/stores/wizardStore';
import { useRouter } from 'next/navigation';

type StudioType = 'visual' | 'copy' | 'video';

interface StudioCardInfo {
    title: string;
    desc: string;
    type: StudioType;
}

const STUDIO_CARDS: StudioCardInfo[] = [
    { title: 'AI 视觉工作室', desc: '生成产品图片和主图', type: 'visual' },
    { title: 'AI 文案工作室', desc: '创作产品描述和标题', type: 'copy' },
    { title: 'AI 视频工作室', desc: '制作产品视频内容', type: 'video' },
];

export function StudioCards() {
    const { currentWorkspace } = useWorkspace();
    const router = useRouter();
    const { currentAssetId, nextStep, setCurrentStep, setCurrentWorkspaceId } = useWizardStore();

    const handleStudioClick = (studioType: StudioType) => {
        // Check if workspace is selected
        if (!currentWorkspace) {
            toast.error('请先选择一个工作区');
            return;
        }

        // Check if file is uploaded (currentAssetId is set)
        if (currentAssetId) {
            // Update step in store just in case
            setCurrentStep(2);
            // Sync workspace ID to store to satisfy step-2 validation
            setCurrentWorkspaceId(currentWorkspace.id);
            // Navigate to Step 2 (Product Category Selection)
            // CRITICAL: Pass params in URL to survive hydration race condition
            router.push(`/wizard/step-2?assetId=${currentAssetId}&workspaceId=${currentWorkspace.id}`);
            return;
        }

        // Scroll to file upload section
        const uploadSection = document.getElementById('file-upload-section');
        if (uploadSection) {
            uploadSection.scrollIntoView({ behavior: 'smooth' });
        }

        // Show guidance toast
        toast.info('请先上传产品文件，然后通过向导创建产品');
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {STUDIO_CARDS.map((item) => (
                <div
                    key={item.title}
                    onClick={() => handleStudioClick(item.type)}
                    className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:border-violet-500/50 transition-colors cursor-pointer group"
                >
                    <h3 className="text-lg font-semibold text-white group-hover:text-violet-400 transition-colors">
                        {item.title}
                    </h3>
                    <p className="text-sm text-neutral-400 mt-2">{item.desc}</p>
                </div>
            ))}
        </div>
    );
}
