import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { isDemoMode, isSupabaseConfigured, supabase } from "@/lib/supabase";

// Request notification permission
function requestNotificationPermission(): void {
  if ("Notification" in window && Notification.permission === "default") {
    Notification.requestPermission().catch((error) => {
      console.error("Error requesting notification permission:", error);
    });
  }
}

const DEV_AUTH_STORAGE_KEY = "bpc-dev-auth-user";

interface AuthContextValue {
  user: User | null;
  session: Session | null;
  loading: boolean;
  loginWithOtp: (email: string) => Promise<void>;
  loginWithPassword: (email: string, password: string) => Promise<void>;
  signUpWithPassword: (email: string, password: string) => Promise<void>;
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

    const syncUserFromServer = async (nextSession: Session | null) => {
      if (!subscribed) return;

      setSession(nextSession);

      if (!nextSession) {
        setUser(null);
        setLoading(false);
        return;
      }

      // Always fetch latest auth user data so profile metadata (e.g. avatar_url)
      // updates even when the cached session payload is stale.
      const { data } = await supabase.auth.getUser();
      if (!subscribed) return;
      setUser(data.user ?? nextSession.user ?? null);
      setLoading(false);
    };

    supabase.auth
      .getSession()
      .then(({ data }) => syncUserFromServer(data.session))
      .catch(() => {
        if (subscribed) {
          setLoading(false);
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncUserFromServer(nextSession);
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

          // Request notification permission after successful login
          requestNotificationPermission();
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

        // Request notification permission (OTP login will complete on redirect)
        requestNotificationPermission();
      },
      loginWithPassword: async (email: string, password: string) => {
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

        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        setSession(data.session);
        setUser(data.user);

        // Request notification permission after successful login
        requestNotificationPermission();
      },
      signUpWithPassword: async (email: string, password: string) => {
        if (isDemoMode) {
          throw new Error("Sign up is unavailable in demo mode.");
        }

        if (!isSupabaseConfigured) {
          throw new Error(
            "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.",
          );
        }

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        if (data.session) {
          setSession(data.session);
          setUser(data.user);

          // Request notification permission after successful signup
          requestNotificationPermission();
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

        // Request notification permission after dev login
        requestNotificationPermission();
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
