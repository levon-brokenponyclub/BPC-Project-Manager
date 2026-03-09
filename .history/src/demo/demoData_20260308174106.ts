import { formatDurationHours, toIsoNow } from "@/lib/utils";
import type {
  Comment,
  Notification,
  SupportSummary,
  Task,
  TaskActivity,
  TaskStatus,
  TimeEntry,
  Workspace,
} from "@/types/models";
import { normalizeNotificationPayloadV2 } from "@/lib/notifications/notificationTypes";

const DEMO_WORKSPACE_ID = "demo";
const DEMO_WORKSPACE_NAME = "Broken Pony Club – Demo Client";
const DEMO_USER_ID = "dev-user-localhost";

const assignees = [
  { id: "u-amy", name: "Amy" },
  { id: "u-jordan", name: "Jordan" },
  { id: "u-ruby", name: "Ruby" },
];

function nowIso(): string {
  return new Date().toISOString();
}

function daysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

let tasks: Task[] = [
  {
    id: "task-1",
    workspace_id: DEMO_WORKSPACE_ID,
    title: "Refresh homepage messaging",
    description: "Update hero copy and primary CTA alignment.",
    status: "Todo",
    due_date: daysFromNow(4),
    assignee_user_id: assignees[0].id,
    created_by: DEMO_USER_ID,
    created_at: daysFromNow(-7),
    updated_at: daysFromNow(-1),
  },
  {
    id: "task-2",
    workspace_id: DEMO_WORKSPACE_ID,
    title: "Fix mobile menu overlap",
    description: "Resolve nav overlap in iOS Safari viewport.",
    status: "In Progress",
    due_date: daysFromNow(2),
    assignee_user_id: assignees[1].id,
    created_by: DEMO_USER_ID,
    created_at: daysFromNow(-8),
    updated_at: daysFromNow(-1),
  },
  {
    id: "task-3",
    workspace_id: DEMO_WORKSPACE_ID,
    title: "CSV export for reports",
    description: "Add export action in reports card footer.",
    status: "In Review",
    due_date: daysFromNow(6),
    assignee_user_id: assignees[2].id,
    created_by: DEMO_USER_ID,
    created_at: daysFromNow(-10),
    updated_at: daysFromNow(-2),
  },
  {
    id: "task-4",
    workspace_id: DEMO_WORKSPACE_ID,
    title: "Improve onboarding checklist",
    description: "Simplify first-session setup copy.",
    status: "Complete",
    due_date: daysFromNow(-1),
    assignee_user_id: assignees[0].id,
    created_by: DEMO_USER_ID,
    created_at: daysFromNow(-14),
    updated_at: daysFromNow(-3),
  },
  {
    id: "task-5",
    workspace_id: DEMO_WORKSPACE_ID,
    title: "Billing period labels",
    description: "Show human-friendly month labels in settings.",
    status: "Todo",
    due_date: daysFromNow(9),
    assignee_user_id: assignees[1].id,
    created_by: DEMO_USER_ID,
    created_at: daysFromNow(-6),
    updated_at: daysFromNow(-4),
  },
  {
    id: "task-6",
    workspace_id: DEMO_WORKSPACE_ID,
    title: "Notification copy polish",
    description: "Standardize tone for in-app notification text.",
    status: "In Progress",
    due_date: daysFromNow(3),
    assignee_user_id: assignees[2].id,
    created_by: DEMO_USER_ID,
    created_at: daysFromNow(-9),
    updated_at: daysFromNow(-1),
  },
  {
    id: "task-7",
    workspace_id: DEMO_WORKSPACE_ID,
    title: "Task drawer keyboard support",
    description: "Close drawer on ESC and trap focus.",
    status: "In Review",
    due_date: daysFromNow(5),
    assignee_user_id: assignees[0].id,
    created_by: DEMO_USER_ID,
    created_at: daysFromNow(-11),
    updated_at: daysFromNow(-2),
  },
  {
    id: "task-8",
    workspace_id: DEMO_WORKSPACE_ID,
    title: "Reports page layout pass",
    description: "Improve table spacing and heading hierarchy.",
    status: "Complete",
    due_date: daysFromNow(-2),
    assignee_user_id: assignees[1].id,
    created_by: DEMO_USER_ID,
    created_at: daysFromNow(-15),
    updated_at: daysFromNow(-5),
  },
  {
    id: "task-9",
    workspace_id: DEMO_WORKSPACE_ID,
    title: "Retainer summary edge cases",
    description: "Clamp remaining hours at zero.",
    status: "Todo",
    due_date: daysFromNow(7),
    assignee_user_id: assignees[2].id,
    created_by: DEMO_USER_ID,
    created_at: daysFromNow(-5),
    updated_at: daysFromNow(-3),
  },
  {
    id: "task-10",
    workspace_id: DEMO_WORKSPACE_ID,
    title: "Workspace switcher empty state",
    description: "Provide fallback when no workspaces found.",
    status: "Complete",
    due_date: daysFromNow(-4),
    assignee_user_id: assignees[0].id,
    created_by: DEMO_USER_ID,
    created_at: daysFromNow(-16),
    updated_at: daysFromNow(-8),
  },
];

let comments: Comment[] = [
  {
    id: "comment-1",
    task_id: "task-2",
    user_id: DEMO_USER_ID,
    body: "Confirmed on iPhone 14, overlap starts at 390px width.",
    created_at: daysFromNow(-2),
  },
  {
    id: "comment-2",
    task_id: "task-2",
    user_id: DEMO_USER_ID,
    body: "Patch deployed to preview. Ready for client review.",
    created_at: daysFromNow(-1),
  },
  {
    id: "comment-3",
    task_id: "task-3",
    user_id: DEMO_USER_ID,
    body: "CSV output includes headers and consistent date format.",
    created_at: daysFromNow(-2),
  },
];

let taskActivity: TaskActivity[] = [
  {
    id: "activity-1",
    task_id: "task-2",
    type: "status_change",
    payload: { from: "Todo", to: "In Progress" },
    created_at: daysFromNow(-3),
  },
  {
    id: "activity-2",
    task_id: "task-2",
    type: "comment_added",
    payload: { comment_id: "comment-1" },
    created_at: daysFromNow(-2),
  },
  {
    id: "activity-3",
    task_id: "task-3",
    type: "status_change",
    payload: { from: "In Progress", to: "In Review" },
    created_at: daysFromNow(-2),
  },
  {
    id: "activity-4",
    task_id: "task-3",
    type: "comment_added",
    payload: { comment_id: "comment-3" },
    created_at: daysFromNow(-2),
  },
];

let timeEntries: TimeEntry[] = [
  {
    id: "te-1",
    workspace_id: DEMO_WORKSPACE_ID,
    task_id: "task-2",
    user_id: DEMO_USER_ID,
    started_at: daysFromNow(-6),
    ended_at: daysFromNow(-6),
    duration_seconds: 3600,
    created_at: daysFromNow(-6),
  },
  {
    id: "te-2",
    workspace_id: DEMO_WORKSPACE_ID,
    task_id: "task-3",
    user_id: DEMO_USER_ID,
    started_at: daysFromNow(-5),
    ended_at: daysFromNow(-5),
    duration_seconds: 4500,
    created_at: daysFromNow(-5),
  },
  {
    id: "te-3",
    workspace_id: DEMO_WORKSPACE_ID,
    task_id: "task-6",
    user_id: DEMO_USER_ID,
    started_at: daysFromNow(-4),
    ended_at: daysFromNow(-4),
    duration_seconds: 5400,
    created_at: daysFromNow(-4),
  },
  {
    id: "te-4",
    workspace_id: DEMO_WORKSPACE_ID,
    task_id: "task-4",
    user_id: DEMO_USER_ID,
    started_at: daysFromNow(-8),
    ended_at: daysFromNow(-8),
    duration_seconds: 1800,
    created_at: daysFromNow(-8),
  },
  {
    id: "te-5",
    workspace_id: DEMO_WORKSPACE_ID,
    task_id: "task-7",
    user_id: DEMO_USER_ID,
    started_at: daysFromNow(-3),
    ended_at: daysFromNow(-3),
    duration_seconds: 3000,
    created_at: daysFromNow(-3),
  },
  {
    id: "te-6",
    workspace_id: DEMO_WORKSPACE_ID,
    task_id: "task-8",
    user_id: DEMO_USER_ID,
    started_at: daysFromNow(-10),
    ended_at: daysFromNow(-10),
    duration_seconds: 3600,
    created_at: daysFromNow(-10),
  },
  {
    id: "te-7",
    workspace_id: DEMO_WORKSPACE_ID,
    task_id: "task-10",
    user_id: DEMO_USER_ID,
    started_at: daysFromNow(-12),
    ended_at: daysFromNow(-12),
    duration_seconds: 2400,
    created_at: daysFromNow(-12),
  },
  {
    id: "te-8",
    workspace_id: DEMO_WORKSPACE_ID,
    task_id: "task-1",
    user_id: DEMO_USER_ID,
    started_at: daysFromNow(-1),
    ended_at: daysFromNow(-1),
    duration_seconds: 600,
    created_at: daysFromNow(-1),
  },
];

let notifications: Notification[] = Array.from({ length: 10 }).map(
  (_, index) => ({
    id: `notification-${index + 1}`,
    workspace_id: DEMO_WORKSPACE_ID,
    user_id: DEMO_USER_ID,
    type: index % 2 === 0 ? "task_created" : "comment_added",
    payload: {
      taskId: tasks[index % tasks.length]?.id,
      message: `Demo notification ${index + 1}`,
    },
    read_at: index < 4 ? nowIso() : null,
    created_at: daysFromNow(-index),
  }),
);

let runningTimer: {
  workspace_id: string;
  task_id: string;
  user_id: string;
  started_at: string;
} | null = null;

export async function listMyWorkspaces(): Promise<Workspace[]> {
  return [
    {
      id: DEMO_WORKSPACE_ID,
      name: DEMO_WORKSPACE_NAME,
    },
  ];
}

export async function listTasks(
  workspaceId: string,
  filters?: {
    status?: TaskStatus | "All";
    search?: string;
  },
): Promise<Task[]> {
  if (workspaceId !== DEMO_WORKSPACE_ID) {
    return [];
  }

  const status = filters?.status ?? "All";
  const search = filters?.search?.toLowerCase().trim() ?? "";

  return tasks
    .filter((task) => (status === "All" ? true : task.status === status))
    .filter((task) => {
      if (!search) {
        return true;
      }

      const haystack = `${task.title} ${task.description ?? ""}`.toLowerCase();
      return haystack.includes(search);
    })
    .sort((a, b) => (a.updated_at < b.updated_at ? 1 : -1));
}

export async function createTask(
  workspaceId: string,
  input: Pick<
    Task,
    "title" | "description" | "status" | "due_date" | "assignee_user_id"
  >,
): Promise<Task> {
  const createdAt = nowIso();
  const task: Task = {
    id: createId("task"),
    workspace_id: workspaceId,
    title: input.title,
    description: input.description,
    status: input.status,
    due_date: input.due_date,
    assignee_user_id: input.assignee_user_id,
    created_by: DEMO_USER_ID,
    created_at: createdAt,
    updated_at: createdAt,
  };

  tasks = [task, ...tasks];
  return task;
}

export async function updateTask(
  taskId: string,
  patch: Partial<Task>,
): Promise<Task> {
  const index = tasks.findIndex((task) => task.id === taskId);
  if (index < 0) {
    throw new Error("Task not found");
  }

  tasks[index] = {
    ...tasks[index],
    ...patch,
    updated_at: nowIso(),
  };

  return tasks[index];
}

export async function updateTaskStatus(
  taskId: string,
  status: TaskStatus,
): Promise<Task> {
  return updateTask(taskId, { status });
}

export async function deleteTask(taskId: string): Promise<void> {
  tasks = tasks.filter((task) => task.id !== taskId);
  comments = comments.filter((comment) => comment.task_id !== taskId);
  taskActivity = taskActivity.filter((entry) => entry.task_id !== taskId);
  timeEntries = timeEntries.filter((entry) => entry.task_id !== taskId);
  notifications = notifications.filter(
    (notification) => notification.payload?.taskId !== taskId,
  );

  if (runningTimer?.task_id === taskId) {
    runningTimer = null;
  }
}

export async function listComments(taskId: string): Promise<Comment[]> {
  return comments
    .filter((comment) => comment.task_id === taskId)
    .sort((a, b) => (a.created_at > b.created_at ? 1 : -1));
}

export async function addComment(
  taskId: string,
  body: string,
): Promise<Comment> {
  const comment: Comment = {
    id: createId("comment"),
    task_id: taskId,
    user_id: DEMO_USER_ID,
    body,
    created_at: nowIso(),
  };

  comments = [...comments, comment];
  taskActivity = [
    {
      id: createId("activity"),
      task_id: taskId,
      type: "comment_added",
      payload: { comment_id: comment.id },
      created_at: comment.created_at,
    },
    ...taskActivity,
  ];

  return comment;
}

export async function listTaskActivity(
  taskId: string,
): Promise<TaskActivity[]> {
  return taskActivity
    .filter((entry) => entry.task_id === taskId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function logTaskActivity(
  taskId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  taskActivity = [
    {
      id: createId("activity"),
      task_id: taskId,
      type,
      payload,
      created_at: nowIso(),
    },
    ...taskActivity,
  ];
}

export async function listTimeEntries(
  workspaceId: string,
): Promise<TimeEntry[]> {
  return timeEntries
    .filter((entry) => entry.workspace_id === workspaceId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
}

export async function getRunningTimer(
  workspaceId: string,
): Promise<{ entry: TimeEntry; taskTitle: string } | null> {
  if (!runningTimer || runningTimer.workspace_id !== workspaceId) {
    return null;
  }

  const entry: TimeEntry = {
    id: "running-entry",
    workspace_id: runningTimer.workspace_id,
    task_id: runningTimer.task_id,
    user_id: runningTimer.user_id,
    started_at: runningTimer.started_at,
    ended_at: null,
    duration_seconds: null,
    created_at: runningTimer.started_at,
  };

  return {
    entry,
    taskTitle:
      tasks.find((task) => task.id === runningTimer?.task_id)?.title ?? "Task",
  };
}

export async function startTimer(
  workspaceId: string,
  taskId: string,
): Promise<void> {
  runningTimer = {
    workspace_id: workspaceId,
    task_id: taskId,
    user_id: DEMO_USER_ID,
    started_at: toIsoNow(),
  };
}

export async function stopTimer(
  workspaceId: string,
  taskId: string,
): Promise<void> {
  if (
    !runningTimer ||
    runningTimer.workspace_id !== workspaceId ||
    runningTimer.task_id !== taskId
  ) {
    return;
  }

  const endedAt = toIsoNow();
  const durationSeconds = Math.max(
    60,
    Math.floor(
      (new Date(endedAt).getTime() -
        new Date(runningTimer.started_at).getTime()) /
        1000,
    ),
  );

  timeEntries = [
    {
      id: createId("te"),
      workspace_id: workspaceId,
      task_id: taskId,
      user_id: DEMO_USER_ID,
      started_at: runningTimer.started_at,
      ended_at: endedAt,
      duration_seconds: durationSeconds,
      created_at: endedAt,
    },
    ...timeEntries,
  ];

  runningTimer = null;
}

export async function startTaskTimer(
  workspaceId: string,
  taskId: string,
): Promise<void> {
  return startTimer(workspaceId, taskId);
}

export async function stopTaskTimer(
  workspaceId: string,
  taskId: string,
): Promise<void> {
  return stopTimer(workspaceId, taskId);
}

export async function listNotifications(
  workspaceId: string,
): Promise<Notification[]> {
  return notifications
    .filter((notification) => notification.workspace_id === workspaceId)
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
    .slice(0, 50);
}

export async function countUnread(workspaceId: string): Promise<number> {
  return notifications.filter(
    (notification) =>
      notification.workspace_id === workspaceId && !notification.read_at,
  ).length;
}

export async function markAsRead(notificationId: string): Promise<void> {
  notifications = notifications.map((notification) =>
    notification.id === notificationId
      ? {
          ...notification,
          read_at: nowIso(),
        }
      : notification,
  );
}

export async function getUnreadNotificationCount(
  workspaceId: string,
): Promise<number> {
  return countUnread(workspaceId);
}

export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  return markAsRead(notificationId);
}

export async function markAllNotificationsRead(
  workspaceId: string,
): Promise<void> {
  notifications = notifications.map((notification) =>
    notification.workspace_id === workspaceId &&
    notification.user_id === DEMO_USER_ID &&
    !notification.read_at
      ? {
          ...notification,
          read_at: nowIso(),
        }
      : notification,
  );
}

export async function clearAllNotifications(
  workspaceId: string,
): Promise<void> {
  notifications = notifications.filter(
    (notification) =>
      !(
        notification.workspace_id === workspaceId &&
        notification.user_id === DEMO_USER_ID
      ),
  );
}

export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  notifications = notifications.filter(
    (notification) => notification.id !== notificationId,
  );
}

export async function notifyWorkspaceEvent(
  workspaceId: string,
  type: string,
  payload: Record<string, unknown>,
  targetUserIds?: string[],
): Promise<void> {
  const recipients = targetUserIds?.length ? targetUserIds : [DEMO_USER_ID];
  const payloadV2 = normalizeNotificationPayloadV2(type, payload, workspaceId, {
    id: DEMO_USER_ID,
    name: "Demo User",
    email: "demo@localhost",
    avatar_url: "/defaultAvatar.png",
  });

  const generated = recipients.map((userId) => ({
    id: createId("notification"),
    workspace_id: workspaceId,
    user_id: userId,
    type,
    payload: payloadV2 as unknown as Record<string, unknown>,
    read_at: null,
    created_at: nowIso(),
  })) as Notification[];

  notifications = [...generated, ...notifications];
}

export async function getSupportSummary(
  workspaceId: string,
): Promise<SupportSummary> {
  const allocated = workspaceId === DEMO_WORKSPACE_ID ? 20 : 0;
  const usedHours =
    workspaceId === DEMO_WORKSPACE_ID
      ? Number(
          formatDurationHours(
            timeEntries
              .filter((entry) => entry.workspace_id === workspaceId)
              .reduce(
                (total, entry) => total + Number(entry.duration_seconds ?? 0),
                0,
              ),
          ),
        )
      : 0;

  return {
    workspace_id: workspaceId,
    hours_allocated: allocated,
    hours_used: usedHours,
    hours_remaining: Math.max(0, Number((allocated - usedHours).toFixed(2))),
  };
}

export async function getWorkspaceSupportSummary(
  workspaceId: string,
): Promise<SupportSummary> {
  return getSupportSummary(workspaceId);
}

export async function getHoursBreakdown(workspaceId: string): Promise<
  Array<{
    task_id: string;
    task_title: string;
    total_seconds: number;
    total_hours: string;
  }>
> {
  const grouped = (await listTimeEntries(workspaceId)).reduce((acc, entry) => {
    const taskId = entry.task_id;
    const current = acc.get(taskId) ?? 0;
    acc.set(taskId, current + Number(entry.duration_seconds ?? 0));
    return acc;
  }, new Map<string, number>());

  return [...grouped.entries()].map(([taskId, totalSeconds]) => ({
    task_id: taskId,
    task_title:
      tasks.find((task) => task.id === taskId)?.title ?? "Untitled Task",
    total_seconds: totalSeconds,
    total_hours: formatDurationHours(totalSeconds),
  }));
}

export async function listSupportBuckets(workspaceId: string): Promise<
  Array<{
    id: string;
    period_start: string;
    period_end: string;
    hours_allocated: number;
    hours_used_cached: number;
  }>
> {
  const summary = await getSupportSummary(workspaceId);

  const nowDate = new Date();
  const periodStart = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth(),
    1,
  ).toISOString();
  const periodEnd = new Date(
    nowDate.getFullYear(),
    nowDate.getMonth() + 1,
    0,
  ).toISOString();

  return [
    {
      id: "support-bucket-demo",
      period_start: periodStart,
      period_end: periodEnd,
      hours_allocated: summary.hours_allocated,
      hours_used_cached: summary.hours_used,
    },
  ];
}
