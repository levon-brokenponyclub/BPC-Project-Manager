import { useMemo, useRef, useState } from "react";
import { Clock3, Download, Paperclip, Send, Trash2 } from "lucide-react";

import { StatusPill } from "@/components/tasks/StatusPill";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { secondsToHms } from "@/lib/utils";
import type {
  Comment,
  TaskFile,
  TaskPriority,
  Task,
  TaskActivity,
  TaskStatus,
  TimeEntry,
} from "@/types/models";

const statuses: TaskStatus[] = ["Todo", "In Progress", "In Review", "Complete"];
const priorities: TaskPriority[] = ["Low", "Medium", "High", "Urgent"];
type TaskDrawerTab = "comments" | "updates" | "files";

interface TaskDrawerProps {
  open: boolean;
  task: Task | null;
  workspaceId: string;
  currentUserId: string | null;
  effectiveRole: "admin" | "client" | null;
  onClose: () => void;
  onSaveTask: (taskId: string, patch: Partial<Task>) => void;
  comments: Comment[];
  activity: TaskActivity[];
  files: TaskFile[];
  timeEntries: TimeEntry[];
  isUploadingFile?: boolean;
  isDeletingFile?: boolean;
  isDownloadingFile?: boolean;
  onAddComment: (body: string) => void;
  onUploadFile: (taskId: string, file: File) => void;
  onDeleteFile: (fileId: string, taskId: string) => void;
  onDownloadFile: (storagePath: string, fileName: string) => void;
}

export function TaskDrawer({
  open,
  task,
  workspaceId,
  currentUserId,
  effectiveRole,
  onClose,
  onSaveTask,
  comments,
  activity,
  files,
  timeEntries,
  isUploadingFile = false,
  isDeletingFile = false,
  isDownloadingFile = false,
  onAddComment,
  onUploadFile,
  onDeleteFile,
  onDownloadFile,
}: TaskDrawerProps): React.ReactElement | null {
  const [commentBody, setCommentBody] = useState("");
  const [activeTab, setActiveTab] = useState<TaskDrawerTab>("comments");
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const canDeleteFile = (file: TaskFile): boolean => {
    if (effectiveRole === "admin") {
      return true;
    }

    return Boolean(currentUserId && file.uploader_user_id === currentUserId);
  };

  const handleStatusChange = (nextStatus: TaskStatus): void => {
    const patch: Partial<Task> = { status: nextStatus };

    if (nextStatus === "Complete") {
      patch.completed_at = new Date().toISOString();
    } else if (task.status === "Complete") {
      patch.completed_at = null;
    }

    onSaveTask(task.id, patch);
  };

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
          <section className="space-y-3 rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Fields
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
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted">Status</p>
                <select
                  className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm"
                  value={task.status}
                  onChange={(event) =>
                    handleStatusChange(event.target.value as TaskStatus)
                  }
                >
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted">Priority</p>
                <select
                  className="h-10 w-full rounded-xl border border-border bg-white px-3 text-sm"
                  value={task.priority ?? "Medium"}
                  onChange={(event) =>
                    onSaveTask(task.id, {
                      priority: event.target.value as TaskPriority,
                    })
                  }
                >
                  {priorities.map((priority) => (
                    <option key={priority} value={priority}>
                      {priority}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted">Due date</p>
                <Input
                  type="date"
                  defaultValue={task.due_date?.slice(0, 10) ?? ""}
                  onChange={(event) =>
                    onSaveTask(task.id, {
                      due_date: event.target.value || null,
                    })
                  }
                />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-medium text-muted">
                  Estimated hours
                </p>
                <Input
                  type="number"
                  step="0.25"
                  min="0"
                  defaultValue={
                    task.estimated_hours == null
                      ? ""
                      : String(task.estimated_hours)
                  }
                  onBlur={(event) => {
                    const value = event.target.value.trim();
                    onSaveTask(task.id, {
                      estimated_hours: value === "" ? null : Number(value),
                    });
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={task.billable ?? true}
                  onChange={(event) =>
                    onSaveTask(task.id, { billable: event.target.checked })
                  }
                />
                Billable
              </label>
              <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={task.client_visible ?? true}
                  onChange={(event) =>
                    onSaveTask(task.id, {
                      client_visible: event.target.checked,
                    })
                  }
                />
                Client visible
              </label>
            </div>

            <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4"
                checked={task.blocked ?? false}
                onChange={(event) =>
                  onSaveTask(task.id, {
                    blocked: event.target.checked,
                    blocked_reason: event.target.checked
                      ? (task.blocked_reason ?? "")
                      : null,
                  })
                }
              />
              Blocked
            </label>

            {task.blocked ? (
              <Input
                placeholder="Blocked reason"
                defaultValue={task.blocked_reason ?? ""}
                onBlur={(event) =>
                  onSaveTask(task.id, {
                    blocked_reason: event.target.value.trim() || null,
                  })
                }
              />
            ) : null}
          </section>

          <section className="space-y-3 rounded-xl border border-border p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted">
              Time Logged
            </h3>
            <p className="inline-flex items-center gap-2 text-2xl font-semibold text-foreground">
              <Clock3 className="h-5 w-5 text-primary" />
              {secondsToHms(taskTimeSeconds)}
            </p>
          </section>

          <section className="space-y-3 rounded-xl border border-border p-4">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-stone-50 p-1">
              <button
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === "comments"
                    ? "bg-primary text-white"
                    : "text-muted hover:bg-white"
                }`}
                onClick={() => setActiveTab("comments")}
                type="button"
              >
                Comments
              </button>
              <button
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === "updates"
                    ? "bg-primary text-white"
                    : "text-muted hover:bg-white"
                }`}
                onClick={() => setActiveTab("updates")}
                type="button"
              >
                Updates
              </button>
              <button
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                  activeTab === "files"
                    ? "bg-primary text-white"
                    : "text-muted hover:bg-white"
                }`}
                onClick={() => setActiveTab("files")}
                type="button"
              >
                Files
              </button>
            </div>

            {activeTab === "comments" ? (
              <>
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
                  {comments.length === 0 ? (
                    <p className="text-sm text-muted">No comments yet.</p>
                  ) : null}
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
              </>
            ) : null}

            {activeTab === "updates" ? (
              <div className="space-y-2 text-sm text-muted">
                {activity.map((entry) => (
                  <div key={entry.id} className="rounded-xl bg-stone-50 p-3">
                    <p className="font-medium text-foreground">{entry.type}</p>
                    <p className="mt-1 text-xs text-muted">
                      {new Date(entry.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
                {activity.length === 0 ? <p>No activity yet.</p> : null}
              </div>
            ) : null}

            {activeTab === "files" ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted">Workspace: {workspaceId}</p>
                  <>
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(event) => {
                        const selected = event.target.files?.[0];
                        if (!selected) {
                          return;
                        }
                        onUploadFile(task.id, selected);
                        event.currentTarget.value = "";
                      }}
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingFile}
                    >
                      <Paperclip className="mr-1 h-3.5 w-3.5" />
                      {isUploadingFile ? "Uploading..." : "Upload"}
                    </Button>
                  </>
                </div>

                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between rounded-xl bg-stone-50 p-3 text-sm"
                    >
                      <div>
                        <p className="font-medium text-foreground">
                          {file.file_name}
                        </p>
                        <p className="text-xs text-muted">
                          {file.uploader_user_id === currentUserId
                            ? "You"
                            : file.uploader_user_id.slice(0, 8)}
                          {" · "}
                          {new Date(file.created_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          onClick={() =>
                            onDownloadFile(file.storage_path, file.file_name)
                          }
                          disabled={isDownloadingFile}
                        >
                          <Download className="mr-1 h-3.5 w-3.5" />
                          Download
                        </Button>
                        {canDeleteFile(file) ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => onDeleteFile(file.id, task.id)}
                            disabled={isDeletingFile}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        ) : null}
                      </div>
                    </div>
                  ))}
                  {files.length === 0 ? (
                    <p className="text-sm text-muted">No files uploaded yet.</p>
                  ) : null}
                </div>
              </>
            ) : null}
          </section>
        </div>
      </aside>
    </div>
  );
}
