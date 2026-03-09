import { Calendar, MessageCircle, Play, Square } from "lucide-react";

import { StatusPill } from "@/components/tasks/StatusPill";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Task } from "@/types/models";

interface TaskTableProps {
  tasks: Task[];
  onOpen: (task: Task) => void;
  selectedTaskIds: string[];
  onToggleTaskSelection: (taskId: string) => void;
  onToggleAllSelection: (taskIds: string[]) => void;
  runningTaskId?: string;
  onStartTimer: (taskId: string) => void;
  onStopTimer: (taskId: string) => void;
  isLoading?: boolean;
  showTimerControls?: boolean;
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
            <th className="px-5 py-3 font-semibold">Status</th>
            <th className="px-5 py-3 font-semibold">Due</th>
            {showTimerControls ? <th className="px-5 py-3 font-semibold">Timer</th> : null}
          </tr>
        </thead>
        <tbody>
          {isLoading
            ? Array.from({ length: 6 }).map((_, index) => (
                <tr
                  key={`task-loading-row-${index}`}
                  className="border-b border-border/80"
                >
                  <td className="px-5 py-4">
                    <Skeleton className="h-4 w-4 rounded" />
                  </td>
                  <td className="px-5 py-4">
                    <Skeleton className="h-4 w-52" />
                    <Skeleton className="mt-2 h-3.5 w-72" />
                  </td>
                  <td className="px-5 py-4">
                    <Skeleton className="h-6 w-24 rounded-full" />
                  </td>
                  <td className="px-5 py-4">
                    <Skeleton className="h-4 w-24" />
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
                  <StatusPill status={task.status} />
                </td>
                <td className="px-5 py-4 text-muted">
                  {task.due_date ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {new Date(task.due_date).toLocaleDateString()}
                    </span>
                  ) : (
                    "-"
                  )}
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
                colSpan={showTimerControls ? 5 : 4}
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
