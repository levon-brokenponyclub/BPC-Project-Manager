import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { getWorkspaceSupportSummary, listTasks } from "@/api";
import { StatusPill } from "@/components/tasks/StatusPill";
import { Card } from "@/components/ui/card";
import { queryKeys } from "@/lib/queryKeys";

export function DashboardPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();

  const supportQuery = useQuery({
    queryKey: queryKeys.workspaceSupport(workspaceId),
    queryFn: () => getWorkspaceSupportSummary(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const recentTasksQuery = useQuery({
    queryKey: queryKeys.tasks(workspaceId, "All", ""),
    queryFn: () => listTasks(workspaceId, { status: "All" }),
    enabled: Boolean(workspaceId),
  });

  const summary = supportQuery.data;
  const allocated = Number(summary?.hours_allocated ?? 0);
  const used = Number(summary?.hours_used ?? 0);
  const remaining = Number(summary?.hours_remaining ?? 0);
  const progress = allocated > 0 ? Math.min(100, (used / allocated) * 100) : 0;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <h1 className="text-xl font-semibold text-foreground">Support Hours</h1>
        <p className="mt-1 text-sm text-muted">
          Prepaid retainer usage for this period.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <MetricCard label="Allocated" value={`${allocated.toFixed(2)}h`} />
          <MetricCard label="Used" value={`${used.toFixed(2)}h`} />
          <MetricCard label="Remaining" value={`${remaining.toFixed(2)}h`} />
        </div>

        <div className="mt-4 h-3 rounded-full bg-stone-100">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="text-lg font-semibold text-foreground">Recent Tasks</h2>
        <div className="mt-3 space-y-2">
          {(recentTasksQuery.data ?? []).slice(0, 8).map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between rounded-xl bg-stone-50 px-3 py-2"
            >
              <p className="text-sm font-medium text-foreground">
                {task.title}
              </p>
              <StatusPill status={task.status} />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function MetricCard({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.ReactElement {
  return (
    <div className="rounded-2xl border border-border bg-white px-4 py-4">
      <p className="text-xs uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-foreground">{value}</p>
    </div>
  );
}
