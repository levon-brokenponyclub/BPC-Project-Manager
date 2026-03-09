// @ts-nocheck
// Supabase Edge Function: invite-client
// @deno-types="npm:@supabase/supabase-js@2"
// @ts-ignore -- Deno npm: specifier is resolved by Supabase Edge runtime, not Node TS resolver
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-user-jwt, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get(
      "SUPABASE_SERVICE_ROLE_KEY",
    )!;
    const APP_BASE_URL = Deno.env.get("APP_BASE_URL");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return jsonResponse(
        { error: "Missing Supabase environment variables" },
        500,
      );
    }

    const forwardedUserJwt = req.headers.get("x-user-jwt");
    const authHeader = forwardedUserJwt
      ? `Bearer ${forwardedUserJwt}`
      : req.headers.get("Authorization") || "";

    // Create Supabase client with auth context from request
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Get the authenticated user from the request's JWT
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      return jsonResponse(
        { error: "Unauthorized - invalid or missing auth token" },
        401,
      );
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );

    const body = await req.json();
    console.log("[invite-client] Request body:", JSON.stringify(body));

    const { workspaceId, email, role, delivery } = body;
    const normalizedEmail =
      typeof email === "string" ? normalizeEmail(email) : "";
    if (!workspaceId || !email || role !== "client") {
      console.error("[invite-client] Invalid input:", {
        workspaceId,
        email,
        role,
      });
      return jsonResponse({ error: "Invalid input" }, 400);
    }

    console.log(
      "[invite-client] Checking workspace membership for user:",
      user.id,
    );
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("workspace_users")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (membershipError) {
      console.error("[invite-client] Membership query error:", membershipError);
      return jsonResponse(
        { error: `Membership check failed: ${membershipError.message}` },
        500,
      );
    }

    if (!membership || membership.role !== "admin") {
      console.error("[invite-client] Not authorized:", { membership });
      return jsonResponse({ error: "Not authorized" }, 403);
    }

    const requestOrigin = req.headers.get("origin");
    const redirectBase = (APP_BASE_URL || requestOrigin || "").replace(
      /\/$/,
      "",
    );

    if (!redirectBase) {
      console.error("[invite-client] Missing redirect base URL", {
        appBaseUrl: APP_BASE_URL,
        requestOrigin,
      });
      return jsonResponse(
        {
          error:
            "Missing APP_BASE_URL and request origin. Configure APP_BASE_URL in Edge Function secrets.",
        },
        500,
      );
    }

    const redirectTo = `${redirectBase}/auth/invite`;
    console.log("[invite-client] Using redirectTo:", redirectTo);

    const deliveryMode = delivery === "magic_link" ? "magic_link" : "email";

    let invite: any = null;
    let inviteError: any = null;
    let generatedMagicLink: string | null = null;

    if (deliveryMode === "magic_link") {
      const { data: generated, error: generatedError } =
        await supabaseAdmin.auth.admin.generateLink({
          type: "invite",
          email: normalizedEmail,
          options: { redirectTo },
        });

      invite = generated;
      inviteError = generatedError;
      generatedMagicLink = generated?.properties?.action_link ?? null;
    } else {
      const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        normalizedEmail,
        {
          redirectTo,
        },
      );

      invite = data;
      inviteError = error;
    }

    if (inviteError) {
      console.error("[invite-client] invite operation failed:", inviteError);

      const inviteErrorMessage = (inviteError.message || "").toLowerCase();
      const isEmailRateLimited =
        inviteErrorMessage.includes("email rate limit") ||
        inviteErrorMessage.includes("rate limit");

      // Fallback path: if rate-limited but user already exists, attach user to workspace.
      if (isEmailRateLimited) {
        const { data: usersData, error: usersError } =
          await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });

        if (!usersError) {
          const existingUser = (usersData?.users ?? []).find(
            (u) => normalizeEmail(u.email || "") === normalizedEmail,
          );

          if (existingUser?.id) {
            const { error: fallbackUpsertError } = await supabaseAdmin
              .from("workspace_users")
              .upsert({
                workspace_id: workspaceId,
                user_id: existingUser.id,
                role: "client",
              });

            if (!fallbackUpsertError) {
              return jsonResponse(
                {
                  ok: true,
                  warning:
                    "Invite email rate limit exceeded. Existing user was added to the workspace without sending an email.",
                },
                200,
              );
            }
          }
        }

        return jsonResponse(
          {
            error:
              "Email rate limit exceeded. Please wait and try again, or configure custom SMTP in Supabase Auth settings.",
          },
          429,
        );
      }

      return jsonResponse({ error: inviteError.message }, 400);
    }

    const invitedUserId = invite.user?.id;
    if (invitedUserId) {
      const { error: upsertError } = await supabaseAdmin
        .from("workspace_users")
        .upsert({
          workspace_id: workspaceId,
          user_id: invitedUserId,
          role: "client",
        });

      if (upsertError) {
        return jsonResponse({ error: upsertError.message }, 500);
      }
    }

    return jsonResponse(
      {
        ok: true,
        ...(generatedMagicLink ? { magicLink: generatedMagicLink } : {}),
      },
      200,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
