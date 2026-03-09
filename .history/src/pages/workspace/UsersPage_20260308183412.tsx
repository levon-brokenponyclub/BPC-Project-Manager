import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import {
  Download,
  Search,
  UserPlus,
  MoreVertical,
  ChevronDown,
  X,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";

import { getMyWorkspaceRole, getWorkspaceUsers } from "@/api/workspaces";
import { getMyWorkspaces } from "@/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/queryKeys";
import { useToast } from "@/providers/ToastProvider";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import { useAuth } from "@/providers/AuthProvider";

function UsersSkeleton(): React.ReactElement {
  return (
    <div className="border border-border rounded-lg">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Avatar
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                First Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Surname
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Last active
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Invited by
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Invited on
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                Access
              </th>
            </tr>
          </thead>
          <tbody className="bg-card divide-y divide-border">
            {Array.from({ length: 5 }).map((_, i) => (
              <tr key={i}>
                <td className="px-6 py-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-[100px]" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-[100px]" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-[160px]" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-6 w-[60px]" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-[80px]" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-[100px]" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-[80px]" />
                </td>
                <td className="px-6 py-4">
                  <Skeleton className="h-4 w-[80px]" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function UsersPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<{
    id: string;
    email: string | null;
  } | null>(null);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState("");
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { user: authUser } = useAuth();

  const roleQuery = useQuery({
    queryKey: ["workspace", workspaceId, "myRole"],
    queryFn: () => getMyWorkspaceRole(workspaceId),
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
      showToast("User assigned to workspace successfully!");
      setAssignModalOpen(false);
      setSelectedUser(null);
      setTargetWorkspaceId("");
      void queryClient.invalidateQueries({
        queryKey: queryKeys.workspaceUsers(workspaceId),
      });
    },
    onError: (err: Error) => {
      showToast(err.message || "Failed to assign user", "error");
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
  const isLoading = usersQuery.isLoading || roleQuery.isLoading;
  const isError = usersQuery.isError;

  const filteredUsers = users.filter((user) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.email?.toLowerCase().includes(query) ||
      user.user_id.toLowerCase().includes(query)
    );
  });

  const isEmpty = !isLoading && !isError && users.length === 0;

  if (isLoading) {
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
        <UsersSkeleton />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <p className="text-sm text-destructive">
            Failed to load users. Please try again.
          </p>
        </Card>
      </div>
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
        {isAdmin && (
          <Button variant="primary" size="sm">
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

      {/* Users Table */}
      {isEmpty ? (
        <Card className="p-12 text-center">
          <p className="text-muted">No users found in this workspace.</p>
        </Card>
      ) : (
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Avatar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    First Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Surname
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Last active
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Invited by
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Invited on
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted uppercase tracking-wider">
                    Access
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {/* Invite Row (Admin Only) */}
                {isAdmin && (
                  <tr className="hover:bg-surface/50 transition-colors">
                    <td colSpan={9} className="px-6 py-4">
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
                {filteredUsers.map((user) => {
                  const displayName = user.email?.split("@")[0] ?? "Unknown";
                  const initials = displayName
                    .split(/[\s._-]/)
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((part) => part.charAt(0).toUpperCase())
                    .join("");

                  return (
                    <tr
                      key={user.user_id}
                      className="hover:bg-surface/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt={displayName}
                            className="h-10 w-10 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center border border-border">
                            <span className="text-sm font-medium text-primary">
                              {initials}
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-foreground">
                          {user.first_name ?? "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-foreground">
                          {user.surname ?? "—"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-foreground">
                          {user.email ?? "No email"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className="bg-primary/10 text-primary border-primary/20">
                          Member
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted">—</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted">—</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-muted">—</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="relative" data-menu>
                          <button
                            type="button"
                            className="p-1 rounded hover:bg-surface transition-colors"
                            aria-label="More options"
                            onClick={() =>
                              setMenuOpen(
                                menuOpen === user.user_id ? null : user.user_id,
                              )
                            }
                          >
                            <MoreVertical className="h-4 w-4 text-muted" />
                          </button>

                          {menuOpen === user.user_id && isAdmin && (
                            <div className="absolute right-0 top-8 z-10 w-48 rounded-md border border-border bg-card shadow-lg">
                              <button
                                type="button"
                                className="w-full px-4 py-2 text-left text-sm text-foreground hover:bg-surface transition-colors"
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

      {/* Assign to Workspace Modal */}
      {assignModalOpen && selectedUser ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  Assign to Workspace
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Assign {selectedUser.email || "this user"} to another
                  workspace
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
                    assignMutation.isPending || !targetWorkspaceId.trim()
                  }
                >
                  {assignMutation.isPending ? "Assigning..." : "Assign"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
