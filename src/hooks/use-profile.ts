import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Profile = Omit<Tables<"profiles">, "active_session_token">;

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(true);
    supabase
      .from("profiles")
      .select("id, username, display_name, avatar_url, country, bac_coin_balance, referral_code, referred_by, created_at, updated_at, in_game_username, country_code, mobile_number, pubg_id, game_server, cover_url, is_premium, premium_expires_at, is_active, is_suspended, suspension_reason, language_preference, social_links, bio, active_theme")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        setProfile(data ?? null);
        setLoading(false);
      });

    const channel = supabase.channel(
      `profile-${userId}-${Math.random().toString(36).slice(2, 10)}`,
    );
    channel
      .on(
        "postgres_changes" as any,
        { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload: any) => {
          setProfile(payload.new as Profile);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return { profile, loading };
}
