import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AuthInvitePage(): React.ReactElement {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    async function handleInviteSession() {
      setError("");
      // Try to exchange code for session if present
      const url = window.location.href;
      if (url.includes("code=")) {
        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) {
          setError("Invite link expired or invalid. Request a new invite.");
          setSessionChecked(true);
          return;
        }
      }
      // Check session
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        setError("No active session. Invite link may be expired.");
      }
      setSessionChecked(true);
    }
    handleInviteSession();
  }, []);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      setLoading(false);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }
    setSuccess("Password set! Redirecting...");
    setTimeout(() => navigate("/workspaces"), 1200);
    setLoading(false);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md p-7">
        <h1 className="text-xl font-semibold text-foreground">Accept Invite</h1>
        <p className="mt-1 text-sm text-muted">
          Set your password to finish onboarding and access your workspace.
        </p>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
        {success && <p className="mt-3 text-sm text-green-600">{success}</p>}
        {sessionChecked && !error && (
          <form className="mt-5 space-y-3" onSubmit={handleSetPassword}>
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
        )}
      </Card>
    </div>
  );
}
