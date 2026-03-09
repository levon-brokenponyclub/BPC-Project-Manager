import { useQuery } from "@tanstack/react-query";
import {
  supabase,
  isSupabaseConfigured,
  preferredDataMode,
} from "@/lib/supabase";

export function useSystemStatus(workspaceId: string) {
  const mode = preferredDataMode === "live" ? "live" : "demo";
  const enabled = isSupabaseConfigured && mode === "live";
  const query = useQuery({
    queryKey: ["system-status", workspaceId],
    queryFn: async () => {
      if (!enabled) return { connected: false };
      // Trivial query: get session and workspace
      const session = await supabase.auth.getSession();
      if (!session.data.session) throw new Error("No session");
      const { data, error } = await supabase
        .from("my_workspaces")
        .select("id")
        .limit(1);
      if (error) throw error;
      return { connected: true };
    },
    enabled,
    retry: 1,
    staleTime: 10000,
  });
  return {
    mode,
    supabaseConfigured: isSupabaseConfigured,
    connected: query.data?.connected ?? false,
    lastError: query.error?.message,
  };
}
