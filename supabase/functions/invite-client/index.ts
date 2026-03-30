// @ts-nocheck
// Supabase Edge Function: invite-client
// Delivery is always magic_link — no emails are sent.
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

function randomTempPassword(): string {
  return `Tmp#${crypto.randomUUID()}!`;
}

const DEFAULT_AVATAR_PATH = "/defaultAvatar.png";

function enforceRedirectInActionLink(
  actionLink: string | null,
  redirectTo: string,
): string | null {
  if (!actionLink) return null;
  try {
    const url = new URL(actionLink);
    url.searchParams.set("redirect_to", redirectTo);
    return url.toString();
  } catch {
    return actionLink;
  }
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

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );

    const body = await req.json();
    const { workspaceId, projectId, email, role, firstName, surname } = body;

    const normalizedEmail =
      typeof email === "string" ? normalizeEmail(email) : "";
    const sanitizedFirstName =
      typeof firstName === "string" ? firstName.trim() : "";
    const sanitizedSurname = typeof surname === "string" ? surname.trim() : "";
    const fullName = `${sanitizedFirstName} ${sanitizedSurname}`.trim();

    const VALID_ROLES = ["admin", "member", "client", "viewer"];
    const normalizedRole =
      typeof role === "string" ? role.trim().toLowerCase() : "";
    const assignedRole = VALID_ROLES.includes(normalizedRole)
      ? normalizedRole
      : "viewer";

    if (!workspaceId || !normalizedEmail) {
      return jsonResponse({ error: "workspaceId and email are required" }, 400);
    }

    // Admin-only gate
    const { data: membership, error: membershipError } = await supabaseAdmin
      .from("workspace_users")
      .select("role")
      .eq("workspace_id", workspaceId)
      .eq("user_id", user.id)
      .single();

    if (membershipError || !membership || membership.role !== "admin") {
      return jsonResponse({ error: "Not authorized" }, 403);
    }

    const requestOrigin = req.headers.get("origin");
    const redirectBase = (APP_BASE_URL || requestOrigin || "").replace(
      /\/$/,
      "",
    );
    if (!redirectBase) {
      return jsonResponse(
        {
          error: "Missing APP_BASE_URL. Configure it in Edge Function secrets.",
        },
        500,
      );
    }
    const magicLinkRedirectTo = `${redirectBase}/auth/invite`;

    // ── Find or create the auth user ──────────────────────────────────────────
    const { data: usersData, error: usersError } =
      await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) return jsonResponse({ error: usersError.message }, 500);

    const existingUser = (usersData?.users ?? []).find(
      (u) => normalizeEmail(u.email || "") === normalizedEmail,
    );

    let targetUserId: string;

    if (existingUser?.id) {
      targetUserId = existingUser.id;
      // Patch metadata for existing user if names supplied
      if (sanitizedFirstName || sanitizedSurname || fullName) {
        const existing = existingUser.user_metadata || {};
        await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
          user_metadata: {
            ...existing,
            ...(sanitizedFirstName ? { first_name: sanitizedFirstName } : {}),
            ...(sanitizedSurname ? { surname: sanitizedSurname } : {}),
            ...(fullName ? { full_name: fullName } : {}),
            avatar_url: existing.avatar_url || DEFAULT_AVATAR_PATH,
          },
        });
      }
    } else {
      const { data: created, error: createError } =
        await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          email_confirm: true,
          password: randomTempPassword(),
          user_metadata: {
            avatar_url: DEFAULT_AVATAR_PATH,
            ...(sanitizedFirstName ? { first_name: sanitizedFirstName } : {}),
            ...(sanitizedSurname ? { surname: sanitizedSurname } : {}),
            ...(fullName ? { full_name: fullName } : {}),
          },
        });
      if (createError || !created?.user?.id) {
        return jsonResponse(
          { error: createError?.message || "Failed to create user" },
          500,
        );
      }
      targetUserId = created.user.id;
    }

    // ── Assign membership ─────────────────────────────────────────────────────
    if (assignedRole === "admin") {
      // Admin gets access to all workspaces
      const { data: allWorkspaces, error: allWsError } = await supabaseAdmin
        .from("workspaces")
        .select("id");
      if (allWsError) return jsonResponse({ error: allWsError.message }, 500);
      for (const ws of allWorkspaces ?? []) {
        const { error: wsErr } = await supabaseAdmin
          .from("workspace_users")
          .upsert(
            { workspace_id: ws.id, user_id: targetUserId, role: "admin" },
            { onConflict: "workspace_id,user_id" },
          );
        if (wsErr) return jsonResponse({ error: wsErr.message }, 500);
      }
    } else if (projectId) {
      // Project-scoped invites still need a workspace membership to avoid
      // legacy defaults (e.g. stale client-role trigger state) overriding
      // the intended role.
      const { error: wsErr } = await supabaseAdmin
        .from("workspace_users")
        .upsert(
          {
            workspace_id: workspaceId,
            user_id: targetUserId,
            role: assignedRole,
          },
          { onConflict: "workspace_id,user_id" },
        );
      if (wsErr) return jsonResponse({ error: wsErr.message }, 500);

      // Project-scoped: add to project_users too (viewer/member/client)
      const { error: projErr } = await supabaseAdmin
        .from("project_users")
        .upsert(
          {
            project_id: projectId,
            workspace_id: workspaceId,
            user_id: targetUserId,
            role: assignedRole,
            invited_by: user.id,
          },
          { onConflict: "project_id,user_id" },
        );
      if (projErr) return jsonResponse({ error: projErr.message }, 500);
    } else {
      // Workspace-scoped
      const { error: wsErr } = await supabaseAdmin
        .from("workspace_users")
        .upsert(
          {
            workspace_id: workspaceId,
            user_id: targetUserId,
            role: assignedRole,
          },
          { onConflict: "workspace_id,user_id" },
        );
      if (wsErr) return jsonResponse({ error: wsErr.message }, 500);
    }

    // ── Generate magic link (recovery type = passwordless sign-in link) ───────
    const { data: generated, error: generatedError } =
      await supabaseAdmin.auth.admin.generateLink({
        type: "recovery",
        email: normalizedEmail,
        options: { redirectTo: magicLinkRedirectTo, expiresIn: 86400 },
      });

    if (generatedError) {
      return jsonResponse({ error: generatedError.message }, 500);
    }

    const magicLink = enforceRedirectInActionLink(
      generated?.properties?.action_link ?? null,
      magicLinkRedirectTo,
    );

    return jsonResponse({ ok: true, magicLink }, 200);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
