import { useState } from "react";
import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
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
      <Button
        variant="secondary"
        size="sm"
        onClick={() => setOpen((current) => !current)}
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 ? (
          <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        ) : null}
      </Button>

      {open ? (
        <Card className="absolute right-0 z-30 mt-2 max-h-96 w-[360px] overflow-y-auto p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold">Notifications</p>
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Close
            </Button>
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
                <Button
                  className="mt-2"
                  variant="ghost"
                  size="sm"
                  onClick={() => onMarkRead(notification.id)}
                >
                  Mark as read
                </Button>
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
