/**
[IDENTITY]: User Dashboard Home
Main Landing for Authenticated Users.

[INPUT]:
    - Auth Session.

[LINK]:
- Layout -> ./ DashboardLayoutClient.tsx
    - Widgets -> ../../ components / business/*

[OUTPUT]: Workspace Overview UI.
[POS]: /frontend/src/app/dashboard/page.tsx

[PROTOCOL]:
1. **Access Control**: Redirect unauthenticated users to `/login`.
2. **Personalization**: Display user-specific greetings and assets.
 */
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import DashboardLayoutClient from "./DashboardLayoutClient"
import FileUploadSectionWrapper from "@/components/business/FileUploadSectionWrapper"

export default async function DashboardPage() {
    const session = await auth()

    if (!session?.user) {
        redirect("/login")
    }

    return (
        <DashboardLayoutClient
            userEmail={session.user.email || ''}
            userName={session.user.name || undefined}
        >
            <main className="container mx-auto px-4 py-12">
                <div className="max-w-4xl mx-auto">
                    <h2 className="text-3xl font-bold text-white mb-2">
                        欢迎回来, {session.user.name || session.user.email}
                    </h2>
                    <p className="text-neutral-400 mb-8">
                        这是您的工作空间。开始创建精彩的内容吧！
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            { title: "AI 视觉工作室", desc: "生成产品图片和主图" },
                            { title: "AI 文案工作室", desc: "创作产品描述和标题" },
                            { title: "AI 视频工作室", desc: "制作产品视频内容" },
                        ].map((item) => (
                            <div
                                key={item.title}
                                className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/50 hover:border-violet-500/50 transition-colors cursor-pointer group"
                            >
                                <h3 className="text-lg font-semibold text-white group-hover:text-violet-400 transition-colors">
                                    {item.title}
                                </h3>
                                <p className="text-sm text-neutral-400 mt-2">{item.desc}</p>
                            </div>
                        ))}
                    </div>

                    {/* File Upload Section - Story 1.4 */}
<div className="mt-8">
    <FileUploadSectionWrapper />
</div>
                </div >
            </main >
        </DashboardLayoutClient >
    )
}
