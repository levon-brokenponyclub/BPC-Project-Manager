import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { getMyWorkspaceRole } from "@/api/workspaces";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  getEffectiveRole,
  getStoredRoleView,
  type RoleViewMode,
} from "@/lib/roleView";
import { supabase } from "@/lib/supabase";
import { useEffect, useMemo, useState } from "react";

interface AdminUser {
  id: string;
  email: string | null;
  created_at: string | null;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
  confirmed_at: string | null;
}

async function invokeAdminUsers(
  action: "list" | "verify",
  payload: Record<string, unknown>,
): Promise<any> {
  const {
    data: { session: initialSession },
  } = await supabase.auth.getSession();

  let session = initialSession;

  const expiresSoon =
    session?.expires_at != null &&
    session.expires_at * 1000 <= Date.now() + 30_000;

  if (!session || expiresSoon) {
    const {
      data: { session: refreshedSession },
      error: refreshError,
    } = await supabase.auth.refreshSession();

    if (refreshError) {
      throw new Error(
        "Your session expired. Please sign in again and retry.",
      );
    }

    session = refreshedSession;
  }

  const accessToken = session?.access_token;
  if (!accessToken) {
    throw new Error(
      "You are not authenticated with Supabase. Please sign in again.",
    );
  }

  const { data, error } = await supabase.functions.invoke("admin-users", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
    body: {
      action,
      ...payload,
    },
  });

  if (error) {
    throw new Error(error.message || "Request failed");
  }

  if (data?.error) {
    throw new Error(String(data.error));
  }

  return data;
}

export function ClientsPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const queryClient = useQueryClient();
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
    <div className="space-y-4">
      <Card className="p-5">
        <h1 className="text-xl font-semibold text-foreground">Clients</h1>
        <p className="mt-1 text-sm text-muted">
          All registered users and verification status.
        </p>
      </Card>

      <Card className="overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-stone-50/70 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Created</th>
              <th className="px-5 py-3">Last Sign In</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const isVerified = Boolean(
                user.email_confirmed_at || user.confirmed_at,
              );
              return (
                <tr key={user.id} className="border-b border-border/80">
                  <td className="px-5 py-4 text-foreground">
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
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={isVerified || verifyMutation.isPending}
                      onClick={() => verifyMutation.mutate(user.id)}
                    >
                      {isVerified ? "Verified" : "Verify User"}
                    </Button>
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
                  {usersQuery.isLoading
                    ? "Loading users..."
                    : "No users found."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
