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
    <div className="dark min-h-screen bg-[#15161D] px-4 py-10 text-white md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-medium leading-8 tracking-[-0.16px] text-white">
              Select Workspace
            </h1>
            {isDemoMode ? (
              <span className="rounded-full bg-[#23262C] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#E3E4E8] border border-[#313339]">
                Demo Mode
              </span>
            ) : null}
          </div>
          <p className="text-[18px] leading-[22px] font-medium text-[#97989E] mb-1">
            Choose a client workspace you have access to.
          </p>
        </div>

        <div className="grid gap-4">
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
              <Card className="flex items-center justify-between px-5 py-5 transition-all bg-[#191A22] border border-[#292B38] hover:bg-[#1F2028] rounded-[4px]">
                <div>
                  <p className="text-[18px] leading-[22px] font-medium text-white mb-1">
                    {workspace.name}
                  </p>
                  <p className="text-sm text-[#939496]">
                    Workspace ID: {workspace.id.slice(0, 8)}...
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-[#939496]" />
              </Card>
            </Link>
          ))}
          {!workspacesQuery.isLoading &&
          (workspacesQuery.data ?? []).length === 0 ? (
            <Card className="px-5 py-8 text-sm text-[#939496] bg-[#191A22] border border-[#292B38] rounded-[4px]">
              No workspaces available yet.
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
