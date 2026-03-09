import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/providers/AuthProvider";

export function LoginPage(): React.ReactElement {
  const { loginWithOtp } = useAuth();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          Sign in with Magic Link
        </h1>
        <p className="mt-1 text-sm text-muted">
          Use your client email to receive a one-time login link.
        </p>

        <form
          className="mt-5 space-y-3"
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setMessage("");
            setIsSubmitting(true);
            try {
              await loginWithOtp(email);
              setMessage("Magic link sent. Check your inbox.");
            } catch (err) {
              setError(
                err instanceof Error
                  ? err.message
                  : "Failed to send magic link",
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
          <Button className="w-full" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Sending..." : "Send magic link"}
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
