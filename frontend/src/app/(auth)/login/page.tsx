/**
 * Login Page
 *
 * Authentication entry point with email/password and OAuth options.
 */
import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
            <div className="relative z-10 w-full max-w-md px-4">
                <LoginForm />
            </div>
        </div>
    )
}
