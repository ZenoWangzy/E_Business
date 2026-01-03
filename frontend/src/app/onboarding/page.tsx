/**
 * [IDENTITY]: Onboarding Page (服务器组件)
 * 工作区创建引导页，服务器端进行认证检查
 * 
 * [INPUT]: 
 *   - session (from auth())
 * 
 * [LINK]:
 *   - Auth -> @/auth (auth)
 *   - Form Component -> ./components/OnboardingForm
 * 
 * [OUTPUT]: OnboardingForm 或重定向
 * [POS]: /frontend/src/app/onboarding/page.tsx
 * 
 * [PROTOCOL]:
 * 1. 使用服务器组件避免 hydration 问题
 * 2. 使用 redirect() 而非 router.push() 避免 setState in render
 * 3. 将表单逻辑委托给客户端组件
 */

import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import OnboardingForm from './components/OnboardingForm';

export default async function OnboardingPage() {
    const session = await auth();

    // 服务器端重定向，无 hydration 问题
    if (!session?.user) {
        redirect('/login');
    }

    // 渲染纯客户端表单
    return (
        <OnboardingForm
            userEmail={session.user.email || ''}
            accessToken={session.user.accessToken || ''}
        />
    );
}
