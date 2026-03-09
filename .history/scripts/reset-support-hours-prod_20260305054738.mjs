import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "hnrpcdyzvjkkpniahnzm";
const ADMIN_EMAIL = "levongravett@gmail.com";

function getEnvValue(key) {
  const envText = readFileSync(".env.local", "utf8");
  const line = envText
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith(`${key}=`));
  if (!line) {
    throw new Error(`Missing ${key} in .env.local`);
  }
  return line.slice(key.length + 1).trim();
}

function getServiceRoleKey() {
  const raw = execSync(
    `supabase projects api-keys --project-ref ${PROJECT_REF} --output json`,
    { encoding: "utf8" },
  );
  const keys = JSON.parse(raw);
  const legacyServiceRole = keys.find(
    (k) => k.id === "service_role" && k.api_key,
  );
  if (!legacyServiceRole) {
    throw new Error(
      "Could not find legacy service_role API key via Supabase CLI",
    );
  }
  return legacyServiceRole.api_key;
}

const supabaseUrl = getEnvValue("VITE_SUPABASE_URL");
const serviceRoleKey = getServiceRoleKey();

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: usersPage, error: usersError } =
  await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
if (usersError) throw usersError;

const adminUser = usersPage.users.find(
  (u) => (u.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase(),
);
if (!adminUser) {
  throw new Error(`Could not find user ${ADMIN_EMAIL}`);
}

const { data: memberships, error: membershipsError } = await supabase
  .from("workspace_users")
  .select("workspace_id, role")
  .eq("user_id", adminUser.id);
if (membershipsError) throw membershipsError;
if (!memberships || memberships.length === 0) {
  throw new Error(`User ${ADMIN_EMAIL} has no workspace memberships`);
}

const targetMembership =
  memberships.find((m) => (m.role || "").toLowerCase() === "admin") ||
  memberships[0];
const workspaceId = targetMembership.workspace_id;

const { data: beforeSummary, error: beforeSummaryError } = await supabase
  .from("workspace_support_summary")
  .select("workspace_id,hours_allocated,hours_used,hours_remaining")
  .eq("workspace_id", workspaceId)
  .maybeSingle();
if (beforeSummaryError) throw beforeSummaryError;

const { count: beforeEntriesCount, error: beforeEntriesError } = await supabase
  .from("time_entries")
  .select("id", { count: "exact", head: true })
  .eq("workspace_id", workspaceId);
if (beforeEntriesError) throw beforeEntriesError;

const { error: resetBucketsError } = await supabase
  .from("support_buckets")
  .update({ hours_used_cached: 0 })
  .eq("workspace_id", workspaceId);
if (resetBucketsError) throw resetBucketsError;

const { error: deleteTimeEntriesError } = await supabase
  .from("time_entries")
  .delete()
  .eq("workspace_id", workspaceId);
if (deleteTimeEntriesError) throw deleteTimeEntriesError;

const { data: afterSummary, error: afterSummaryError } = await supabase
  .from("workspace_support_summary")
  .select("workspace_id,hours_allocated,hours_used,hours_remaining")
  .eq("workspace_id", workspaceId)
  .maybeSingle();
if (afterSummaryError) throw afterSummaryError;

const { count: afterEntriesCount, error: afterEntriesError } = await supabase
  .from("time_entries")
  .select("id", { count: "exact", head: true })
  .eq("workspace_id", workspaceId);
if (afterEntriesError) throw afterEntriesError;

console.log(
  JSON.stringify(
    {
      workspaceId,
      adminUserId: adminUser.id,
      before: {
        summary: beforeSummary,
        timeEntries: beforeEntriesCount ?? 0,
      },
      after: {
        summary: afterSummary,
        timeEntries: afterEntriesCount ?? 0,
      },
      status: "support hours reset complete",
    },
    null,
    2,
  ),
);
