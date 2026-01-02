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
import { StudioCards } from "@/components/business/StudioCards"

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

                    {/* Studio Selection Cards */}
                    <StudioCards />

                    {/* File Upload Section - Story 1.4 */}
                    <div id="file-upload-section" className="mt-8">
                        <div className="mb-4">
                            <h3 className="text-2xl font-bold text-white mb-2">开始创建</h3>
                            <p className="text-neutral-400">
                                上传您的产品文件，我们将引导您完成整个创建流程
                            </p>
                        </div>
                        <FileUploadSectionWrapper />
                    </div>
                </div >
            </main >
        </DashboardLayoutClient >
    )
}

