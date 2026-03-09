import { supabase } from "@/lib/supabase";
import { invokeAuthedFunction } from "@/lib/invokeAuthedFunction";
import type { UserNotificationPreferences } from "@/types/models";

/**
 * Get user's email notification preferences
 * Returns defaults if user has no preferences row
 */
export async function getUserNotificationPreferences(): Promise<
  Omit<UserNotificationPreferences, "user_id" | "created_at" | "updated_at">
> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  // Use RPC function that returns defaults if no row exists
  const { data, error } = await supabase
    .rpc("get_user_notification_preferences", { p_user_id: user.id })
    .single();

  if (error) {
    console.error("Error loading preferences:", error);
    // Return defaults on error
    return {
      email_enabled: true,
      task_created: true,
      task_status_changed: true,
      task_assignee_added: true,
      comment_created: true,
    };
  }

  return data as Omit<
    UserNotificationPreferences,
    "user_id" | "created_at" | "updated_at"
  >;
}

/**
 * Update user's email notification preferences
 * Creates a new row if user has no preferences yet
 */
export async function updateUserNotificationPreferences(
  preferences: Partial<
    Omit<UserNotificationPreferences, "user_id" | "created_at" | "updated_at">
  >,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Not authenticated");
  }

  const { error } = await supabase
    .from("user_notification_preferences")
    .upsert({
      user_id: user.id,
      ...preferences,
      updated_at: new Date().toISOString(),
    });

  if (error) {
    throw error;
  }
}

/**
 * Send an email notification for a notification row
 * Called after creating a notification in the database
 */
export async function sendEmailNotification(
  notificationId: string,
): Promise<{ success: boolean; skipped?: boolean; reason?: string }> {
  const result = await invokeAuthedFunction<{
    success: boolean;
    skipped?: boolean;
    reason?: string;
    sentTo?: string;
  }>("send-email-notification", {
    notificationId,
  });

  return {
    success: result.success,
    skipped: result.skipped,
    reason: result.reason,
  };
}

/**
 * Send a test email notification (admin only)
 */
export async function sendTestEmailNotification(): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new Error("No email address found");
  }

  await invokeAuthedFunction("send-email-notification", {
    testMode: true,
    testEmail: user.email,
  });
}
