import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Trophy, Eye, Loader2, KeyRound, Copy, Check, ExternalLink } from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";
import { randomBanner } from "@/lib/match-banners";
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

type Tab = "all" | "wins" | "losses" | "pending";

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
    if (!data) return { total: 0, wins: 0, losses: 0, prize: 0 };
    return data.reduce(
      (acc, p: any) => {
        acc.total += 1;
        acc.prize += Number(p.prize_bac || 0);
        const done = p.result_applied || p.match?.status?.toLowerCase() === "completed";
        if (done) {
          if (Number(p.prize_bac || 0) > 0) acc.wins += 1;
          else acc.losses += 1;
        }
        return acc;
      },
      { total: 0, wins: 0, losses: 0, prize: 0 }
    );
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    return data.filter((p: any) => {
      const done = p.result_applied || p.match?.status?.toLowerCase() === "completed";
      const won = done && Number(p.prize_bac || 0) > 0;
      const lost = done && Number(p.prize_bac || 0) <= 0;
      if (tab === "all") return true;
      if (tab === "wins") return won;
      if (tab === "losses") return lost;
      if (tab === "pending") return !done;
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

      {/* Top summary row like reference */}
      <section className="hud-panel p-4 flex flex-wrap items-center gap-x-8 gap-y-2">
        <SummaryItem label="Total Matches" value={stats.total} />
        <SummaryItem label="Wins" value={stats.wins} accent="text-emerald-400" />
        <SummaryItem label="Losses" value={stats.losses} accent="text-red-400" />
        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-amber-400">Total Prize</div>
          <div className="font-display text-lg flex items-center gap-1.5 text-amber-300">
            <CoinIcon className="w-4 h-4" />
            {stats.prize.toLocaleString(undefined, { maximumFractionDigits: 2 })}
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="border-b border-border/60 flex gap-1 overflow-x-auto">
        {(["all", "wins", "losses", "pending"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-5 py-3 font-mono text-xs uppercase tracking-wider transition border-b-2 -mb-px ${
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((p: any) => (
            <MatchCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function SummaryItem({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-lg ${accent ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

function MatchCard({ p }: { p: any }) {
  const m = p.match;
  if (!m) return null;
  const status = m.status?.toLowerCase();
  const done = p.result_applied || status === "completed";
  const won = done && Number(p.prize_bac || 0) > 0;
  const lost = done && !won;
  const pending = !done;
  const entryFree = Number(m.entry_fee_bac || 0) === 0;

  const badge = won
    ? { label: "WON", cls: "bg-emerald-500 text-white" }
    : lost
    ? { label: "LOST", cls: "bg-zinc-400 text-zinc-900" }
    : pending
    ? { label: "PENDING", cls: "bg-amber-400 text-black" }
    : { label: m.status?.toUpperCase() ?? "—", cls: "bg-zinc-700 text-white" };

  return (
    <Link
      to="/dashboard/matches/$matchId"
      params={{ matchId: String(m.id) }}
      className="hud-panel group overflow-hidden flex flex-col hover:border-primary/60 transition"
    >
      {/* Banner */}
      <div className="relative aspect-[4/3] bg-muted/20 overflow-hidden">
        <img
          loading="lazy"
          decoding="async"
          src={m.banner_image_url || randomBanner(m.id)}
          alt={m.match_name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Top-left tags */}
        <div className="absolute top-2 left-2 flex gap-1.5">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${entryFree ? "bg-red-500 text-white" : "bg-primary text-primary-foreground"}`}>
            {entryFree ? "FREE" : "PAID"}
          </span>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-black/60 text-white backdrop-blur-sm">
            {m.map_name || "—"}
          </span>
        </div>
        {/* Top-right status badge */}
        <span className={`absolute top-2 right-2 text-[10px] font-bold px-2.5 py-0.5 rounded ${badge.cls}`}>
          {badge.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-3 flex flex-col gap-2 flex-1">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          <h3 className="font-display text-sm tracking-wide truncate">{m.match_name}</h3>
        </div>
        <div className="font-mono text-[11px] text-red-400">
          {format(new Date(m.schedule_at), "dd/MM/yyyy hh:mm a")}
        </div>

        <div className="grid grid-cols-2 gap-2 mt-1">
          <div>
            <div className="font-mono text-[10px] text-muted-foreground uppercase">Entry Fee</div>
            <div className="flex items-center gap-1 font-display text-sm">
              <CoinIcon className="w-3.5 h-3.5" />
              {Number(p.entry_fee_bac || m.entry_fee_bac || 0).toFixed(0)}
            </div>
          </div>
          <div>
            <div className="font-mono text-[10px] text-emerald-400 uppercase">Prize Won</div>
            <div className="flex items-center gap-1 font-display text-sm text-emerald-300">
              {Number(p.prize_bac || 0) > 0 ? (
                <>
                  <CoinIcon className="w-3.5 h-3.5" />
                  {Number(p.prize_bac).toFixed(2)}
                </>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="font-mono text-[10px] text-muted-foreground uppercase">Kills</div>
          <div className="font-display text-sm">{p.kills ?? 0}</div>
        </div>

        <button className="mt-2 w-full inline-flex items-center justify-center gap-2 py-2 rounded bg-rose-500 hover:bg-rose-400 text-white font-mono text-xs uppercase tracking-wider transition">
          <Eye className="w-3.5 h-3.5" /> View Details
        </button>
      </div>
    </Link>
  );
}
