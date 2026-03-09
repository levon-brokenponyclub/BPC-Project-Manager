import { Calendar, MessageCircle, Play, Square } from "lucide-react";

import { StatusPill } from "@/components/tasks/StatusPill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { TaskWithUsers } from "@/api/tasks";

interface TaskTableProps {
  tasks: TaskWithUsers[];
  onOpen: (task: TaskWithUsers) => void;
  selectedTaskIds: string[];
  onToggleTaskSelection: (taskId: string) => void;
  onToggleAllSelection: (taskIds: string[]) => void;
  runningTaskId?: string;
  onStartTimer: (taskId: string) => void;
  onStopTimer: (taskId: string) => void;
  isLoading?: boolean;
  showTimerControls?: boolean;
}

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
  if (!email) return <span className="text-muted">-</span>;

  const initial = email.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-stone-200 text-xs font-medium text-stone-700">
        {initial}
      </div>
      <span className="text-sm">{email.split("@")[0]}</span>
    </div>
  );
}

export function TaskTable({
  tasks,
  onOpen,
  selectedTaskIds,
  onToggleTaskSelection,
  onToggleAllSelection,
  runningTaskId,
  onStartTimer,
  onStopTimer,
  isLoading = false,
  showTimerControls = true,
}: TaskTableProps): React.ReactElement {
  const allVisibleSelected =
    tasks.length > 0 &&
    tasks.every((task) => selectedTaskIds.includes(task.id));

  return (
    <Card className="overflow-hidden">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-stone-50/70 text-xs uppercase tracking-wide text-muted">
          <tr>
            <th className="px-5 py-3">
              <input
                type="checkbox"
                checked={allVisibleSelected}
                onChange={() =>
                  onToggleAllSelection(tasks.map((task) => task.id))
                }
                aria-label="Select all tasks"
                className="focus-ring rounded"
              />
            </th>
            <th className="px-5 py-3 font-semibold">Task</th>
            <th className="px-5 py-3 font-semibold">Owner</th>
            <th className="px-5 py-3 font-semibold">Due Date</th>
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="px-5 py-3 font-semibold">Assigned To</th>
            {showTimerControls ? (
              <th className="px-5 py-3 font-semibold">Timer</th>
            ) : null}
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <tr
                  key={`task-loading-row-${index}`}
                  className="border-b border-border/70"
                >
                  <td className="px-5 py-4">
                    <Skeleton className="h-4 w-4 rounded" />
                  </td>
                  <td className="px-5 py-4">
                    <Skeleton className="h-4 w-52" />
                    <Skeleton className="mt-2 h-3.5 w-72" />
                  </td>
                  <td className="px-5 py-4">
                    <Skeleton className="h-6 w-32 rounded-full" />
                  </td>
                  <td className="px-5 py-4">
                    <Skeleton className="h-4 w-24" />
                  </td>
                  <td className="px-5 py-4">
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </td>
                  <td className="px-5 py-4">
                    <Skeleton className="h-6 w-32 rounded-full" />
                  </td>
                  {showTimerControls ? (
                    <td className="px-5 py-4">
                      <Skeleton className="h-8 w-20 rounded-full" />
                    </td>
                  ) : null}
                </tr>
              ))
            : null}
          {tasks.map((task) => {
            const isRunning = runningTaskId === task.id;
            const isSelected = selectedTaskIds.includes(task.id);
            const dueDateStatus = getDueDateStatus(task.due_date, task.status);

            return (
              <tr
                key={task.id}
                className="cursor-pointer border-b border-border/70 transition-colors hover:bg-stone-50/70"
                onClick={() => onOpen(task)}
              >
                <td
                  className="px-5 py-4"
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleTaskSelection(task.id)}
                    aria-label={`Select task ${task.title}`}
                    className="focus-ring rounded"
                  />
                </td>
                <td className="px-5 py-4">
                  <p className="font-medium text-foreground">{task.title}</p>
                  <p className="mt-1 flex items-center gap-2 text-xs text-muted">
                    <MessageCircle className="h-3.5 w-3.5" />
                    {task.description?.slice(0, 72) || "No description"}
                  </p>
                </td>
                <td className="px-5 py-4">
                  <UserAvatar email={task.owner?.email || null} />
                </td>
                <td className="px-5 py-4 text-muted">
                  {task.due_date ? (
                    <span className="inline-flex items-center gap-2">
                      <DueDateIndicator status={dueDateStatus} />
                      <span>
                        {new Date(task.due_date).toLocaleDateString()}
                      </span>
                    </span>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="px-5 py-4">
                  <StatusPill status={task.status} />
                </td>
                <td className="px-5 py-4">
                  <UserAvatar email={task.assignee?.email || null} />
                </td>
                {showTimerControls ? (
                  <td className="px-5 py-4">
                    {isRunning ? (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={(event) => {
                          event.stopPropagation();
                          onStopTimer(task.id);
                        }}
                      >
                        <Square className="mr-1 h-3.5 w-3.5" /> Stop
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          onStartTimer(task.id);
                        }}
                      >
                        <Play className="mr-1 h-3.5 w-3.5" /> Start
                      </Button>
                    )}
                  </td>
                ) : null}
              </tr>
            );
          })}
          {!isLoading && tasks.length === 0 ? (
            <tr>
              <td
                className="px-5 py-10 text-center text-sm text-muted"
                colSpan={showTimerControls ? 7 : 6}
              >
                No tasks found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </Card>
  );
}
