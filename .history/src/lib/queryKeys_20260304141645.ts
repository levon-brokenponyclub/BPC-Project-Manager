export const queryKeys = {
  authSession: ["auth", "session"] as const,
  workspaces: ["workspaces"] as const,
  workspaceSupport: (workspaceId: string) =>
    ["workspace", workspaceId, "support"] as const,
  tasks: (workspaceId: string, status: string, search: string) =>
    ["workspace", workspaceId, "tasks", status, search] as const,
  taskComments: (taskId: string) => ["task", taskId, "comments"] as const,
  taskActivity: (taskId: string) => ["task", taskId, "activity"] as const,
  timeEntries: (workspaceId: string) =>
    ["workspace", workspaceId, "timeEntries"] as const,
  runningTimer: (workspaceId: string) =>
    ["workspace", workspaceId, "runningTimer"] as const,
  notifications: (workspaceId: string) =>
    ["workspace", workspaceId, "notifications"] as const,
  unreadNotifications: (workspaceId: string) =>
    ["workspace", workspaceId, "notifications", "unread"] as const,
  hoursBreakdown: (workspaceId: string) =>
    ["workspace", workspaceId, "hoursBreakdown"] as const,
};
