import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock3,
  Download,
  ListChecks,
  MessageSquare,
  Paperclip,
  Send,
  Trash2,
  X,
} from "lucide-react";

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
import type { TaskWithUsers } from "@/api/tasks";
import { getWorkspaceUsers } from "@/api/workspaces";

const statuses: TaskStatus[] = ["Todo", "In Progress", "In Review", "Complete"];
const priorities: TaskPriority[] = ["Low", "Medium", "High", "Urgent"];
type TaskDrawerTab = "comments" | "updates" | "files";

interface NewTaskInput {
  title: string;
  description: string;
  status: TaskStatus;
  due_date: string | null;
  assignee_user_id: string | null;
}

interface TaskDrawerProps {
  open: boolean;
  task: TaskWithUsers | null;
  isNewTask?: boolean;
  isCreatingTask?: boolean;
  isSavingTask?: boolean;
  isDeletingTask?: boolean;
  workspaceId: string;
  currentUserId: string | null;
  effectiveRole: "admin" | "client" | null;
  canManageTasks: boolean;
  onClose: () => void;
  onCreateTask: (input: NewTaskInput, files: File[]) => Promise<void>;
  onSaveTask: (taskId: string, patch: Partial<Task>) => Promise<void>;
  onDeleteTask: (taskId: string) => Promise<void>;
  comments: Comment[];
  isCommentsLoading?: boolean;
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
  isNewTask = false,
  isCreatingTask = false,
  isSavingTask = false,
  workspaceId,
  currentUserId,
  effectiveRole,
  canManageTasks,
  onClose,
  onCreateTask,
  onSaveTask,
  comments,
  isCommentsLoading = false,
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
  const [isEditingTask, setIsEditingTask] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");
  const [draftStatus, setDraftStatus] = useState<TaskStatus>("Todo");
  const [draftDueDate, setDraftDueDate] = useState("");
  const [draftPriority, setDraftPriority] = useState<TaskPriority>("Medium");
  const [draftEstimatedHours, setDraftEstimatedHours] = useState("");
  const [draftBillable, setDraftBillable] = useState(true);
  const [draftClientVisible, setDraftClientVisible] = useState(true);
  const [draftBlocked, setDraftBlocked] = useState(false);
  const [draftBlockedReason, setDraftBlockedReason] = useState("");
  const [draftFiles, setDraftFiles] = useState<File[]>([]);
  const [draftOwnerId, setDraftOwnerId] = useState<string | null>(null);
  const [draftAssigneeId, setDraftAssigneeId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const commentInputRef = useRef<HTMLInputElement | null>(null);

  const reviewPromptTemplate =
    "\ud83d\udd0e Review requested -- please add snags/feedback below.\n\nSnag:\n- \nExpected:\nActual:\n";

  const appendToCommentBody = useCallback((text: string): void => {
    setActiveTab("comments");
    setCommentBody((previous) => {
      const previousTrimmed = previous.trim();
      return previousTrimmed.length > 0
        ? `${previousTrimmed}\n\n${text}`
        : text;
    });

    window.setTimeout(() => {
      commentInputRef.current?.focus();
    }, 0);
  }, []);

  const openReviewPrompt = useCallback((): void => {
    setActiveTab("comments");
    setCommentBody((previous) =>
      previous.trim().length === 0 ? reviewPromptTemplate : previous,
    );

    window.setTimeout(() => {
      commentInputRef.current?.focus();
    }, 0);
  }, [reviewPromptTemplate]);

  // Fetch workspace users for owner/assignee dropdowns
  const workspaceUsersQuery = useQuery({
    queryKey: ["workspace", workspaceId, "users"],
    queryFn: () => getWorkspaceUsers(workspaceId),
    enabled: Boolean(workspaceId && open),
  });

  const workspaceUsers = workspaceUsersQuery.data ?? [];

  useEffect(() => {
    if (!open || !task || !isNewTask) {
      return;
    }

    setDraftTitle(task.title ?? "");
    setDraftDescription(task.description ?? "");
    setDraftStatus(task.status ?? "Todo");
    setDraftDueDate(task.due_date?.slice(0, 10) ?? "");
    setDraftFiles([]);
    setDraftOwnerId(currentUserId); // Auto-assign owner to current user for new tasks
    setDraftAssigneeId(null);
  }, [isNewTask, open, task]);

  useEffect(() => {
    if (!open || !task || isNewTask) {
      return;
    }

    setIsEditingTask(canManageTasks);
    setDraftTitle(task.title ?? "");
    setDraftDescription(task.description ?? "");
    setDraftStatus(task.status ?? "Todo");
    setDraftDueDate(task.due_date?.slice(0, 10) ?? "");
    setDraftPriority(task.priority ?? "Medium");
    setDraftEstimatedHours(
      task.estimated_hours == null ? "" : String(task.estimated_hours),
    );
    setDraftBillable(task.billable ?? true);
    setDraftClientVisible(task.client_visible ?? true);
    setDraftBlocked(task.blocked ?? false);
    setDraftBlockedReason(task.blocked_reason ?? "");
    setDraftOwnerId(task.created_by ?? null);
    setDraftAssigneeId(task.assignee_user_id ?? null);
  }, [canManageTasks, isNewTask, open, task]);

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

    if (nextStatus === "In Review") {
      openReviewPrompt();
    }

    if (nextStatus === "Complete") {
      patch.completed_at = new Date().toISOString();
    } else if (task.status === "Complete") {
      patch.completed_at = null;
    }

    void onSaveTask(task.id, patch);
  };

  const saveEditedTask = async (): Promise<void> => {
    const patch: Partial<Task> = {
      title: draftTitle.trim() || task.title,
      description: draftDescription,
      status: draftStatus,
      due_date: draftDueDate || null,
      priority: draftPriority,
      estimated_hours:
        draftEstimatedHours.trim() === "" ? null : Number(draftEstimatedHours),
      billable: draftBillable,
      client_visible: draftClientVisible,
      blocked: draftBlocked,
      blocked_reason: draftBlocked ? draftBlockedReason.trim() || null : null,
      assignee_user_id: draftAssigneeId,
    };

    // Only admin can update owner (created_by)
    if (effectiveRole === "admin") {
      patch.created_by = draftOwnerId ?? undefined;
    }

    if (draftStatus === "Complete") {
      patch.completed_at = task.completed_at ?? new Date().toISOString();
    } else if (task.status === "Complete") {
      patch.completed_at = null;
    }

    try {
      await onSaveTask(task.id, patch);
      setIsEditingTask(false);
      onClose();
    } catch {
      // no-op; errors are surfaced by existing mutation handling
    }
  };

  const formatUserDisplayName = (email: string | null | undefined): string => {
    if (!email) return "Not assigned";
    const localPart = email.split("@")[0] ?? "";
    const tokens = localPart
      .split(/[._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((token) => token.charAt(0).toUpperCase() + token.slice(1));
    return tokens.length > 0 ? tokens.join(" ") : "Not assigned";
  };

  const assigneeLabel = formatUserDisplayName(
    task?.assignee?.email ||
      workspaceUsers.find((user) => user.user_id === task.assignee_user_id)
        ?.email,
  );

  const ownerLabel = formatUserDisplayName(task?.owner?.email);
  const isReviewMode =
    task.status === "In Review" ||
    (isEditingTask && draftStatus === "In Review") ||
    (isNewTask && draftStatus === "In Review");

  const quickTemplates = [
    {
      label: "Snag",
      value: "Snag:\n- \nSteps to reproduce:\nExpected:\nActual:\n",
    },
    { label: "Needs changes", value: "Needs changes:\n- \n" },
    { label: "Approved ✅", value: "Approved ✅" },
    { label: "Question", value: "Question:\n- \n" },
  ] as const;

  const handleReplyToComment = (comment: Comment): void => {
    const dateLabel = new Date(comment.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const maxLength = 140;
    const normalizedBody = comment.body.replace(/\s+/g, " ").trim();
    const excerpt =
      normalizedBody.length > maxLength
        ? `${normalizedBody.slice(0, maxLength)}...`
        : normalizedBody;

    appendToCommentBody(`Replying to (${dateLabel}): \"${excerpt}\"\n`);
  };

  return (
    <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm">
      <aside className="fixed inset-y-0 right-0 w-full max-w-xl bg-card border-l border-border shadow-lift overflow-y-auto animate-in slide-in-from-right">
        <div className="relative flex min-h-full">
          <div className="min-w-0 flex-1 px-6 py-6 pr-24">
            <div className="mb-5 flex items-center justify-between gap-3">
              <div>
                {!isNewTask ? (
                  <Button
                    variant="secondary"
                    onClick={() => handleStatusChange("Complete")}
                    disabled={!canManageTasks || task.status === "Complete"}
                  >
                    Mark Complete
                  </Button>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                {!isNewTask && canManageTasks ? (
                  <Button onClick={saveEditedTask} disabled={isSavingTask}>
                    {isSavingTask ? "Saving..." : "Save Changes"}
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  aria-label="Close task drawer"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {isNewTask || activeTab === "comments" ? (
                <>
                  <section className="space-y-4">
                    {isNewTask || (isEditingTask && canManageTasks) ? (
                      <Textarea
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        placeholder="Task title"
                        rows={2}
                        className="min-h-[72px] resize-none border-0 bg-transparent px-0 text-2xl font-semibold leading-tight tracking-tight text-foreground shadow-none focus-visible:ring-0"
                      />
                    ) : (
                      <h2 className="break-words text-2xl font-semibold leading-tight tracking-tight text-foreground">
                        {task.title || "Untitled task"}
                      </h2>
                    )}

                    {!isNewTask ? (
                      <div className="space-y-3 rounded-xl border border-border bg-background p-4">
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="text-muted">Assignee</span>
                          <span className="text-foreground">
                            {assigneeLabel}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-sm">
                          <span className="text-muted">Due Date</span>
                          <span className="text-foreground">
                            {task.due_date
                              ? new Date(task.due_date).toLocaleDateString()
                              : "No due date"}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </section>

                  <section className="space-y-4 rounded-xl border border-border bg-stone-50/30 p-5">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Fields
                    </h3>
                    <div className="overflow-hidden rounded-xl border border-border bg-card">
                      <div className="grid grid-cols-[140px_1fr] border-b border-border">
                        <div className="px-3 py-3 text-sm font-medium text-muted">
                          Status
                        </div>
                        <div className="px-3 py-2">
                          <select
                            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm focus-ring"
                            value={
                              isNewTask || isEditingTask
                                ? draftStatus
                                : task.status
                            }
                            onChange={(event) => {
                              const nextStatus = event.target
                                .value as TaskStatus;
                              if (isNewTask) {
                                setDraftStatus(nextStatus);
                                if (nextStatus === "In Review") {
                                  openReviewPrompt();
                                }
                                return;
                              }
                              if (isEditingTask) {
                                setDraftStatus(nextStatus);
                                if (nextStatus === "In Review") {
                                  openReviewPrompt();
                                }
                                return;
                              }
                              handleStatusChange(nextStatus);
                            }}
                            disabled={
                              (!isNewTask && !isEditingTask) || !canManageTasks
                            }
                          >
                            {statuses.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-[140px_1fr]">
                        <div className="px-3 py-3 text-sm font-medium text-muted">
                          Priority
                        </div>
                        <div className="px-3 py-2">
                          <select
                            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm focus-ring"
                            value={draftPriority}
                            onChange={(event) =>
                              setDraftPriority(
                                event.target.value as TaskPriority,
                              )
                            }
                            disabled={!isEditingTask || !canManageTasks}
                          >
                            {priorities.map((priority) => (
                              <option key={priority} value={priority}>
                                {priority}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`grid gap-3 ${isNewTask ? "grid-cols-1" : "grid-cols-2"}`}
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted">
                          Due date
                        </p>
                        <Input
                          type="date"
                          value={
                            isNewTask || isEditingTask
                              ? draftDueDate
                              : (task.due_date?.slice(0, 10) ?? "")
                          }
                          onChange={(event) => {
                            const value = event.target.value || null;
                            if (isNewTask) {
                              setDraftDueDate(event.target.value);
                              return;
                            }
                            if (isEditingTask) {
                              setDraftDueDate(event.target.value);
                              return;
                            }
                            onSaveTask(task.id, { due_date: value });
                          }}
                          disabled={
                            (!isNewTask && !isEditingTask) || !canManageTasks
                          }
                        />
                      </div>
                      {!isNewTask ? (
                        <div className="space-y-1">
                          <p className="text-xs font-medium text-muted">
                            Estimated hours
                          </p>
                          <Input
                            type="number"
                            step="0.25"
                            min="0"
                            value={draftEstimatedHours}
                            onChange={(event) =>
                              setDraftEstimatedHours(event.target.value)
                            }
                            disabled={!isEditingTask || !canManageTasks}
                          />
                        </div>
                      ) : null}
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted">
                        Description
                      </p>
                      <Textarea
                        value={draftDescription}
                        onChange={(event) =>
                          setDraftDescription(event.target.value)
                        }
                        placeholder="Task description"
                        disabled={
                          (!isNewTask && !isEditingTask) || !canManageTasks
                        }
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted">Owner</p>
                        {isNewTask ||
                        (isEditingTask && effectiveRole === "admin") ? (
                          <select
                            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm focus-ring"
                            value={draftOwnerId ?? ""}
                            onChange={(event) =>
                              setDraftOwnerId(event.target.value || null)
                            }
                          >
                            <option value="">Not assigned</option>
                            {workspaceUsers.map((user) => (
                              <option key={user.user_id} value={user.user_id}>
                                {formatUserDisplayName(user.email)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex h-10 w-full items-center rounded-xl border border-border bg-stone-50 px-3 text-sm text-muted">
                            {ownerLabel}
                          </div>
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-muted">
                          Assigned To
                        </p>
                        {isNewTask || isEditingTask ? (
                          <select
                            className="h-10 w-full rounded-xl border border-border bg-card px-3 text-sm focus-ring"
                            value={draftAssigneeId ?? ""}
                            onChange={(event) =>
                              setDraftAssigneeId(event.target.value || null)
                            }
                          >
                            <option value="">Not assigned</option>
                            {workspaceUsers.map((user) => (
                              <option key={user.user_id} value={user.user_id}>
                                {formatUserDisplayName(user.email)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex h-10 w-full items-center rounded-xl border border-border bg-stone-50 px-3 text-sm text-muted">
                            {assigneeLabel}
                          </div>
                        )}
                      </div>
                    </div>

                    {!isNewTask ? (
                      <>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={draftBillable}
                              onChange={(event) =>
                                setDraftBillable(event.target.checked)
                              }
                              disabled={!isEditingTask || !canManageTasks}
                            />
                            Billable
                          </label>
                          <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
                            <input
                              type="checkbox"
                              className="h-4 w-4"
                              checked={draftClientVisible}
                              onChange={(event) =>
                                setDraftClientVisible(event.target.checked)
                              }
                              disabled={!isEditingTask || !canManageTasks}
                            />
                            Client visible
                          </label>
                        </div>

                        <label className="flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm">
                          <input
                            type="checkbox"
                            className="h-4 w-4"
                            checked={draftBlocked}
                            onChange={(event) =>
                              setDraftBlocked(event.target.checked)
                            }
                            disabled={!isEditingTask || !canManageTasks}
                          />
                          Blocked
                        </label>

                        {draftBlocked ? (
                          <Input
                            placeholder="Blocked reason"
                            value={draftBlockedReason}
                            onChange={(event) =>
                              setDraftBlockedReason(event.target.value)
                            }
                            disabled={!isEditingTask || !canManageTasks}
                          />
                        ) : null}
                      </>
                    ) : (
                      <>
                        <div className="space-y-2 rounded-xl border border-border bg-stone-50 p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-foreground">
                              Files for this task
                            </p>
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
                                  setDraftFiles((previous) => [
                                    ...previous,
                                    selected,
                                  ]);
                                  event.currentTarget.value = "";
                                }}
                              />
                              <Button
                                type="button"
                                size="sm"
                                variant="secondary"
                                onClick={() => fileInputRef.current?.click()}
                              >
                                <Paperclip className="mr-1 h-3.5 w-3.5" />
                                Add File
                              </Button>
                            </>
                          </div>
                          {draftFiles.length > 0 ? (
                            <div className="space-y-2">
                              {draftFiles.map((file, index) => (
                                <div
                                  key={`${file.name}-${index}`}
                                  className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm"
                                >
                                  <span className="truncate text-foreground">
                                    {file.name}
                                  </span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      setDraftFiles((previous) =>
                                        previous.filter(
                                          (_, fileIndex) => fileIndex !== index,
                                        ),
                                      )
                                    }
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-muted">
                              No files selected yet.
                            </p>
                          )}
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" onClick={onClose}>
                            Cancel
                          </Button>
                          <Button
                            onClick={async () => {
                              try {
                                await onCreateTask(
                                  {
                                    title: draftTitle.trim(),
                                    description: draftDescription,
                                    status: draftStatus,
                                    due_date: draftDueDate || null,
                                    assignee_user_id: draftAssigneeId,
                                  },
                                  draftFiles,
                                );
                                onClose();
                              } catch {
                                // no-op; errors are surfaced by existing mutation handling
                              }
                            }}
                            disabled={!draftTitle.trim() || isCreatingTask}
                          >
                            {isCreatingTask ? "Saving..." : "Save Task"}
                          </Button>
                        </div>
                      </>
                    )}
                  </section>

                  {!isNewTask ? (
                    <section className="space-y-4 rounded-xl border border-border bg-stone-50/30 p-5">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                        Time Logged
                      </h3>
                      <p className="inline-flex items-center gap-2 text-2xl font-semibold tracking-tight text-foreground">
                        <Clock3 className="h-5 w-5 text-primary" />
                        {secondsToHms(taskTimeSeconds)}
                      </p>
                    </section>
                  ) : null}

                  {!isNewTask ? (
                    <section className="space-y-4 rounded-xl border border-border bg-stone-50/30 p-5">
                      {isReviewMode ? (
                        <div className="flex flex-wrap items-center gap-2">
                          {quickTemplates.map((template) => (
                            <Button
                              key={template.label}
                              type="button"
                              size="sm"
                              variant="secondary"
                              onClick={() =>
                                appendToCommentBody(template.value)
                              }
                            >
                              {template.label}
                            </Button>
                          ))}
                        </div>
                      ) : null}

                      <div className="space-y-3">
                        {comments.map((comment) => (
                          <div
                            key={comment.id}
                            className="rounded-xl border border-border bg-white p-4 text-sm"
                          >
                            <p className="text-foreground">{comment.body}</p>
                            <div className="mt-2 flex items-center justify-between gap-3">
                              <p className="text-xs text-muted">
                                {new Date(comment.created_at).toLocaleString()}
                              </p>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                onClick={() => handleReplyToComment(comment)}
                              >
                                Reply
                              </Button>
                            </div>
                          </div>
                        ))}
                        {!isCommentsLoading && comments.length === 0 ? (
                          <p className="py-4 text-center text-sm text-muted">
                            No comments yet.
                          </p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <Input
                          ref={commentInputRef}
                          value={commentBody}
                          onChange={(event) =>
                            setCommentBody(event.target.value)
                          }
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
                  ) : null}
                </>
              ) : null}

              {!isNewTask && activeTab === "updates" ? (
                <section className="space-y-4">
                  <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                    Activity
                  </h2>
                  <div className="space-y-3 text-sm text-muted">
                    {activity.map((entry) => (
                      <div
                        key={entry.id}
                        className="rounded-xl border border-border bg-white p-4"
                      >
                        <p className="font-medium text-foreground">
                          {entry.type}
                        </p>
                        <p className="mt-2 text-xs text-muted">
                          {new Date(entry.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                    {activity.length === 0 ? (
                      <p className="py-4 text-center">No activity yet.</p>
                    ) : null}
                  </div>
                  <div className="border-t border-border pt-4">
                    <div className="flex items-center gap-3">
                      <Input
                        ref={commentInputRef}
                        value={commentBody}
                        onChange={(event) => setCommentBody(event.target.value)}
                        placeholder="Write a comment..."
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
                  </div>
                </section>
              ) : null}

              {!isNewTask && activeTab === "files" ? (
                <section className="space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-semibold leading-tight tracking-tight text-foreground">
                      Files
                    </h2>
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

                  <div className="space-y-3">
                    {files.map((file) => (
                      <div
                        key={file.id}
                        className="flex items-center justify-between rounded-xl border border-border bg-white p-4 text-sm"
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
                      <p className="text-sm text-muted">
                        No files uploaded yet.
                      </p>
                    ) : null}
                  </div>
                </section>
              ) : null}
            </div>
          </div>

          {!isNewTask ? (
            <div className="absolute right-4 top-24 bottom-6 z-20 flex items-start">
              <nav
                aria-label="Task detail sections"
                className="sticky top-28 flex w-14 flex-col gap-3 rounded-2xl border border-border/60 bg-stone-50/40 p-2 shadow-md backdrop-blur-sm"
              >
                <div className="relative group">
                  <button
                    type="button"
                    aria-label="Task"
                    onClick={() => setActiveTab("comments")}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-ring ${
                      activeTab === "comments"
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted hover:bg-black/5"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4" />
                  </button>
                  <span className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900/90 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    Task
                    <span className="absolute right-[-5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 bg-slate-900/90" />
                  </span>
                </div>

                <div className="relative group">
                  <button
                    type="button"
                    aria-label="Activity"
                    onClick={() => setActiveTab("updates")}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-ring ${
                      activeTab === "updates"
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted hover:bg-black/5"
                    }`}
                  >
                    <ListChecks className="h-4 w-4" />
                  </button>
                  <span className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900/90 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    Activity
                    <span className="absolute right-[-5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 bg-slate-900/90" />
                  </span>
                </div>

                <div className="relative group">
                  <button
                    type="button"
                    aria-label="Files"
                    onClick={() => setActiveTab("files")}
                    className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors focus-ring ${
                      activeTab === "files"
                        ? "bg-primary text-white shadow-sm"
                        : "text-muted hover:bg-black/5"
                    }`}
                  >
                    <Paperclip className="h-4 w-4" />
                  </button>
                  <span className="pointer-events-none absolute right-full top-1/2 mr-3 -translate-y-1/2 whitespace-nowrap rounded-xl bg-slate-900/90 px-3 py-2 text-xs font-medium text-white opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    Files
                    <span className="absolute right-[-5px] top-1/2 h-2.5 w-2.5 -translate-y-1/2 rotate-45 bg-slate-900/90" />
                  </span>
                </div>
              </nav>
            </div>
          ) : null}
        </div>
      </aside>
    </div>
  );
}
