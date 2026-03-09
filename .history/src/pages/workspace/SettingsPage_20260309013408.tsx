import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Lock, PencilLine, Plus, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import { listSupportBuckets } from "@/api";
import { getMyWorkspaceRole } from "@/api/workspaces";
import { SettingsSkeleton } from "@/components/skeletons/SettingsSkeleton";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataStateWrapper } from "@/components/ui/DataStateWrapper";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/input";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { queryKeys } from "@/lib/queryKeys";
import {
  getEffectiveRole,
  getStoredRoleView,
  type RoleViewMode,
} from "@/lib/roleView";
import { isDemoMode, supabase } from "@/lib/supabase";
import { useToast } from "@/providers/ToastProvider";

// ---------------------------------------------------------------------------
// File-scoped layout primitives
// ---------------------------------------------------------------------------

function SettingsSection({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return <Card className={`p-6 ${className}`}>{children}</Card>;
}

function SettingsSectionHeader({
  title,
  description,
}: {
  title: string;
  description?: string;
}): React.ReactElement {
  return (
    <div className="mb-5 border-b border-[#292B38] pb-4">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {description ? (
        <p className="mt-0.5 text-xs text-muted">{description}</p>
      ) : null}
    </div>
  );
}

interface SupportBucket {
  id: string;
  period_start: string;
  period_end: string;
  hours_allocated: number;
  hours_used_cached: number;
}

export function SettingsPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteSurname, setInviteSurname] = useState("");
  const [inviteStatus, setInviteStatus] = useState<string | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [generatedMagicLink, setGeneratedMagicLink] = useState<string | null>(
    null,
  );

  const [editingName, setEditingName] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [updateNameStatus, setUpdateNameStatus] = useState<string | null>(null);
  const [updateNameError, setUpdateNameError] = useState<string | null>(null);

  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [createWorkspaceStatus, setCreateWorkspaceStatus] = useState<
    string | null
  >(null);
  const [createWorkspaceError, setCreateWorkspaceError] = useState<
    string | null
  >(null);

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

      if (error || !data) {
        return "";
      }

      return data.name;
    },
    enabled: Boolean(workspaceId),
  });

  const bucketsQuery = useQuery({
    queryKey: ["workspace", workspaceId, "supportBuckets"],
    queryFn: async () =>
      (await listSupportBuckets(workspaceId)) as SupportBucket[],
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

      if (error) {
        throw new Error(error.message);
      }
    },
    onSuccess: () => {
      setUpdateNameStatus("Workspace name updated.");
      setEditingName(false);
      showToast("Workspace name updated.");
    },
    onError: (err: Error) => {
      setUpdateNameError(err.message || "Update failed");
      showToast(err.message || "Failed to update workspace name.", "error");
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

      return invokeAuthedFunction<{ warning?: string }>("invite-client", {
        workspaceId,
        email: inviteEmail,
        firstName: inviteFirstName,
        surname: inviteSurname,
        role: "client",
        workspaceName,
        delivery: "email",
      });
    },
    onSuccess: (data: { warning?: string }) => {
      const statusMessage = data?.warning || "Invite sent successfully.";
      setInviteStatus(statusMessage);
      setGeneratedMagicLink(null);
      setInviteEmail("");
      setInviteFirstName("");
      setInviteSurname("");
      showToast(statusMessage);
    },
    onError: (err: Error) => {
      setInviteError(err.message || "Invite failed");
      showToast(err.message || "Invite failed", "error");
    },
  });

  const generateMagicLinkMutation = useMutation({
    mutationFn: async () => {
      setInviteStatus(null);
      setInviteError(null);

      if (isDemoMode) {
        throw new Error(
          "Invites are unavailable in demo mode. Switch to live mode with Supabase configured.",
        );
      }

      const data = await invokeAuthedFunction<{ magicLink?: string }>(
        "invite-client",
        {
          workspaceId,
          email: inviteEmail,
          firstName: inviteFirstName,
          surname: inviteSurname,
          role: "client",
          workspaceName,
          delivery: "magic_link",
        },
      );

      if (!data?.magicLink) {
        throw new Error("Magic link was not returned by the server.");
      }

      return data;
    },
    onSuccess: (data) => {
      setGeneratedMagicLink(data.magicLink ?? null);
      setInviteStatus("Magic link generated. Copy and send it directly.");
      showToast("Magic link generated.");
    },
    onError: (err: Error) => {
      setInviteError(err.message || "Magic link generation failed");
      showToast(err.message || "Magic link generation failed", "error");
    },
  });

  const createWorkspaceMutation = useMutation({
    mutationFn: async () => {
      setCreateWorkspaceStatus(null);
      setCreateWorkspaceError(null);

      return invokeAuthedFunction<{ workspace?: { id: string; name: string } }>(
        "admin-users",
        {
          action: "create_workspace",
          workspaceId,
          workspaceName: newWorkspaceName,
        },
      );
    },
    onSuccess: async (data) => {
      const createdName = data?.workspace?.name || newWorkspaceName.trim();
      setCreateWorkspaceStatus(`Workspace created: ${createdName}`);
      setNewWorkspaceName("");
      await queryClient.invalidateQueries({ queryKey: queryKeys.workspaces });
      showToast(`Workspace created: ${createdName}`);
    },
    onError: (err: Error) => {
      const message = err.message || "Workspace creation failed";
      setCreateWorkspaceError(message);
      showToast(message, "error");
    },
  });

  const handleCopyMagicLink = async (): Promise<void> => {
    if (!generatedMagicLink) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedMagicLink);
      showToast("Magic link copied to clipboard.");
    } catch {
      showToast("Failed to copy link. Please copy manually.", "error");
    }
  };

  const isPageLoading =
    roleQuery.isLoading || workspaceQuery.isLoading || bucketsQuery.isLoading;
  const isPageError =
    roleQuery.isError || workspaceQuery.isError || bucketsQuery.isError;
  const pageError =
    roleQuery.error ?? workspaceQuery.error ?? bucketsQuery.error;

  return (
    <DataStateWrapper
      isLoading={isPageLoading}
      isError={isPageError}
      error={pageError}
      onRetry={() => {
        void Promise.all([
          roleQuery.refetch(),
          workspaceQuery.refetch(),
          bucketsQuery.refetch(),
        ]);
      }}
      isEmpty={false}
      skeleton={<SettingsSkeleton />}
      empty={
        <EmptyState
          title="No settings data yet"
          description="Workspace settings and support buckets will appear here when available."
        />
      }
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="pb-1">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Workspace Settings
          </h1>
          <p className="mt-1 text-sm text-muted">
            Manage workspace details, client access, and operational settings.
          </p>
          <p className="mt-2 font-mono text-[11px] text-muted/40">
            {workspaceId}
          </p>
        </div>

        {effectiveRole !== "admin" ? (
          /* Non-admin restricted state */
          <SettingsSection>
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <div className="rounded-full border border-[#292B38] bg-[#191A22] p-3">
                <Lock className="size-5 text-muted" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  Restricted Access
                </p>
                <p className="mt-1 text-xs text-muted">
                  Only admins can manage workspace settings.
                </p>
              </div>
            </div>
          </SettingsSection>
        ) : (
          <>
            {/* ── 1. Workspace Details ── */}
            <SettingsSection>
              <SettingsSectionHeader
                title="Workspace Details"
                description="The name shown across your portal and client communications."
              />
              {editingName ? (
                <form
                  className="flex items-center gap-2"
                  onSubmit={(event) => {
                    event.preventDefault();
                    updateNameMutation.mutate();
                  }}
                >
                  <Input
                    type="text"
                    value={workspaceName}
                    onChange={(event) => setWorkspaceName(event.target.value)}
                    required
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    disabled={updateNameMutation.isPending}
                  >
                    {updateNameMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingName(false);
                      setWorkspaceName(workspaceQuery.data ?? "");
                    }}
                  >
                    Cancel
                  </Button>
                </form>
              ) : (
                <div className="flex items-center justify-between">
                  <div>
                    <p className="mb-1 text-[11px] uppercase tracking-wider text-muted">
                      Workspace Name
                    </p>
                    <p className="text-sm font-medium text-foreground">
                      {workspaceName || (
                        <span className="italic text-muted">
                          Untitled workspace
                        </span>
                      )}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => setEditingName(true)}
                  >
                    <PencilLine />
                    Edit
                  </Button>
                </div>
              )}
              {updateNameStatus ? (
                <p className="mt-3 text-xs text-green-500">
                  {updateNameStatus}
                </p>
              ) : null}
              {updateNameError ? (
                <p className="mt-3 text-xs text-red-400">{updateNameError}</p>
              ) : null}
            </SettingsSection>

            {/* ── 2. Client Access ── */}
            <SettingsSection>
              <SettingsSectionHeader
                title="Client Access"
                description="Invite a client to this workspace. Send an email invite or generate a magic link to share directly."
              />
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  inviteMutation.mutate();
                }}
              >
                <div className="space-y-3">
                  <div>
                    <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                      Email
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="client@example.com"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                        First Name
                      </label>
                      <Input
                        type="text"
                        placeholder="Jane"
                        value={inviteFirstName}
                        onChange={(event) =>
                          setInviteFirstName(event.target.value)
                        }
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                        Surname
                      </label>
                      <Input
                        type="text"
                        placeholder="Smith"
                        value={inviteSurname}
                        onChange={(event) =>
                          setInviteSurname(event.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    type="submit"
                    disabled={inviteMutation.isPending || !inviteEmail}
                  >
                    <UserPlus />
                    {inviteMutation.isPending ? "Sending..." : "Send Invite"}
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={
                      generateMagicLinkMutation.isPending || !inviteEmail
                    }
                    onClick={() => generateMagicLinkMutation.mutate()}
                  >
                    {generateMagicLinkMutation.isPending
                      ? "Generating..."
                      : "Generate Magic Link"}
                  </Button>
                </div>
              </form>

              {generatedMagicLink ? (
                <div className="mt-5 rounded-lg border border-[#292B38] bg-[#191A22] p-4">
                  <p className="mb-2 text-xs font-medium text-foreground">
                    Magic Link — copy and send directly to the client
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={generatedMagicLink}
                      readOnly
                      className="flex-1 font-mono text-xs"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={handleCopyMagicLink}
                    >
                      <Copy />
                      Copy
                    </Button>
                  </div>
                </div>
              ) : null}

              {inviteStatus ? (
                <p className="mt-3 text-xs text-green-500">{inviteStatus}</p>
              ) : null}
              {inviteError ? (
                <p className="mt-3 text-xs text-red-400">{inviteError}</p>
              ) : null}
            </SettingsSection>

            {/* ── 3. Workspace Management ── */}
            <SettingsSection>
              <SettingsSectionHeader
                title="Workspace Management"
                description="Create an additional workspace. Each workspace is independently managed with its own team and tasks."
              />
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  createWorkspaceMutation.mutate();
                }}
              >
                <label className="mb-1 block text-[11px] uppercase tracking-wider text-muted">
                  Workspace Name
                </label>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    required
                    placeholder="e.g. Acme Corp"
                    value={newWorkspaceName}
                    onChange={(event) =>
                      setNewWorkspaceName(event.target.value)
                    }
                    className="flex-1"
                  />
                  <Button
                    type="submit"
                    disabled={
                      createWorkspaceMutation.isPending ||
                      !newWorkspaceName.trim()
                    }
                  >
                    <Plus />
                    {createWorkspaceMutation.isPending
                      ? "Creating..."
                      : "Create"}
                  </Button>
                </div>
              </form>
              {createWorkspaceStatus ? (
                <p className="mt-3 text-xs text-green-500">
                  {createWorkspaceStatus}
                </p>
              ) : null}
              {createWorkspaceError ? (
                <p className="mt-3 text-xs text-red-400">
                  {createWorkspaceError}
                </p>
              ) : null}
            </SettingsSection>

            {/* ── 4. Support Buckets ── */}
            <SettingsSection>
              <SettingsSectionHeader
                title="Support Buckets"
                description="Prepaid support hour allocations for this workspace."
              />
              {(bucketsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted">
                  No support buckets have been allocated yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {(bucketsQuery.data ?? []).map((bucket) => {
                    const used = bucket.hours_used_cached;
                    const allocated = bucket.hours_allocated;
                    const remaining = Math.max(0, allocated - used);
                    const pct =
                      allocated > 0
                        ? Math.min(100, (used / allocated) * 100)
                        : 0;

                    return (
                      <div
                        key={bucket.id}
                        className="rounded-lg border border-[#292B38] bg-[#191A22] px-4 py-3"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-xs font-medium text-foreground">
                            {new Date(bucket.period_start).toLocaleDateString()}{" "}
                            – {new Date(bucket.period_end).toLocaleDateString()}
                          </p>
                          <span
                            className={`text-xs font-medium ${remaining === 0 ? "text-red-400" : "text-muted"}`}
                          >
                            {remaining}h remaining
                          </span>
                        </div>
                        <div className="mb-2 flex gap-4 text-[11px] text-muted">
                          <span>
                            Allocated:{" "}
                            <span className="font-medium text-foreground">
                              {allocated}h
                            </span>
                          </span>
                          <span>
                            Used:{" "}
                            <span className="font-medium text-foreground">
                              {used}h
                            </span>
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[#292B38]">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </SettingsSection>
          </>
        )}
      </div>
    </DataStateWrapper>
  );
}
