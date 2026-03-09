import { useMutation, useQuery, useQueryClient } from "@tantml:invoke>
<parameter name="query">
import { useParams } from "react-router-dom";
import {
  Download,
  Search,
  UserPlus,
  MoreVertical,
  ChevronDown,
  X,
} from "lucide-react";

import { getMyWorkspaceRole } from "@/api/workspaces";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getEffectiveRole,
  getStoredRoleView,
  type RoleViewMode,
} from "@/lib/roleView";
import { useToast } from "@/providers/ToastProvider";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { isDemoMode, supabase } from "@/lib/supabase";

interface AdminUser {
  id: string;
  email: string | null;
  avatar_url?: string | null;
  first_name?: string | null;
  surname?: string | null;
  workspace_names?: string[];
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  confirmed_at: string | null;
}

function fallbackAvatarFromEmail(_email: string | null): string {
  return "/defaultAvatar.png";
}

async function invokeAdminUsers(
  action: "list" | "verify" | "delete" | "update_profile",
  payload: Record<string, unknown>,
): Promise<any> {
  return invokeAuthedFunction("admin-users", {
    action,
    ...payload,
  });
}

export function ClientsPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user: authUser } = useAuth();
  const [roleViewMode, setRoleViewMode] = useState<RoleViewMode>("admin");
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editFirstName, setEditFirstName] = useState("");
  const [editSurname, setEditSurname] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteSurname, setInviteSurname] = useState("");
  const [workspaceName, setWorkspaceName] = useState("");

  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    setRoleViewMode(getStoredRoleView(workspaceId) ?? "admin");
  }, [workspaceId]);

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

  const usersQuery = useQuery({
    queryKey: ["workspace", workspaceId, "clients-users"],
    queryFn: async () => {
      const data = await invokeAdminUsers("list", { workspaceId });
      return (data?.users ?? []) as AdminUser[];
    },
    enabled: Boolean(workspaceId) && effectiveRole === "admin",
    retry: 0,
  });

  const verifyMutation = useMutation({
    mutationFn: async (userId: string) =>
      invokeAdminUsers("verify", { workspaceId, userId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspace", workspaceId, "clients-users"],
      });
      showToast("User verified successfully.");
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error ? err.message : "Verification failed";
      showToast(message, "error");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) =>
      invokeAdminUsers("delete", { workspaceId, userId }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspace", workspaceId, "clients-users"],
      });
      showToast("User deleted successfully.");
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
    }) => invokeAdminUsers("update_profile", { workspaceId, ...payload }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["workspace", workspaceId, "clients-users"],
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

  const workspaceQuery = useQuery({
    queryKey: ["workspace", workspaceId, "details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("workspaces")
        .select("name")
        .eq("id", workspaceId)
        .single();

      if (error) {
        throw error;
      }

      return data.name as string;
    },
    enabled: Boolean(workspaceId),
  });

  useEffect(() => {
    if (workspaceQuery.data) {
      setWorkspaceName(workspaceQuery.data);
    }
  }, [workspaceQuery.data]);

  const inviteMutation = useMutation({
    mutationFn: async () => {
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
      showToast(statusMessage);
      setInviteEmail("");
      setInviteFirstName("");
      setInviteSurname("");
      setInviteModalOpen(false);
      void queryClient.invalidateQueries({
        queryKey: ["workspace", workspaceId, "clients-users"],
      });
    },
    onError: (err: Error) => {
      showToast(err.message || "Invite failed", "error");
    },
  });

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

  const filteredUsers = users.filter((clientUser) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      clientUser.email?.toLowerCase().includes(query) ||
      clientUser.first_name?.toLowerCase().includes(query) ||
      clientUser.surname?.toLowerCase().includes(query)
    );
  });

  if (roleQuery.isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">
              Manage people
            </h1>
            <a
              href="#"
              className="text-sm text-primary hover:underline inline-block mt-1"
            >
              Learn more
            </a>
          </div>
          <Button variant="secondary" size="sm" disabled>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
        <Card className="p-6">
          <Skeleton className="h-7 w-28" />
          <Skeleton className="h-4 w-72 mt-2" />
        </Card>
      </div>
    );
  }

  if (effectiveRole !== "admin") {
    return (
      <Card className="p-5">
        <h1 className="text-lg font-semibold text-foreground">Clients</h1>
        <p className="mt-2 text-sm text-muted">Admin access required.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Manage people
          </h1>
          <a
            href="#"
            className="text-sm text-primary hover:underline inline-block mt-1"
          >
            Learn more
          </a>
        </div>
        <Button variant="secondary" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
      </div>

      {/* Search and Invite */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" />
          <Input
            type="text"
            placeholder="Search or invite by email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {effectiveRole === "admin" && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setInviteModalOpen(true)}
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Invite people
          </Button>
        )}
      </div>

      {/* User Count Dropdown */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md border border-border bg-card hover:bg-surface transition-colors text-sm font-medium text-foreground"
        >
          All Users ({users.length})
          <ChevronDown className="h-4 w-4 text-muted" />
        </button>
      </div>

      {/* Clients Table */}
      {usersQuery.isLoading ? (
        <div className="border border-border rounded-lg">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Workspace
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Last Sign In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <Skeleton className="h-4 w-[120px]" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-[160px]" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-[120px]" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-6 w-[60px]" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-6 w-[80px]" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-[100px]" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-[100px]" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-8 w-8" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-muted">
            {searchQuery ? "No users match your search." : "No users found."}
          </p>
        </Card>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Workspace
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Last Sign In
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {/* Invite Row (Admin Only) */}
                {effectiveRole === "admin" && (
                  <tr className="hover:bg-surface/50 transition-colors">
                    <td colSpan={8} className="px-6 py-4">
                      <button
                        type="button"
                        className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                      >
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <UserPlus className="h-5 w-5 text-primary" />
                        </div>
                        Invite people
                      </button>
                    </td>
                  </tr>
                )}

                {/* User Rows */}
                {filteredUsers.map((clientUser) => {
                  const isVerified = Boolean(
                    clientUser.email_confirmed_at || clientUser.confirmed_at,
                  );
                  const isCurrentUser = clientUser.id === (authUser?.id ?? "");
                  const displayAvatarUrl =
                    clientUser.avatar_url ||
                    fallbackAvatarFromEmail(clientUser.email);
                  const displayName =
                    clientUser.first_name || clientUser.surname
                      ? `${clientUser.first_name ?? ""} ${clientUser.surname ?? ""}`.trim()
                      : (clientUser.email?.split("@")[0] ?? "Unknown");
                  const initials = displayName
                    .split(/[\s._-]/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part.charAt(0).toUpperCase())
                    .join("");

                  return (
                    <tr
                      key={clientUser.id}
                      className="hover:bg-surface/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 overflow-hidden rounded-full border border-border bg-surface">
                            <img
                              src={displayAvatarUrl}
                              alt={displayName}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <span className="text-sm font-medium text-foreground">
                            {displayName}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-foreground">
                          {clientUser.email ?? "(no email)"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted">
                          {clientUser.workspace_names &&
                          clientUser.workspace_names.length > 0
                            ? clientUser.workspace_names.join(", ")
                            : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            isVerified
                              ? "bg-primary/10 text-primary border-primary/20"
                              : "bg-amber-100 text-amber-700 border-amber-200"
                          }
                        >
                          {isVerified ? "Client" : "Guest"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge
                          className={
                            isVerified
                              ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                              : "bg-amber-100 text-amber-700 border-amber-200"
                          }
                        >
                          {isVerified ? "Verified" : "Pending"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted">
                          {clientUser.created_at
                            ? new Date(
                                clientUser.created_at,
                              ).toLocaleDateString()
                            : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted">
                          {clientUser.last_sign_in_at
                            ? new Date(
                                clientUser.last_sign_in_at,
                              ).toLocaleDateString()
                            : "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative" data-dropdown-menu>
                          <button
                            type="button"
                            onClick={() =>
                              setMenuOpen(
                                menuOpen === clientUser.id
                                  ? null
                                  : clientUser.id,
                              )
                            }
                            className="p-1 rounded hover:bg-surface transition-colors"
                            aria-label="More options"
                          >
                            <MoreVertical className="h-4 w-4 text-muted" />
                          </button>
                          {menuOpen === clientUser.id && (
                            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-card border border-border z-10">
                              <div className="py-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingUser(clientUser);
                                    setEditEmail(clientUser.email ?? "");
                                    setEditFirstName(
                                      clientUser.first_name ?? "",
                                    );
                                    setEditSurname(clientUser.surname ?? "");
                                    setMenuOpen(null);
                                  }}
                                  className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface transition-colors"
                                >
                                  Edit Profile
                                </button>
                                {!isVerified && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      verifyMutation.mutate(clientUser.id);
                                      setMenuOpen(null);
                                    }}
                                    disabled={verifyMutation.isPending}
                                    className="w-full text-left px-4 py-2 text-sm text-foreground hover:bg-surface transition-colors disabled:opacity-50"
                                  >
                                    Verify User
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    const confirmation = prompt(
                                      'Type "DELETE" to confirm user deletion:',
                                    );
                                    if (confirmation !== "DELETE") {
                                      showToast(
                                        "User deletion cancelled.",
                                        "error",
                                      );
                                      setMenuOpen(null);
                                      return;
                                    }
                                    deleteMutation.mutate(clientUser.id);
                                    setMenuOpen(null);
                                  }}
                                  disabled={
                                    deleteMutation.isPending || isCurrentUser
                                  }
                                  className="w-full text-left px-4 py-2 text-sm text-destructive hover:bg-surface transition-colors disabled:opacity-50"
                                >
                                  {isCurrentUser
                                    ? "Cannot delete self"
                                    : "Delete User"}
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Edit Client Profile
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Update client email and name.
                </p>
              </div>
              <button
                type="button"
                className="text-muted transition-colors hover:text-foreground"
                onClick={() => setEditingUser(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Email
                </label>
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(event) => setEditEmail(event.target.value)}
                  placeholder="client@example.com"
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
                    placeholder="First name"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                    Surname
                  </label>
                  <Input
                    value={editSurname}
                    onChange={(event) => setEditSurname(event.target.value)}
                    placeholder="Surname"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="ghost" onClick={() => setEditingUser(null)}>
                  Cancel
                </Button>
                <Button
                  disabled={
                    updateProfileMutation.isPending || !editEmail.trim()
                  }
                  onClick={() => {
                    updateProfileMutation.mutate({
                      userId: editingUser.id,
                      email: editEmail.trim(),
                      firstName: editFirstName.trim(),
                      surname: editSurname.trim(),
                    });
                  }}
                >
                  {updateProfileMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
