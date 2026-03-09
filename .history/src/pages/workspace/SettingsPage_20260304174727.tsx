import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useState } from "react";
import { getMyWorkspaceRole } from "@/api/workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";

interface SupportBucket {
  id: string;
  period_start: string;
  period_end: string;
  hours_allocated: number;
  hours_used_cached: number;
}

export function SettingsPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole] = useState("client");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const roleQuery = useQuery({
    queryKey: ["workspace", workspaceId, "myRole"],
    queryFn: () => getMyWorkspaceRole(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      setInviteStatus(null);
      setInviteError(null);
      const res = await fetch("/functions/v1/invite-client", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          workspaceId,
          email: inviteEmail,
          role: inviteRole,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Invite failed");
      return data;
    },
    onSuccess: () => {
      setInviteStatus("Invite sent successfully.");
      setInviteEmail("");
    },
    onError: (err: any) => {
      setInviteError(err.message || "Invite failed");
    },
  });

  const bucketsQuery = useQuery({
    queryKey: ["workspace", workspaceId, "supportBuckets"],
    queryFn: async () =>
      (await listSupportBuckets(workspaceId)) as SupportBucket[],
    enabled: Boolean(workspaceId),
  });

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h1 className="text-xl font-semibold text-foreground">
          Workspace Settings
        </h1>
        <p className="mt-1 text-sm text-muted">Workspace ID: {workspaceId}</p>
        <p className="mt-1 text-xs text-amber-700">
          <strong>Debug:</strong> Current role:{" "}
          {roleQuery.isLoading ? "Loading..." : roleQuery.data ?? "(none)"}
        </p>
      </Card>

      {roleQuery.data === "admin" && (
        <Card className="p-5">
          <h2 className="text-lg font-semibold text-foreground">
            Invite Client
          </h2>
          <form
            className="mt-3 flex flex-col gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              inviteMutation.mutate();
            }}
          >
            <Input
              type="email"
              required
              placeholder="Client email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
            />
            <select
              className="rounded-xl border border-border px-2 py-1 text-sm"
              value={inviteRole}
              disabled
            >
              <option value="client">Client</option>
            </select>
            <Button
              type="submit"
              disabled={inviteMutation.isLoading || !inviteEmail}
            >
              {inviteMutation.isLoading ? "Sending..." : "Send Invite"}
            </Button>
          </form>
          {inviteStatus && (
            <p className="mt-2 text-green-600 text-sm">{inviteStatus}</p>
          )}
          {inviteError && (
            <p className="mt-2 text-red-600 text-sm">{inviteError}</p>
          )}
        </Card>
      )}

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-foreground">
          Support Buckets
        </h2>
        <div className="mt-3 space-y-2">
          {(bucketsQuery.data ?? []).map((bucket) => (
            <div
              key={bucket.id}
              className="rounded-xl bg-stone-50 px-3 py-2 text-sm"
            >
              <p className="font-medium text-foreground">
                {new Date(bucket.period_start).toLocaleDateString()} -{" "}
                {new Date(bucket.period_end).toLocaleDateString()}
              </p>
              <p className="text-muted">
                Allocated: {bucket.hours_allocated}h · Cached used:{" "}
                {bucket.hours_used_cached}h
              </p>
            </div>
          ))}
          {(bucketsQuery.data ?? []).length === 0 ? (
            <p className="text-sm text-muted">No support buckets found.</p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}
