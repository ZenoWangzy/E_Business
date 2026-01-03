/**
 * [IDENTITY]: Edge Middleware
 * Protected Route Enforcement & Authentication Check.
 * Runs on Edge Runtime before the request is processed by the page.
 *
 * [INPUT]: NextRequest (Incoming HTTP Request)
 * [LINK]:
 *   - AuthConfig -> @/auth.ts
 *   - AppConfig -> @/lib/config.ts
 *
 * [OUTPUT]: NextResponse (Redirect or Rewrite)
 * [POS]: /frontend/src/middleware.ts (Edge)
 *
 * [PROTOCOL]:
 * 1. Do not import heavy libraries here (e.g. database clients); runtime is limited.
 * 2. Changes to protected routes list must be synced with `backend/app/main.py` CORS if necessary.
 */
import { auth } from "@/auth"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// 路由配置
const ROUTE_CONFIG = {
    public: ['/login', '/register', '/', '/api/auth'],
    protected: ['/dashboard', '/workspace', '/wizard', '/editor'],
    onboarding: ['/onboarding'],
} as const;

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const pathname = req.nextUrl.pathname

    // 检查是否为公开路由
    const isPublicRoute = ROUTE_CONFIG.public.some(route =>
        pathname === route || pathname.startsWith(route)
    )

    // 检查是否为受保护路由
    const isProtectedRoute = ROUTE_CONFIG.protected.some(route =>
        pathname.startsWith(route)
    )

    // 检查是否为 onboarding 路由
    const isOnboardingRoute = ROUTE_CONFIG.onboarding.some(route =>
        pathname.startsWith(route)
    )

    // 未登录访问受保护路由或 onboarding → 重定向到登录
    if (!isLoggedIn && (isProtectedRoute || isOnboardingRoute)) {
        const loginUrl = new URL("/login", req.url)
        loginUrl.searchParams.set("callbackUrl", pathname)
        return NextResponse.redirect(loginUrl)
    }

    // 已登录访问登录页 → 重定向到 dashboard
    if (pathname === "/login" && isLoggedIn) {
        return NextResponse.redirect(new URL("/dashboard", req.url))
    }

    return NextResponse.next()
})

// Configure which routes use this middleware
export const config = {
    matcher: [
        /*
         * Match all request paths except:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         * - api routes (handled by NextAuth)
         */
        "/((?!_next/static|_next/image|favicon.ico|api).*)",
    ],
}
