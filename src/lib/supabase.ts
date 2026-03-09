import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const DATA_MODE_STORAGE_KEY = "bpc-data-mode";

export type DataMode = "demo" | "live";

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);
export const isDevBypassEnabled =
  import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === "true";
export const canUseLiveMode = isSupabaseConfigured;

function getStoredPreferredMode(): DataMode | null {
  if (typeof window === "undefined") {
    return null;
  }

  const value = window.localStorage.getItem(DATA_MODE_STORAGE_KEY);
  if (value === "demo" || value === "live") {
    return value;
  }

  return null;
}

export const preferredDataMode = getStoredPreferredMode();

export const isDemoMode =
  preferredDataMode === "demo"
    ? true
    : preferredDataMode === "live"
      ? !isSupabaseConfigured
      : isDevBypassEnabled || !isSupabaseConfigured;

if (!isSupabaseConfigured) {
  console.warn(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Running in demo mode.",
  );
}

export function setPreferredDataMode(mode: DataMode): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DATA_MODE_STORAGE_KEY, mode);
}

function createUnavailableClient(): SupabaseClient {
  return new Proxy({} as SupabaseClient, {
    get() {
      throw new Error(
        "Supabase is not configured for live calls. Use demo mode API or set Supabase env vars.",
      );
    },
  });
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(supabaseUrl as string, supabaseAnonKey as string)
  : createUnavailableClient();
