import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

import { getMyWorkspaces } from "@/api";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { queryKeys } from "@/lib/queryKeys";
import { isDemoMode } from "@/lib/supabase";

export function WorkspaceSelectPage(): React.ReactElement {
  const workspacesQuery = useQuery({
    queryKey: queryKeys.workspaces,
    queryFn: getMyWorkspaces,
  });

  return (
    <div className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold text-foreground">
              Select Workspace
            </h1>
            {isDemoMode ? (
              <span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900">
                Demo Mode
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted">
            Choose a client workspace you have access to.
          </p>
        </div>

        <div className="grid gap-3">
          {workspacesQuery.isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Card key={`workspace-skeleton-${index}`} className="px-5 py-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-56" />
                    <Skeleton className="h-4 w-44" />
                  </div>
                </Card>
              ))
            : null}
          {(workspacesQuery.data ?? []).map((workspace) => (
            <Link key={workspace.id} to={`/w/${workspace.id}/dashboard`}>
              <Card className="flex items-center justify-between px-5 py-4 transition hover:-translate-y-0.5 hover:shadow-lg">
                <div>
                  <p className="font-semibold text-foreground">
                    {workspace.name}
                  </p>
                  <p className="text-sm text-muted">
                    Workspace ID: {workspace.id.slice(0, 8)}...
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted" />
              </Card>
            </Link>
          ))}
          {!workspacesQuery.isLoading && (workspacesQuery.data ?? []).length === 0 ? (
            <Card className="px-5 py-8 text-sm text-muted">
              No workspaces available yet.
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
