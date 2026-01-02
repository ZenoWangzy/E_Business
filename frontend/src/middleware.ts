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

export default auth((req) => {
    const isLoggedIn = !!req.auth
    const pathname = req.nextUrl.pathname

    // Protected routes that require authentication
    const protectedRoutes = ["/dashboard"]
    const isProtectedRoute = protectedRoutes.some(route =>
        pathname.startsWith(route)
    )

    // Redirect to login if accessing protected route without auth
    if (isProtectedRoute && !isLoggedIn) {
        const loginUrl = new URL("/login", req.url)
        loginUrl.searchParams.set("callbackUrl", pathname)
        return NextResponse.redirect(loginUrl)
    }

    // Redirect to dashboard if already logged in and trying to access login
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
