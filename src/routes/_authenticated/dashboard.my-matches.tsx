import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Trophy, Target, Calendar, ChevronRight, Crosshair, Award, Loader2, Filter } from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";
import { format } from "date-fns";

export const Route = createFileRoute("/_authenticated/dashboard/my-matches")({
  component: MyMatchesPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="hud-panel p-6">
        <p className="text-destructive font-mono text-sm">Failed to load matches: {error.message}</p>
        <button
          className="mt-3 btn-outline-gold px-4 py-2 text-xs"
          onClick={() => { reset(); router.invalidate(); }}
        >RETRY</button>
      </div>
    );
  },
  notFoundComponent: () => <div className="hud-panel p-6 font-mono">Not found.</div>,
});

type Tab = "all" | "upcoming" | "active" | "completed";

function MyMatchesPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["my-matches", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("match_participants")
        .select(`
          id, kills, rank_position, prize_bac, entry_fee_bac, status, result_applied, joined_at,
          match:matches (
            id, match_name, map_name, schedule_at, status, game_mode, player_mode,
            reward_type, kill_rate_type, per_kill_amount_bac,
            rank_1_prize_bac, rank_2_prize_bac, rank_3_prize_bac,
            entry_fee_bac, banner_image_url, total_players
          )
        `)
        .eq("user_id", user!.id)
        .order("joined_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const stats = useMemo(() => {
    if (!data) return { total: 0, wins: 0, kills: 0, prize: 0, spent: 0 };
    return data.reduce(
      (acc, p: any) => {
        acc.total += 1;
        acc.kills += p.kills || 0;
        acc.prize += Number(p.prize_bac || 0);
        acc.spent += Number(p.entry_fee_bac || 0);
        if (p.rank_position && p.rank_position <= 3) acc.wins += 1;
        return acc;
      },
      { total: 0, wins: 0, kills: 0, prize: 0, spent: 0 }
    );
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    if (tab === "all") return data;
    return data.filter((p: any) => {
      const s = p.match?.status?.toLowerCase();
      if (tab === "upcoming") return s === "upcoming";
      if (tab === "active") return s === "active";
      if (tab === "completed") return s === "completed" || p.result_applied;
      return true;
    });
  }, [data, tab]);

  return (
    <div className="space-y-6">
      <header className="hud-panel p-5">
        <div className="flex items-center gap-3">
          <Trophy className="w-6 h-6 text-primary" />
          <div>
            <h1 className="font-display text-2xl tracking-wider">MY MATCHES</h1>
            <p className="font-mono text-xs text-muted-foreground uppercase">
              Combat log // results // payouts
            </p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={<Target className="w-4 h-4" />} label="Joined" value={stats.total} />
        <StatTile icon={<Award className="w-4 h-4" />} label="Top 3 Finishes" value={stats.wins} />
        <StatTile icon={<Crosshair className="w-4 h-4" />} label="Total Kills" value={stats.kills} />
        <StatTile
          icon={<CoinIcon className="w-4 h-4" />}
          label="Net BAC"
          value={(stats.prize - stats.spent).toFixed(0)}
          accent={stats.prize - stats.spent >= 0 ? "text-emerald-400" : "text-red-400"}
        />
      </section>

      <div className="hud-panel p-2 flex flex-wrap gap-1">
        <Filter className="w-4 h-4 ml-2 my-auto text-muted-foreground" />
        {(["all", "upcoming", "active", "completed"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-mono text-xs uppercase tracking-wider transition ${
              tab === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="hud-panel p-10 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="hud-panel p-10 text-center">
          <p className="font-mono text-sm text-muted-foreground">No matches in this filter.</p>
          <Link to="/dashboard/matches" className="btn-gold inline-block mt-4 px-5 py-2 text-xs">
            BROWSE TOURNAMENTS
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {filtered.map((p: any) => (
            <MatchRow key={p.id} p={p} />
          ))}
        </ul>
      )}
    </div>
  );
}

function StatTile({
  icon, label, value, accent,
}: { icon: React.ReactNode; label: string; value: number | string; accent?: string }) {
  return (
    <div className="hud-panel p-4">
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="font-mono text-[10px] uppercase tracking-wider">{label}</span>
      </div>
      <div className={`font-display text-2xl mt-1 ${accent ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

function MatchRow({ p }: { p: any }) {
  const m = p.match;
  if (!m) return null;
  const status = m.status?.toLowerCase();
  const isDone = p.result_applied || status === "completed";
  const won = p.rank_position && p.rank_position <= 3;
  const net = Number(p.prize_bac || 0) - Number(p.entry_fee_bac || 0);

  return (
    <li>
      <Link
        to="/dashboard/matches/$matchId"
        params={{ matchId: String(m.id) }}
        className="hud-panel block p-4 hover:border-primary/50 transition"
      >
        <div className="flex items-center gap-4">
          <div className="hidden sm:block w-16 h-16 border border-border bg-muted/20 overflow-hidden shrink-0">
            {m.banner_image_url ? (
              <img loading="lazy" decoding="async" src={m.banner_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                <Trophy className="w-6 h-6" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-display text-base tracking-wide truncate">{m.match_name}</h3>
              <span className={`font-mono text-[10px] uppercase px-2 py-0.5 border ${
                status === "active" ? "border-red-500 text-red-400 animate-pulse" :
                status === "upcoming" ? "border-primary text-primary" :
                "border-muted text-muted-foreground"
              }`}>{m.status}</span>
              {won && (
                <span className="font-mono text-[10px] uppercase px-2 py-0.5 border border-amber-400 text-amber-400">
                  RANK #{p.rank_position}
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-3 mt-1 font-mono text-[11px] text-muted-foreground uppercase">
              <span><Calendar className="inline w-3 h-3 mr-1" />{format(new Date(m.schedule_at), "dd MMM, HH:mm")}</span>
              <span>{m.map_name}</span>
              <span>{m.player_mode}</span>
              <span>{m.reward_type}</span>
            </div>
          </div>

          <div className="text-right shrink-0">
            {isDone ? (
              <>
                <div className="font-mono text-[10px] text-muted-foreground uppercase">Kills / Prize</div>
                <div className="font-display text-base flex items-center justify-end gap-1">
                  <Crosshair className="w-3.5 h-3.5 text-primary" />
                  {p.kills}
                  <span className="mx-1 text-muted-foreground">·</span>
                  <CoinIcon className="w-3.5 h-3.5" />
                  <span className={net >= 0 ? "text-emerald-400" : "text-red-400"}>
                    {Number(p.prize_bac).toFixed(0)}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="font-mono text-[10px] text-muted-foreground uppercase">Entry</div>
                <div className="font-display text-base flex items-center justify-end gap-1">
                  <CoinIcon className="w-3.5 h-3.5" />{Number(p.entry_fee_bac).toFixed(0)}
                </div>
              </>
            )}
          </div>

          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </div>
      </Link>
    </li>
  );
}
