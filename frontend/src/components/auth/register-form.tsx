/**
[IDENTITY]: Register Form Component
User Registration Interface with Auto-login.

[INPUT]:
- User Registration(Form Submit).

[LINK]:
- NextAuth -> next-auth/react
- UI_Button -> ../ui/button.tsx
- UI_Input -> ../ui/input.tsx
- Backend_API -> /api/v1/auth/register

[OUTPUT]: Registration + Auto-login + Redirect to /onboarding.
[POS]: /frontend/src/components/auth/register-form.tsx

[PROTOCOL]:
1. **Security**: Validate password strength on client-side before submit.
2. **Auto-login**: Call signIn('credentials') after successful registration.
3. **Routing**: Redirect to `/onboarding` on success.
 */
"use client";

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function RegisterForm() {
    const router = useRouter()
    const [name, setName] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [confirmPassword, setConfirmPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // API URL with fallback
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        // Client-side name validation
        const trimmedName = name.trim()
        if (trimmedName.length < 2 || trimmedName.length > 50) {
            setError("姓名长度需要在 2-50 个字符之间")
            setIsLoading(false)
            return
        }

        // Client-side password validation
        if (password.length < 8) {
            setError("密码至少需要8个字符")
            setIsLoading(false)
            return
        }

        const hasNumberOrSpecial = /[\d\W]/.test(password)
        if (!hasNumberOrSpecial) {
            setError("密码需要包含至少一个数字或特殊字符")
            setIsLoading(false)
            return
        }

        // Confirm password validation
        if (password !== confirmPassword) {
            setError("两次输入的密码不一致")
            setIsLoading(false)
            return
        }

        try {
            // Step 1: Register user
            const response = await fetch(`${apiUrl}/api/v1/auth/register`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password, name: trimmedName }),
            })

            if (!response.ok) {
                const data = await response.json()
                setError(data.detail || "注册失败，请重试")
                setIsLoading(false)
                return
            }

            // Step 2: Auto-login using signIn
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            })

            if (result?.error) {
                // Registration succeeded but login failed
                setError("注册成功，请手动登录")
                setIsLoading(false)
                // Optionally redirect to login page
                setTimeout(() => router.push("/login"), 2000)
            } else {
                // Success: redirect to onboarding
                router.push("/onboarding")
            }
        } catch {
            setError("注册失败，请重试")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Card className="border-neutral-700/50 bg-neutral-900/80 backdrop-blur-xl shadow-2xl">
            <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold tracking-tight text-white">
                    创建账户
                </CardTitle>
                <CardDescription className="text-neutral-400">
                    注册以开始使用
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <form onSubmit={handleRegister} className="space-y-4">
                    {error && (
                        <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                            {error}
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-neutral-200">
                            姓名
                        </Label>
                        <Input
                            id="name"
                            type="text"
                            placeholder="张三"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            disabled={isLoading}
                            className="border-neutral-700 bg-neutral-800/50 text-white placeholder:text-neutral-500 focus:border-violet-500 focus:ring-violet-500/20"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-neutral-200">
                            邮箱
                        </Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            disabled={isLoading}
                            className="border-neutral-700 bg-neutral-800/50 text-white placeholder:text-neutral-500 focus:border-violet-500 focus:ring-violet-500/20"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="password" className="text-neutral-200">
                            密码
                        </Label>
                        <Input
                            id="password"
                            type="password"
                            placeholder="至少8个字符，包含数字或特殊字符"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            className="border-neutral-700 bg-neutral-800/50 text-white placeholder:text-neutral-500 focus:border-violet-500 focus:ring-violet-500/20"
                        />
                        <p className="text-xs text-neutral-500">
                            密码至少8个字符，需包含数字或特殊字符
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-neutral-200">
                            确认密码
                        </Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="再次输入密码"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={isLoading}
                            className="border-neutral-700 bg-neutral-800/50 text-white placeholder:text-neutral-500 focus:border-violet-500 focus:ring-violet-500/20"
                        />
                    </div>
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-violet-500/25 transition-all duration-200"
                    >
                        {isLoading ? (
                            <span className="flex items-center">
                                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                注册中...
                            </span>
                        ) : (
                            "注册"
                        )}
                    </Button>
                </form>

                {/* Link to Login */}
                <div className="text-center text-sm text-neutral-400">
                    已有账户？{" "}
                    <Link
                        href="/login"
                        className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
                    >
                        登录
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}
