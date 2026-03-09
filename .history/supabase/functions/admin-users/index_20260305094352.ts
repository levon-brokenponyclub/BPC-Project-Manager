// @ts-nocheck
// Supabase Edge Function: admin-users
// @deno-types="npm:@supabase/supabase-js@2"
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
      console.error(`[admin-users] Auth verification failed:`, userError);
      return jsonResponse(
        { error: "Unauthorized - invalid or missing auth token" },
        401,
      );
    }

    console.log(`[admin-users] Authenticated as user: ${user.id}`);

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      },
    );

    const body = await req.json();
    const action = body?.action;
    const workspaceId = body?.workspaceId;

    if (!workspaceId || !action) {
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

    if (action === "list") {
      const { data: usersData, error: listError } =
        await supabaseAdmin.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

      if (listError) {
        return jsonResponse({ error: listError.message }, 500);
      }

      const users = (usersData?.users ?? []).map((u) => ({
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at,
        confirmed_at: u.confirmed_at,
        avatar_url:
          u.user_metadata?.avatar_url ??
          u.raw_user_meta_data?.avatar_url ??
          null,
        first_name:
          u.user_metadata?.first_name ??
          u.raw_user_meta_data?.first_name ??
          null,
        surname:
          u.user_metadata?.surname ?? u.raw_user_meta_data?.surname ?? null,
      }));

      return jsonResponse({ users }, 200);
    }

    if (action === "verify") {
      const userId = body?.userId;
      if (!userId) {
        return jsonResponse({ error: "Missing userId" }, 400);
      }

      const { error: verifyError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, {
          email_confirm: true,
        });

      if (verifyError) {
        return jsonResponse({ error: verifyError.message }, 500);
      }

      return jsonResponse({ ok: true }, 200);
    }

    if (action === "update_profile") {
      const userId = body?.userId;
      const email =
        typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
      const firstName =
        typeof body?.firstName === "string" ? body.firstName.trim() : "";
      const surname =
        typeof body?.surname === "string" ? body.surname.trim() : "";
      const avatarUrl =
        typeof body?.avatarUrl === "string" ? body.avatarUrl.trim() : "";
      const shouldUpdateAvatarUrl = typeof body?.avatarUrl === "string";

      if (!userId) {
        return jsonResponse({ error: "Missing userId" }, 400);
      }

      if (!email) {
        return jsonResponse({ error: "Email is required" }, 400);
      }

      const fullName = `${firstName} ${surname}`.trim();
      const userMetadata: Record<string, unknown> = {
        first_name: firstName || null,
        surname: surname || null,
        full_name: fullName || null,
      };

      if (shouldUpdateAvatarUrl) {
        userMetadata.avatar_url = avatarUrl || null;
      }

      const updatePayload: Record<string, unknown> = {
        email,
        user_metadata: userMetadata,
      };

      const { error: updateError } =
        await supabaseAdmin.auth.admin.updateUserById(userId, updatePayload);

      if (updateError) {
        return jsonResponse({ error: updateError.message }, 500);
      }

      return jsonResponse({ ok: true }, 200);
    }

    if (action === "create_workspace") {
      const workspaceName =
        typeof body?.workspaceName === "string"
          ? body.workspaceName.trim()
          : "";

      if (!workspaceName) {
        return jsonResponse({ error: "Workspace name is required" }, 400);
      }

      const { data: createdWorkspace, error: createWorkspaceError } =
        await supabaseAdmin
          .from("workspaces")
          .insert({ name: workspaceName })
          .select("id, name")
          .single();

      if (createWorkspaceError || !createdWorkspace?.id) {
        return jsonResponse(
          { error: createWorkspaceError?.message || "Failed to create workspace" },
          500,
        );
      }

      const { error: addCreatorMembershipError } = await supabaseAdmin
        .from("workspace_users")
        .upsert({
          workspace_id: createdWorkspace.id,
          user_id: user.id,
          role: "admin",
        });

      if (addCreatorMembershipError) {
        return jsonResponse({ error: addCreatorMembershipError.message }, 500);
      }

      return jsonResponse({ ok: true, workspace: createdWorkspace }, 200);
    }

    if (action === "delete") {
      const userId = body?.userId;
      if (!userId) {
        return jsonResponse({ error: "Missing userId" }, 400);
      }

      if (userId === user.id) {
        return jsonResponse({ error: "You cannot delete your own user." }, 400);
      }

      // Remove workspace membership in the current workspace first.
      const { error: membershipDeleteError } = await supabaseAdmin
        .from("workspace_users")
        .delete()
        .eq("workspace_id", workspaceId)
        .eq("user_id", userId);

      if (membershipDeleteError) {
        return jsonResponse({ error: membershipDeleteError.message }, 500);
      }

      // Then delete the auth user account.
      const { error: deleteUserError } =
        await supabaseAdmin.auth.admin.deleteUser(userId);

      if (deleteUserError) {
        return jsonResponse({ error: deleteUserError.message }, 500);
      }

      return jsonResponse({ ok: true }, 200);
    }

    return jsonResponse({ error: "Unsupported action" }, 400);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return jsonResponse({ error: message }, 500);
  }
});
