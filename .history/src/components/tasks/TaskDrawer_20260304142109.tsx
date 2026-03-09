import { useMemo, useState } from "react";
import { Clock3, Send } from "lucide-react";

import { StatusPill } from "@/components/tasks/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { secondsToHms } from "@/lib/utils";
import type {
  Comment,
  Task,
  TaskActivity,
  TaskStatus,
  TimeEntry,
} from "@/types/models";

const statuses: TaskStatus[] = ["Todo", "In Progress", "In Review", "Complete"];

interface TaskDrawerProps {
  open: boolean;
  task: Task | null;
  onClose: () => void;
  onSaveTask: (taskId: string, patch: Partial<Task>) => void;
  comments: Comment[];
  activity: TaskActivity[];
  timeEntries: TimeEntry[];
  onAddComment: (body: string) => void;
}

export function TaskDrawer({
  open,
  task,
  onClose,
  onSaveTask,
  comments,
  activity,
  timeEntries,
  onAddComment,
}: TaskDrawerProps): React.ReactElement | null {
  const [commentBody, setCommentBody] = useState("");

  const taskTimeSeconds = useMemo(
    () =>
      timeEntries
        .filter((entry) => entry.task_id === task?.id)
        .reduce(
          (total, entry) => total + Number(entry.duration_seconds ?? 0),
          0,
        ),
    [task?.id, timeEntries],
  );

  if (!open || !task) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex justify-end bg-black/15 backdrop-blur-[1px]">
      <aside className="h-full w-full max-w-xl overflow-y-auto border-l border-border bg-white px-6 py-6 shadow-soft animate-in slide-in-from-right">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-foreground">
              {task.title}
            </h2>
            <div className="mt-2">
              <StatusPill status={task.status} />
            </div>
          </div>
          <Button variant="ghost" onClick={onClose}>
            Close
          </Button>
        </div>

        <div className="space-y-6">
          <section className="space-y-3 rounded-2xl border border-border p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Task Details
            </h3>
            <Input
              defaultValue={task.title}
              onBlur={(event) => {
                const value = event.target.value.trim();
                if (value && value !== task.title) {
                  onSaveTask(task.id, { title: value });
                }
              }}
            />
            <Textarea
              defaultValue={task.description ?? ""}
              onBlur={(event) =>
                onSaveTask(task.id, { description: event.target.value })
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <select
                className="h-10 rounded-xl border border-border bg-white px-3 text-sm"
                value={task.status}
                onChange={(event) =>
                  onSaveTask(task.id, {
                    status: event.target.value as TaskStatus,
                  })
                }
              >
                {statuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
              <Input
                type="date"
                defaultValue={task.due_date?.slice(0, 10) ?? ""}
                onChange={(event) =>
                  onSaveTask(task.id, { due_date: event.target.value || null })
                }
              />
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-border p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Time Logged
            </h3>
            <p className="inline-flex items-center gap-2 text-2xl font-semibold text-foreground">
              <Clock3 className="h-5 w-5 text-primary" />
              {secondsToHms(taskTimeSeconds)}
            </p>
          </section>

          <section className="space-y-3 rounded-2xl border border-border p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Comments
            </h3>
            <div className="space-y-2">
              {comments.map((comment) => (
                <div
                  key={comment.id}
                  className="rounded-xl bg-stone-50 p-3 text-sm"
                >
                  <p className="text-foreground/90">{comment.body}</p>
                  <p className="mt-1 text-xs text-muted">
                    {new Date(comment.created_at).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={commentBody}
                onChange={(event) => setCommentBody(event.target.value)}
                placeholder="Add a comment"
              />
              <Button
                size="sm"
                onClick={() => {
                  const body = commentBody.trim();
                  if (!body) {
                    return;
                  }
                  onAddComment(body);
                  setCommentBody("");
                }}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </div>
          </section>

          <section className="space-y-3 rounded-2xl border border-border p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Activity
            </h3>
            <div className="space-y-2 text-sm text-muted">
              {activity.map((entry) => (
                <p key={entry.id}>
                  {entry.type} · {new Date(entry.created_at).toLocaleString()}
                </p>
              ))}
              {activity.length === 0 ? <p>No activity yet.</p> : null}
            </div>
          </section>
        </div>
      </aside>
    </div>
  );
}
