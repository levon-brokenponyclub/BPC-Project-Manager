import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { getMyWorkspaceRole } from "@/api/workspaces";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  confirmed_at: string | null;
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
  const { user } = useAuth();
  const [roleViewMode, setRoleViewMode] = useState<RoleViewMode>("admin");

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
            {users.map((user) => {
              const isVerified = Boolean(
                user.email_confirmed_at || user.confirmed_at,
              );
              const isCurrentUser = user.id === (user?.id ?? "") ? false : false;
              return (
                <tr key={user.id} className="border-b border-border/70">
                  <td className="px-5 py-4 text-foreground font-medium">
                    {user.email ?? "(no email)"}
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
                    {user.created_at
                      ? new Date(user.created_at).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-5 py-4 text-muted">
                    {user.last_sign_in_at
                      ? new Date(user.last_sign_in_at).toLocaleString()
                      : "-"}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        disabled={isVerified || verifyMutation.isPending}
                        onClick={() => verifyMutation.mutate(user.id)}
                      >
                        {isVerified ? "Verified" : "Verify User"}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700"
                        disabled={deleteMutation.isPending || user.id === user?.id}
                        onClick={() => {
                          const confirmation = prompt(
                            'Type "DELETE" to confirm user deletion:',
                          );
                          if (confirmation !== "DELETE") {
                            showToast("User deletion cancelled.", "error");
                            return;
                          }
                          deleteMutation.mutate(user.id);
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
    </div>
  );
}
