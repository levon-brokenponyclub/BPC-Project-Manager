import { useQuery } from "@tanstack/react-query";
import { useParams } from "react-router-dom";

import { listTasksWithUsers, getWorkspaceSupportSummary } from "@/api";
import type { TaskWithUsers } from "@/api/tasks";
import { StatusPill } from "@/components/tasks/StatusPill";
import { Card } from "@/components/ui/card";
import { queryKeys } from "@/lib/queryKeys";

type DueDateStatus = "on-time" | "at-risk" | "overdue";

function getDueDateStatus(
  dueDate: string | null,
  status: string,
): DueDateStatus | null {
  if (!dueDate || status === "Complete") return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffDays = Math.ceil(
    (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (diffDays < 0) return "overdue";
  if (diffDays <= 2) return "at-risk";
  return "on-time";
}

function DueDateIndicator({ status }: { status: DueDateStatus | null }) {
  if (!status) return null;

  const colors = {
    "on-time": "bg-green-500",
    "at-risk": "bg-yellow-500",
    overdue: "bg-red-500",
  };

  return (
    <span className={`inline-block h-2 w-2 rounded-full ${colors[status]}`} />
  );
}

function UserAvatar({ email }: { email: string | null }) {
  if (!email) return <span className="text-muted text-xs">-</span>;

  const initial = email.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex h-5 w-5 items-center justify-center rounded-full bg-stone-200 text-[10px] font-medium text-stone-700">
        {initial}
      </div>
      <span className="text-xs">{email.split("@")[0]}</span>
    </div>
  );
}

export function DashboardPage(): React.ReactElement {
  const { workspaceId = "" } = useParams<{ workspaceId: string }>();

  const supportQuery = useQuery({
    queryKey: queryKeys.workspaceSupport(workspaceId),
    queryFn: () => getWorkspaceSupportSummary(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const recentTasksQuery = useQuery({
    queryKey: queryKeys.tasks(workspaceId, "All", ""),
    queryFn: () => listTasksWithUsers(workspaceId, { status: "All" }),
    enabled: Boolean(workspaceId),
  });

  const summary = supportQuery.data;
  const allocated = Number(summary?.hours_allocated ?? 0);
  const used = Number(summary?.hours_used ?? 0);
  const remaining = Number(summary?.hours_remaining ?? 0);
  const progress = allocated > 0 ? Math.min(100, (used / allocated) * 100) : 0;

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <h1 className="text-xl md:text-2xl font-semibold tracking-tight text-foreground">
          Support Hours
        </h1>
        <p className="mt-1 text-sm text-muted">
          Prepaid retainer usage for this period.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <MetricCard label="Allocated" value={`${allocated.toFixed(2)}h`} />
          <MetricCard label="Used" value={`${used.toFixed(2)}h`} />
          <MetricCard label="Remaining" value={`${remaining.toFixed(2)}h`} />
        </div>

        <div className="mt-6 h-3 rounded-full bg-stone-50">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="p-5 border-b border-border">
          <h2 className="text-base font-semibold text-foreground">
            Recent Tasks
          </h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-stone-50/70 text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-5 py-3 font-semibold">Task</th>
              <th className="px-5 py-3 font-semibold">Owner</th>
              <th className="px-5 py-3 font-semibold">Due Date</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">Assigned To</th>
            </tr>
          </thead>
          <tbody>
            {(recentTasksQuery.data ?? []).slice(0, 8).map((task) => {
              const dueDateStatus = getDueDateStatus(task.due_date, task.status);
              return (
                <tr
                  key={task.id}
                  className="border-b border-border/70 transition-colors hover:bg-stone-50/70"
                >
                  <td className="px-5 py-3">
                    <p className="text-sm font-medium text-foreground">
                      {task.title}
                    </p>
                  </td>
                  <td className="px-5 py-3">
                    <UserAvatar email={task.owner?.email || null} />
                  </td>
                  <td className="px-5 py-3 text-muted">
                    {task.due_date ? (
                      <span className="inline-flex items-center gap-2">
                        <DueDateIndicator status={dueDateStatus} />
                        <span className="text-xs">
                          {new Date(task.due_date).toLocaleDateString()}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs">-</span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <StatusPill status={task.status} />
                  </td>
                  <td className="px-5 py-3">
                    <UserAvatar email={task.assignee?.email || null} />
                  </td>
                </tr>
              );
            })}
            {(recentTasksQuery.data ?? []).length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-sm text-muted" colSpan={5}>
                  No tasks found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <p className="text-xs uppercase tracking-wide text-muted font-medium">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
        {value}
      </p>
    </div>
  );
}
