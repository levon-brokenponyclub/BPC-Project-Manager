"use client";

import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { DesignaliCreative } from "@/components/creative";
import { LoginScreen } from "@/components/login-screen";

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (data.session) {
        const { error } = await supabase.auth.getUser();
        if (error) {
          await supabase.auth.signOut();
          setUser(null);
        } else {
          setUser(data.session.user);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "TOKEN_REFRESHED" && !session) {
        supabase.auth.signOut();
        return;
      }
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (loading) return null;

  if (!user) return <LoginScreen />;

  const userName =
    user.user_metadata?.full_name ||
    user.user_metadata?.name ||
    user.email ||
    "Admin";

  return (
    <main className="overflow-hidden">
      <DesignaliCreative userName={userName} />
    </main>
  );
}
