import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { UserPlus, MoreVertical, X } from "lucide-react";
import { useState, useEffect, Fragment } from "react";

import { getMyWorkspaceRole, getWorkspaceUsers } from "@/api/workspaces";
import { getMyWorkspaces } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { queryKeys } from "@/lib/queryKeys";
import { useToast } from "@/providers/ToastProvider";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { supabase } from "@/lib/supabase";
import { DataStateWrapper } from "@/components/ui/DataStateWrapper";
import { EmptyState } from "@/components/ui/EmptyState";

function UsersSkeleton(): React.ReactElement {
  return (
    <Card className="border-[#222330] bg-[#191A22]">
      <div className="flex h-13 items-center justify-between border-b border-[#222330] px-6 py-2">
        <div className="h-4 w-32 animate-pulse rounded bg-muted/20" />
      </div>
      <table className="w-full text-left text-sm">
        <tbody>
          {Array.from({ length: 5 }).map((_, i) => (
            <tr
              key={i}
              className="h-11 border-b border-[#292B38] bg-[#191A22]"
            >
              <td className="px-6 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="h-7 w-7 animate-pulse rounded-full bg-muted/20" />
                  <div className="h-4 w-48 animate-pulse rounded bg-muted/20" />
                </div>
              </td>
              <td className="px-6 py-3.5">
                <div className="h-4 w-24 animate-pulse rounded bg-muted/20" />
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
  email,
  avatarUrl,
}: {
  email: string | null;
  avatarUrl?: string | null;
}) {
  if (!email) return <span className="text-muted">-</span>;

  const displayAvatarUrl = avatarUrl || "/defaultAvatar.png";
  const displayName = email.split("@")[0];
  const initials = displayName
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-3">
      <img
        src={displayAvatarUrl}
        alt={email}
        title={email}
        className="h-7 w-7 rounded-full border border-border object-cover"
      />
      <span className="text-[13px] font-medium text-[#E3E4EA]">{email}</span>
    </div>
  );
}

export function UsersPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    email: string | null;
  } | null>(null);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState("");
  const [removingUserId, setRemovingUserId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const roleQuery = useQuery({
    queryKey: ["workspace", workspaceId, "myRole"],
    queryFn: () => getMyWorkspaceRole(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const workspaceQuery = useQuery({
    queryKey: ["workspace", workspaceId, "details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .single();

      if (error) throw error;
      return data.name as string;
    },
    enabled: Boolean(workspaceId),
  });

  const usersQuery = useQuery({
    queryKey: queryKeys.workspaceUsers(workspaceId),
    queryFn: () => getWorkspaceUsers(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const workspacesQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: getMyWorkspaces,
  });

  const assignMutation = useMutation({
    mutationFn: async () => {
      if (!selectedUser || !targetWorkspaceId) {
        throw new Error("Missing user or workspace selection");
      }
      return invokeAuthedFunction("admin-users", {
        action: "assign_to_workspace",
        workspaceId,
        userId: selectedUser.id,
        targetWorkspaceId,
        role: "client",
      });
    },
    onSuccess: () => {
      showToast("User added to workspace successfully!");
      setAssignModalOpen(false);
      setSelectedUser(null);
      setTargetWorkspaceId("");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceUsers(workspaceId),
      });
    },
    onError: (err: Error) => {
      showToast(err.message || "Failed to add user", "error");
    },
  });

  const removeUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      return invokeAuthedFunction("admin-users", {
        action: "delete",
        workspaceId,
        userId,
      });
    },
    onSuccess: () => {
      showToast("User removed from workspace");
      setRemovingUserId(null);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceUsers(workspaceId),
      });
    },
    onError: (err: Error) => {
      showToast(err.message || "Failed to remove user", "error");
      setRemovingUserId(null);
    },
  });

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-menu]")) {
        setMenuOpen(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [menuOpen]);

  const users = usersQuery.data ?? [];
  const isAdmin = roleQuery.data === "admin";
  const isClient = roleQuery.data === "client";
  const isLoading =
    usersQuery.isLoading || roleQuery.isLoading || workspaceQuery.isLoading;
  const isError = usersQuery.isError || workspaceQuery.isError;
  const isEmpty = !isLoading && !isError && users.length === 0;

  const workspaceName = workspaceQuery.data || "Workspace";

  const handleRemoveUser = (userId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this user from this workspace?",
    );
    if (!confirmed) return;
    setRemovingUserId(userId);
    removeUserMutation.mutate(userId);
  };

  return (
    <div className="relative space-y-6">
      <DataStateWrapper
        isLoading={isLoading}
        isError={isError}
        error={usersQuery.error || workspaceQuery.error}
        onRetry={() => {
          void usersQuery.refetch();
          void workspaceQuery.refetch();
        }}
        isEmpty={isEmpty}
        skeleton={<UsersSkeleton />}
        empty={
          <EmptyState
            title="No users found"
            description="No users have been added to this workspace yet."
          />
        }
      >
        <Card className="relative overflow-visible border-[#222330] bg-[#191A22]">
          <div className="flex h-13 items-center justify-between border-b border-[#222330] px-6 py-2">
            <div className="text-sm font-medium text-foreground">
              {workspaceName} Users
            </div>

            {isAdmin &&  (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setAssignModalOpen(true)}
                className="min-w-[140px]"
              >
                <UserPlus className="h-4 w-4" />
                Add to workspace
              </Button>
            )}
          </div>

          <table className="w-full text-left text-sm">
            <tbody>
              {users.map((user) => {
                const displayName =
                  user.first_name || user.surname
                    ? `${user.first_name ?? ""} ${user.surname ?? ""}`.trim()
                    : user.email?.split("@")[0] ?? "Unknown";

                return (
                  <tr
                    key={user.user_id}
                    className="h-11 border-b border-[#292B38] bg-[#191A22] transition-colors hover:bg-[#1E2030]"
                  >
                    <td className="px-6 py-3.5">
                      <UserAvatar
                        email={user.email}
                        avatarUrl={user.avatar_url}
                      />
                    </td>

                    {!isClient && (
                      <>
                        <td className="px-6 py-3.5 text-[#959699]">
                          <span className="text-xs">{displayName}</span>
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge
                            className={
                              user.role === "admin"
                                ? "bg-primary/10 text-primary border-primary/20 text-xs"
                                : "bg-muted/50 text-foreground border-border text-xs"
                            }
                          >
                            {user.role === "admin"
                              ? "Admin"
                              : user.role === "client"
                                ? "Client"
                                : "Contributor"}
                          </Badge>
                        </td>
                        {isAdmin && (
                          <td className="px-6 py-3.5 text-right">
                            <div className="relative inline-block" data-menu>
                              <button
                                type="button"
                                className="focus-ring inline-flex h-7 w-7 items-center justify-center rounded text-[#999A9D] transition-colors hover:bg-card/50 hover:text-[#E3E4EA]"
                                onClick={() =>
                                  setMenuOpen(
                                    menuOpen === user.user_id
                                      ? null
                                      : user.user_id,
                                  )
                                }
                                aria-label="More options"
                              >
                                <MoreVertical className="h-4 w-4" />
                              </button>

                              {menuOpen === user.user_id && (
                                <div className="absolute right-0 top-8 z-10 min-w-[180px] rounded-xl border border-border/70 bg-card p-2 shadow-card">
                                  <button
                                    type="button"
                                    className="focus-ring block w-full rounded-md px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-surface/60"
                                    onClick={() => {
                                      setSelectedUser({
                                        id: user.user_id,
                                        email: user.email,
                                      });
                                      setAssignModalOpen(true);
                                      setMenuOpen(null);
                                    }}
                                  >
                                    Assign to workspace
                                  </button>
                                  <button
                                    type="button"
                                    className="focus-ring block w-full rounded-md px-3 py-2 text-left text-sm text-destructive transition-colors hover:bg-surface/60"
                                    onClick={() => {
                                      handleRemoveUser(user.user_id);
                                      setMenuOpen(null);
                                    }}
                                    disabled={removingUserId === user.user_id}
                                  >
                                    {removingUserId === user.user_id
                                      ? "Removing..."
                                      : "Remove from workspace"}
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        )}
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      </DataStateWrapper>

      {/* Assign to Workspace Modal */}
      {assignModalOpen && isAdmin ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Add to Workspace
                </h2>
                <p className="mt-1 text-sm text-muted">
                  {selectedUser
                    ? `Add ${selectedUser.email || "this user"} to another workspace`
                    : "Select a user to add to another workspace"}
                </p>
              </div>
              <button
                type="button"
                className="text-muted transition-colors hover:text-foreground"
                onClick={() => {
                  setAssignModalOpen(false);
                  setSelectedUser(null);
                  setTargetWorkspaceId("");
                }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault();
                assignMutation.mutate();
              }}
            >
              {!selectedUser && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Select User
                  </label>
                  <select
                    value={selectedUser?.id || ""}
                    onChange={(e) => {
                      const user = users.find((u) => u.user_id === e.target.value);
                      if (user) {
                        setSelectedUser({
                          id: user.user_id,
                          email: user.email,
                        });
                      }
                    }}
                    required
                    className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                  >
                    <option value="">Choose a user...</option>
                    {users.map((u) => (
                      <option key={u.user_id} value={u.user_id}>
                        {u.email}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  Select Workspace
                </label>
                <select
                  value={targetWorkspaceId}
                  onChange={(e) => setTargetWorkspaceId(e.target.value)}
                  required
                  className="w-full rounded-lg border border-border bg-surface px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Choose a workspace...</option>
                  {workspacesQuery.data?.map((ws) => (
                    <option key={ws.id} value={ws.id}>
                      {ws.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setAssignModalOpen(false);
                    setSelectedUser(null);
                    setTargetWorkspaceId("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    assignMutation.isPending ||
                    !targetWorkspaceId.trim() ||
                    !selectedUser
                  }
                >
                  {assignMutation.isPending ? "Adding..." : "Add to Workspace"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
