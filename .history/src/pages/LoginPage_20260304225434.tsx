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
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-6 md:p-8">
        <div className="mb-8 flex items-center gap-3">
          <img src="/BPC-Logo.jpg" alt="BPC" className="h-12 w-12 rounded-xl" />
          <div>
            <p className="text-lg font-semibold tracking-tight text-foreground">
              Broken Pony Club
            </p>
            <p className="text-sm text-muted">Client Portal Login</p>
          </div>
        </div>

        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          {authMode === "signin" ? "Sign in" : "Sign up"}
        </h1>
        <p className="mt-2 text-sm text-muted">
          Admin and client accounts use the same login screen. Access level is
          determined by workspace membership role.
        </p>

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
          <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Missing Supabase env keys. Create .env.local with VITE_SUPABASE_URL
            and VITE_SUPABASE_ANON_KEY.
          </div>
        ) : null}

        {isDemoMode ? (
          <Button
            className="mt-4 w-full"
            variant="secondary"
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
          <Input
            type="email"
            required
            placeholder="Email Address"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {!isDemoMode ? (
            <>
              <Input
                type="password"
                required
                placeholder="Password"
                autoComplete={
                  authMode === "signin" ? "current-password" : "new-password"
                }
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {authMode === "signup" ? (
                <Input
                  type="password"
                  required
                  placeholder="Confirm Password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                />
              ) : null}
            </>
          ) : null}
          <Button
            className="w-full"
            type="submit"
            disabled={isSubmitting || !isSupabaseConfigured}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Please wait...
              </>
            ) : authMode === "signin" ? (
              "Sign in"
            ) : (
              "Create account"
            )}
          </Button>
          {!isDemoMode ? (
            <Button
              className="w-full"
              type="button"
              variant="secondary"
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
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </Card>
    </div>
  );
}
