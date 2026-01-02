/**
[IDENTITY]: Register Page
Public registration page route.

[INPUT]:
- None (Public route).

[LINK]:
- RegisterForm -> @/components/auth/register-form

[OUTPUT]: Registration UI.
[POS]: /frontend/src/app/(auth)/register/page.tsx

[PROTOCOL]:
1. **Layout**: Inherits from (auth) layout.
2. **Access**: Public, no authentication required.
 */
import { RegisterForm } from "@/components/auth/register-form"

export const metadata = {
    title: "注册 - E_Business",
    description: "创建新账户",
}

export default function RegisterPage() {
    return (
        <div className="flex min-h-screen items-center justify-center p-4">
            <div className="w-full max-w-md">
                <RegisterForm />
            </div>
        </div>
    )
}
