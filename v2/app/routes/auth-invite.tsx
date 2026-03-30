import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useNavigate, type ClientLoaderFunctionArgs } from "react-router"

import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import { Field, FieldError, FieldGroup } from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { Switch } from "~/components/ui/switch"
import { supabase } from "~/lib/supabase"

export async function clientLoader(_: ClientLoaderFunctionArgs) {
  return {}
}

export default function AuthInvitePage() {
  const { resolvedTheme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [password, setPassword] = React.useState("")
  const [confirm, setConfirm] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [sessionChecked, setSessionChecked] = React.useState(false)

  React.useEffect(() => {
    let active = true

    async function prepareInviteSession() {
      setError(null)

      const url = new URL(window.location.href)
      const code = url.searchParams.get("code")

      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(window.location.href)

        if (exchangeError) {
          if (!active) return
          setError("Invite link expired or invalid. Request a new invite.")
          setSessionChecked(true)
          return
        }
      }

      const hash = window.location.hash.startsWith("#")
        ? window.location.hash.slice(1)
        : window.location.hash
      const params = new URLSearchParams(hash)

      const accessToken = params.get("access_token")
      const refreshToken = params.get("refresh_token")
      const errorDescription = params.get("error_description")

      if (errorDescription) {
        if (!active) return
        setError(errorDescription)
        setSessionChecked(true)
        return
      }

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (sessionError) {
          if (!active) return
          setError("Invite link expired or invalid. Request a new invite.")
          setSessionChecked(true)
          return
        }
      }

      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!active) return

      if (!session) {
        setError("No active session. Invite link may be expired.")
      }
      setSessionChecked(true)
    }

    void prepareInviteSession()

    return () => {
      active = false
    }
  }, [])

  async function handleSetPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setLoading(true)

    if (password.length < 8) {
      setError("Password must be at least 8 characters.")
      setLoading(false)
      return
    }

    if (password !== confirm) {
      setError("Passwords do not match.")
      setLoading(false)
      return
    }

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    })

    if (updateError) {
      setError(updateError.message)
      setLoading(false)
      return
    }

    setSuccess("Password set. Redirecting...")
    setLoading(false)
    setTimeout(() => {
      navigate("/", { replace: true })
    }, 1200)
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <Card className="gap-6 rounded p-8">
          <CardHeader className="px-0">
            <div className="space-y-1 text-center">
              <CardTitle>Accept Invite</CardTitle>
              <CardDescription>
                Set your password to access your workspace.
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="px-0">
            {error ? <FieldError>{error}</FieldError> : null}
            {success ? (
              <p className="mt-4 text-sm text-green-600">{success}</p>
            ) : null}

            {sessionChecked && !error ? (
              <form className="mt-4" onSubmit={handleSetPassword}>
                <FieldGroup>
                  <Field>
                    <Input
                      id="new-password"
                      type="password"
                      required
                      placeholder="New password"
                      aria-label="New password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 rounded"
                    />
                  </Field>

                  <Field>
                    <Input
                      id="confirm-password"
                      type="password"
                      required
                      placeholder="Confirm password"
                      aria-label="Confirm password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="h-10 rounded"
                    />
                  </Field>

                  <Field>
                    <Button
                      className="h-10 rounded"
                      type="submit"
                      disabled={loading}
                    >
                      {loading ? "Setting..." : "Set Password"}
                    </Button>
                    <div className="space-y-2 pt-3">
                      <p className="text-center text-sm font-medium">
                        Select theme
                      </p>
                      <div className="flex items-center justify-center gap-3 text-muted-foreground">
                        <Sun className="size-4" />
                        <Switch
                          id="invite-theme-switch"
                          checked={resolvedTheme === "dark"}
                          onCheckedChange={(checked) =>
                            setTheme(checked ? "dark" : "light")
                          }
                          aria-label="Toggle light and dark mode"
                        />
                        <Moon className="size-4" />
                      </div>
                    </div>
                  </Field>
                </FieldGroup>
              </form>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
