import { supabase } from "@/lib/supabase";

export async function requireSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error || !data.session) {
    throw new Error("You are not authenticated. Please sign in again.");
  }

  return data.session;
}
