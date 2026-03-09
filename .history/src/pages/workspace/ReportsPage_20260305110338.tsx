import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { getHoursBreakdown } from "@/api";
import { ReportsSkeleton } from "@/components/skeletons/ReportsSkeleton";
import { Card } from "@/components/ui/card";
import { DataStateWrapper } from "@/components/ui/DataStateWrapper";
import { EmptyState } from "@/components/ui/EmptyState";
import { queryKeys } from "@/lib/queryKeys";

export function ReportsPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();

  const breakdownQuery = useQuery({
    queryKey: queryKeys.hoursBreakdown(workspaceId),
    queryFn: () => getHoursBreakdown(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const rows = breakdownQuery.data ?? [];
  const isLoading = breakdownQuery.isLoading;
  const isError = breakdownQuery.isError;
  const isEmpty = !isLoading && rows.length === 0;

  return (
    <DataStateWrapper
      isLoading={isLoading}
      isError={isError}
      error={breakdownQuery.error}
      onRetry={() => {
        void breakdownQuery.refetch();
      }}
      isEmpty={isEmpty}
      skeleton={<ReportsSkeleton />}
      empty={
        <EmptyState
          title="No report data yet"
          description="Tracked time will appear here once entries are logged."
        />
      }
    >
      <Card className="p-5">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          Hours Used Breakdown
        </h1>
        <p className="mt-1 text-sm text-muted">
          Simple report by task for this workspace.
        </p>

        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50/70 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Task</th>
                <th className="px-5 py-3 font-semibold">Hours Used</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.task_id} className="border-t border-border/70">
                  <td className="px-5 py-4 text-foreground">{row.task_title}</td>
                  <td className="px-5 py-4 text-foreground tabular font-medium">
                    {row.total_hours}h
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </DataStateWrapper>
  );
}
