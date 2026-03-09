import { formatNotificationMessage } from "@/lib/notifications/formatNotificationMessage";
import type { Notification } from "@/types/models";

export interface ToastFromNotification {
  title: string;
  description?: string;
  route?: string | null;
}

/**
 * High-value notification types that deserve a realtime Sonner toast when
 * received from another user.  Low-signal events (read-state, bulk sync,
 * time/sprint bookkeeping) are intentionally omitted.
 */
const REALTIME_TOAST_TYPES = new Set([
  "task.created",
  "task.status_changed",
  "task.assignee_added",
  "task.assignee_removed",
  "task.deleted",
  "comment.created",
  "comment.assigned",
  "attachment.added",
  "workspace.invite_sent",
  "workspace.member_joined",
  "workspace.member_removed",
]);

export function shouldShowRealtimeToast(type: string): boolean {
  return REALTIME_TOAST_TYPES.has(type);
}

/**
 * Converts a Supabase notification row into toast title + optional description
 * + optional route, using the centralized formatter for actor-first language.
 */
export function mapNotificationToToast(
  notification: Notification,
): ToastFromNotification | null {
  if (!shouldShowRealtimeToast(notification.type)) {
    return null;
  }

  const formatted = formatNotificationMessage(notification);

  return {
    title: formatted.title,
    description: formatted.description,
    route: formatted.route,
  };
}
