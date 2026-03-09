import { useState } from "react";

import type { Notification } from "@/types/models";
import type { WorkspaceUser } from "@/api/workspaces";

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  workspaceUsers?: WorkspaceUser[];
  onMarkRead?: (notificationId: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
}

type NotificationFilter = "all" | "unread" | "task";

export function NotificationBell({
  notifications,
  unreadCount,
  workspaceUsers = [],
  onMarkAllRead,
  onClearAll,
}: NotificationBellProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<NotificationFilter>("all");

  const filteredNotifications = notifications.filter((notification) => {
    if (filter === "unread") return !notification.read_at;
    if (filter === "task") return getTaskName(notification).length > 0;
    return true;
  });

  const handleMarkAllRead = () => {
    onMarkAllRead();
  };

  const usersById = new Map(workspaceUsers.map((user) => [user.user_id, user]));

  const toTitleCase = (value: string): string =>
    value
      .split(/[_\s-]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ");

  const getActorUserId = (payload: Record<string, unknown>): string | null => {
    const candidate =
      payload.actor_user_id ??
      payload.actorUserId ??
      payload.user_id ??
      payload.userId ??
      payload.created_by;

    return typeof candidate === "string" && candidate.length > 0
      ? candidate
      : null;
  };

  const getAvatarUrl = (notification: Notification): string => {
    const actorUserId = getActorUserId(notification.payload ?? {});
    if (!actorUserId) {
      return "/defaultAvatar.png";
    }

    return usersById.get(actorUserId)?.avatar_url || "/defaultAvatar.png";
  };

  const getActorFirstName = (notification: Notification): string => {
    const payload = notification.payload ?? {};
    const fromPayload = payload.actor_first_name ?? payload.actorFirstName;
    if (typeof fromPayload === "string" && fromPayload.trim().length > 0) {
      return fromPayload.trim();
    }

    const actorUserId = getActorUserId(payload);
    const email = actorUserId ? usersById.get(actorUserId)?.email : null;
    if (email) {
      const localPart = email.split("@")[0] ?? "User";
      const firstToken = localPart.split(/[._-]+/)[0] ?? localPart;
      return toTitleCase(firstToken);
    }

    return "User";
  };

  const getActivityLabel = (notification: Notification): string => {
    const type = notification.type;
    if (type === "status_change") return "updated status";
    if (type === "comment_added") return "added comment";
    if (type === "task_created") return "created task";
    if (type === "task_deleted") return "deleted task";
    return toTitleCase(type);
  };

  const getTaskName = (notification: Notification): string => {
    const payload = notification.payload ?? {};
    const candidates = [
      payload.taskTitle,
      payload.task_title,
      payload.title,
      payload.taskName,
      payload.task_name,
    ];
    const first = candidates.find(
      (value) => typeof value === "string" && value.trim().length > 0,
    ) as string | undefined;
    return first?.trim() ?? "";
  };

  const renderNotificationRow = (notification: Notification) => {
    const actorFirstName = getActorFirstName(notification);
    const activityLabel = getActivityLabel(notification);
    const taskName = getTaskName(notification) || "General Notification";

    return (
      <li
        key={notification.id}
        className="relative flex gap-3 p-4 text-muted transition-colors hover:bg-stone-50"
      >
        <figure className="flex shrink-0 items-center">
          <div className="relative flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-stone-200">
            <img
              className="h-full w-full object-cover"
              alt="User"
              src={getAvatarUrl(notification)}
            />
          </div>
        </figure>

        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            {actorFirstName} | {activityLabel}
          </p>
          <p className="mt-0.5 text-sm text-muted">{taskName}</p>
          <p className="mt-1 text-xs text-muted">
            {getTimeAgo(notification.created_at)}
          </p>
        </div>

        {!notification.read_at && (
          <span className="absolute right-4 top-1/2 h-2 w-2 -translate-y-1/2 rounded-full bg-primary" />
        )}
      </li>
    );
  };

  const taskGroupedNotifications = filteredNotifications.reduce(
    (acc, notification) => {
      const taskName = getTaskName(notification) || "General Notification";
      const existing = acc.get(taskName) ?? [];
      existing.push(notification);
      acc.set(taskName, existing);
      return acc;
    },
    new Map<string, Notification[]>(),
  );

  const getTimeAgo = (timestamp: string): string => {
    const now = new Date();
    const past = new Date(timestamp);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        className={`relative flex h-12 w-12 items-center justify-center rounded-full border transition ${
          open
            ? "border-primary text-primary"
            : "border-border bg-card text-muted hover:text-foreground"
        }`}
        onClick={() => setOpen((current) => !current)}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M11.9999 2.75098V4.25098M11.9999 4.25098C15.7279 4.25098 18.7499 7.27305 18.7499 11.001V14.1168C18.7499 14.2055 18.7659 14.2935 18.7971 14.3766L19.4899 16.2243C19.8577 17.2049 19.1328 18.251 18.0854 18.251H14.3118M11.9999 4.25098C8.27202 4.25098 5.24994 7.27305 5.24994 11.001V14.1168C5.24994 14.2055 5.23398 14.2935 5.20283 14.3766L4.50995 16.2243C4.14221 17.2049 4.86713 18.251 5.91444 18.251H9.68451M9.68451 18.251V18.937C9.68451 20.2142 10.7204 21.2495 11.9981 21.2495C13.2759 21.2495 14.3118 20.2142 14.3118 18.937V18.251M9.68451 18.251H14.3118"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500"></span>
          </span>
        )}
        {unreadCount > 0 ? (
          <span className="sr-only">
            {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-[420px] rounded-xl border border-border bg-card shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border p-4">
            <h3 className="text-lg font-semibold text-foreground">
              Notifications
            </h3>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-stone-100 hover:text-foreground"
            >
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6.75 17.249L17.2479 6.75111M6.75 6.75098L17.2479 17.2489"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {/* Navigation Tabs */}
          <div className="border-b border-border p-2">
            <nav className="flex gap-1">
              <button
                onClick={() => setFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === "all"
                    ? "bg-primary text-white"
                    : "text-muted hover:bg-stone-100 hover:text-foreground"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setFilter("unread")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === "unread"
                    ? "bg-primary text-white"
                    : "text-muted hover:bg-stone-100 hover:text-foreground"
                }`}
              >
                Unread
              </button>
              <button
                onClick={() => setFilter("task")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === "task"
                    ? "bg-primary text-white"
                    : "text-muted hover:bg-stone-100 hover:text-foreground"
                }`}
              >
                Task
              </button>
            </nav>
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {filter !== "task" ? (
              <ul className="divide-y divide-border">
                {filteredNotifications.map((notification) =>
                  renderNotificationRow(notification),
                )}
                {filteredNotifications.length === 0 && (
                  <li className="p-8 text-center text-sm text-muted">
                    No notifications found.
                  </li>
                )}
              </ul>
            ) : (
              <div className="space-y-3 p-3">
                {[...taskGroupedNotifications.entries()].map(
                  ([taskName, entries]) => (
                    <section
                      key={taskName}
                      className="overflow-hidden rounded-lg border border-border"
                    >
                      <header className="border-b border-border bg-stone-50 px-3 py-2">
                        <p className="text-sm font-semibold text-foreground">
                          {taskName}
                        </p>
                        <p className="text-xs text-muted">Notifications</p>
                      </header>
                      <ul className="divide-y divide-border">
                        {entries.map((notification) =>
                          renderNotificationRow(notification),
                        )}
                      </ul>
                    </section>
                  ),
                )}
                {taskGroupedNotifications.size === 0 && (
                  <p className="p-6 text-center text-sm text-muted">
                    No task notifications found.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-border p-3">
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-foreground"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M2.5 13.8333L6 17.5L7.02402 16.4272M16.5 6.5L10.437 12.8517M7.5 13.8333L11 17.5L21.5 6.5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Mark all as read
            </button>
            <button className="text-sm font-medium text-primary transition-colors hover:text-primary/80">
              Clear All
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
