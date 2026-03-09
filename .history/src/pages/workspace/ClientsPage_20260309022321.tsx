import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { UserPlus, MoreVertical, X } from "lucide-react";
import { useEffect, useMemo, useState, Fragment } from "react";

import { getAllSystemUsers, type SystemUser } from "@/api/clients";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/providers/ToastProvider";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { isDemoMode, supabase } from "@/lib/supabase";
import { DataStateWrapper } from "@/components/ui/DataStateWrapper";
import { EmptyState } from "@/components/ui/EmptyState";

interface GroupedUsers {
  workspaceName: string;
  users: SystemUser[];
}

function ClientsSkeleton(): React.ReactElement {
  return (
    <Card className="border-[#222330] bg-[#191A22]">
      <div className="flex h-13 items-center justify-between border-b border-[#222330] px-6 py-2">
        <div className="h-4 w-32 animate-pulse rounded bg-muted/20" />
      </div>
      <table className="w-full text-left text-sm">
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr key={i} className="h-11 border-b border-[#292B38] bg-[#191A22]">
              <td className="px-6 py-3.5">
                <div className="h-4 w-48 animate-pulse rounded bg-muted/20" />
              </td>
              <td className="px-6 py-3.5">
                <div className="h-4 w-32 animate-pulse rounded bg-muted/20" />
              </td>
              <td className="px-6 py-3.5">
                <div className="h-6 w-16 animate-pulse rounded bg-muted/20" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

function UserAvatar({
  firstName,
  surname,
  email,
  avatarUrl,
}: {
  firstName?: string | null;
  surname?: string | null;
  email: string | null;
  avatarUrl?: string | null;
}) {
  const displayAvatarUrl = avatarUrl || "/defaultAvatar.png";
  const displayName =
    firstName || surname
      ? `${firstName ?? ""} ${surname ?? ""}`.trim()
      : (email?.split("@")[0] ?? "Unknown");

  return (
    <div className="flex items-center gap-3">
      <img
        src={displayAvatarUrl}
        alt={displayName}
        className="h-7 w-7 rounded-full border border-border object-cover"
      />
      <span className="text-[13px] font-medium text-[#E3E4EA]">
        {firstName && surname ? `${firstName} ${surname}` : displayName}
      </span>
    </div>
  );
}

export function ClientsPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteSurname, setInviteSurname] = useState("");
  const [inviteWorkspaceId, setInviteWorkspaceId] = useState("");
  const [inviteRole, setInviteRole] = useState<"client" | "admin">("client");
  const [deliveryMode, setDeliveryMode] = useState<"email" | "magic_link">(
    "email",
  );
  const [generatedMagicLink, setGeneratedMagicLink] = useState<string | null>(
    null,
  );
  const [editingUser, setEditingUser] = useState<SystemUser | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editSurname, setEditSurname] = useState("");
  const [editWorkspaces, setEditWorkspaces] = useState<string[]>([]);

  // Fetch ALL users in the system (not workspace-limited)
  const usersQuery = useQuery({
    queryKey: ["all-system-users", workspaceId],
    queryFn: () => getAllSystemUsers(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("id, name")
        .order("name", { ascending: true });

      if (error) throw error;
      return data as Array<{ id: string; name: string }>;
    },
  });

  // Set default invite workspace to current workspace
  useEffect(() => {
    if (inviteModalOpen && !inviteWorkspaceId && workspaceId) {
      setInviteWorkspaceId(workspaceId);
    }
  }, [inviteModalOpen, inviteWorkspaceId, workspaceId]);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-dropdown-menu]")) {
        setMenuOpen(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const inviteMutation = useMutation({
    mutationFn: async () => {
      if (isDemoMode) {
        throw new Error("Invites are unavailable in demo mode.");
      }

      if (!inviteWorkspaceId) {
        throw new Error("Please select a workspace.");
      }

      const workspace = workspacesQuery.data?.find(
        (w) => w.id === inviteWorkspaceId,
      );

      return invokeAuthedFunction<{ warning?: string; magicLink?: string }>(
        "invite-client",
        {
          workspaceId: inviteWorkspaceId,
          email: inviteEmail,
          firstName: inviteFirstName,
          surname: inviteSurname,
          role: inviteRole,
          workspaceName: workspace?.name || "",
          delivery: deliveryMode,
        },
      );
    },
    onSuccess: (data: { warning?: string; magicLink?: string }) => {
      if (deliveryMode === "magic_link" && data?.magicLink) {
        setGeneratedMagicLink(data.magicLink);
        showToast("Magic link generated successfully!");
      } else {
        const statusMessage = data?.warning || "Invite sent successfully.";
        showToast(statusMessage);
        setInviteEmail("");
        setInviteFirstName("");
        setInviteSurname("");
        setInviteWorkspaceId("");
        setInviteRole("client");
        setDeliveryMode("email");
        setInviteModalOpen(false);
      }
      void queryClient.invalidateQueries({
        queryKey: ["all-system-users", workspaceId],
      });
    },
    onError: (err: Error) => {
      showToast(err.message || "Invite failed", "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) =>
      invokeAuthedFunction("admin-users", {
        action: "delete",
        workspaceId,
        userId,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["all-system-users", workspaceId],
      });
      showToast("Client deleted.");
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Delete failed";
      showToast(message, "error");
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: {
      userId: string;
      email: string;
      firstName: string;
      surname: string;
      workspaceIds: string[];
    }) =>
      invokeAuthedFunction("admin-users", {
        action: "update_profile",
        workspaceId,
        ...payload,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["all-system-users", workspaceId],
      });
      showToast("Client profile updated.");
      setEditingUser(null);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Profile update failed";
      showToast(message, "error");
    },
  });

  const allUsers = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  // Deduplicated list of admin users
  const adminUsers = useMemo(() => {
    const seen = new Set<string>();
    return allUsers.filter((u) => {
      if (u.role !== "admin") return false;
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }, [allUsers]);

  // Non-admin users grouped by workspace
  const groupedClients = useMemo(() => {
    const groups: Record<string, GroupedUsers> = {};
    allUsers
      .filter((u) => u.role !== "admin")
      .forEach((user) => {
        const workspaces = user.workspace_names ?? ["Unassigned"];
        workspaces.forEach((ws) => {
          if (!groups[ws]) {
            groups[ws] = { workspaceName: ws, users: [] };
          }
          groups[ws].users.push(user);
        });
      });
    return Object.values(groups).sort((a, b) =>
      a.workspaceName.localeCompare(b.workspaceName),
    );
  }, [allUsers]);

  const isLoading = usersQuery.isLoading;
  const isError = usersQuery.isError;
  const isEmpty = !isLoading && !isError && allUsers.length === 0;

  const handleDelete = (userId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this user? This action cannot be undone.",
    );
    if (!confirmed) return;
    deleteMutation.mutate(userId);
  };

  const handleEditProfile = (user: SystemUser) => {
    setEditingUser(user);
    setEditEmail(user.email ?? "");
    setEditFirstName(user.first_name ?? "");
    setEditSurname(user.surname ?? "");
    // Resolve workspace names → IDs using the already-loaded workspacesQuery
    const resolvedIds = (user.workspace_names ?? [])
      .map((name) => workspacesQuery.data?.find((w) => w.name === name)?.id)
      .filter((id): id is string => Boolean(id));
    setEditWorkspaces(resolvedIds);
    setMenuOpen(null);
  };

  const handleSaveProfile = () => {
    if (!editingUser) return;

    updateProfileMutation.mutate({
      userId: editingUser.id,
      email: editEmail,
      firstName: editFirstName,
      surname: editSurname,
      workspaceIds: editWorkspaces,
    });
  };

  return (
    <div className="relative space-y-6">
      <DataStateWrapper
        isLoading={isLoading}
        isError={isError}
        error={usersQuery.error}
        onRetry={() => {
          void usersQuery.refetch();
        }}
        isEmpty={isEmpty}
        skeleton={<ClientsSkeleton />}
        empty={
          <EmptyState
            title="No users found"
            description="Invite users to get started."
            action={
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setInviteModalOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                Invite Client
              </Button>
            }
          />
        }
      >
        <Card className="relative overflow-visible border-[#222330] bg-[#191A22]">
          <div className="flex h-13 items-center justify-between border-b border-[#222330] px-6 py-2">
            <div className="text-sm font-medium text-foreground">All Users</div>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => setInviteModalOpen(true)}
              className="min-w-[120px]"
            >
              <UserPlus className="h-4 w-4" />
              Invite Client
            </Button>
          </div>

          <table className="w-full text-left text-sm">
            <tbody>
              {/* All Users - Grouped by Workspace */}
              {groupedUsers.map((group) => (
                <Fragment key={group.workspaceName}>
                  {/* Workspace Group Header */}
                  <tr className="h-10 border-b border-[#222330] bg-[#1E1F2A]">
                    <td className="px-6" colSpan={4}>
                      <div className="inline-flex items-center gap-[10px] text-xs">
                        <span className="font-medium text-[#E3E4EA]">
                          {group.workspaceName}
                        </span>
                        <span className="font-normal text-[#97989E]">
                          {group.users.length}
                        </span>
                      </div>
                    </td>
                  </tr>

                  {/* User Rows */}
                  {group.users.map((user) => {
                    const isVerified = Boolean(
                      user.email_confirmed_at || user.confirmed_at,
                    );

                    return (
                      <tr
                        key={user.id}
                        className="h-11 border-b border-[#292B38] bg-[#191A22] transition-colors hover:bg-[#1E2030]"
                      >
                        <td className="px-6 py-3.5 pl-12">
                          <UserAvatar
                            firstName={user.first_name}
                            surname={user.surname}
                            email={user.email}
                            avatarUrl={user.avatar_url}
                          />
                        </td>
                        <td className="px-6 py-3.5 text-[#959699]">
                          <span className="text-xs">{user.email}</span>
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge
                            className={
                              isVerified
                                ? "bg-emerald-100 text-emerald-700 border-emerald-200 text-xs"
                                : "bg-amber-100 text-amber-700 border-amber-200 text-xs"
                            }
                          >
                            {isVerified ? "Verified" : "Pending"}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <div
                            className="relative inline-block"
                            data-dropdown-menu
                          >
                            <button
                              type="button"
                              className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded text-[#999A9D] transition-colors hover:bg-card/50 hover:text-[#E3E4EA]"
                              onClick={() =>
                                setMenuOpen(
                                  menuOpen === user.id ? null : user.id,
                                )
                              }
                              aria-label="More options"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </button>

                            {menuOpen === user.id && (
                              <div className="absolute right-0 top-8 z-10 min-w-[160px] rounded-xl border border-border/70 bg-card p-2 shadow-card">
                                <button
                                  type="button"
                                  className="focus-ring block w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface/60"
                                  onClick={() => handleEditProfile(user)}
                                >
                                  Edit Profile
                                </button>
                                <button
                                  type="button"
                                  className="focus-ring block w-full rounded-md px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-surface/60"
                                  onClick={() => handleDelete(user.id)}
                                >
                                  Delete
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </Fragment>
              ))}
            </tbody>
          </table>
        </Card>
      </DataStateWrapper>

      {/* Invite Modal */}
      {inviteModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Invite User
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Send an invitation to join this workspace.
                </p>
              </div>
              <button
                type="button"
                className="text-muted transition-colors hover:text-foreground"
                onClick={() => {
                  setInviteModalOpen(false);
                  setInviteEmail("");
                  setInviteFirstName("");
                  setInviteSurname("");
                  setInviteWorkspaceId("");
                  setInviteRole("client");
                  setDeliveryMode("email");
                  setGeneratedMagicLink(null);
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                inviteMutation.mutate();
              }}
            >
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Email *
                </label>
                <Input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="client@example.com"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                    First Name
                  </label>
                  <Input
                    value={inviteFirstName}
                    onChange={(event) => setInviteFirstName(event.target.value)}
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                    Surname
                  </label>
                  <Input
                    value={inviteSurname}
                    onChange={(event) => setInviteSurname(event.target.value)}
                    placeholder="Surname"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Role *
                </label>
                <div className="flex gap-2">
                  {(["client", "admin"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setInviteRole(r)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm font-medium capitalize transition-colors ${
                        inviteRole === r
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-surface text-muted hover:text-foreground"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Workspace *
                </label>
                <select
                  value={inviteWorkspaceId}
                  onChange={(e) => setInviteWorkspaceId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Select workspace...</option>
                  {workspacesQuery.data?.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted">
                  User will be assigned to the selected workspace as{" "}
                  {inviteRole}
                </p>
              </div>

              {!generatedMagicLink ? (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="magic-link-checkbox"
                      checked={deliveryMode === "magic_link"}
                      onChange={(e) =>
                        setDeliveryMode(
                          e.target.checked ? "magic_link" : "email",
                        )
                      }
                      className="h-4 w-4 rounded border-border bg-surface text-primary focus:ring-2 focus:ring-primary"
                    />
                    <label
                      htmlFor="magic-link-checkbox"
                      className="cursor-pointer text-sm text-foreground"
                    >
                      Generate magic link instead of sending email
                    </label>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setInviteModalOpen(false);
                        setInviteEmail("");
                        setInviteFirstName("");
                        setInviteSurname("");
                        setInviteWorkspaceId("");
                        setInviteRole("client");
                        setDeliveryMode("email");
                        setGeneratedMagicLink(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        inviteMutation.isPending ||
                        !inviteEmail.trim() ||
                        !inviteWorkspaceId
                      }
                    >
                      {inviteMutation.isPending
                        ? "Processing..."
                        : deliveryMode === "magic_link"
                          ? "Generate Link"
                          : "Send Invite"}
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-lg border border-border bg-surface p-4">
                    <p className="mb-2 text-sm font-medium text-foreground">
                      Magic Link Generated
                    </p>
                    <div className="flex items-center gap-2">
                      <Input
                        readOnly
                        value={generatedMagicLink}
                        className="flex-1 font-mono text-xs"
                      />
                      <Button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(generatedMagicLink);
                          showToast("Magic link copied to clipboard!");
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <p className="mt-2 text-xs text-muted">
                      Share this link with the user to grant them access.
                    </p>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      type="button"
                      onClick={() => {
                        setInviteModalOpen(false);
                        setInviteEmail("");
                        setInviteFirstName("");
                        setInviteSurname("");
                        setInviteWorkspaceId("");
                        setInviteRole("client");
                        setDeliveryMode("email");
                        setGeneratedMagicLink(null);
                      }}
                    >
                      Done
                    </Button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      ) : null}

      {/* Edit Profile Modal */}
      {editingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Edit Profile
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Update client information and workspace assignments.
                </p>
              </div>
              <button
                type="button"
                className="text-muted transition-colors hover:text-foreground"
                onClick={() => {
                  setEditingUser(null);
                  setEditEmail("");
                  setEditFirstName("");
                  setEditSurname("");
                  setEditWorkspaces([]);
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                handleSaveProfile();
              }}
            >
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Email *
                </label>
                <Input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                    First Name
                  </label>
                  <Input
                    value={editFirstName}
                    onChange={(event) => setEditFirstName(event.target.value)}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                    Surname
                  </label>
                  <Input
                    value={editSurname}
                    onChange={(event) => setEditSurname(event.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Workspace Access
                </label>
                <div className="space-y-2 rounded-lg border border-border bg-surface p-3">
                  {workspacesQuery.data?.map((ws) => (
                    <div key={ws.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id={`workspace-${ws.id}`}
                        checked={editWorkspaces.includes(ws.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setEditWorkspaces([...editWorkspaces, ws.id]);
                          } else {
                            setEditWorkspaces(
                              editWorkspaces.filter((id) => id !== ws.id),
                            );
                          }
                        }}
                        className="h-4 w-4 rounded border-border bg-card text-primary focus:ring-2 focus:ring-primary"
                      />
                      <label
                        htmlFor={`workspace-${ws.id}`}
                        className="cursor-pointer text-sm text-foreground"
                      >
                        {ws.name}
                      </label>
                    </div>
                  ))}
                </div>
                <p className="mt-1 text-xs text-muted">
                  Check or uncheck workspaces to add or remove this user's
                  access.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setEditingUser(null);
                    setEditEmail("");
                    setEditFirstName("");
                    setEditSurname("");
                    setEditWorkspaces([]);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    updateProfileMutation.isPending || !editEmail.trim()
                  }
                >
                  {updateProfileMutation.isPending
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
