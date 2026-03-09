import { useState } from "react";
import { Bell } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { Notification } from "@/types/models";

interface NotificationBellProps {
  notifications: Notification[];
  unreadCount: number;
  onMarkRead: (notificationId: string) => void;
}

export function NotificationBell({
  notifications,
  unreadCount,
  onMarkRead,
}: NotificationBellProps): React.ReactElement {
  const [open, setOpen] = useState(false);

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
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500" />
        ) : null}
        {unreadCount > 0 ? (
          <span className="sr-only">
            {unreadCount} unread notification{unreadCount > 1 ? "s" : ""}
          </span>
        ) : null}
      </button>

      {open ? (
        <Card className="absolute right-0 z-30 mt-2 max-h-96 w-[360px] overflow-y-auto p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Notifications</p>
            <button
              className="rounded-lg px-2 py-1 text-xs text-muted hover:bg-stone-100"
              onClick={() => setOpen(false)}
              type="button"
            >
              Close
            </button>
          </div>

          <div className="space-y-2">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="rounded-xl border border-border p-3"
              >
                <p className="text-sm font-medium">{notification.type}</p>
                <p className="mt-1 text-xs text-muted">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
                <button
                  className="mt-2 rounded-lg px-2 py-1 text-xs text-foreground hover:bg-stone-100"
                  onClick={() => onMarkRead(notification.id)}
                  type="button"
                >
                  Mark as read
                </button>
              </div>
            ))}
            {notifications.length === 0 ? (
              <p className="text-sm text-muted">No notifications yet.</p>
            ) : null}
          </div>
        </Card>
      ) : null}
    </div>
  );
}
