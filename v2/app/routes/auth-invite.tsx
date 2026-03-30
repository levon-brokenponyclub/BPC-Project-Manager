import * as React from "react"
import { useNavigate, type ClientLoaderFunctionArgs } from "react-router"

import { Button } from "~/components/ui/button"
import { Input } from "~/components/ui/input"
import { supabase } from "~/lib/supabase"

export async function clientLoader(_: ClientLoaderFunctionArgs) {
  return {}
}

export default function AuthInvitePage() {
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
    <div className="flex min-h-svh items-center justify-center bg-card px-4 py-8">
      <div className="w-full max-w-md rounded border bg-card p-6">
        <h1 className="text-xl font-semibold">Accept Invite</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Set your password to access your workspace.
        </p>

        {error ? (
          <p className="mt-4 text-sm text-destructive">{error}</p>
        ) : null}
        {success ? (
          <p className="mt-4 text-sm text-green-600">{success}</p>
        ) : null}

        {sessionChecked && !error ? (
          <form className="mt-6 space-y-4" onSubmit={handleSetPassword}>
            <Input
              type="password"
              required
              placeholder="New password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              type="password"
              required
              placeholder="Confirm password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
            <Button className="w-full" type="submit" disabled={loading}>
              {loading ? "Setting..." : "Set Password"}
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  )
}
