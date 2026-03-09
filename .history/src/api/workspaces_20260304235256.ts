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

export async function getMyWorkspaceRole(
  workspaceId: string,
): Promise<"admin" | "client" | "contributor" | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.id) {
    return null;
  }

  const { data, error } = await supabase
    .from("workspace_users")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !data?.role) {
    return null;
  }

  if (
    data.role === "admin" ||
    data.role === "client" ||
    data.role === "contributor"
  ) {
    return data.role;
  }

  return null;
}

export interface WorkspaceUser {
  user_id: string;
  email: string | null;
}

export async function getWorkspaceUsers(
  workspaceId: string,
): Promise<WorkspaceUser[]> {
  const { data, error } = await supabase.rpc(
    "get_workspace_users_with_emails",
    {
      workspace_id_param: workspaceId,
    },
  );

  if (error) {
    throw error;
  }

  return (data ?? []) as WorkspaceUser[];
}
