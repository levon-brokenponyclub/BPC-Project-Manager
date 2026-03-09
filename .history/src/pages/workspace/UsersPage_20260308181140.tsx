import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import {
  Download,
  Search,
  UserPlus,
  MoreVertical,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

import { getMyWorkspaceRole, getWorkspaceUsers } from "@/api/workspaces";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/queryKeys";

function UsersSkeleton(): React.ReactElement {
  return (
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
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <Skeleton className="h-4 w-[120px]" />
                  </div>
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
                    Name
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
                    <td colSpan={7} className="px-6 py-4">
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
                        <div className="flex items-center gap-3">
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
                          <span className="text-sm font-medium text-foreground">
                            {displayName}
                          </span>
                        </div>
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
                        <button
                          type="button"
                          className="p-1 rounded hover:bg-surface transition-colors"
                          aria-label="More options"
                        >
                          <MoreVertical className="h-4 w-4 text-muted" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
