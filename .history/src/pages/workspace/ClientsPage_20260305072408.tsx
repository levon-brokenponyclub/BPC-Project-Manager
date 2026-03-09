import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { getMyWorkspaceRole } from "@/api/workspaces";
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

interface AdminUser {
  id: string;
  email: string | null;
  avatar_url?: string | null;
  first_name?: string | null;
  surname?: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  confirmed_at: string | null;
}

const CLIENT_AVATAR_FALLBACKS = [
  "/anime-avatar-icon.png",
  "/avatar-gaming-icon.png",
  "/avatar-person-icon.png",
  "/batman-avatar-icon%20copy.png",
  "/cool-avatar-icons.png",
  "/funny-avatar-icons.png",
  "/lego-avatar-icon.png",
  "/programmer-avatar-icon.png",
  "/spider-man-avatar-icon.png",
  "/star-wars-avatar-icon.png",
];

function fallbackAvatarFromEmail(email: string | null): string {
  if (!email) {
    return CLIENT_AVATAR_FALLBACKS[0];
  }

  const normalized = email.toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i += 1) {
    hash = (hash * 31 + normalized.charCodeAt(i)) % 2147483647;
  }

  return CLIENT_AVATAR_FALLBACKS[
    Math.abs(hash) % CLIENT_AVATAR_FALLBACKS.length
  ];
}

async function invokeAdminUsers(
  action: "list" | "verify" | "delete",
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
  const [editAvatarUrl, setEditAvatarUrl] = useState("");

  useEffect(() => {
    if (!workspaceId) {
      return;
    }

    setRoleViewMode(getStoredRoleView(workspaceId) ?? "admin");
  }, [workspaceId]);

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
      avatarUrl: string;
    }) =>
      invokeAdminUsers("update_profile" as any, { workspaceId, ...payload }),
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

  const users = useMemo(() => usersQuery.data ?? [], [usersQuery.data]);

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
      <Card className="p-5">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          Clients
        </h1>
        <p className="mt-1 text-sm text-muted">
          All registered users and verification status.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-stone-50/70 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">Email</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Created</th>
              <th className="px-5 py-3 font-semibold">Last Sign In</th>
              <th className="px-5 py-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {usersQuery.isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <tr
                    key={`users-skeleton-${index}`}
                    className="border-b border-border/70"
                  >
                    <td className="px-5 py-4" colSpan={5}>
                      <div className="grid grid-cols-5 gap-4">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="h-5 w-full" />
                      </div>
                    </td>
                  </tr>
                ))
              : null}
            {users.map((clientUser) => {
              const isVerified = Boolean(
                clientUser.email_confirmed_at || clientUser.confirmed_at,
              );
              const isCurrentUser = clientUser.id === (authUser?.id ?? "");
              const displayAvatarUrl =
                clientUser.avatar_url ||
                fallbackAvatarFromEmail(clientUser.email);
              return (
                <tr key={clientUser.id} className="border-b border-border/70">
                  <td className="px-5 py-4 text-foreground font-medium">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 overflow-hidden rounded-full bg-stone-100 ring-1 ring-border/60">
                        <img
                          src={displayAvatarUrl}
                          alt={clientUser.email ?? "User avatar"}
                          className="h-full w-full object-cover"
                        />
                      </div>
                      <span>{clientUser.email ?? "(no email)"}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        isVerified
                          ? "bg-green-100 text-green-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {isVerified ? "Verified" : "Waiting for verification"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {clientUser.created_at
                      ? new Date(clientUser.created_at).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {clientUser.last_sign_in_at
                      ? new Date(clientUser.last_sign_in_at).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updateProfileMutation.isPending}
                        onClick={() => {
                          setEditingUser(clientUser);
                          setEditEmail(clientUser.email ?? "");
                          setEditFirstName(clientUser.first_name ?? "");
                          setEditSurname(clientUser.surname ?? "");
                          setEditAvatarUrl(clientUser.avatar_url ?? "");
                        }}
                      >
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isVerified || verifyMutation.isPending}
                        onClick={() => verifyMutation.mutate(clientUser.id)}
                      >
                        {isVerified ? "Verified" : "Verify User"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        disabled={deleteMutation.isPending || isCurrentUser}
                        onClick={() => {
                          const confirmation = prompt(
                            'Type "DELETE" to confirm user deletion:',
                          );
                          if (confirmation !== "DELETE") {
                            showToast("User deletion cancelled.", "error");
                            return;
                          }
                          deleteMutation.mutate(clientUser.id);
                        }}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 ? (
              <tr>
                <td
                  className="px-5 py-10 text-center text-sm text-muted"
                  colSpan={5}
                >
                  No users found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>

      {editingUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Edit Client Profile
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Update client email, name, and avatar image URL.
                </p>
              </div>
              <button
                type="button"
                className="text-muted transition-colors hover:text-foreground"
                onClick={() => setEditingUser(null)}
              >
                x
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

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-muted">
                  Avatar URL
                </label>
                <Input
                  value={editAvatarUrl}
                  onChange={(event) => setEditAvatarUrl(event.target.value)}
                  placeholder="/anime-avatar-icon.png"
                />
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
                      avatarUrl: editAvatarUrl.trim(),
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
