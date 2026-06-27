import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  recordLoginEvent,
  heartbeatSession,
  clearLocalSessionToken,
} from "@/lib/login-tracker";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (event === "SIGNED_IN") {
        setTimeout(() => {
          void recordLoginEvent();
        }, 0);
      } else if (event === "SIGNED_OUT") {
        clearLocalSessionToken();
      }
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (data.session) void heartbeatSession();
    });
    const hb = setInterval(() => {
      void heartbeatSession();
    }, 60_000);
    return () => {
      sub.subscription.unsubscribe();
      clearInterval(hb);
    };
  }, []);

  return { session, user, loading, isAuthenticated: !!user };
}
