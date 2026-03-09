// @ts-ignore - jsr: specifier is valid in Deno/Supabase Edge Functions
import { createClient } from "jsr:@supabase/supabase-js@2";
import { formatNotificationMessage } from "../_shared/notificationFormatter.ts";
import { buildNotificationEmail } from "../_shared/emailTemplate.ts";
import type { NotificationPayloadV2 } from "../_shared/notificationFormatter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// V1 Email Allow-List: only these notification types trigger emails
const EMAIL_ENABLED_TYPES = new Set([
  "task.created",
  "task.status_changed",
  "task.assignee_added",
  "comment.created",
]);

interface EmailNotificationRequest {
  notificationId?: string;
  testMode?: boolean;
  testEmail?: string;
}

/** Send an email via Resend REST API — no SDK required */
async function sendViaResend(
  apiKey: string,
  opts: {
    from: string;
    to: string[];
    subject: string;
    html: string;
    text: string;
  },
): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(opts),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend API error ${res.status}: ${body}`);
  }
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize clients
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const appBaseUrl =
      Deno.env.get("APP_BASE_URL") || "https://bpc-project-manager.netlify.app";

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase configuration");
    }

    if (!resendApiKey) {
      throw new Error("Missing RESEND_API_KEY environment variable");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Parse request body
    const body: EmailNotificationRequest = await req.json();

    // Handle test mode
    if (body.testMode && body.testEmail) {
      const testSubject = "Test Notification from Broken Pony Club";
      const testHtml = buildNotificationEmail({
        title: "Test notification email",
        description:
          "This is a test email sent from your notification preferences.",
        actor: "System",
        entity: "Test",
        ctaUrl: appBaseUrl,
        ctaText: "Open Broken Pony Club",
      });

      await sendViaResend(resendApiKey, {
        from: "Broken Pony Club <onboarding@resend.dev>",
        to: [body.testEmail],
        subject: testSubject,
        html: testHtml.html,
        text: testHtml.text,
      });

      return new Response(JSON.stringify({ success: true, test: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Regular notification mode - require notificationId
    if (!body.notificationId) {
      throw new Error("Missing notificationId");
    }

    // 1. Load the notification
    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .select("*")
      .eq("id", body.notificationId)
      .single();

    if (notifError || !notification) {
      throw new Error("Notification not found");
    }

    // 2. Check if notification type is in the allow-list
    if (!EMAIL_ENABLED_TYPES.has(notification.type)) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "notification_type_not_enabled",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // 3. Load recipient user
    const { data: user, error: userError } =
      await supabase.auth.admin.getUserById(notification.user_id);

    if (userError || !user) {
      throw new Error("Recipient user not found");
    }

    const recipientEmail = user.user.email;

    if (!recipientEmail) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "no_recipient_email",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // 4. Check if actor === recipient (skip self-actions)
    const payload = notification.payload as unknown as NotificationPayloadV2;
    if (payload?.actor?.id === notification.user_id) {
      return new Response(
        JSON.stringify({ success: true, skipped: true, reason: "self_action" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // 5. Load user email preferences
    const { data: prefsData, error: prefsError } = await supabase
      .rpc("get_user_notification_preferences", {
        p_user_id: notification.user_id,
      })
      .single();

    if (prefsError) {
      console.error("Error loading preferences:", prefsError);
      // Continue with defaults if preferences can't be loaded
    }

    // Apply preferences (fallback to defaults if no row)
    const prefs = prefsData || {
      email_enabled: true,
      task_created: true,
      task_status_changed: true,
      task_assignee_added: true,
      comment_created: true,
    };

    // 6. Check if email is globally disabled
    if (!prefs.email_enabled) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: "email_disabled_globally",
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // 7. Check type-specific preference
    const typePreferenceMap: Record<string, keyof typeof prefs> = {
      "task.created": "task_created",
      "task.status_changed": "task_status_changed",
      "task.assignee_added": "task_assignee_added",
      "comment.created": "comment_created",
    };

    const prefKey = typePreferenceMap[notification.type];
    if (prefKey && !prefs[prefKey]) {
      return new Response(
        JSON.stringify({
          success: true,
          skipped: true,
          reason: `type_disabled_${prefKey}`,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // 8. Format the notification
    const formatted = formatNotificationMessage(notification.type, payload);

    // 9. Build the full route URL
    const routeUrl = formatted.route
      ? `${appBaseUrl}${formatted.route}`
      : appBaseUrl;

    // 10. Build the email template
    const emailContent = buildNotificationEmail({
      title: formatted.title,
      description: formatted.description,
      actor: formatted.actor,
      actorAvatarUrl: formatted.actorAvatarUrl,
      entity: formatted.entity,
      ctaUrl: routeUrl,
      ctaText: "View in Broken Pony Club",
    });

    // 11. Send via Resend
    await sendViaResend(resendApiKey, {
      from: "Broken Pony Club <onboarding@resend.dev>",
      to: [recipientEmail],
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });

    return new Response(
      JSON.stringify({ success: true, sentTo: recipientEmail }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Error in send-email-notification:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
