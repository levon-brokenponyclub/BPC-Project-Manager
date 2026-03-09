import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Clock3,
  ListChecks,
  MessageSquare,
  Paperclip,
  Plus,
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
import { listSubtasks } from "@/api/tasks";
import { getWorkspaceUsers } from "@/api/workspaces";

const statuses: TaskStatus[] = [
  "Todo",
  "Upcoming",
  "In Progress",
  "In Review",
  "Awaiting Client",
  "On Hold",
  "Complete",
  "Cancelled",
];
const priorities: TaskPriority[] = ["Low", "Medium", "High", "Urgent"];

type TimelineEntry =
  | {
      id: string;
      type: "activity";
      created_at: string;
      actorName: string;
      actorAvatarUrl: string | null;
      actionText: string;
    }
  | {
      id: string;
      type: "comment";
      created_at: string;
      actorName: string;
      actorAvatarUrl: string | null;
      body: string;
    };

function toRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function readString(
  record: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

function formatTimelineRelativeTime(isoString: string): string {
  const value = new Date(isoString).getTime();
  if (Number.isNaN(value)) return "now";

  const seconds = Math.round((Date.now() - value) / 1000);
  const absSeconds = Math.abs(seconds);
  const units = [
    { threshold: 60, unit: "second", divisor: 1 },
    { threshold: 3600, unit: "minute", divisor: 60 },
    { threshold: 86400, unit: "hour", divisor: 3600 },
    { threshold: 604800, unit: "day", divisor: 86400 },
    { threshold: 2629800, unit: "week", divisor: 604800 },
    { threshold: 31557600, unit: "month", divisor: 2629800 },
    { threshold: Number.POSITIVE_INFINITY, unit: "year", divisor: 31557600 },
  ] as const;

  const selected = units.find((u) => absSeconds < u.threshold) ?? units[0];
  const amount = Math.round(seconds / selected.divisor);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  return formatter.format(-amount, selected.unit);
}

function formatTimelineAbsoluteTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return date.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatEventAction(
  type: string,
  payload: Record<string, unknown>,
): string {
  const field = readString(payload, ["field", "changed_field"]);
  const toValue = readString(payload, ["to", "new", "next"]);
  const fromValue = readString(payload, ["from", "old", "previous"]);
  const assigneeName = readString(payload, ["assignee_name", "assigneeName"]);

  if (type === "task_created") return "created the task.";
  if (type === "task_deleted") return "deleted the task.";

  if (type === "status_changed" || field === "status") {
    return toValue
      ? `changed the status to ${toValue}.`
      : "changed the status.";
  }

  if (field === "assignee" || field === "assignee_user_id") {
    const nextAssignee = assigneeName ?? toValue;
    return nextAssignee
      ? `changed the assignee to ${nextAssignee}.`
      : "changed the assignee.";
  }

  if (field === "due_date" || field === "dueDate") {
    return toValue
      ? `updated the due date to ${new Date(toValue).toLocaleDateString()}.`
      : "updated the due date.";
  }

  if (field === "title") {
    return toValue
      ? `renamed the task to \"${toValue}\".`
      : "updated the title.";
  }

  if (field === "priority") {
    return toValue
      ? `changed the priority to ${toValue}.`
      : "changed the priority.";
  }

  if (type === "task_updated") {
    if (fromValue && toValue && fromValue !== toValue) {
      return `updated the task from ${fromValue} to ${toValue}.`;
    }
    return "updated the task.";
  }

  if (type === "comment_added") {
    return "commented on the task.";
  }

  return type
    .replaceAll("_", " ")
    .replace(/\b\w/g, (char) => char.toLowerCase())
    .concat(".");
}

type TaskDrawerTab = "task" | "activity";

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
  /** Called when the user clicks "Add Subtask" inside the drawer */
  onAddSubtask?: (parentTaskId: string) => void;
  /** Called when the user clicks on a subtask row to open it */
  onOpenSubtask?: (subtask: TaskWithUsers) => void;
  /** Parent task used to show "Subtask of …" breadcrumb in the header */
  parentTask?: TaskWithUsers | null;
  /** Workspace display name shown in the breadcrumb */
  workspaceName?: string;
}

export function TaskDrawer({
  open,
  task,
  isNewTask = false,
  isCreatingTask = false,
  isSavingTask = false,
  isDeletingTask = false,
  workspaceId,
  currentUserId,
  effectiveRole,
  canManageTasks,
  onClose,
  onCreateTask,
  onSaveTask,
  onDeleteTask,
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
  onAddSubtask,
  onOpenSubtask,
  parentTask,
  workspaceName,
}: TaskDrawerProps): React.ReactElement | null {
  const [activeTab, setActiveTab] = useState<TaskDrawerTab>("task");

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

  const [commentBody, setCommentBody] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const newTaskFilesInputRef = useRef<HTMLInputElement | null>(null);
  const commentInputRef = useRef<HTMLTextAreaElement | null>(null);
  const activityScrollRef = useRef<HTMLDivElement | null>(null);
  const activityBottomRef = useRef<HTMLDivElement | null>(null);
  const prevActivityCountRef = useRef(0);
  const prevCommentCountRef = useRef(0);

  const [showJumpToLatest, setShowJumpToLatest] = useState(false);

  const isNearBottom = (el: HTMLDivElement, threshold = 180): boolean => {
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    return distance <= threshold;
  };

  const scrollActivityToBottom = (behavior: ScrollBehavior = "auto"): void => {
    activityBottomRef.current?.scrollIntoView({ behavior, block: "end" });
  };

  // Prevent background scroll + fixes “gap showing page behind”
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  const reviewPromptTemplate =
    "Review requested: please add snags and feedback below.\n\nSnag:\n- \nSteps to reproduce:\nExpected:\nActual:\n";

  const appendToCommentBody = useCallback((text: string): void => {
    setActiveTab("activity");
    setCommentBody((previous) => {
      const prev = previous.trim();
      return prev.length > 0 ? `${prev}\n\n${text}` : text;
    });

    window.setTimeout(() => commentInputRef.current?.focus(), 0);
  }, []);

  const openReviewPrompt = useCallback((): void => {
    setActiveTab("activity");
    setCommentBody((previous) =>
      previous.trim().length === 0 ? reviewPromptTemplate : previous,
    );
    window.setTimeout(() => commentInputRef.current?.focus(), 0);
  }, [reviewPromptTemplate]);

  // Fetch workspace users for owner/assignee dropdowns
  const workspaceUsersQuery = useQuery({
    queryKey: ["workspace", workspaceId, "users"],
    queryFn: () => getWorkspaceUsers(workspaceId),
    enabled: Boolean(workspaceId && open),
  });

  const workspaceUsers = workspaceUsersQuery.data ?? [];

  // Fetch subtasks for the currently open (non-new) task
  const subtasksQuery = useQuery({
    queryKey: ["task", task?.id, "subtasks"],
    queryFn: () => listSubtasks(task!.id, workspaceId),
    enabled: Boolean(task?.id && open && !isNewTask),
  });

  const subtasks = subtasksQuery.data ?? [];

  useEffect(() => {
    if (!open || !task || !isNewTask) return;

    setActiveTab("task");
    setDraftTitle(task.title ?? "");
    setDraftDescription(task.description ?? "");
    setDraftStatus(task.status ?? "Todo");
    setDraftDueDate(task.due_date?.slice(0, 10) ?? "");
    setDraftFiles([]);
    setDraftOwnerId(currentUserId);
    setDraftAssigneeId(null);
    setCommentBody("");
  }, [isNewTask, open, task, currentUserId]);

  useEffect(() => {
    if (!open || !task || isNewTask) return;

    setActiveTab("task");
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
    setCommentBody("");
  }, [canManageTasks, isNewTask, open, task]);

  useEffect(() => {
    if (!open) return;
    if (activeTab !== "activity") return;

    const el = activityScrollRef.current;
    if (!el) return;

    let raf = 0;

    const onScroll = (): void => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setShowJumpToLatest(!isNearBottom(el, 200));
      });
    };

    onScroll();
    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("scroll", onScroll as EventListener);
    };
  }, [open, activeTab]);

  useEffect(() => {
    if (!open || activeTab !== "activity") {
      prevActivityCountRef.current = activity.length;
      prevCommentCountRef.current = comments.length;
      return;
    }

    const el = activityScrollRef.current;
    if (!el) return;

    const previousActivityCount = prevActivityCountRef.current;
    const previousCommentCount = prevCommentCountRef.current;
    const hasNewEntries =
      activity.length > previousActivityCount ||
      comments.length > previousCommentCount;

    // only autoscroll for newly added entries when the user is already near bottom
    if (hasNewEntries && isNearBottom(el, 72)) {
      requestAnimationFrame(() => scrollActivityToBottom("auto"));
    }

    prevActivityCountRef.current = activity.length;
    prevCommentCountRef.current = comments.length;
  }, [open, activeTab, activity.length, comments.length]);

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

  if (!open || !task) return null;

  const canDeleteFile = (file: TaskFile): boolean => {
    if (effectiveRole === "admin") return true;
    return Boolean(currentUserId && file.uploader_user_id === currentUserId);
  };

  const handleStatusChange = (nextStatus: TaskStatus): void => {
    const patch: Partial<Task> = { status: nextStatus };

    if (nextStatus === "In Review") openReviewPrompt();

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

    if (effectiveRole === "admin") patch.created_by = draftOwnerId ?? undefined;

    if (draftStatus === "In Review") openReviewPrompt();

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
      // errors handled upstream
    }
  };

  const workspaceUsersById = new Map(
    workspaceUsers.map((user) => [user.user_id, user]),
  );

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

  const resolveUserLabel = (
    userId: string | null | undefined,
    email: string | null | undefined,
  ): string => {
    if (userId) {
      const wu = workspaceUsersById.get(userId);
      if (wu) {
        const fullName = `${wu.first_name ?? ""} ${wu.surname ?? ""}`.trim();
        if (fullName.length > 0) return fullName;
        if (wu.email) return formatUserDisplayName(wu.email);
      }
    }
    return formatUserDisplayName(email);
  };

  const assigneeLabel = resolveUserLabel(
    task?.assignee_user_id,
    task?.assignee?.email ??
      workspaceUsers.find((u) => u.user_id === task?.assignee_user_id)?.email,
  );
  const ownerLabel = resolveUserLabel(task?.owner?.id, task?.owner?.email);

  const currentUserProfile = currentUserId
    ? workspaceUsersById.get(currentUserId)
    : undefined;

  const resolveActorName = (
    userId: string | null | undefined,
    fallbackName: string,
  ): string => {
    if (!userId) return fallbackName;
    const user = workspaceUsersById.get(userId);
    if (!user) return fallbackName;

    const fullName = `${user.first_name ?? ""} ${user.surname ?? ""}`.trim();
    if (fullName.length > 0) return fullName;
    return formatUserDisplayName(user.email);
  };

  const resolveActorAvatar = (
    userId: string | null | undefined,
  ): string | null => {
    if (!userId) return null;
    return workspaceUsersById.get(userId)?.avatar_url ?? null;
  };

  const timelineEntries: TimelineEntry[] = (() => {
    const commentRows: TimelineEntry[] = comments.map((comment) => ({
      id: `comment-${comment.id}`,
      type: "comment",
      created_at: comment.created_at,
      actorName: resolveActorName(comment.user_id, "Team member"),
      actorAvatarUrl: resolveActorAvatar(comment.user_id),
      body: comment.body,
    }));

    const activityRows: TimelineEntry[] = activity
      .filter((entry) => entry.type !== "comment_added")
      .map((entry) => {
        const payload = toRecord(entry.payload);
        const payloadActor = toRecord(payload.actor);
        const actorUserId = readString(payload, [
          "actor_user_id",
          "user_id",
          "created_by",
          "changed_by",
        ]);

        const actorName =
          readString(payload, ["actor_name", "user_name", "by", "name"]) ??
          readString(payloadActor, ["name", "full_name"]) ??
          resolveActorName(
            actorUserId,
            ownerLabel === "Not assigned" ? "System" : ownerLabel,
          );

        const actorAvatarUrl =
          readString(payload, ["actor_avatar_url", "avatar_url"]) ??
          readString(payloadActor, ["avatar_url"]) ??
          resolveActorAvatar(actorUserId);

        return {
          id: `activity-${entry.id}`,
          type: "activity",
          created_at: entry.created_at,
          actorName,
          actorAvatarUrl,
          actionText: formatEventAction(entry.type, payload),
        };
      });

    return [...activityRows, ...commentRows].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  })();

  const submitComment = (): void => {
    const body = commentBody.trim();
    if (!body) return;
    onAddComment(body);
    setCommentBody("");
  };

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

    appendToCommentBody(`Replying to (${dateLabel}): "${excerpt}"\n`);
  };

  const navItems = [
    { key: "task" as const, label: "Task", Icon: MessageSquare },
    { key: "activity" as const, label: "Activity", Icon: ListChecks },
  ];

  const drawerActionButtonClass = "rounded-sm";
  const drawerPrimaryCompactButtonClass = "rounded-sm";
  const drawerFieldControlClass =
    "h-10 w-full rounded-[5px] border border-[#25262B] bg-[#15161D] px-3 text-[13px] font-medium leading-4 text-white placeholder:text-[#939496] focus-ring";
  const drawerReadOnlyFieldClass =
    "flex h-10 items-center rounded-[5px] border border-[#25262B] bg-[#15161D] px-3 text-[13px] font-medium leading-4 text-[#D4D5D8]";

  return (
    <section className="absolute inset-0 z-40 !mt-0 overflow-hidden bg-[#15161D]">
      <div className="grid h-full min-h-0 grid-cols-1 md:grid-cols-[300px_minmax(0,1fr)_280px]">
        <div className="flex min-h-0 flex-col bg-[#1E1F2A] md:border-r md:border-[#222330]">
          <div className="flex items-center justify-between border-b border-[#222330] px-4 py-3">
            <h3 className="text-[15px] leading-[22px] font-medium text-white">
              Task Panel
            </h3>
            <button
              type="button"
              onClick={onClose}
              className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-[5px] border border-[#313339] bg-[#15161D] text-[#939496] transition-colors hover:bg-[#1A1C23] hover:text-white"
              aria-label="Close task panel"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {isNewTask ? (
              <div className="rounded-[5px] border border-[#25262B] bg-[#15161D] px-4 py-3 text-[15px] font-medium leading-[22px] text-[#97989E]">
                Creating a new task
              </div>
            ) : (
              <>
                {navItems.map(({ key, label, Icon }) => {
                  const isActive = activeTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setActiveTab(key)}
                      className={`focus-ring flex w-full items-center gap-2 rounded-[5px] border px-4 py-3 text-left text-[15px] font-medium leading-[22px] transition-colors ${
                        isActive
                          ? "border-[#2A2C31] bg-[#15161D] text-white"
                          : "border-transparent text-[#97989E] hover:bg-[#15161D] hover:text-white"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      <span>{label}</span>
                    </button>
                  );
                })}
                {canManageTasks && task?.id && onAddSubtask ? (
                  <button
                    type="button"
                    onClick={() => onAddSubtask(task.id)}
                    className="focus-ring flex w-full items-center gap-2 rounded-[5px] border border-transparent px-4 py-3 text-left text-[15px] font-medium leading-[22px] text-[#97989E] transition-colors hover:bg-[#15161D] hover:text-white"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Sub Task</span>
                  </button>
                ) : null}
              </>
            )}
          </div>
        </div>

        <div className="grid min-h-0 grid-cols-1 grid-rows-[auto_minmax(0,1fr)] bg-[#1A1B25] md:col-span-2 md:grid-cols-[minmax(0,1fr)_280px]">
          <header className="flex items-center justify-between gap-3 border-b border-[#222330] bg-[#191A22] px-5 py-3 md:col-span-2">
            <div className="min-w-0 flex-1">
              {!isNewTask && workspaceName ? (
                <p className="mb-0.5 flex items-center gap-1 truncate text-[11px] text-[#6B6D7A]">
                  <button
                    type="button"
                    className="shrink-0 transition-colors hover:text-[#C4C5CC]"
                    onClick={onClose}
                  >
                    {workspaceName}
                  </button>
                  {task.parent_task_id && parentTask ? (
                    <>
                      <span className="shrink-0">/</span>
                      <button
                        type="button"
                        className="max-w-[120px] truncate transition-colors hover:text-[#C4C5CC]"
                        onClick={() => onOpenSubtask?.(parentTask)}
                      >
                        {parentTask.title}
                      </button>
                    </>
                  ) : null}
                  <span className="shrink-0">/</span>
                  <span className="max-w-[120px] truncate">{task.title}</span>
                </p>
              ) : null}
              <h3 className="truncate text-[15px] leading-[22px] font-medium text-white">
                {isNewTask ? "New Task" : task.title || "Untitled task"}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              {!isNewTask ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className={drawerActionButtonClass}
                  onClick={() => handleStatusChange("Complete")}
                  disabled={!canManageTasks || task.status === "Complete"}
                >
                  Mark Complete
                </Button>
              ) : null}

              {!isNewTask && canManageTasks ? (
                <Button
                  size="sm"
                  className={drawerActionButtonClass}
                  onClick={saveEditedTask}
                  disabled={isSavingTask}
                >
                  {isSavingTask ? "Saving..." : "Save Changes"}
                </Button>
              ) : null}

              {!isNewTask && canManageTasks ? (
                <Button
                  variant="secondary"
                  size="sm"
                  className={drawerActionButtonClass}
                  onClick={() => {
                    void onDeleteTask(task.id);
                  }}
                  disabled={isDeletingTask}
                >
                  {isDeletingTask ? "Deleting..." : "Delete Task"}
                </Button>
              ) : null}

              <Button
                variant="secondary"
                size="sm"
                className={`${drawerActionButtonClass} px-2`}
                onClick={onClose}
                aria-label="Close task drawer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </header>

          <div className="min-h-0 flex flex-col md:border-r md:border-[#222330]">
            {isNewTask ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 pr-2">
                <div className="space-y-6 pb-6">
                  <section className="space-y-4">
                    <Textarea
                      value={draftTitle}
                      onChange={(event) => setDraftTitle(event.target.value)}
                      placeholder="Task title"
                      rows={2}
                      className="min-h-[72px] resize-none border-0 bg-transparent px-0 text-xl font-medium leading-8 tracking-[-0.16px] text-white shadow-none focus-visible:ring-0"
                    />

                    <div className="space-y-5 rounded-[4px] border border-[#292B38] bg-[#191A22] p-5">
                      <h3 className="text-[13px] font-medium uppercase tracking-wide text-[#97989E]">
                        Fields
                      </h3>

                      <div className="overflow-hidden rounded-[4px] border border-[#292B38] bg-[#191A22]">
                        <div className="grid grid-cols-[140px_1fr] border-b border-[#292B38]">
                          <div className="px-3 py-2.5 text-[13px] font-medium text-[#97989E]">
                            Status
                          </div>
                          <div className="px-3 py-2">
                            <select
                              className={drawerFieldControlClass}
                              value={draftStatus}
                              onChange={(event) => {
                                const next = event.target.value as TaskStatus;
                                setDraftStatus(next);
                                if (next === "In Review") openReviewPrompt();
                              }}
                            >
                              {statuses.map((status) => (
                                <option key={status} value={status}>
                                  {status}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <p className="text-[13px] font-medium text-[#97989E]">
                          Due date
                        </p>
                        <Input
                          type="date"
                          value={draftDueDate}
                          onChange={(event) =>
                            setDraftDueDate(event.target.value)
                          }
                          className={drawerFieldControlClass}
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-[13px] font-medium text-[#97989E]">
                          Description
                        </p>
                        <Textarea
                          value={draftDescription}
                          onChange={(event) =>
                            setDraftDescription(event.target.value)
                          }
                          placeholder="Task description"
                          className="rounded-[5px] border border-[#25262B] bg-[#15161D] px-3 py-2 text-[13px] font-medium leading-4 text-white placeholder:text-[#939496]"
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-[13px] font-medium text-[#97989E]">
                          Assigned To
                        </p>
                        <select
                          className={drawerFieldControlClass}
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
                      </div>
                    </div>

                    <div className="space-y-3 rounded-[4px] border border-[#292B38] bg-[#191A22] p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] font-medium text-white">
                          Files for this task
                        </p>
                        <input
                          ref={newTaskFilesInputRef}
                          type="file"
                          className="hidden"
                          onChange={(event) => {
                            const selected = event.target.files?.[0];
                            if (!selected) return;
                            setDraftFiles((prev) => [...prev, selected]);
                            event.currentTarget.value = "";
                          }}
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          className={drawerActionButtonClass}
                          onClick={() => newTaskFilesInputRef.current?.click()}
                        >
                          <Paperclip className="h-3.5 w-3.5" />
                          Add File
                        </Button>
                      </div>

                      {draftFiles.length > 0 ? (
                        <div className="space-y-2">
                          {draftFiles.map((file, index) => (
                            <div
                              key={`${file.name}-${index}`}
                              className="flex items-center justify-between rounded-[4px] border border-[#292B38] bg-[#191A22] px-3 py-2 text-[13px]"
                            >
                              <span className="truncate text-white">
                                {file.name}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                className={drawerActionButtonClass}
                                onClick={() =>
                                  setDraftFiles((prev) =>
                                    prev.filter((_, i) => i !== index),
                                  )
                                }
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[13px] text-[#97989E]">
                          No files selected yet.
                        </p>
                      )}
                    </div>

                    <div className="flex justify-end gap-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        className={drawerActionButtonClass}
                        onClick={onClose}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className={drawerPrimaryCompactButtonClass}
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
                            // no-op
                          }
                        }}
                        disabled={!draftTitle.trim() || isCreatingTask}
                      >
                        {isCreatingTask ? "Saving..." : "Save Task"}
                      </Button>
                    </div>
                  </section>
                </div>
              </div>
            ) : null}

            {!isNewTask && activeTab === "task" ? (
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 pr-2">
                <div className="flex flex-col space-y-8 pb-6">
                  <section className="space-y-5">
                    {isEditingTask && canManageTasks ? (
                      <Textarea
                        value={draftTitle}
                        onChange={(event) => setDraftTitle(event.target.value)}
                        placeholder="Task title"
                        rows={2}
                        className="min-h-[72px] resize-none border-0 bg-transparent px-0 text-2xl font-medium leading-8 tracking-[-0.16px] text-white shadow-none focus-visible:ring-0"
                      />
                    ) : (
                      <h2 className="break-words text-2xl font-medium leading-8 tracking-[-0.16px] text-white">
                        {task.title || "Untitled task"}
                      </h2>
                    )}

                    <div className="space-y-3 rounded-[4px] border border-[#292B38] bg-[#191A22] p-5">
                      <div className="flex items-center justify-between gap-4 text-[15px] font-medium">
                        <span className="text-[#97989E]">Assignee</span>
                        <span className="text-white">{assigneeLabel}</span>
                      </div>
                      <div className="flex items-center justify-between gap-4 text-[15px] font-medium">
                        <span className="text-[#97989E]">Due Date</span>
                        <span className="text-white">
                          {task.due_date
                            ? new Date(task.due_date).toLocaleDateString()
                            : "No due date"}
                        </span>
                      </div>
                    </div>
                  </section>

                  <section className="space-y-5 rounded-[4px] border border-[#292B38] bg-[#191A22] p-5">
                    <h3 className="text-[13px] font-medium uppercase tracking-wide text-[#97989E]">
                      Fields
                    </h3>

                    <div className="overflow-hidden rounded-[4px] border border-[#292B38] bg-[#191A22]">
                      <div className="grid grid-cols-[140px_1fr] border-b border-[#292B38]">
                        <div className="px-3 py-2.5 text-[13px] font-medium text-[#97989E]">
                          Status
                        </div>
                        <div className="px-3 py-2">
                          <select
                            className={drawerFieldControlClass}
                            value={isEditingTask ? draftStatus : task.status}
                            onChange={(event) => {
                              const nextStatus = event.target
                                .value as TaskStatus;
                              if (isEditingTask) {
                                setDraftStatus(nextStatus);
                                if (nextStatus === "In Review")
                                  openReviewPrompt();
                                return;
                              }
                              handleStatusChange(nextStatus);
                            }}
                            disabled={!isEditingTask || !canManageTasks}
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
                        <div className="px-3 py-2.5 text-[13px] font-medium text-[#97989E]">
                          Priority
                        </div>
                        <div className="px-3 py-2">
                          <select
                            className={drawerFieldControlClass}
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

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <p className="text-[13px] font-medium text-[#97989E]">
                          Due date
                        </p>
                        <Input
                          type="date"
                          value={
                            isEditingTask
                              ? draftDueDate
                              : (task.due_date?.slice(0, 10) ?? "")
                          }
                          onChange={(event) => {
                            const next = event.target.value || "";
                            if (isEditingTask) {
                              setDraftDueDate(next);
                              return;
                            }
                            void onSaveTask(task.id, {
                              due_date: next || null,
                            });
                          }}
                          disabled={!isEditingTask || !canManageTasks}
                          className={drawerFieldControlClass}
                        />
                      </div>

                      <div className="space-y-2">
                        <p className="text-[13px] font-medium text-[#97989E]">
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
                          className={drawerFieldControlClass}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <p className="text-[13px] font-medium text-[#97989E]">
                        Description
                      </p>
                      <Textarea
                        value={draftDescription}
                        onChange={(event) =>
                          setDraftDescription(event.target.value)
                        }
                        placeholder="Task description"
                        disabled={!isEditingTask || !canManageTasks}
                        className="rounded-[5px] border border-[#25262B] bg-[#15161D] px-3 py-2 text-[13px] font-medium leading-4 text-white placeholder:text-[#939496]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <p className="text-[13px] font-medium text-[#97989E]">
                          Owner
                        </p>
                        {isEditingTask && effectiveRole === "admin" ? (
                          <select
                            className={drawerFieldControlClass}
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
                          <div className={drawerReadOnlyFieldClass}>
                            {ownerLabel}
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <p className="text-[13px] font-medium text-[#97989E]">
                          Assigned To
                        </p>
                        {isEditingTask ? (
                          <select
                            className={drawerFieldControlClass}
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
                          <div className={drawerReadOnlyFieldClass}>
                            {assigneeLabel}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[13px]">
                      <label className="flex items-center gap-2 rounded-[4px] border border-[#292B38] bg-[#191A22] px-3 py-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={draftBillable}
                          onChange={(event) =>
                            setDraftBillable(event.target.checked)
                          }
                          disabled={!isEditingTask || !canManageTasks}
                        />
                        <span className="text-white">Billable</span>
                      </label>
                      <label className="flex items-center gap-2 rounded-[4px] border border-[#292B38] bg-[#191A22] px-3 py-2">
                        <input
                          type="checkbox"
                          className="h-4 w-4"
                          checked={draftClientVisible}
                          onChange={(event) =>
                            setDraftClientVisible(event.target.checked)
                          }
                          disabled={!isEditingTask || !canManageTasks}
                        />
                        <span className="text-white">Client visible</span>
                      </label>
                    </div>

                    <label className="flex items-center gap-2 rounded-[4px] border border-[#292B38] bg-[#191A22] px-3 py-2 text-[13px] text-white">
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
                        className={drawerFieldControlClass}
                      />
                    ) : null}
                  </section>

                  <section className="space-y-4 rounded-[4px] border border-[#292B38] bg-[#191A22] p-5">
                    <h3 className="text-[13px] font-medium uppercase tracking-wide text-[#97989E]">
                      Time Logged
                    </h3>
                    <p className="inline-flex items-center gap-2 text-2xl font-medium tracking-tight text-white">
                      <Clock3 className="h-5 w-5 text-primary" />
                      {secondsToHms(taskTimeSeconds)}
                    </p>
                  </section>
                </div>
              </div>
            ) : null}

            {/* ACTIVITY TAB: unified timeline + composer */}
            {!isNewTask && activeTab === "activity" ? (
              <div className="flex min-h-0 flex-1 flex-col px-5 py-5">
                <h2 className="pb-6 text-2xl font-medium leading-8 tracking-[-0.16px] text-foreground">
                  Activity
                </h2>

                <div
                  ref={activityScrollRef}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-2"
                >
                  {timelineEntries.length === 0 ? (
                    <div className="rounded-md border border-border bg-card/60 p-8 text-center">
                      <p className="text-sm text-muted">
                        No activity yet. Be the first to comment.
                      </p>
                    </div>
                  ) : (
                    <ul role="list" className="space-y-4 pb-6">
                      {timelineEntries.map((entry, index) => {
                        const isLast = index === timelineEntries.length - 1;
                        const absoluteTime = formatTimelineAbsoluteTime(
                          entry.created_at,
                        );
                        const relativeTime = formatTimelineRelativeTime(
                          entry.created_at,
                        );

                        return (
                          <li
                            key={entry.id}
                            className="relative grid grid-cols-[34px_minmax(0,1fr)_auto] items-start gap-3"
                          >
                            <div className="relative flex justify-center">
                              {!isLast ? (
                                <span className="absolute top-4 bottom-[-16px] w-px bg-border" />
                              ) : null}

                              {entry.type === "comment" ? (
                                <img
                                  src={
                                    entry.actorAvatarUrl || "/defaultAvatar.png"
                                  }
                                  alt={entry.actorName}
                                  className="relative z-10 mt-0.5 h-7 w-7 rounded-full border border-[#2c2e42] bg-card object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <span className="relative z-10 mt-2 h-2.5 w-2.5 rounded-full border border-[#2c2e42] bg-[#2c2e42]" />
                              )}
                            </div>

                            {entry.type === "comment" ? (
                              <div className="rounded-2xl border border-[#2c2e42] bg-card px-4 py-3">
                                <div className="flex items-center justify-between gap-3">
                                  <p className="text-sm leading-5 text-foreground">
                                    <span className="font-semibold">
                                      {entry.actorName}
                                    </span>{" "}
                                    <span className="text-muted">
                                      commented
                                    </span>
                                  </p>
                                  <time
                                    dateTime={entry.created_at}
                                    title={absoluteTime}
                                    className="shrink-0 text-xs text-muted"
                                  >
                                    {relativeTime}
                                  </time>
                                </div>

                                <p className="mt-2 whitespace-pre-wrap text-[15px] leading-6 text-foreground">
                                  {entry.body}
                                </p>

                                <div className="mt-3 flex justify-end">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() =>
                                      handleReplyToComment({
                                        id: entry.id,
                                        task_id: task.id,
                                        user_id: "",
                                        body: entry.body,
                                        created_at: entry.created_at,
                                      })
                                    }
                                  >
                                    Reply
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <p className="pt-0.5 text-sm leading-6 text-foreground">
                                <span className="font-semibold">
                                  {entry.actorName}
                                </span>{" "}
                                <span className="text-muted">
                                  {entry.actionText}
                                </span>
                              </p>
                            )}

                            {entry.type === "activity" ? (
                              <time
                                dateTime={entry.created_at}
                                title={absoluteTime}
                                className="pt-0.5 text-xs text-muted"
                              >
                                {relativeTime}
                              </time>
                            ) : (
                              <span />
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  )}

                  <div ref={activityBottomRef} />
                </div>

                <div className="pointer-events-none sticky bottom-[122px] z-10 flex justify-center">
                  <div
                    className={`pointer-events-auto transition-all duration-200 ${
                      showJumpToLatest
                        ? "translate-y-0 opacity-100"
                        : "translate-y-2 opacity-0"
                    }`}
                  >
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => scrollActivityToBottom("smooth")}
                      className="rounded-full border border-border bg-card/80 px-4 shadow-sm backdrop-blur"
                    >
                      Jump to latest
                    </Button>
                  </div>
                </div>

                <div className="sticky bottom-0">
                  <div className="flex items-start gap-3 rounded-2xl border border-border bg-card p-3">
                    <img
                      src={
                        currentUserProfile?.avatar_url || "/defaultAvatar.png"
                      }
                      alt="Your avatar"
                      className="mt-0.5 h-8 w-8 shrink-0 rounded-full border border-border object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <label htmlFor="task-comment" className="sr-only">
                        Add your comment
                      </label>
                      <Textarea
                        id="task-comment"
                        ref={commentInputRef}
                        value={commentBody}
                        onChange={(event) => setCommentBody(event.target.value)}
                        placeholder="Add your comment..."
                        rows={3}
                        className="min-h-[84px] resize-none border-0 bg-transparent px-0 py-0 text-sm text-foreground placeholder:text-muted shadow-none focus-visible:ring-0"
                        onKeyDown={(event) => {
                          const shouldSubmit =
                            event.key === "Enter" &&
                            (event.metaKey || event.ctrlKey);
                          if (!shouldSubmit) return;
                          event.preventDefault();
                          submitComment();
                        }}
                      />

                      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                        <button
                          type="button"
                          className="focus-ring inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-surface text-muted"
                          aria-label="Attach a file"
                          title="Attachment support coming soon"
                          disabled
                        >
                          <Paperclip className="h-4 w-4" />
                        </button>

                        <Button
                          type="button"
                          size="sm"
                          onClick={submitComment}
                          disabled={commentBody.trim().length === 0}
                          className="rounded-md"
                        >
                          Comment
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="hidden min-h-0 bg-sidebar md:flex md:flex-col">
            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
              {/* ── Sub Tasks ── */}
              {!isNewTask ? (
                <div className="pt-2">
                  <div className="mb-2 flex items-center gap-2">
                    <ListChecks className="h-3.5 w-3.5 text-muted" />
                    <p className="text-xs uppercase tracking-wide text-muted">
                      Sub Tasks
                    </p>
                    {subtasks.length > 0 ? (
                      <span className="text-xs text-muted">
                        (
                        {subtasks.filter((s) => s.status === "Complete").length}
                        /{subtasks.length})
                      </span>
                    ) : null}
                  </div>
                  {subtasksQuery.isLoading ? (
                    <p className="text-xs text-muted">Loading…</p>
                  ) : subtasks.length === 0 ? (
                    <p className="text-xs text-muted">No subtasks yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {subtasks.map((sub) => (
                        <button
                          key={sub.id}
                          type="button"
                          className="flex w-full items-center gap-2 rounded border border-[#292B38] bg-[#15161D] px-2.5 py-1.5 text-left transition-colors hover:bg-[#1A1C23]"
                          onClick={() => onOpenSubtask?.(sub)}
                        >
                          <span
                            className={[
                              "h-1.5 w-1.5 shrink-0 rounded-full",
                              sub.status === "Complete"
                                ? "bg-green-500"
                                : sub.status === "In Progress"
                                  ? "bg-blue-500"
                                  : "bg-[#6B6D7A]",
                            ].join(" ")}
                          />
                          <span
                            className={[
                              "flex-1 truncate text-xs",
                              sub.status === "Complete"
                                ? "text-muted line-through"
                                : "text-foreground",
                            ].join(" ")}
                          >
                            {sub.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {/* ── Files ── */}
              {!isNewTask ? (
                <div className="pt-2">
                  <div className="mb-2 flex items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5 text-muted" />
                    <p className="text-xs uppercase tracking-wide text-muted">
                      Files
                    </p>
                    {files.length > 0 ? (
                      <span className="text-xs text-muted">
                        ({files.length})
                      </span>
                    ) : null}
                  </div>
                  {files.length === 0 ? (
                    <p className="text-xs text-muted">No files attached.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {files.map((file) => (
                        <div
                          key={file.id}
                          className="flex w-full items-center gap-2 rounded border border-[#292B38] bg-[#15161D] px-2.5 py-1.5"
                        >
                          <Paperclip className="h-3 w-3 shrink-0 text-muted" />
                          <button
                            type="button"
                            className="flex-1 truncate text-left text-xs text-foreground hover:text-white"
                            onClick={() =>
                              onDownloadFile(file.storage_path, file.file_name)
                            }
                            disabled={isDownloadingFile}
                          >
                            {file.file_name}
                          </button>
                          {canDeleteFile(file) ? (
                            <button
                              type="button"
                              onClick={() => onDeleteFile(file.id, task.id)}
                              disabled={isDeletingFile}
                              className="shrink-0 text-muted transition-colors hover:text-red-400"
                              title="Delete file"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="mt-3">
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={(event) => {
                        const selected = event.target.files?.[0];
                        if (!selected) return;
                        onUploadFile(task.id, selected);
                        event.currentTarget.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingFile}
                      className="focus-ring inline-flex w-full items-center justify-center gap-1.5 rounded border border-[#2A2C31] bg-[#15161D] py-1.5 text-xs text-[#97989E] transition-colors hover:text-white disabled:opacity-50"
                    >
                      <Paperclip className="h-3 w-3" />
                      {isUploadingFile ? "Uploading..." : "Upload File"}
                    </button>
                  </div>
                </div>
              ) : null}

              {!isNewTask ? <hr className="border-[#222330]" /> : null}

              <div>
                <p className="text-xs uppercase tracking-wide text-muted">
                  Status
                </p>
                <p className="mt-1 text-foreground">
                  {isNewTask ? draftStatus : task.status}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">
                  Priority
                </p>
                <p className="mt-1 text-foreground">{draftPriority}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">
                  Owner
                </p>
                <p className="mt-1 text-foreground">
                  {isNewTask
                    ? formatUserDisplayName(
                        workspaceUsers.find(
                          (user) => user.user_id === draftOwnerId,
                        )?.email,
                      )
                    : ownerLabel}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">
                  Assigned To
                </p>
                <p className="mt-1 text-foreground">
                  {isNewTask
                    ? formatUserDisplayName(
                        workspaceUsers.find(
                          (user) => user.user_id === draftAssigneeId,
                        )?.email,
                      )
                    : assigneeLabel}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted">
                  Due Date
                </p>
                <p className="mt-1 text-foreground">
                  {isNewTask
                    ? draftDueDate || "No due date"
                    : task.due_date
                      ? new Date(task.due_date).toLocaleDateString()
                      : "No due date"}
                </p>
              </div>
              {!isNewTask ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted">
                    Logged Time
                  </p>
                  <p className="mt-1 text-foreground">
                    {secondsToHms(taskTimeSeconds)}
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
