"use client"

import * as React from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useNavigate } from "react-router"

import { cn } from "~/lib/utils"
import { Button } from "~/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card"
import {
  Field,
  FieldError,
  FieldGroup,
} from "~/components/ui/field"
import { Input } from "~/components/ui/input"
import { Switch } from "~/components/ui/switch"
import { supabase } from "~/lib/supabase"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const { resolvedTheme, setTheme } = useTheme()
  const navigate = useNavigate()
  const [error, setError] = React.useState<string | null>(null)
  const [pending, setPending] = React.useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError(null)
    setPending(true)

    const form = new FormData(e.currentTarget)
    const email = form.get("email") as string
    const password = form.get("password") as string

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError(authError.message)
      setPending(false)
      return
    }

    navigate("/")
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="gap-6 rounded p-8">
        <CardHeader className="px-0">
          <div className="space-y-1 text-center">
            <img
              src="/BPC-Logo.jpg"
              alt="Broken Pony Club"
              className="mx-auto mb-3 h-12 w-12 rounded object-cover"
            />
            <CardTitle>Broken Pony Club</CardTitle>
            <CardDescription>Project Management System</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-0">
          <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="email@example.com"
                  aria-label="Email"
                  required
                  autoComplete="email"
                  className="h-10 rounded"
                />
              </Field>
              <Field>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Password"
                  aria-label="Password"
                  required
                  autoComplete="current-password"
                  className="h-10 rounded"
                />
              </Field>
              {error && <FieldError>{error}</FieldError>}
              <Field>
                <Button
                  type="submit"
                  disabled={pending}
                  className="h-10 rounded"
                >
                  {pending ? "Signing in…" : "Login"}
                </Button>
                <div className="space-y-2 pt-3">
                  <p className="text-center text-sm font-medium">
                    Select theme
                  </p>
                  <div className="flex items-center justify-center gap-3 text-muted-foreground">
                    <Sun className="size-4" />
                    <Switch
                      id="login-theme-switch"
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
        </CardContent>
      </Card>
    </div>
  )
}
