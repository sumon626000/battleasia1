import React, { useEffect, useMemo, useState } from "react";
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
  Clock,
  Medal,
  Flame,
  Award,
  Star,
  Lock,
  Timer,
  Zap,
  Radio,
} from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";
import { CountUp } from "@/components/ui/CountUp";
import {
  RankTierCard,
  AchievementsCard,
  NextTournamentCard,
} from "@/components/dashboard/PlayerHubCards";
import { RewardsHub } from "@/components/dashboard/RewardsHub";
import { TournamentsShowcase } from "@/components/dashboard/TournamentsShowcase";
import { WeeklyPerformanceCard } from "@/components/dashboard/WeeklyPerformanceCard";
import { WeeklyLeaderboardMini } from "@/components/dashboard/WeeklyLeaderboardMini";
import { QuestProgressMini } from "@/components/dashboard/QuestProgressMini";
import { SquadActivityCard } from "@/components/dashboard/SquadActivityCard";
import { PersonalBestsCard } from "@/components/dashboard/PersonalBestsCard";
import { TipAndCheckInCard } from "@/components/dashboard/TipAndCheckInCard";
import { TransactionsTimeline } from "@/components/dashboard/TransactionsTimeline";
import { ProfileQuickEditDrawer } from "@/components/dashboard/ProfileQuickEditDrawer";
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
  stripe,
  trend,
}: {
  icon: typeof Trophy;
  label: string;
  value: React.ReactNode;
  hint?: string;
  accent?: string;
  stripe?: string;
  trend?: "up" | "down" | "flat";
}) {
  return (
    <div className="hud-panel group relative overflow-hidden p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-[0_8px_24px_-12px_rgba(212,175,55,0.45)]">
      <span
        aria-hidden
        className={`absolute inset-y-0 left-0 w-[3px] ${stripe ?? "bg-gold/60"} opacity-70 transition-all duration-300 group-hover:opacity-100 group-hover:shadow-[0_0_10px_rgba(212,175,55,0.7)]`}
      />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
            {label}
          </div>
          <div className={`mt-1.5 flex items-baseline gap-1.5 font-display text-2xl font-bold tabular-nums ${accent ?? "text-gold"}`}>
            <span>{value}</span>
            {trend === "up" && <TrendingUp size={12} className="text-emerald-400" />}
            {trend === "down" && <TrendingUp size={12} className="rotate-180 text-destructive" />}
          </div>
          {hint && <div className="mt-1 text-[11px] text-foreground/55">{hint}</div>}
        </div>
        <Icon size={18} className="shrink-0 text-foreground/40 transition-all duration-300 group-hover:scale-110 group-hover:text-gold" />
      </div>
    </div>
  );
}


function RankBadge({ rank }: { rank: number | null | undefined }) {
  const r = Number(rank ?? 0);
  if (!r) return <span className="grid h-6 w-7 place-items-center rounded border border-border/50 font-mono text-[10px] text-foreground/50">—</span>;
  const tone =
    r === 1 ? "border-yellow-400/60 bg-yellow-400/15 text-yellow-300 shadow-[0_0_8px_rgba(250,204,21,0.4)]" :
    r === 2 ? "border-zinc-300/50 bg-zinc-300/10 text-zinc-200" :
    r === 3 ? "border-amber-600/60 bg-amber-700/15 text-amber-400" :
    r <= 10 ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" :
              "border-border/60 bg-background/40 text-foreground/60";
  return (
    <span className={`inline-flex h-6 min-w-7 items-center justify-center gap-0.5 rounded border px-1 font-mono text-[10px] font-bold tabular-nums ${tone}`}>
      {r <= 3 && <Medal size={10} />}#{r}
    </span>
  );
}

function formatSchedule(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  const abs = Math.abs(diff);
  const m = Math.round(abs / 60000);
  const h = Math.round(abs / 3600000);
  const dy = Math.round(abs / 86400000);
  if (diff > 0) {
    if (m < 60) return `in ${m}m`;
    if (h < 24) return `in ${h}h`;
    return `in ${dy}d`;
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
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
          .select("amount_bac, type, created_at")
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

  // Personalized greeting
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return "Good night";
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    if (h < 21) return "Good evening";
    return "Good night";
  }, []);

  // Level / XP from stats
  const totalXp = stats.wins * 100 + stats.top3 * 50 + stats.played * 10 + stats.totalKills * 5;
  const level = Math.max(1, Math.floor(totalXp / 200) + 1);
  const xpForLevel = level * 200;
  const xpInLevel = totalXp - (level - 1) * 200;
  const xpPct = Math.min(100, Math.max(2, Math.round((xpInLevel / xpForLevel) * 100)));

  // Daily streak — consecutive days with at least one match participation
  const streak = useMemo(() => {
    const parts = data?.participants ?? [];
    if (!parts.length) return 0;
    const days = new Set(
      parts
        .map((p) => (p.created_at ? new Date(p.created_at).toISOString().slice(0, 10) : null))
        .filter(Boolean) as string[],
    );
    let count = 0;
    const d = new Date();
    for (let i = 0; i < 60; i++) {
      const key = d.toISOString().slice(0, 10);
      if (days.has(key)) {
        count++;
        d.setDate(d.getDate() - 1);
      } else {
        if (i === 0) {
          // allow yesterday-start streak
          d.setDate(d.getDate() - 1);
          continue;
        }
        break;
      }
    }
    return count;
  }, [data]);

  // Achievements (derived)
  const achievements = useMemo(
    () => [
      { id: "first-win", label: "First Blood", icon: Trophy, unlocked: stats.wins >= 1 },
      { id: "veteran", label: "Veteran", icon: Swords, unlocked: stats.played >= 10 },
      { id: "sharpshooter", label: "Sharpshooter", icon: Crosshair, unlocked: stats.totalKills >= 10 },
      { id: "podium", label: "Podium", icon: Medal, unlocked: stats.top3 >= 1 },
      { id: "high-roller", label: "High Roller", icon: Star, unlocked: stats.totalPrize >= 1000 },
      { id: "elite", label: "Elite", icon: Award, unlocked: stats.winRate >= 50 && stats.finished >= 5 },
    ],
    [stats],
  );
  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  // Live ticking clock (1s) for countdown
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Next match countdown
  const nextMatch = upcoming[0] as { id: number | string; match_name: string; schedule_at: string | null; entry_fee_bac: number | null } | undefined;
  const nextDiff = nextMatch?.schedule_at ? new Date(nextMatch.schedule_at).getTime() - now : null;
  const nextSoon = nextDiff !== null && nextDiff > 0 && nextDiff < 3600_000; // within 1hr
  const nextLive = nextDiff !== null && nextDiff <= 0 && nextDiff > -3600_000;
  const fmtCountdown = (ms: number) => {
    const s = Math.max(0, Math.floor(ms / 1000));
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
  };

  // Live activity feed — last 8 finished participations
  const activity = useMemo(() => {
    const parts = data?.participants ?? [];
    return parts
      .filter((p) => {
        const m = p.matches as { status?: string; match_name?: string } | null;
        return m && (m.status === "completed" || m.status === "result_published");
      })
      .slice(0, 8);
  }, [data]);

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
        <div aria-hidden className="absolute inset-0 -z-10 bg-grid-hud opacity-[0.08] animate-hud-grid-pulse" />
        <div aria-hidden className="pointer-events-none absolute -top-1/2 left-0 -z-10 h-[200%] w-1/3 -skew-x-12 bg-gradient-to-r from-transparent via-gold/[0.06] to-transparent animate-hud-sweep" />
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
          <div className="min-w-0">
            <p className="font-hud text-[11px] uppercase tracking-[0.25em] text-gold/80">
              {greeting}, Operator
            </p>
            <h1 className="mt-1 truncate font-display text-2xl font-bold tracking-wide sm:text-3xl">
              {name}
            </h1>
            <p className="mt-1 font-mono text-[11px] text-foreground/60">
              PUBG ID: {profile?.pubg_id ?? "—"} · Server: {profile?.game_server ?? "—"}
            </p>
            <div className="mt-2">
              <ProfileQuickEditDrawer profile={profile} />
            </div>
            {/* Next match countdown pill */}
            {nextMatch && (nextSoon || nextLive) && (
              <Link
                to="/dashboard/matches/$matchId"
                params={{ matchId: String(nextMatch.id) }}
                className={`mt-3 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest transition hover:scale-[1.02] ${
                  nextLive
                    ? "border-emerald-400/60 bg-emerald-400/10 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.45)]"
                    : "border-gold/60 bg-gold/10 text-gold shadow-[0_0_12px_rgba(212,175,55,0.35)]"
                }`}
              >
                {nextLive ? (
                  <>
                    <Radio size={12} className="animate-pulse" />
                    <span>LIVE NOW</span>
                  </>
                ) : (
                  <>
                    <Timer size={12} />
                    <span className="truncate max-w-[140px]">{nextMatch.match_name}</span>
                    <span className="tabular-nums text-gold/90">· {fmtCountdown(nextDiff!)}</span>
                  </>
                )}
              </Link>
            )}
            {/* Level / XP bar */}
            <div className="mt-3 max-w-sm">
              <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-foreground/60">
                <span className="text-gold">Lv {level}</span>
                <span className="tabular-nums">{xpInLevel} / {xpForLevel} XP</span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full border border-gold/30 bg-background/60">
                <div
                  className="h-full bg-gradient-to-r from-gold/70 via-gold to-amber-300 shadow-[0_0_8px_rgba(212,175,55,0.6)] transition-all duration-700"
                  style={{ width: `${xpPct}%` }}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-gold/40 bg-background/60 px-4 py-3 backdrop-blur">
            <CoinIcon size={22} />
            <div className="min-w-0">
              <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/55">
                BAC Balance
              </div>
              <div className="font-mono text-2xl font-bold tabular-nums text-gold leading-tight">
                <CountUp value={balance} />
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
            <StatCard icon={Swords} label="Matches" value={<CountUp value={stats.played} />} hint={`${stats.finished} finished`} stripe="bg-gold/70" />
            <StatCard icon={Trophy} label="Wins" value={<CountUp value={stats.wins} />} accent="text-emerald-400" hint={`Top3: ${stats.top3}`} stripe="bg-emerald-400/70" trend={stats.wins > 0 ? "up" : "flat"} />
            <StatCard icon={TrendingUp} label="Win Rate" value={<><CountUp value={stats.winRate} />%</>} accent="text-gold" hint={`${stats.avgKills} avg K`} stripe="bg-gold/70" trend={stats.winRate >= 50 ? "up" : stats.winRate > 0 ? "down" : "flat"} />
          </>
        )}
      </section>

      {/* TIP OF THE DAY + TODAY CHECK-IN */}
      <TipAndCheckInCard
        participants={data?.participants ?? []}
        balanceLogs={data?.balanceLogs ?? []}
      />

      {/* LIVE ACTIVITY TICKER */}
      {activity.length > 0 && (
        <section className="hud-panel relative overflow-hidden">
          <div className="flex items-stretch">
            <div className="flex shrink-0 items-center gap-1.5 border-r border-border/40 bg-background/60 px-3 py-2">
              <span aria-hidden className="relative grid h-1.5 w-1.5 place-items-center">
                <span className="absolute inset-0 rounded-full bg-emerald-400" />
                <span className="absolute inset-0 rounded-full bg-emerald-400 animate-ping opacity-75" />
              </span>
              <span className="font-hud text-[10px] font-bold uppercase tracking-widest text-emerald-300">Live</span>
            </div>
            <div className="group relative flex-1 overflow-hidden">
              <div className="flex animate-hud-ticker gap-6 whitespace-nowrap py-2 pr-6 [animation-play-state:running] group-hover:[animation-play-state:paused]">
                {[...activity, ...activity].map((p, i) => {
                  const m = p.matches as { match_name?: string } | null;
                  const rank = Number(p.rank_position ?? 0);
                  const kills = Number(p.kills ?? 0);
                  const prize = Number(p.prize_bac ?? 0);
                  const isWin = rank === 1;
                  return (
                    <span key={`${p.id ?? i}-${i}`} className="inline-flex items-center gap-1.5 font-mono text-[11px]">
                      {isWin ? (
                        <Trophy size={11} className="text-yellow-300" />
                      ) : rank > 0 && rank <= 10 ? (
                        <Medal size={11} className="text-emerald-300" />
                      ) : (
                        <Zap size={11} className="text-foreground/50" />
                      )}
                      <span className="text-foreground/80">{m?.match_name ?? "Match"}</span>
                      {rank > 0 && <span className="text-foreground/60">· #{rank}</span>}
                      {kills > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-foreground/60">
                          · <Crosshair size={10} /> {kills}
                        </span>
                      )}
                      {prize > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-gold">
                          · <CoinIcon size={10} /> {prize}
                        </span>
                      )}
                      <span aria-hidden className="ml-2 text-border/60">|</span>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* STREAK + ACHIEVEMENTS quick-glance */}
      <section className="hud-panel relative overflow-hidden p-4">
        <div className="flex items-center gap-4">
          {/* Streak */}
          <div className="flex shrink-0 items-center gap-2.5 border-r border-border/40 pr-4">
            <div className={`relative grid h-10 w-10 place-items-center rounded-md border ${streak > 0 ? "border-orange-400/60 bg-orange-500/10" : "border-border/40 bg-background/40"}`}>
              <Flame size={20} className={streak > 0 ? "text-orange-400 drop-shadow-[0_0_6px_rgba(251,146,60,0.7)]" : "text-foreground/40"} />
              {streak > 0 && (
                <span aria-hidden className="absolute inset-0 rounded-md ring-1 ring-orange-400/40 animate-pulse" />
              )}
            </div>
            <div className="min-w-0">
              <div className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">Streak</div>
              <div className="font-display text-lg font-bold leading-tight tabular-nums">
                <span className={streak > 0 ? "text-orange-400" : "text-foreground/60"}>{streak}</span>
                <span className="ml-1 text-[11px] font-normal text-foreground/55">day{streak === 1 ? "" : "s"}</span>
              </div>
            </div>
          </div>

          {/* Achievements row */}
          <div className="min-w-0 flex-1">
            <div className="mb-1.5 flex items-center justify-between">
              <div className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">Achievements</div>
              <div className="font-mono text-[10px] tabular-nums text-gold/80">{unlockedCount}/{achievements.length}</div>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
              {achievements.map((a) => {
                const Icon = a.unlocked ? a.icon : Lock;
                return (
                  <div
                    key={a.id}
                    title={a.label}
                    className={`group/ach relative grid h-9 w-9 shrink-0 place-items-center rounded-md border transition-all ${
                      a.unlocked
                        ? "border-gold/50 bg-gold/10 text-gold hover:scale-110 hover:shadow-[0_0_10px_rgba(212,175,55,0.55)]"
                        : "border-border/40 bg-background/40 text-foreground/35"
                    }`}
                  >
                    <Icon size={15} />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED TOURNAMENTS CAROUSEL */}
      <TournamentsShowcase />


      {/* TRANSACTIONS TIMELINE (Phase 18) */}
      <TransactionsTimeline userId={uid} />


      {/* DAILY QUEST PROGRESS MINI */}
      <QuestProgressMini />

      {/* QUICK ACTIONS */}
      <section>
        <div className="mb-3 flex items-center gap-3">
          <h2 className="font-hud text-sm font-bold uppercase tracking-widest text-foreground/80">
            Quick Actions
          </h2>
          <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-gold/40 via-border/40 to-transparent" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {quick.map((q) => {
            const Icon = q.icon;
            return (
              <Link
                key={q.href}
                to={q.href}
                className="hud-panel group relative flex items-center justify-between overflow-hidden p-4 transition-all duration-300 hover:-translate-y-0.5 hover:border-gold/60 hover:bg-gold/5 hover:shadow-[0_8px_24px_-12px_rgba(212,175,55,0.55)]"
              >
                <span
                  aria-hidden
                  className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-gold/10 to-transparent transition-transform duration-700 group-hover:translate-x-full"
                />
                <div className="relative flex items-center gap-3">
                  <div className="grid h-9 w-9 place-items-center rounded-md bg-gold/15 text-gold transition-all duration-300 group-hover:scale-110 group-hover:bg-gold/25 group-hover:shadow-[0_0_14px_rgba(212,175,55,0.55)]">
                    <Icon size={16} />
                  </div>
                  <span className="font-hud text-sm font-semibold uppercase">{q.label}</span>
                </div>
                <ArrowRight size={14} className="relative text-foreground/40 transition-all duration-300 group-hover:translate-x-1 group-hover:text-gold" />
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

      {/* WEEKLY PERFORMANCE + GOAL RING */}
      <WeeklyPerformanceCard participants={data?.participants ?? []} />

      {/* PERSONAL BESTS */}
      <PersonalBestsCard participants={data?.participants ?? []} />




      {/* COMBAT STATISTICS — unified inline panel */}
      <section className="hud-panel overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
          <h2 className="font-hud text-xs font-bold uppercase tracking-widest text-foreground/80">
            Combat Statistics
          </h2>
          <Link
            to="/dashboard/my-matches"
            className="rounded border border-border/60 px-2.5 py-1 font-hud text-[10px] uppercase tracking-widest hover:border-gold hover:text-gold"
          >
            My Matches →
          </Link>
        </div>
        {isLoading ? (
          <div className="p-8 text-center text-sm text-foreground/60">Loading…</div>
        ) : (
          <dl className="divide-y divide-border/30">
            {[
              { icon: Crown, label: "Top 3 Finishes", value: stats.top3, accent: "text-gold" },
              { icon: Target, label: "Top 10 Finishes", value: stats.top10 },
              { icon: Crosshair, label: "Total Kills", value: `${stats.totalKills} · ${stats.avgKills} avg` },
              { icon: Coins, label: "Total Prize Won", value: `${stats.totalPrize.toLocaleString()} BAC`, accent: "text-gold" },
              { icon: Activity, label: "Total Entry Spent", value: `${stats.totalEntry.toLocaleString()} BAC` },
              {
                icon: Calendar,
                label: "Net P/L",
                value: `${(stats.totalPrize - stats.totalEntry).toLocaleString()} BAC`,
                accent: stats.totalPrize - stats.totalEntry >= 0 ? "text-emerald-400" : "text-destructive",
              },
            ].map((row) => {
              const Icon = row.icon;
              return (
                <div key={row.label} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <dt className="flex min-w-0 items-center gap-2.5 text-xs text-foreground/70">
                    <Icon size={14} className="shrink-0 text-foreground/40" />
                    <span className="truncate">{row.label}</span>
                  </dt>
                  <dd className={`shrink-0 font-mono text-sm font-bold tabular-nums ${row.accent ?? "text-foreground"}`}>
                    {row.value}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}
    </div>
  );
}

