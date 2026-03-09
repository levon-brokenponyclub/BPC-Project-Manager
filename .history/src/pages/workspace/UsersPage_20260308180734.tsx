import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { UsersRound } from "lucide-react";

import { getMyWorkspaceRole, getWorkspaceUsers } from "@/api/workspaces";
import { Card } from "@/components/ui/card";
import { DataStateWrapper } from "@/components/ui/DataStateWrapper";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/queryKeys";

function UsersSkeleton(): React.ReactElement {
  return (
    <Card className="overflow-hidden">
      <div className="p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-[150px]" />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

export function UsersPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();

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
  const isLoading = usersQuery.isLoading || roleQuery.isLoading;
  const isError = usersQuery.isError;
  const isEmpty = !isLoading && !isError && users.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <p className="text-sm text-muted mt-1">
            Manage users who have access to this workspace
          </p>
        </div>
      </div>

      <DataStateWrapper
        isLoading={isLoading}
        isError={isError}
        error={usersQuery.error}
        onRetry={() => {
          void usersQuery.refetch();
        }}
        isEmpty={isEmpty}
        skeleton={<UsersSkeleton />}
        empty={
          <EmptyState
            title="No users found"
            description="This workspace doesn't have any users yet."
          />
        }
      >
        <Card className="overflow-hidden">
          <div className="p-6">
            <div className="space-y-4">
              {users.map((user) => {
                const displayName = user.email?.split("@")[0] ?? "Unknown User";
                const initials = displayName
                  .split(/[\s._-]/)
                  .filter(Boolean)
                  .slice(0, 2)
                  .map((part) => part.charAt(0).toUpperCase())
                  .join("");

                return (
                  <div
                    key={user.user_id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border bg-surface hover:bg-surface/80 transition-colors"
                  >
                    {user.avatar_url ? (
                      <img
                        src={user.avatar_url}
                        alt={displayName}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {initials}
                        </span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {displayName}
                      </p>
                      <p className="text-xs text-muted truncate">
                        {user.email ?? "No email provided"}
                      </p>
                    </div>
                    <UsersRound className="h-4 w-4 text-muted" />
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </DataStateWrapper>
    </div>
  );
}
