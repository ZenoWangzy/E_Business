/**
[IDENTITY]: Login Form Component
multi - Strategy Authentication Interface.

[INPUT]:
- User Interaction(Form Submit, OAuth Click).

[LINK]:
- NextAuth -> next - auth / react
    - UI_Button -> ../ ui / button.tsx
    - UI_Input -> ../ ui / input.tsx

    [OUTPUT]: Auth Action(Redirect or Error).
[POS]: /frontend/src / components / auth / login - form.tsx

[PROTOCOL]:
1. ** Security **: Do not persist passwords in state longer than necessary.
2. ** Feedback **: Show loading states and clear error messages.
3. ** Routing **: Redirect to `/dashboard` on success.
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

export function LoginForm() {
    const router = useRouter()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleCredentialsLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)
        setError(null)

        console.log('[LoginForm] Attempting login with email:', email)

        try {
            const result = await signIn("credentials", {
                email,
                password,
                redirect: false,
            })

            console.log('[LoginForm] signIn result:', JSON.stringify(result, null, 2))

            if (result?.error) {
                console.log('[LoginForm] Login error:', result.error)
                setError("邮箱或密码错误")
            } else {
                console.log('[LoginForm] Login successful, redirecting...')
                router.push("/dashboard")
            }
        } catch (err) {
            console.error('[LoginForm] Exception:', err)
            setError("登录失败，请重试")
        } finally {
            setIsLoading(false)
        }
    }

    const handleOAuthLogin = (provider: "google" | "github") => {
        setIsLoading(true)
        signIn(provider, { callbackUrl: "/dashboard" })
    }

    return (
        <Card className="border-neutral-700/50 bg-neutral-900/80 backdrop-blur-xl shadow-2xl">
            <CardHeader className="space-y-1 text-center">
                <CardTitle className="text-2xl font-bold tracking-tight text-white">
                    欢迎回来
                </CardTitle>
                <CardDescription className="text-neutral-400">
                    登录以访问您的工作空间
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* OAuth Buttons */}
                <div className="grid grid-cols-2 gap-3">
                    <Button
                        variant="outline"
                        onClick={() => handleOAuthLogin("google")}
                        disabled={isLoading}
                        className="border-neutral-700 bg-neutral-800/50 hover:bg-neutral-700/50 text-white"
                    >
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Google
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => handleOAuthLogin("github")}
                        disabled={isLoading}
                        className="border-neutral-700 bg-neutral-800/50 hover:bg-neutral-700/50 text-white"
                    >
                        <svg className="mr-2 h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        GitHub
                    </Button>
                </div>

                {/* Divider */}
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-neutral-700" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-neutral-900 px-2 text-neutral-400">或使用邮箱登录</span>
                    </div>
                </div>

                {/* Credentials Form */}
                <form onSubmit={handleCredentialsLogin} className="space-y-4">
                    {error && (
                        <div className="rounded-md bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                            {error}
                        </div>
                    )}
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
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
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
                                登录中...
                            </span>
                        ) : (
                            "登录"
                        )}
                    </Button>
                </form>

                {/* Link to Register */}
                <div className="text-center text-sm text-neutral-400">
                    还没有账户？{" "}
                    <Link
                        href="/register"
                        className="text-violet-400 hover:text-violet-300 font-medium transition-colors"
                    >
                        注册
                    </Link>
                </div>
            </CardContent>
        </Card>
    )
}
