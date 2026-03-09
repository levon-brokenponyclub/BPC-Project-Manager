import { supabase } from "@/lib/supabase";
import type { Workspace } from "@/types/models";

export async function getMyWorkspaces(): Promise<Workspace[]> {
  const { data, error } = await supabase
    .from("my_workspaces")
    .select("id,name")
    .order("name", { ascending: true });

  if (!error && data) {
    return data as Workspace[];
  }

  const { data: fallback, error: fallbackError } = await supabase
    .from("workspace_users")
    .select("workspaces(id,name)");

  if (fallbackError) {
    throw fallbackError;
  }

  return (fallback ?? [])
    .flatMap((row) => {
      const relation = (row as { workspaces: Workspace[] | Workspace | null })
        .workspaces;
      if (!relation) {
        return [];
      }

      return Array.isArray(relation) ? relation : [relation];
    })
    .filter((row): row is Workspace => Boolean(row?.id));
}
