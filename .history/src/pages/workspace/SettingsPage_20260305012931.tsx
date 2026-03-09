import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { useState, useEffect } from "react";
import { getMyWorkspaceRole } from "@/api/workspaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card } from "@/components/ui/card";
import { useMutation } from "@tanstack/react-query";
import { isDemoMode, supabase } from "@/lib/supabase";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { listSupportBuckets } from "@/api";
import { useToast } from "@/providers/ToastProvider";
import {
  getEffectiveRole,
  getStoredRoleView,
  type RoleViewMode,
} from "@/lib/roleView";

interface SupportBucket {
  id: string;
  period_start: string;
  period_end: string;
  hours_allocated: number;
  hours_used_cached: number;
}

export function SettingsPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const { showToast } = useToast();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [updateNameStatus, setUpdateNameStatus] = useState<string | null>(null);
  const [updateNameError, setUpdateNameError] = useState<string | null>(null);
  const [roleViewMode, setRoleViewMode] = useState<RoleViewMode>("admin");

  const roleQuery = useQuery({
    queryKey: ["workspace", workspaceId, "myRole"],
    queryFn: () => getMyWorkspaceRole(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const actualRole =
    roleQuery.data === "admin" || roleQuery.data === "client"
      ? roleQuery.data
      : null;
  const effectiveRole = getEffectiveRole(actualRole, roleViewMode);

  const workspaceQuery = useQuery({
    queryKey: ["workspace", workspaceId, "details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .single();
      if (error || !data) return "";
      return data.name;
    },
    enabled: Boolean(workspaceId),
  });

  useEffect(() => {
    if (workspaceQuery.data) {
      setWorkspaceName(workspaceQuery.data);
    }
  }, [workspaceQuery.data]);

  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    setRoleViewMode(getStoredRoleView(workspaceId) ?? "admin");
  }, [workspaceId]);

  const updateNameMutation = useMutation({
    mutationFn: async () => {
      setUpdateNameStatus(null);
      setUpdateNameError(null);
      const { error } = await supabase
        .from("workspaces")
        .update({ name: workspaceName })
        .eq("id", workspaceId);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      setUpdateNameStatus("Workspace name updated.");
      setEditingName(false);
      showToast("Workspace name updated.");
    },
    onError: (err: any) => {
      setUpdateNameError(err.message || "Update failed");
      showToast(err?.message || "Failed to update workspace name.", "error");
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      setInviteStatus(null);
      setInviteError(null);

      if (isDemoMode) {
        throw new Error(
          "Invites are unavailable in demo mode. Switch to live mode with Supabase configured.",
        );
      }

      const data = await invokeAuthedFunction("invite-client", {
        workspaceId,
        email: inviteEmail,
        role: "client",
        workspaceName,
      });

      return data;
    },
    onSuccess: (data: any) => {
      const statusMessage = data?.warning || "Invite sent successfully.";
      setInviteStatus(statusMessage);
      setInviteEmail("");
      showToast(statusMessage);
    },
    onError: (err: any) => {
      setInviteError(err.message || "Invite failed");
      showToast(err?.message || "Invite failed", "error");
    },
  });

  const bucketsQuery = useQuery({
    queryKey: ["workspace", workspaceId, "supportBuckets"],
    queryFn: async () =>
      (await listSupportBuckets(workspaceId)) as SupportBucket[],
    enabled: Boolean(workspaceId),
  });

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          Workspace Settings
        </h1>
        <p className="mt-1 text-sm text-muted">Workspace ID: {workspaceId}</p>
        <p className="mt-2 text-xs text-amber-700">
          <strong>Debug:</strong> Current role:{" "}
          <span className="capitalize">
            {roleQuery.isLoading ? "Checking..." : (effectiveRole ?? "(none)")}
          </span>
        </p>
      </Card>

      {effectiveRole === "admin" && (
        <Card className="p-5">
          <h2 className="text-base font-semibold text-foreground">
            Invite Client
          </h2>
          <form
            className="mt-4 flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
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
            <Button
              type="submit"
              disabled={inviteMutation.isPending || !inviteEmail}
            >
              {inviteMutation.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </form>
          {inviteStatus && (
            <p className="mt-3 text-green-600 text-sm">{inviteStatus}</p>
          )}
          {inviteError && (
            <p className="mt-3 text-red-600 text-sm">{inviteError}</p>
          )}
        </Card>
      )}

      {effectiveRole === "admin" && (
        <Card className="p-5">
          <h2 className="text-base font-semibold text-foreground">
            Workspace Name
          </h2>
          <div className="mt-4">
            {workspaceQuery.isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : null}
            {editingName ? (
              <form
                className="flex gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  updateNameMutation.mutate();
                }}
              >
                <Input
                  type="text"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  required
                />
                <Button type="submit" size="sm">
                  {updateNameMutation.isPending ? "Saving..." : "Save"}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditingName(false)}
                >
                  Cancel
                </Button>
              </form>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium">Workspace Name:</span>
                <span>{workspaceName}</span>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => setEditingName(true)}
                >
                  Edit
                </Button>
              </div>
            )}
            {updateNameStatus && (
              <p className="mt-1 text-green-600 text-xs">{updateNameStatus}</p>
            )}
            {updateNameError && (
              <p className="mt-1 text-red-600 text-xs">{updateNameError}</p>
            )}
          </div>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-foreground">
          Support Buckets
        </h2>
        <div className="mt-3 space-y-2">
          {bucketsQuery.isLoading
            ? Array.from({ length: 2 }).map((_, index) => (
                <div
                  key={`bucket-skeleton-${index}`}
                  className="rounded-xl bg-stone-50 px-3 py-2"
                >
                  <Skeleton className="h-4 w-56" />
                  <Skeleton className="mt-2 h-4 w-44" />
                </div>
              ))
            : null}
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
