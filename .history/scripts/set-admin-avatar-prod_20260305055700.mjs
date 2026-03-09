import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const PROJECT_REF = "hnrpcdyzvjkkpniahnzm";
const ADMIN_EMAIL = "levongravett@gmail.com";
const AVATAR_URL = "/batman-avatar-icon.png";

function readEnvValue(key) {
  const text = readFileSync(".env.local", "utf8");
  const line = text.split(/\r?\n/).find((row) => row.startsWith(`${key}=`));
  if (!line) throw new Error(`Missing ${key} in .env.local`);
  return line.slice(key.length + 1).trim();
}

function getServiceRoleKey() {
  const raw = execSync(
    `supabase projects api-keys --project-ref ${PROJECT_REF} --output json`,
    { encoding: "utf8" },
  );
  const keys = JSON.parse(raw);
  const key = keys.find((item) => item.id === "service_role" && item.api_key);
  if (!key) throw new Error("service_role key not found");
  return key.api_key;
}

const supabaseUrl = readEnvValue("VITE_SUPABASE_URL");
const serviceRoleKey = getServiceRoleKey();

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: page, error: listError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (listError) throw listError;

const user = page.users.find(
  (u) => (u.email || "").toLowerCase() === ADMIN_EMAIL.toLowerCase(),
);
if (!user) throw new Error(`User not found: ${ADMIN_EMAIL}`);

const newMeta = {
  ...(user.user_metadata || {}),
  avatar_url: AVATAR_URL,
};

const { data: updated, error: updateError } =
  await supabase.auth.admin.updateUserById(user.id, { user_metadata: newMeta });
if (updateError) throw updateError;

console.log(
  JSON.stringify(
    {
      userId: user.id,
      email: user.email,
      avatar_url: updated.user.user_metadata?.avatar_url,
      status: "admin avatar updated",
    },
    null,
    2,
  ),
);
