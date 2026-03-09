import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  canUseLiveMode,
  isDemoMode,
  isSupabaseConfigured,
  preferredDataMode,
  setPreferredDataMode,
} from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

export function LoginPage(): React.ReactElement {
  const { loginForDev, loginWithPassword } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const modeLabel = isDemoMode ? "Demo Data" : "Live Supabase";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-7">
        <div className="mb-6 flex items-center gap-3">
          <img src="/bpc-logo.svg" alt="BPC" className="h-12 w-12 rounded-xl" />
          <div>
            <p className="text-lg font-semibold text-foreground">
              Broken Pony Club
            </p>
            <p className="text-sm text-muted">Client Portal Login</p>
          </div>
        </div>

        <h1 className="text-xl font-semibold text-foreground">
          Sign in with Email + Password
        </h1>
        <p className="mt-1 text-sm text-muted">
          Admin and client accounts use the same login screen. Access level is
          determined by workspace membership role.
        </p>

        <div className="mt-4 rounded-xl border border-border p-3">
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
        </div>

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
          className="mt-5 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setMessage("");
            setIsSubmitting(true);
            try {
              if (isDemoMode) {
                await loginForDev(email || "dev@localhost");
                navigate("/workspaces");
                return;
              }
              await loginWithPassword(email, password);
              navigate("/workspaces");
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Failed to sign in"
              );
            } finally {
              setIsSubmitting(false);
            }
          }}
        >
          <Input
            type="email"
            required
            placeholder="name@client.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {!isDemoMode ? (
            <Input
              type="password"
              required
              placeholder="Enter password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          ) : null}
          <Button
            className="w-full"
            type="submit"
            disabled={isSubmitting || !isSupabaseConfigured}
          >
            {isSubmitting ? "Please wait..." : "Sign in"}
          </Button>
        </form>

        {message ? (
          <p className="mt-3 text-sm text-primary">{message}</p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      </Card>
    </div>
  );
}
