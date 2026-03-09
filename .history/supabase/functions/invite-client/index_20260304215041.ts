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
      return jsonResponse({ error: "Missing Supabase environment variables" }, 500);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;

    if (!token) {
      return jsonResponse({ error: "Missing auth token" }, 401);
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const {
      data: { user },
      error: userError,
    } = await supabaseAuth.auth.getUser(token);

    if (userError || !user) {
      return jsonResponse({ error: "Invalid auth token" }, 401);
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );

    const { workspaceId, email, role } = await req.json();
    if (!workspaceId || !email || role !== "client") {
      return jsonResponse({ error: "Invalid input" }, 400);
    }

    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("workspace_users")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership || membership.role !== "admin") {
      return jsonResponse({ error: "Not authorized" }, 403);
    }

    const redirectTo = APP_BASE_URL
      ? `${APP_BASE_URL}/auth/invite`
      : `${new URL(req.url).origin}/auth/invite`;
    const { data: invite, error: inviteError } =
      await supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo });

    if (inviteError) {
      return jsonResponse({ error: inviteError.message }, 500);
    }

    const invitedUserId = invite.user?.id;
    if (invitedUserId) {
      const { error: upsertError } = await supabaseAdmin.from("workspace_users").upsert({
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
