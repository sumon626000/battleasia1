import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Target, Swords, Calendar } from "lucide-react";

export const Route = createFileRoute("/u/$username")({
  component: PublicProfilePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-md p-12 text-center text-foreground/60">Player not found.</div>
  ),
});

type Profile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  country_code: string | null;
  pubg_id: string | null;
  game_server: string | null;
  created_at: string;
  premium_expires_at: string | null;
};

function PublicProfilePage() {
  const { username } = Route.useParams();

  const q = useQuery({
    queryKey: ["public-profile", username],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, country_code, pubg_id, game_server, created_at, premium_expires_at")
        .ilike("username", username)
        .maybeSingle();
      if (error) throw error;
      if (!data) throw notFound();

      const { data: parts } = await supabase
        .from("match_participants")
        .select("kills, prize_bac, rank_position")
        .eq("user_id", data.id)
        .eq("result_applied", true);

      const stats = (parts ?? []).reduce(
        (s: any, p: any) => ({
          kills: s.kills + (p.kills ?? 0),
          prize: s.prize + Number(p.prize_bac ?? 0),
          matches: s.matches + 1,
          wins: s.wins + (p.rank_position === 1 ? 1 : 0),
        }),
        { kills: 0, prize: 0, matches: 0, wins: 0 }
      );

      return { profile: data as Profile, stats };
    },
  });

  if (q.isLoading) return <div className="p-12 text-center text-foreground/60">Loading…</div>;
  if (!q.data) return null;
  const { profile, stats } = q.data;
  const isPremium = profile.premium_expires_at && new Date(profile.premium_expires_at) > new Date();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 space-y-6">
      <div className="hud-panel p-6">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          {profile.avatar_url ? (
            <img loading="lazy" decoding="async" src={profile.avatar_url} alt={profile.username} className="h-24 w-24 rounded border-2 border-gold/60 object-cover" />
          ) : (
            <div className="h-24 w-24 rounded border-2 border-border bg-secondary" />
          )}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-2xl uppercase tracking-wider text-gold">{profile.username}</h1>
              {isPremium && <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] uppercase text-purple-400">Premium</span>}
            </div>
            <p className="text-sm text-foreground/70">{profile.display_name}</p>
            <div className="flex flex-wrap gap-4 text-xs text-foreground/60 font-hud uppercase tracking-widest pt-2">
              {profile.country_code && <span>{profile.country_code}</span>}
              {profile.game_server && <span>Server: {profile.game_server}</span>}
              {profile.pubg_id && <span>PUBG ID: {profile.pubg_id}</span>}
              <span className="flex items-center gap-1"><Calendar size={11} /> Joined {new Date(profile.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatTile icon={Swords} label="Matches" value={stats.matches} />
        <StatTile icon={Target} label="Total Kills" value={stats.kills} />
        <StatTile icon={Trophy} label="Wins" value={stats.wins} />
        <StatTile icon={Trophy} label="Earnings" value={stats.prize.toLocaleString()} />
      </div>
    </div>
  );
}

function StatTile({ icon: Icon, label, value }: { icon: any; label: string; value: number | string }) {
  return (
    <div className="hud-panel p-4 space-y-1">
      <Icon className="h-5 w-5 text-gold" />
      <div className="font-display text-xl text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-foreground/50 font-hud">{label}</div>
    </div>
  );
}
