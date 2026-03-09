// @ts-nocheck
// Supabase Edge Function: invite-client
// @deno-types="npm:@supabase/supabase-js@2"
// @ts-ignore -- Deno npm: specifier is resolved by Supabase Edge runtime, not Node TS resolver
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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

    // Create Supabase client with auth context from request
    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: {
        headers: {
          Authorization: req.headers.get("Authorization")!,
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

    const { workspaceId, email, role } = body;
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
    const { data: invite, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo });

    if (inviteError) {
      console.error("[invite-client] inviteUserByEmail failed:", inviteError);
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

    return jsonResponse({ ok: true }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
