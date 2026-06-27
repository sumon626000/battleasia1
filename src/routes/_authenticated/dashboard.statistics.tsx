import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Trophy,
  Target,
  Swords,
  Coins,
  Crosshair,
  Activity,
  Crown,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/dashboard/statistics")({
  component: StatisticsPage,
});

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  accent,
}: {
  icon: typeof Trophy;
  label: string;
  value: string | number;
  hint?: string;
  accent?: string;
}) {
  return (
    <div className="hud-panel relative overflow-hidden p-4">
      <div className="flex items-start justify-between">
        <div>
          <div className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
            {label}
          </div>
          <div className={`mt-1 font-display text-2xl font-bold ${accent ?? "text-gold"}`}>
            {value}
          </div>
          {hint && <div className="mt-0.5 text-[11px] text-foreground/55">{hint}</div>}
        </div>
        <Icon size={18} className="text-foreground/40" />
      </div>
    </div>
  );
}

function StatisticsPage() {
  const { user } = useAuth();
  const uid = user?.id;

  const { data, isLoading } = useQuery({
    enabled: !!uid,
    queryKey: ["my-stats", uid],
    queryFn: async () => {
      const [parts, txs] = await Promise.all([
        supabase
          .from("match_participants")
          .select("*, matches:match_id(id, title, status, scheduled_at, entry_fee_bac)")
          .eq("user_id", uid!)
          .order("created_at", { ascending: false }),
        supabase
          .from("balance_logs")
          .select("amount, type, created_at")
          .eq("user_id", uid!)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      return {
        participants: parts.data ?? [],
        balanceLogs: txs.data ?? [],
      };
    },
  });

  const stats = useMemo(() => {
    const parts = data?.participants ?? [];
    const finished = parts.filter((p) => {
      const m = p.matches as { status?: string } | null;
      return m?.status === "completed" || m?.status === "result_published";
    });
    const wins = finished.filter((p) => Number(p.rank_position ?? 0) === 1).length;
    const top3 = finished.filter(
      (p) => Number(p.rank_position ?? 0) > 0 && Number(p.rank_position ?? 0) <= 3,
    ).length;
    const top10 = finished.filter(
      (p) => Number(p.rank_position ?? 0) > 0 && Number(p.rank_position ?? 0) <= 10,
    ).length;
    const totalKills = finished.reduce((s, p) => s + Number(p.kills ?? 0), 0);
    const totalPrize = finished.reduce((s, p) => s + Number(p.prize_bac ?? 0), 0);
    const totalEntry = parts.reduce((s, p) => {
      const m = p.matches as { entry_fee_bac?: number } | null;
      return s + Number(m?.entry_fee_bac ?? 0);
    }, 0);
    const winRate = finished.length ? Math.round((wins / finished.length) * 100) : 0;
    const avgKills = finished.length ? (totalKills / finished.length).toFixed(1) : "0.0";
    return {
      played: parts.length,
      finished: finished.length,
      wins,
      top3,
      top10,
      totalKills,
      totalPrize,
      totalEntry,
      winRate,
      avgKills,
    };
  }, [data]);

  const recent = (data?.participants ?? []).slice(0, 8);

  return (
    <div className="space-y-5">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-widest text-gold">
            My Statistics
          </h1>
          <p className="mt-1 text-xs text-foreground/60">
            Lifetime combat performance across all tournaments.
          </p>
        </div>
        <Link
          to="/dashboard/my-matches"
          className="rounded border border-border/60 px-3 py-1.5 font-hud text-[10px] uppercase tracking-widest hover:border-gold hover:text-gold"
        >
          My Matches →
        </Link>
      </header>

      {isLoading ? (
        <div className="hud-panel p-10 text-center text-sm text-foreground/60">Loading…</div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Swords} label="Matches Played" value={stats.played} hint={`${stats.finished} finished`} />
            <StatCard icon={Trophy} label="Wins" value={stats.wins} accent="text-emerald-400" hint={`${stats.winRate}% win rate`} />
            <StatCard icon={Crown} label="Top 3 Finishes" value={stats.top3} />
            <StatCard icon={Target} label="Top 10 Finishes" value={stats.top10} />
            <StatCard icon={Crosshair} label="Total Kills" value={stats.totalKills} hint={`${stats.avgKills} avg per match`} />
            <StatCard icon={Coins} label="Total Prize Won" value={stats.totalPrize.toLocaleString()} accent="text-gold" hint="BAC" />
            <StatCard icon={Activity} label="Total Entry Spent" value={stats.totalEntry.toLocaleString()} hint="BAC" />
            <StatCard
              icon={Calendar}
              label="Net P/L"
              value={(stats.totalPrize - stats.totalEntry).toLocaleString()}
              accent={stats.totalPrize - stats.totalEntry >= 0 ? "text-emerald-400" : "text-destructive"}
              hint="BAC"
            />
          </div>

          <section className="hud-panel p-5">
            <h2 className="mb-4 font-display text-sm uppercase tracking-widest text-gold">
              Recent Matches
            </h2>
            {recent.length === 0 ? (
              <div className="text-sm text-foreground/55">No matches played yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="font-mono uppercase tracking-widest text-foreground/55">
                    <tr className="border-b border-border/40">
                      <th className="py-2 text-left">Match</th>
                      <th className="py-2 text-left">Status</th>
                      <th className="py-2 text-right">Rank</th>
                      <th className="py-2 text-right">Kills</th>
                      <th className="py-2 text-right">Prize</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((p) => {
                      const m = p.matches as {
                        id?: string;
                        title?: string;
                        status?: string;
                      } | null;
                      return (
                        <tr key={p.id} className="border-b border-border/20">
                          <td className="py-2">
                            {m?.id ? (
                              <Link
                                to="/dashboard/matches/$matchId"
                                params={{ matchId: m.id }}
                                className="hover:text-gold"
                              >
                                {m.title ?? "Match"}
                              </Link>
                            ) : (
                              "Match"
                            )}
                          </td>
                          <td className="py-2 text-foreground/70">{m?.status ?? "—"}</td>
                          <td className="py-2 text-right font-mono">
                            {p.rank_position ? `#${p.rank_position}` : "—"}
                          </td>
                          <td className="py-2 text-right font-mono">{p.kills ?? 0}</td>
                          <td className="py-2 text-right font-mono text-gold">
                            {Number(p.prize_bac ?? 0).toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
