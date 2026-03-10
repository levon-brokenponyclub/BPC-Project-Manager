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
    <div className="min-h-screen bg-[#ECECEC] dark:bg-[#0B0C10] px-4 py-10 text-[#1A1A1A] dark:text-[#E3E4EA] md:py-16">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-medium leading-8 tracking-[-0.16px] text-[#1A1A1A] dark:text-[#E3E4EA] mb-1">
              Select Workspace
            </h1>
            {isDemoMode ? (
              <span className="rounded-full bg-[#E4E4E4] dark:bg-[#1C1C26] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#575859] dark:text-[#888A93] border border-[#DCDCDC] dark:border-[#222330]">
                Demo Mode
              </span>
            ) : null}
          </div>
          <p className="text-[15px] leading-[22px] font-medium text-[#575859] dark:text-[#888A93]">
            Choose a client workspace you have access to.
          </p>
        </div>

        <div className="grid gap-4">
          {workspacesQuery.isLoading
            ? Array.from({ length: 4 }).map((_, index) => (
                <Card
                  key={`workspace-skeleton-${index}`}
                  className="px-5 py-4 border border-[#DCDCDC] dark:border-[#222330] bg-[#FBFBFB] dark:bg-[#15161D]"
                >
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-56 bg-[#F5F5F5] dark:bg-[#1C1C26]" />
                    <Skeleton className="h-4 w-44 bg-[#F5F5F5] dark:bg-[#1C1C26]" />
                  </div>
                </Card>
              ))
            : null}
          {(workspacesQuery.data ?? []).map((workspace) => (
            <Link key={workspace.id} to={`/w/${workspace.id}/project-overview`}>
              <Card className="flex items-center justify-between px-5 py-5 transition-all bg-[#FBFBFB] dark:bg-[#15161D] border border-[#DCDCDC] dark:border-[#222330] hover:bg-[#F3F3F3] dark:hover:bg-[#1C1C26] rounded-[4px]">
                <div>
                  <p className="text-[18px] leading-[22px] font-medium text-[#1A1A1A] dark:text-[#E3E4EA] mb-1">
                    {workspace.name}
                  </p>
                  <p className="text-sm text-[#575859] dark:text-[#888A93]">
                    Workspace ID: {workspace.id.slice(0, 8)}...
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-[#575859] dark:text-[#888A93]" />
              </Card>
            </Link>
          ))}
          {!workspacesQuery.isLoading &&
          (workspacesQuery.data ?? []).length === 0 ? (
            <Card className="px-5 py-8 text-sm text-[#575859] dark:text-[#888A93] bg-[#FBFBFB] dark:bg-[#15161D] border border-[#DCDCDC] dark:border-[#222330] rounded-[4px]">
              No workspaces available yet.
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}
