import { supabase } from "@/lib/supabase";
import type { Notification } from "@/types/models";

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

export async function notifyWorkspaceEvent(
  workspaceId: string,
  type: string,
  payload: Record<string, unknown>,
  targetUserIds?: string[],
): Promise<void> {
  const {
    data: { user: actorUser },
  } = await supabase.auth.getUser();

  const payloadWithActor: Record<string, unknown> = {
    ...payload,
    actor_user_id:
      payload.actor_user_id ?? payload.actorUserId ?? actorUser?.id ?? null,
    actor_first_name:
      payload.actor_first_name ??
      payload.actorFirstName ??
      (actorUser?.user_metadata?.first_name as string | undefined) ??
      null,
  };

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
    payload: payloadWithActor,
  }));

  const { error } = await supabase.from("notifications").insert(rows);

  if (error) {
    throw error;
  }
}
