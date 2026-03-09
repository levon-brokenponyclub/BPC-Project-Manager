import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import {
  isDemoMode,
  isSupabaseConfigured,
  supabase,
} from "@/lib/supabase";

const DEV_AUTH_STORAGE_KEY = "bpc-dev-auth-user";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  loginWithOtp: (email: string) => Promise<void>;
  loginForDev: (email?: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isDemoMode) {
      const raw = localStorage.getItem(DEV_AUTH_STORAGE_KEY);
      if (raw) {
        try {
          setUser(JSON.parse(raw) as User);
        } catch {
          localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
        }
      }
      setLoading(false);
      return;
    }

    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    let subscribed = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (subscribed) {
          setSession(data.session);
          setUser(data.session?.user ?? null);
          setLoading(false);
        }
      })
      .catch(() => {
        if (subscribed) {
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      subscribed = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      session,
      loading,
      loginWithOtp: async (email: string) => {
        if (isDemoMode) {
          const devUser = {
            id: "dev-user-localhost",
            email: email || "dev@localhost",
            aud: "authenticated",
            role: "authenticated",
            app_metadata: {
              provider: "email",
              providers: ["email"],
            },
            user_metadata: {
              full_name: "Local Dev User",
            },
            created_at: new Date().toISOString(),
          } as unknown as User;

          setUser(devUser);
          localStorage.setItem(DEV_AUTH_STORAGE_KEY, JSON.stringify(devUser));
          return;
        }

        if (!isSupabaseConfigured) {
          throw new Error(
            "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.",
          );
        }

        const origin = window.location.origin;
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${origin}/workspaces`,
          },
        });

        if (error) {
          throw error;
        }
      },
      loginForDev: async (email?: string) => {
        if (!isDemoMode) {
          throw new Error("Demo login is only available in demo mode.");
        }

        const devUser = {
          id: "dev-user-localhost",
          email: email || "dev@localhost",
          aud: "authenticated",
          role: "authenticated",
          app_metadata: {
            provider: "email",
            providers: ["email"],
          },
          user_metadata: {
            full_name: "Local Dev User",
          },
          created_at: new Date().toISOString(),
        } as unknown as User;

        setUser(devUser);
        localStorage.setItem(DEV_AUTH_STORAGE_KEY, JSON.stringify(devUser));
      },
      signOut: async () => {
        if (isDemoMode) {
          localStorage.removeItem(DEV_AUTH_STORAGE_KEY);
          setUser(null);
          setSession(null);
          return;
        }

        if (!isSupabaseConfigured) {
          return;
        }

        const { error } = await supabase.auth.signOut();
        if (error) {
          throw error;
        }

        setUser(null);
        setSession(null);
      },
    }),
    [loading, session, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
