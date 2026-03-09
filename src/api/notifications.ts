import { supabase } from "@/lib/supabase";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import type { Notification } from "@/types/models";
import { normalizeNotificationPayloadV2 } from "@/lib/notifications/notificationTypes";

export async function listNotifications(
  workspaceId: string,
): Promise<Notification[]> {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw error;
  }

  return (data ?? []) as Notification[];
}

export async function getUnreadNotificationCount(
  workspaceId: string,
): Promise<number> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return 0;
  }

  const { count, error } = await supabase
    .from("notifications")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    throw error;
  }

  return count ?? 0;
}

export async function markNotificationRead(
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId);

  if (error) {
    throw error;
  }
}

export async function markNotificationUnread(
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: null })
    .eq("id", notificationId);

  if (error) {
    throw error;
  }
}

export async function markAllNotificationsRead(
  workspaceId: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .is("read_at", null);

  if (error) {
    throw error;
  }
}

export async function clearAllNotifications(
  workspaceId: string,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id);

  if (error) {
    throw error;
  }
}

export async function deleteNotification(
  notificationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("notifications")
    .delete()
    .eq("id", notificationId);

  if (error) {
    throw error;
  }
}

export async function notifyWorkspaceEvent(
  workspaceId: string,
  type: string,
  payload: Record<string, unknown>,
  targetUserIds?: string[],
): Promise<void> {
  const {
    data: { user: actorUser },
  } = await supabase.auth.getUser();

  const firstName =
    (actorUser?.user_metadata?.first_name as string | undefined)?.trim() ?? "";
  const surname =
    (actorUser?.user_metadata?.surname as string | undefined)?.trim() ?? "";
  const fullNameFromParts = `${firstName} ${surname}`.trim();

  const fallbackName =
    (actorUser?.user_metadata?.full_name as string | undefined) ??
    (fullNameFromParts || undefined) ??
    (actorUser?.user_metadata?.first_name as string | undefined) ??
    actorUser?.email ??
    null;

  const payloadV2 = normalizeNotificationPayloadV2(type, payload, workspaceId, {
    id: actorUser?.id ?? null,
    name: fallbackName,
    email: actorUser?.email ?? null,
    avatar_url:
      (actorUser?.user_metadata?.avatar_url as string | undefined) ?? null,
  });

  let recipients = targetUserIds;

  if (!recipients || recipients.length === 0) {
    const { data: users, error: usersError } = await supabase
      .from("workspace_users")
      .select("user_id")
      .eq("workspace_id", workspaceId);

    if (usersError) {
      throw usersError;
    }

    recipients = (users ?? []).map((row) => String(row.user_id));
  }

  if (!recipients.length) {
    return;
  }

  const rows = recipients.map((userId) => ({
    workspace_id: workspaceId,
    user_id: userId,
    type,
    payload: payloadV2 as unknown as Record<string, unknown>,
  }));

  const { data: insertedRows, error } = await supabase
    .from("notifications")
    .insert(rows)
    .select("id, user_id, type");

  if (error) {
    throw error;
  }

  // Trigger email notifications asynchronously (don't block on email delivery)
  // Only for eligible notification types
  const emailEnabledTypes = new Set([
    "task.created",
    "task.status_changed",
    "task.assignee_added",
    "comment.created",
  ]);

  if (insertedRows && emailEnabledTypes.has(type)) {
    // Fire and forget - don't await or block on email sending
    for (const row of insertedRows) {
      // Skip email for self-actions (actor === recipient)
      if (actorUser?.id !== row.user_id) {
        invokeAuthedFunction("send-email-notification", {
          notificationId: row.id,
        }).catch((err) => {
          // Log but don't throw - email failures shouldn't break notification creation
          console.error("Error sending email notification:", err);
        });
      }
    }
  }
}
