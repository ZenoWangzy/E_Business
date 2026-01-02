/**
[IDENTITY]: Application Authentication Config
Core Auth Logic using Auth.js (NextAuth v5).

[INPUT]:
- Credentials(Email / Password) or OAuth Tokens.

[LINK]:
- Backend -> ../ backend / app / api / v1 / endpoints / auth.py
    - Middleware -> ./ middleware.ts
    - Lib -> ./ lib / utils.ts

    [OUTPUT]: Session Object with JWT.
[POS]: /frontend/src / auth.ts

[PROTOCOL]:
1. ** Stateless **: Uses JWT strategy for session management.
2. ** Backend Proxy **: Validates credentials via Backend API.
3. ** Type Safe **: Extends `NextAuthConfig` strict typing.
 */
import NextAuth from "next-auth"
import type { NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import GitHub from "next-auth/providers/github"

const backendUrl = process.env.BACKEND_URL || "http://localhost:8000"

export const authConfig: NextAuthConfig = {
    pages: {
        signIn: "/login",
        error: "/login",
    },
    providers: [
        // Credentials provider for email/password login
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                console.log('[NextAuth] authorize called with email:', credentials?.email)

                if (!credentials?.email || !credentials?.password) {
                    console.log('[NextAuth] Missing email or password')
                    return null
                }

                try {
                    console.log('[NextAuth] Calling backend at:', `${backendUrl}/api/v1/auth/login`)
                    // Call backend login endpoint
                    const response = await fetch(`${backendUrl}/api/v1/auth/login`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: credentials.email,
                            password: credentials.password,
                        }),
                    })

                    console.log('[NextAuth] Backend response status:', response.status)

                    if (!response.ok) {
                        const errorText = await response.text()
                        console.log('[NextAuth] Backend error:', errorText)
                        return null
                    }

                    const data = await response.json()
                    console.log('[NextAuth] Login successful, token received')

                    // Return user object for session
                    return {
                        id: credentials.email as string,
                        email: credentials.email as string,
                        accessToken: data.access_token,
                    }
                } catch (error) {
                    console.error('[NextAuth] Exception during login:', error)
                    return null
                }
            },
        }),
        // OAuth providers (configure in .env)
        Google({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
        GitHub({
            clientId: process.env.GITHUB_CLIENT_ID || "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
        }),
    ],
    callbacks: {
        async jwt({ token, user, account }) {
            console.log('[NextAuth Callback] jwt called with user:', !!user, 'account:', !!account)
            // On sign in, add user info to token
            if (user) {
                token.id = user.id
                token.email = user.email
                token.accessToken = (user as { accessToken?: string }).accessToken
                console.log('[NextAuth Callback] Added user data to token')
            }
            return token
        },
        async session({ session, token }) {
            console.log('[NextAuth Callback] session called')
            // Add token info to session
            if (session.user) {
                session.user.id = token.id as string
                session.user.email = token.email as string
            }
            console.log('[NextAuth Callback] Session created for user:', session.user?.email)
            return session
        },
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 60, // 30 minutes
    },
    secret: process.env.AUTH_SECRET,
    trustHost: true,
}

export const { handlers, signIn, signOut, auth } = NextAuth(authConfig)
