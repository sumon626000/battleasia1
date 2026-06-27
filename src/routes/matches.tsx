import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Swords, Calendar, Coins, Users, Crown } from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";

export const Route = createFileRoute("/matches")({
  component: PublicMatchesPage,
  head: () => ({
    meta: [
      { title: "Tournaments — Battle Asia" },
      { name: "description", content: "Browse upcoming PUBG tournaments, prize pools, and entry details on Battle Asia." },
    ],
  }),
});

type Match = {
  id: number;
  match_name: string;
  map_name: string;
  match_type: string;
  game_mode: string;
  player_mode: string;
  schedule_at: string;
  entry_fee_bac: number;
  rank_1_prize_bac: number;
  per_kill_amount_bac: number;
  total_players: number;
  premium_only: boolean;
  status: string;
  banner_image_url: string | null;
};

function PublicMatchesPage() {
  const q = useQuery({
    queryKey: ["public-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .is("deleted_at", null)
        .in("status", ["Upcoming", "Active"])
        .order("schedule_at", { ascending: true })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as Match[];
    },
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3 hud-bracket pl-3">
        <Swords className="h-7 w-7 text-gold" />
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wider text-gold">Tournaments</h1>
          <p className="text-xs text-foreground/60 font-hud uppercase tracking-widest">Live + upcoming battles</p>
        </div>
      </div>

      {q.isLoading && <div className="text-center text-foreground/60 py-12">Loading…</div>}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {q.data?.map((m) => (
          <Link
            key={m.id}
            to="/dashboard/matches/$matchId"
            params={{ matchId: String(m.id) }}
            className="hud-panel group overflow-hidden hover:border-gold/60 transition"
          >
            <div className="relative h-32 bg-gradient-to-br from-secondary to-background overflow-hidden">
              {m.banner_image_url ? (
                <img loading="lazy" decoding="async" src={m.banner_image_url} alt={m.match_name} className="h-full w-full object-cover opacity-80 group-hover:scale-105 transition" />
              ) : (
                <div className="absolute inset-0 bg-grid-hud opacity-30" />
              )}
              <div className="absolute top-2 left-2 flex gap-2">
                <span className={`rounded px-2 py-0.5 text-[10px] font-hud uppercase ${m.status === "Active" ? "bg-emerald-500/80 text-black" : "bg-gold/80 text-black"}`}>{m.status}</span>
                {m.premium_only && (
                  <span className="rounded bg-purple-500/80 px-2 py-0.5 text-[10px] font-hud uppercase text-white flex items-center gap-1"><Crown size={10} /> Premium</span>
                )}
              </div>
            </div>
            <div className="p-3 space-y-2">
              <h3 className="font-display text-base uppercase tracking-wide text-foreground line-clamp-1">{m.match_name}</h3>
              <div className="flex items-center gap-2 text-xs text-foreground/60">
                <span>{m.map_name}</span>·<span>{m.game_mode}</span>·<span>{m.player_mode}</span>
              </div>
              <div className="flex items-center justify-between border-t border-border/40 pt-2 text-xs">
                <div className="flex items-center gap-1 text-foreground/70"><Calendar size={12} /> {new Date(m.schedule_at).toLocaleString()}</div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1 text-gold"><CoinIcon className="h-3 w-3" /> Entry: {m.entry_fee_bac}</span>
                <span className="flex items-center gap-1 text-emerald-400"><Coins size={12} /> #1: {m.rank_1_prize_bac}</span>
                <span className="flex items-center gap-1 text-foreground/60"><Users size={12} /> {m.total_players}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {q.data?.length === 0 && (
        <div className="hud-panel p-12 text-center text-foreground/60">No active tournaments. Check back soon.</div>
      )}
    </div>
  );
}
