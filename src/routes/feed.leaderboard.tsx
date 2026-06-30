import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Bell, MessageSquare, Crown, ChevronDown, Users, BadgeCheck } from "lucide-react";

export const Route = createFileRoute("/feed/leaderboard")({
  ssr: false,
  component: FeedLeaderboardPage,
  head: () => ({
    meta: [
      { title: "Leaderboard — BattleAsia" },
      { name: "description", content: "Top warriors of BattleAsia — real players, real matches, live ranking." },
    ],
  }),
});

type Row = {
  user_id: string;
  username: string;
  avatar_url: string | null;
  level: number;
  kills: number;
  prize: number;
  matches: number;
  score: number;
  tier: { label: string; color: string; dot: string };
  last_played: string | null;
};

type TF = "all" | "week" | "month";
type GameTab = "OVERALL" | "BGMI" | "FFMAX" | "CODM";
type ModeFilter = "ALL" | "Solo" | "Duo" | "Squad";

const COUNTRY_OPTIONS: { code: string; flag: string; name: string }[] = [
  { code: "ALL", flag: "🌏", name: "All Countries" },
  { code: "BD", flag: "🇧🇩", name: "Bangladesh" },
  { code: "IN", flag: "🇮🇳", name: "India" },
  { code: "PK", flag: "🇵🇰", name: "Pakistan" },
  { code: "NP", flag: "🇳🇵", name: "Nepal" },
  { code: "LK", flag: "🇱🇰", name: "Sri Lanka" },
  { code: "MY", flag: "🇲🇾", name: "Malaysia" },
  { code: "ID", flag: "🇮🇩", name: "Indonesia" },
  { code: "TH", flag: "🇹🇭", name: "Thailand" },
  { code: "VN", flag: "🇻🇳", name: "Vietnam" },
  { code: "PH", flag: "🇵🇭", name: "Philippines" },
];

function tierFor(score: number) {
  if (score >= 15000) return { label: "Conqueror", color: "text-amber-400", dot: "bg-amber-400" };
  if (score >= 8000)  return { label: "Ace Master", color: "text-amber-300", dot: "bg-amber-300" };
  if (score >= 4000)  return { label: "Ace Dominator", color: "text-fuchsia-400", dot: "bg-fuchsia-400" };
  if (score >= 1500)  return { label: "Ace", color: "text-amber-500", dot: "bg-amber-500" };
  if (score >= 500)   return { label: "Crown", color: "text-purple-300", dot: "bg-purple-300" };
  return { label: "Diamond", color: "text-cyan-300", dot: "bg-cyan-300" };
}

function FeedLeaderboardPage() {
  const { user } = useAuth() as any;
  const tf = "all" as TF;
  const tab = "OVERALL" as GameTab;
  const country = "ALL" as string;
  const mode = "ALL" as ModeFilter;

  const q = useQuery({
    queryKey: ["feed-leaderboard", tf, tab, country, mode],
    queryFn: async () => {


      let since: string | null = null;
      if (tf === "week") since = new Date(Date.now() - 7 * 86400000).toISOString();
      if (tf === "month") since = new Date(Date.now() - 30 * 86400000).toISOString();

      let pq = supabase
        .from("match_participants")
        .select("user_id, kills, prize_bac, joined_at, matches!inner(game_id, player_mode, games!inner(game_name))")
        .eq("result_applied", true)
        .limit(10000);
      if (since) pq = pq.gte("joined_at", since);
      const { data: parts, error } = await pq;
      if (error) throw error;

      const tabFilter = (g: string) => {
        const n = (g || "").toLowerCase();
        if (tab === "BGMI") return n.includes("bgmi") || n.includes("battlegrounds");
        if (tab === "FFMAX") return n.includes("free fire");
        if (tab === "CODM") return n.includes("call of duty") || n.includes("codm");
        return true;
      };

      const agg = new Map<string, { kills: number; prize: number; matches: number; last: string | null }>();
      (parts ?? []).forEach((p: any) => {
        const gname = p.matches?.games?.game_name ?? "";
        const pmode = String(p.matches?.player_mode ?? "");
        if (!tabFilter(gname)) return;
        if (mode !== "ALL" && pmode.toLowerCase() !== mode.toLowerCase()) return;
        const cur = agg.get(p.user_id) ?? { kills: 0, prize: 0, matches: 0, last: null };
        cur.kills += p.kills ?? 0;
        cur.prize += Number(p.prize_bac ?? 0);
        cur.matches += 1;
        if (!cur.last || (p.joined_at && p.joined_at > cur.last)) cur.last = p.joined_at;
        agg.set(p.user_id, cur);
      });

      const ids = Array.from(agg.keys());
      if (ids.length === 0) return [] as Row[];

      let profQ = supabase
        .from("profiles")
        .select("id, username, avatar_url, country_code")
        .in("id", ids);
      if (country !== "ALL") profQ = profQ.eq("country_code", country);
      const { data: profs } = await profQ;

      const rows: Row[] = (profs ?? []).map((p: any) => {
        const a = agg.get(p.id)!;
        const score = a.kills * 25 + a.matches * 15 + Math.floor(a.prize);
        return {
          user_id: p.id,
          username: p.username ?? "Player",
          avatar_url: p.avatar_url,
          level: Math.min(999, 1 + Math.floor(a.matches * 7 + a.kills * 0.5)),
          kills: a.kills,
          prize: a.prize,
          matches: a.matches,
          score,
          tier: tierFor(score),
          last_played: a.last,
        };
      });
      rows.sort((x, y) => y.score - x.score);
      return rows.slice(0, 100);
    },
  });


  const rows = q.data ?? [];
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);

  const meRow = useMemo(() => {
    if (!user?.id) return null;
    const idx = rows.findIndex((r) => r.user_id === user.id);
    return idx < 0 ? null : { rank: idx + 1, row: rows[idx] };
  }, [rows, user?.id]);




  return (
    <div className="min-h-screen bg-background pb-32 text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-30 border-b border-border/40 bg-background/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <Link to="/feed" className="font-display text-2xl tracking-tight">
            <span className="text-foreground">BATTLE</span><span className="text-red-500">ASIA</span>
          </Link>
          <div className="flex items-center gap-2">
            <button className="rounded-full p-2 text-foreground/80 hover:text-gold">
              <Bell size={20} />
            </button>
            <Link to="/dashboard/messages" className="rounded-full p-2 text-foreground/80 hover:text-gold">
              <MessageSquare size={20} />
            </Link>
          </div>
        </div>
      </header>

      {/* Hero banner */}
      <section className="relative overflow-hidden border-b border-border/40">
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 via-purple-500/10 to-transparent" />
        <div className="absolute -top-20 -right-20 h-64 w-64 rounded-full bg-amber-400/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-red-500/20 blur-3xl" />
        <div className="relative mx-auto max-w-5xl px-4 py-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1 text-[10px] font-hud uppercase tracking-[0.25em] text-amber-300">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            Hall of Champions
          </div>
          <h1 className="mt-3 font-display text-3xl sm:text-4xl uppercase tracking-wider">
            <span className="text-foreground">Global </span>
            <span className="bg-gradient-to-r from-amber-300 via-amber-400 to-red-500 bg-clip-text text-transparent">Leaderboard</span>
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-foreground/60">
            Top operatives ranked by total combat score
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-5xl px-4 pt-6 space-y-5">


        {/* Podium */}
        {q.isLoading ? (
          <div className="hud-panel p-10 text-center font-mono text-sm text-muted-foreground">Loading rankings…</div>
        ) : podium.length > 0 ? (
          <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
            {/* #2 left */}
            <PodiumCard rank={2} row={podium[1]} />
            {/* #1 center elevated */}
            <PodiumCard rank={1} row={podium[0]} />
            {/* #3 right */}
            <PodiumCard rank={3} row={podium[2]} />
          </div>
        ) : (
          <div className="hud-panel p-10 text-center font-mono text-sm text-muted-foreground">
            No ranked players yet — play a match to appear here.
          </div>
        )}

        {/* Ranked list */}
        {rest.length > 0 && (
          <div className="hud-panel overflow-hidden">
            {/* Header — hide Rank Tier column on mobile */}
            <div className="grid grid-cols-[36px_1fr_84px] sm:grid-cols-[48px_1fr_140px_90px] items-center gap-2 border-b border-border/40 bg-card/40 px-3 sm:px-4 py-2.5 font-hud text-[10px] uppercase tracking-[0.18em] text-foreground/60">
              <span>Rank</span>
              <span>Player</span>
              <span className="hidden sm:inline">Rank Tier</span>
              <span className="text-right">Points</span>
            </div>
            <ul className="divide-y divide-border/30">
              {rest.map((r, i) => {
                const rank = i + 4;
                const isMe = user?.id === r.user_id;
                return <RankRow key={r.user_id} rank={rank} row={r} highlight={isMe} />;
              })}
            </ul>
          </div>
        )}

        {/* You row */}
        {meRow && meRow.rank > 10 && (
          <div className="rounded-md border-2 border-red-500/70 bg-red-500/5 px-3 sm:px-4 py-3">
            <div className="grid grid-cols-[36px_1fr_84px] sm:grid-cols-[48px_1fr_140px_90px] items-center gap-2">
              <span className="font-display text-xl text-red-500">{meRow.rank}</span>
              <Link to="/u/$username" params={{ username: meRow.row.username }} className="flex items-center gap-2.5 min-w-0">
                <Avatar row={meRow.row} size={36} ring="ring-red-500/60" />
                <div className="leading-tight min-w-0">
                  <div className="font-display tracking-wide text-red-400 truncate">You</div>
                  <div className="text-[11px] text-foreground/60">Lvl {meRow.row.level}</div>
                  <div className="sm:hidden mt-0.5"><TierPill tier={meRow.row.tier} compact /></div>
                </div>
              </Link>
              <div className="hidden sm:block"><TierPill tier={meRow.row.tier} /></div>
              <span className="text-right font-mono font-bold text-red-400 tabular-nums">{meRow.row.score.toLocaleString()}</span>
            </div>
          </div>
        )}

        <p className="pt-1 text-center text-[11px] text-foreground/60">
          <span className="mr-1.5 inline-block h-3.5 w-3.5 rounded-full border border-foreground/40 text-center text-[9px] leading-[12px]">i</span>
          Leaderboards refresh every 10 minutes.
        </p>
      </div>
    </div>
  );
}

/* ---------- pieces ---------- */

function FilterChip({
  label, active, onClick, color, icon,
}: { label: string; active?: boolean; onClick?: () => void; color?: "red"; icon?: React.ReactNode }) {
  const red = color === "red";
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12px] font-medium transition ${
        active && red
          ? "border-red-500/70 text-red-500 bg-red-500/5"
          : "border-border/60 text-foreground/80 hover:border-foreground/40"
      }`}
    >
      {icon}
      <span>{label}</span>
      <ChevronDown size={13} className="opacity-70" />
    </button>
  );
}

function SelectChip({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  const current = options.find((o) => o.value === value) ?? options[0];
  return (
    <div className="relative inline-flex items-center">
      <span className="pointer-events-none inline-flex items-center gap-1.5 rounded-full border border-border/60 px-3 py-1.5 text-[12px] font-medium text-foreground/80">
        {current.label}
        <ChevronDown size={13} className="opacity-70" />
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 cursor-pointer opacity-0"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-background text-foreground">
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function Avatar({ row, size = 40, ring = "ring-border/60" }: { row: Row; size?: number; ring?: string }) {
  return (
    <div
      className={`shrink-0 overflow-hidden rounded-full bg-secondary ring-2 ${ring}`}
      style={{ width: size, height: size }}
    >
      {row.avatar_url ? (
        <img src={row.avatar_url} alt={row.username} className="h-full w-full object-cover" />
      ) : (
        <div className="grid h-full w-full place-items-center text-xs font-bold">
          {row.username.slice(0, 1).toUpperCase()}
        </div>
      )}
    </div>
  );
}

function TierPill({ tier, compact }: { tier: Row["tier"]; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-1.5 ${compact ? "text-[10px]" : "text-[12px]"} font-medium ${tier.color}`}>
      <span className={`inline-block ${compact ? "h-2 w-2" : "h-3 w-3"} rounded-full ${tier.dot} shadow-[0_0_8px_currentColor] opacity-90`} />
      {tier.label}
    </span>
  );
}

function PodiumCard({ rank, row }: { rank: 1 | 2 | 3; row?: Row }) {
  if (!row) return <div className="h-40" />;
  const isFirst = rank === 1;
  const isSecond = rank === 2;
  const ringCls = isFirst ? "ring-amber-400" : isSecond ? "ring-purple-400" : "ring-amber-700";
  const badgeBg = isFirst ? "bg-amber-400 text-black" : isSecond ? "bg-slate-200 text-black" : "bg-amber-700 text-white";
  const cardCls = isFirst
    ? "bg-gradient-to-b from-amber-500/25 via-amber-500/10 to-transparent border-amber-400/50 shadow-[0_0_40px_-10px_rgba(251,191,36,0.5)]"
    : "bg-gradient-to-b from-card/80 to-card/40 border-border/60";
  const heightCls = isFirst ? "pt-7 pb-5 -mt-2" : "pt-5 pb-4";

  return (
    <div className={`relative rounded-xl border ${cardCls} ${heightCls} px-2 text-center`}>
      {/* Rank badge top-left */}
      <span className={`absolute -top-2 left-2 grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold ${badgeBg} ring-2 ring-background`}>
        {rank}
      </span>

      {/* Crown on #1 */}
      {isFirst && (
        <Crown
          className="absolute left-1/2 -top-5 -translate-x-1/2 text-amber-300 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
          size={28}
          fill="currentColor"
        />
      )}

      {/* Laurel-style avatar */}
      <div className="relative mx-auto" style={{ width: isFirst ? 88 : 72, height: isFirst ? 88 : 72 }}>
        <div className={`absolute inset-0 rounded-full ring-4 ${ringCls} overflow-hidden bg-black/40`}>
          {row.avatar_url ? (
            <img src={row.avatar_url} alt={row.username} className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full w-full place-items-center font-bold text-lg">
              {row.username.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-1 truncate font-display text-[13px] tracking-wide sm:text-base">
        <span className="truncate">{row.username}</span>
        <BadgeCheck size={12} className="text-sky-400 shrink-0" />
      </div>

      <div className={`mt-1 inline-flex items-center gap-1 text-[11px] sm:text-[12px] ${row.tier.color}`}>
        <span className={`inline-block h-2.5 w-2.5 rounded-full ${row.tier.dot}`} />
        {row.tier.label}
      </div>

      <div className="mt-1.5 text-[10px] uppercase tracking-widest text-foreground/60">Points</div>
      <div className={`font-mono font-bold tabular-nums ${isFirst ? "text-amber-300 text-xl sm:text-2xl" : "text-foreground text-base sm:text-lg"}`}>
        {row.score.toLocaleString()}
      </div>
    </div>
  );
}

function RankRow({ rank, row, highlight }: { rank: number; row: Row; highlight?: boolean }) {
  return (
    <li className={`grid grid-cols-[36px_1fr_84px] sm:grid-cols-[48px_1fr_140px_90px] items-center gap-2 px-3 sm:px-4 py-3 transition ${highlight ? "bg-red-500/5" : "hover:bg-card/40"}`}>
      <span className="font-display text-lg text-foreground/80">{rank}</span>
      <Link to="/u/$username" params={{ username: row.username }} className="flex items-center gap-2.5 min-w-0">
        <Avatar row={row} size={36} />
        <div className="min-w-0 leading-tight">
          <div className="flex items-center gap-1 truncate font-semibold">
            <span className="truncate">{row.username}</span>
            <BadgeCheck size={12} className="text-sky-400 shrink-0" />
          </div>
          <div className="text-[11px] text-foreground/60">Lvl {row.level}</div>
          <div className="sm:hidden mt-0.5"><TierPill tier={row.tier} compact /></div>
        </div>
      </Link>
      <div className="hidden sm:block"><TierPill tier={row.tier} /></div>
      <span className="text-right font-mono font-bold tabular-nums">{row.score.toLocaleString()}</span>
    </li>
  );
}
