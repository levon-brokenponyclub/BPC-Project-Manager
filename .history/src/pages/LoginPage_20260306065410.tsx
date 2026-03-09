import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { isDemoMode, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/providers/ToastProvider";

export function LoginPage(): React.ReactElement {
  const { loginForDev, loginWithPassword, signUpWithPassword } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="flex min-h-screen items-start justify-center bg-background px-4 pb-8 pt-8 md:pt-[68px]">
      <Card className="w-full max-w-[611px] rounded-sm border border-border bg-card p-0 shadow-card">
        <div className="mx-auto w-full max-w-[517px] px-5 pb-10 pt-11 md:px-0">
          <div className="flex items-center gap-3 border-b border-border pb-6">
            <img
              src="/BPC-Logo.jpg"
              alt="BPC"
              className="h-10 w-10 rounded-md"
            />
            <div>
              <p className="text-2xl font-medium leading-8 tracking-tight text-foreground">
                {authMode === "signin" ? "Sign in" : "Sign up"}
              </p>
              <p className="text-[13px] font-medium leading-4 text-muted">
                Access your workspace portal
              </p>
            </div>
          </div>

          {/* <div className="mt-4 rounded-xl border border-border p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Data Mode
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={isDemoMode ? "default" : "secondary"}
              size="sm"
              onClick={() => {
                setPreferredDataMode("demo");
                window.location.reload();
              }}
            >
              Dev / Demo
            </Button>
            <Button
              type="button"
              variant={!isDemoMode ? "default" : "secondary"}
              size="sm"
              disabled={!canUseLiveMode}
              onClick={() => {
                setPreferredDataMode("live");
                window.location.reload();
              }}
            >
              Live
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Current: {modeLabel}
            {preferredDataMode ? ` (forced: ${preferredDataMode})` : ""}
          </p>
        </div> */}

          {!isSupabaseConfigured ? (
            <div className="mt-6 rounded-md border border-amber-500/30 bg-amber-900/20 px-3 py-2 text-xs text-amber-300">
              Missing Supabase env keys. Create .env.local with
              VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
            </div>
          ) : null}

          {isDemoMode ? (
            <Button
              className="mt-4 h-8 w-full rounded-md border border-border bg-surface px-3 text-[13px] font-medium text-foreground shadow-none hover:bg-surface/70"
              type="button"
              onClick={async () => {
                setError("");
                await loginForDev(email || "dev@localhost");
                navigate("/workspaces");
              }}
            >
              Continue in dev mode
            </Button>
          ) : null}

          <form
            className="mt-6 space-y-4"
            onSubmit={async (event) => {
              event.preventDefault();
              setError("");
              setMessage("");
              setIsSubmitting(true);
              try {
                if (isDemoMode) {
                  await loginForDev(email || "dev@localhost");
                  showToast("Logged in successfully.");
                  navigate("/workspaces");
                  return;
                }

                if (authMode === "signup") {
                  if (password !== confirmPassword) {
                    throw new Error("Passwords do not match.");
                  }

                  await signUpWithPassword(email, password);
                  setMessage(
                    "Account created. You can now access your workspaces.",
                  );
                  showToast("Account created successfully.");
                  navigate("/workspaces");
                  return;
                }

                await loginWithPassword(email, password);
                showToast("Logged in successfully.");
                navigate("/workspaces");
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "Failed to sign in",
                );
              } finally {
                setIsSubmitting(false);
              }
            }}
          >
            <div className="space-y-1">
              <p className="text-[13px] font-medium leading-4 text-foreground">
                Email
              </p>
              <Input
                type="email"
                required
                placeholder="Email Address"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="h-10 rounded-md border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted"
              />
            </div>

            {!isDemoMode ? (
              <>
                <div className="space-y-1">
                  <p className="text-[13px] font-medium leading-4 text-foreground">
                    Password
                  </p>
                  <Input
                    type="password"
                    required
                    placeholder="Password"
                    autoComplete={
                      authMode === "signin"
                        ? "current-password"
                        : "new-password"
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="h-10 rounded-md border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted"
                  />
                </div>

                {authMode === "signup" ? (
                  <div className="space-y-1">
                    <p className="text-[13px] font-medium leading-4 text-foreground">
                      Confirm password
                    </p>
                    <Input
                      type="password"
                      required
                      placeholder="Confirm Password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      className="h-10 rounded-md border-border bg-background px-3 text-[13px] text-foreground placeholder:text-muted"
                    />
                  </div>
                ) : null}
              </>
            ) : null}

            <div className="pt-2">
              <Button
                className="mx-auto h-8 w-full max-w-[386px] rounded-sm border border-border bg-foreground px-3 text-[13px] font-medium leading-4 text-background shadow-card hover:bg-foreground/90"
                type="submit"
                disabled={isSubmitting || !isSupabaseConfigured}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Please wait...
                  </>
                ) : authMode === "signin" ? (
                  "Sign In"
                ) : (
                  "Create account"
                )}
              </Button>
            </div>

            {!isDemoMode ? (
              <Button
                className="mx-auto h-8 w-full max-w-[386px] rounded-sm border border-border bg-background px-3 text-[13px] font-medium leading-4 text-muted shadow-none hover:bg-surface hover:text-foreground"
                type="button"
                onClick={() => {
                  setError("");
                  setMessage("");
                  setAuthMode((mode) =>
                    mode === "signin" ? "signup" : "signin",
                  );
                }}
              >
                {authMode === "signin"
                  ? "Need an account? Sign up"
                  : "Have an account? Sign in"}
              </Button>
            ) : null}
          </form>

          {message ? (
            <p className="mt-3 text-sm text-primary">{message}</p>
          ) : null}
          {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
        </div>
      </Card>
    </div>
  );
}
