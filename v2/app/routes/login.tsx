import { redirect } from "react-router"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { Label } from "~/components/ui/label"
import { Switch } from "~/components/ui/switch"
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
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex items-center justify-end gap-3 rounded-lg border bg-background/80 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sun className="size-4" />
            <Label htmlFor="login-theme-switch" className="cursor-pointer">
              {resolvedTheme === "dark" ? "Dark mode" : "Light mode"}
            </Label>
            <Moon className="size-4" />
          </div>
          <Switch
            id="login-theme-switch"
            checked={resolvedTheme === "dark"}
            onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
            aria-label="Toggle light and dark mode"
          />
        </div>
        <LoginForm />
      </div>
    </div>
  )
}
