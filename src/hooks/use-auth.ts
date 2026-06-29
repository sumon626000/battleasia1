import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  recordLoginEvent,
  heartbeatSession,
  clearLocalSessionToken,
  claimActiveSession,
  isActiveSession,
} from "@/lib/login-tracker";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let stopped = false;

    async function enforceSingleDevice() {
      if (stopped) return;
      const ok = await isActiveSession();
      if (!ok && !stopped) {
        toast.error(
          "This account was logged in on another device — signing out from this device.",
        );
        clearLocalSessionToken();
        await supabase.auth.signOut();
      }
    }

    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      if (event === "SIGNED_IN") {
        setTimeout(() => {
          void recordLoginEvent();
          void claimActiveSession();
        }, 0);
      } else if (event === "SIGNED_OUT") {
        clearLocalSessionToken();
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
      if (data.session) {
        void heartbeatSession();
        void enforceSingleDevice();
      }
    });

    const hb = setInterval(() => {
      void heartbeatSession();
      void enforceSingleDevice();
    }, 30_000);

    return () => {
      stopped = true;
      sub.subscription.unsubscribe();
      clearInterval(hb);
    };
  }, []);

  return { session, user, loading, isAuthenticated: !!user };
}

