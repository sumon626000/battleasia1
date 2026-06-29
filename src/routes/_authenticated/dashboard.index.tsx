import { useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import {
  Trophy,
  Swords,
  Users,
  TrendingUp,
  Wallet as WalletIcon,
  ShoppingBag,
  Crown,
  ArrowRight,
  Target,
  Coins,
  Crosshair,
  Activity,
  Calendar,
} from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";
import {
  RankTierCard,
  AchievementsCard,
  NextTournamentCard,
} from "@/components/dashboard/PlayerHubCards";
import { RewardsHub } from "@/components/dashboard/RewardsHub";
import squadHero from "@/assets/pubg-squad-action.webp";
import sniperImg from "@/assets/pubg-sniper-rooftop.webp";
import airdropImg from "@/assets/pubg-airdrop.webp";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [{ title: "Home — Battle Asia" }],
  }),
  component: DashboardPage,
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
    <div className="hud-panel relative overflow-hidden p-5 transition hover:-translate-y-0.5 hover:border-gold/50">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
            {label}
          </div>
          <div className={`mt-1.5 font-display text-2xl font-bold tabular-nums ${accent ?? "text-gold"}`}>
            {value}
          </div>
          {hint && <div className="mt-1 text-[11px] text-foreground/55">{hint}</div>}
        </div>
        <Icon size={18} className="shrink-0 text-foreground/40" />
      </div>
    </div>
  );
}

function StatSkeleton() {
  return (
    <div className="hud-panel p-5">
      <div className="h-3 w-20 animate-pulse rounded bg-foreground/10" />
      <div className="mt-2 h-7 w-16 animate-pulse rounded bg-foreground/10" />
      <div className="mt-2 h-3 w-24 animate-pulse rounded bg-foreground/10" />
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const uid = user?.id;
  const name = profile?.in_game_username || profile?.username || "Player";
  const balance = Number(profile?.bac_coin_balance ?? 0);

  const { data, isLoading } = useQuery({
    enabled: !!uid,
    queryKey: ["my-stats", uid],
    queryFn: async () => {
      const [parts, txs, upcoming] = await Promise.all([
        supabase
          .from("match_participants")
          .select("*, matches:match_id(id, match_name, status, schedule_at, entry_fee_bac)")
          .eq("user_id", uid!)
          .order("created_at", { ascending: false }),
        supabase
          .from("balance_logs")
          .select("amount, type, created_at")
          .eq("user_id", uid!)
          .order("created_at", { ascending: false })
          .limit(10),
        supabase
          .from("matches")
          .select("id, match_name, schedule_at, status, entry_fee_bac")
          .in("status", ["Upcoming", "Active"])
          .order("schedule_at", { ascending: true })
          .limit(5),
      ]);
      return {
        participants: parts.data ?? [],
        balanceLogs: txs.data ?? [],
        upcoming: upcoming.data ?? [],
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

  const recent = (data?.participants ?? []).slice(0, 6);
  const upcoming = data?.upcoming ?? [];

  const quick = [
    { label: "Join Match", href: "/dashboard/matches", icon: Swords },
    { label: "Get BAC Coin", href: "/dashboard/vault", icon: WalletIcon },
    { label: "Shop", href: "/dashboard/shop", icon: ShoppingBag },
    { label: "Go Premium", href: "/dashboard/premium", icon: Crown },
  ];

  return (
    <div className="space-y-4">
      {/* HERO with merged balance */}
      <section className="hud-panel relative overflow-hidden p-5 sm:p-6">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${squadHero})` }}
        />
        <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-r from-background via-background/85 to-background/50" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid-hud opacity-[0.08]" />
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="font-hud text-[11px] uppercase tracking-[0.25em] text-gold/80">
              Welcome back, Operator
            </p>
            <h1 className="mt-1 truncate font-display text-2xl font-bold tracking-wide sm:text-3xl">
              {name}
            </h1>
            <p className="mt-1 font-mono text-[11px] text-foreground/60">
              PUBG ID: {profile?.pubg_id ?? "—"} · Server: {profile?.game_server ?? "—"}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-gold/40 bg-background/60 px-4 py-3 backdrop-blur">
            <CoinIcon size={22} />
            <div className="min-w-0">
              <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/55">
                BAC Balance
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-gold leading-tight">
                {balance.toLocaleString()}
              </div>
            </div>
            <Link
              to="/dashboard/vault"
              className="ml-1 shrink-0 rounded border border-gold/60 bg-gold/10 px-3 py-1.5 font-hud text-[10px] font-bold uppercase tracking-widest text-gold transition hover:bg-gold hover:text-background"
            >
              + Add
            </Link>
          </div>
        </div>
      </section>

      {/* STATS — 3 cards (Matches, Wins, Win Rate) */}
      <section className="grid grid-cols-3 gap-3">
        {isLoading ? (
          <>
            <StatSkeleton />
            <StatSkeleton />
            <StatSkeleton />
          </>
        ) : (
          <>
            <StatCard icon={Swords} label="Matches" value={stats.played} hint={`${stats.finished} finished`} />
            <StatCard icon={Trophy} label="Wins" value={stats.wins} accent="text-emerald-400" hint={`Top3: ${stats.top3}`} />
            <StatCard icon={TrendingUp} label="Win Rate" value={`${stats.winRate}%`} accent="text-gold" hint={`${stats.avgKills} avg K`} />
          </>
        )}
      </section>


      {/* QUICK ACTIONS */}
      <section>
        <h2 className="mb-3 font-hud text-sm font-bold uppercase tracking-widest text-foreground/80">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quick.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.href}
                to={q.href}
                className="hud-panel group flex items-center justify-between p-4 transition hover:border-gold/60 hover:bg-gold/5"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-gold/15 text-gold">
                    <Icon size={16} />
                  </div>
                  <span className="font-hud text-sm font-semibold uppercase">{q.label}</span>
                </div>
                <ArrowRight size={14} className="text-foreground/40 transition group-hover:text-gold" />
              </Link>
            );
          })}
        </div>
      </section>

      {/* REWARDS HUB — Daily Login + Quests + Spin (tabbed) */}
      <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <RewardsHub />
        <div className="hidden xl:block">
          <RankTierCard wins={stats.wins} kills={stats.totalKills} top3={stats.top3} />
        </div>
      </section>




      {/* PLAYER HUB: Tier + Next Tournament */}
      <section className="grid gap-3 lg:grid-cols-3">
        <div className="xl:hidden">
          <RankTierCard wins={stats.wins} kills={stats.totalKills} top3={stats.top3} />
        </div>
        <div className="lg:col-span-2 xl:col-span-3">
          <NextTournamentCard
            match={
              upcoming[0]
                ? {
                    id: Number(upcoming[0].id),
                    match_name: String(upcoming[0].match_name),
                    schedule_at: String(upcoming[0].schedule_at),
                    entry_fee_bac: Number(upcoming[0].entry_fee_bac ?? 0),
                  }
                : null
            }
          />
        </div>
      </section>


      <AchievementsCard
        played={stats.played}
        wins={stats.wins}
        totalKills={stats.totalKills}
        top3={stats.top3}
        totalPrize={stats.totalPrize}
      />

      {/* COMBAT STATISTICS */}
      <section>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="font-hud text-sm font-bold uppercase tracking-widest text-foreground/80">
            Combat Statistics
          </h2>
          <Link
            to="/dashboard/my-matches"
            className="rounded border border-border/60 px-3 py-1 font-hud text-[10px] uppercase tracking-widest hover:border-gold hover:text-gold"
          >
            My Matches →
          </Link>
        </div>
        {isLoading ? (
          <div className="hud-panel p-8 text-center text-sm text-foreground/60">Loading…</div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard icon={Crown} label="Top 3 Finishes" value={stats.top3} />
            <StatCard icon={Target} label="Top 10 Finishes" value={stats.top10} />
            <StatCard icon={Crosshair} label="Total Kills" value={stats.totalKills} hint={`${stats.avgKills} avg/match`} />
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
        )}
      </section>

      {/* UPCOMING + RECENT */}
      <section className="grid gap-4 lg:grid-cols-2">
        <div className="hud-panel relative overflow-hidden p-5">
          <div aria-hidden className="absolute inset-0 -z-10 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${airdropImg})` }} />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/85 to-transparent" />
          <h3 className="mb-3 font-hud text-sm font-bold uppercase tracking-widest text-gold">
            Upcoming Matches
          </h3>
          {upcoming.length === 0 ? (
            <p className="font-mono text-xs text-foreground/70">No upcoming matches yet.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((m) => (
                <li key={m.id}>
                  <Link
                    to="/dashboard/matches/$matchId"
                    params={{ matchId: String(m.id) }}
                    className="flex items-center justify-between rounded border border-border/40 bg-background/40 px-3 py-2 text-xs hover:border-gold/60 hover:text-gold"
                  >
                    <span className="truncate">{m.match_name}</span>
                    <span className="ml-3 shrink-0 font-mono text-gold">
                      {Number(m.entry_fee_bac ?? 0).toLocaleString()} BAC
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="hud-panel relative overflow-hidden p-5">
          <div aria-hidden className="absolute inset-0 -z-10 bg-cover bg-center opacity-20" style={{ backgroundImage: `url(${sniperImg})` }} />
          <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-t from-background via-background/85 to-transparent" />
          <h3 className="mb-3 font-hud text-sm font-bold uppercase tracking-widest text-gold">
            Recent Matches
          </h3>
          {recent.length === 0 ? (
            <p className="font-mono text-xs text-foreground/70">No matches played yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="font-mono uppercase tracking-widest text-foreground/55">
                  <tr className="border-b border-border/40">
                    <th className="py-2 text-left">Match</th>
                    <th className="py-2 text-right">Rank</th>
                    <th className="py-2 text-right">Kills</th>
                    <th className="py-2 text-right">Prize</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((p) => {
                    const m = p.matches as { id?: number; match_name?: string } | null;
                    return (
                      <tr key={p.id} className="border-b border-border/20">
                        <td className="py-2">
                          {m?.id ? (
                            <Link to="/dashboard/matches/$matchId" params={{ matchId: String(m.id) }} className="hover:text-gold">
                              {m.match_name ?? "Match"}
                            </Link>
                          ) : (
                            "Match"
                          )}
                        </td>
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
        </div>
      </section>
    </div>
  );
}
