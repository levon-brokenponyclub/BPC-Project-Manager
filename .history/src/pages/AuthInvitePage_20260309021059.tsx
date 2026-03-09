import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
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
    <div className="dark flex min-h-screen items-start justify-center bg-[#15161D] px-4 pb-8 pt-8 text-white md:pt-[68px]">
      <div className="w-full max-w-[520px] rounded-[4px] border border-[#292B38] bg-[#191A22] shadow-none">
        <div className="mx-auto w-full max-w-[440px] px-5 pb-10 pt-11 md:px-0">
          <div className="flex items-center gap-3 border-b border-[#25262B] pb-6">
            <img src="/BPC-Logo.jpg" alt="BPC" className="h-10 w-10 rounded-md" />
            <div>
              <p className="text-2xl font-medium leading-8 tracking-[-0.16px] text-white">
                Accept Invite
              </p>
              <p className="text-[13px] font-medium leading-4 text-[#939496]">
                Set your password to access your workspace
              </p>
            </div>
          </div>
          {error && <p className="mt-4 text-sm text-red-400">{error}</p>}
          {success && <p className="mt-4 text-sm text-green-400">{success}</p>}
          {sessionChecked && !error && (
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
          )}
        </div>
      </div>
    </div>
  );
}
