import { redirect } from "react-router"
import { supabase } from "~/lib/supabase"
import { LoginForm } from "~/features/auth/login-form"

// ─── Loader ───────────────────────────────────────────────────────────────────

export async function clientLoader() {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session) return redirect("/")
  return {}
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  )
}
