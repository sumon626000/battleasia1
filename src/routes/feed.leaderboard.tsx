import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Crown, Bell, MessageSquare, Calendar, ChevronDown, Users } from "lucide-react";

export const Route = createFileRoute("/feed/leaderboard")({
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
  country_code: string | null;
  kills: number;
  prize: number;
  matches: number;
  points: number;
  level: number;
  tier: string;
  tierColor: string;
};

type Game = { id: number; game_name: string };

function tierFor(points: number): { tier: string; color: string } {
  if (points >= 15000) return { tier: "Conqueror", color: "text-gold" };
  if (points >= 9500) return { tier: "Ace Dominator", color: "text-fuchsia-400" };
  if (points >= 7000) return { tier: "Ace Master", color: "text-amber-400" };
  if (points >= 5000) return { tier: "Ace", color: "text-orange-400" };
  if (points >= 2500) return { tier: "Crown", color: "text-sky-400" };
  return { tier: "Diamond", color: "text-cyan-400" };
}

function FeedLeaderboardPage() {
  const { user } = useAuth() as any;
  const [gameId, setGameId] = useState<number | "all">("all");

  const gamesQ = useQuery({
    queryKey: ["lb-games"],
    queryFn: async () => {
      const { data } = await supabase.from("games").select("id, game_name").is("deleted_at", null).order("id");
      return (data ?? []) as Game[];
    },
  });

  const q = useQuery({
    queryKey: ["feed-leaderboard", gameId],
    queryFn: async () => {
      let matchIds: number[] | null = null;
      if (gameId !== "all") {
        const { data: ms } = await supabase.from("matches").select("id").eq("game_id", gameId).is("deleted_at", null).limit(5000);
        matchIds = (ms ?? []).map((m: any) => m.id);
        if (matchIds.length === 0) return [] as Row[];
      }
      let pq = supabase
        .from("match_participants")
        .select("user_id, kills, prize_bac, match_id")
        .eq("result_applied", true)
        .limit(10000);
      if (matchIds) pq = pq.in("match_id", matchIds);
      const { data: parts, error } = await pq;
      if (error) throw error;

      const agg = new Map<string, { kills: number; prize: number; matches: number }>();
      (parts ?? []).forEach((p: any) => {
        const cur = agg.get(p.user_id) ?? { kills: 0, prize: 0, matches: 0 };
        cur.kills += p.kills ?? 0;
        cur.prize += Number(p.prize_bac ?? 0);
        cur.matches += 1;
        agg.set(p.user_id, cur);
      });

      const ids = Array.from(agg.keys());
      if (ids.length === 0) return [] as Row[];

      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, country_code")
        .in("id", ids);

      const rows: Row[] = (profs ?? []).map((p: any) => {
        const a = agg.get(p.id)!;
        const points = a.kills * 25 + a.matches * 15 + Math.floor(a.prize / 10);
        const t = tierFor(points);
        return {
          user_id: p.id,
          username: p.username ?? "Player",
          avatar_url: p.avatar_url,
          country_code: p.country_code,
          kills: a.kills,
          prize: a.prize,
          matches: a.matches,
          points,
          level: Math.min(99, 10 + Math.floor(a.matches / 2)),
          tier: t.tier,
          tierColor: t.color,
        };
      });
      rows.sort((a, b) => b.points - a.points);
      return rows.slice(0, 100);
    },
  });

  const rows = q.data ?? [];
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  const meRow = useMemo(() => {
    if (!user?.id) return null;
    const idx = rows.findIndex((r) => r.user_id === user.id);
    if (idx < 0) return null;
    return { row: rows[idx], rank: idx + 1 };
  }, [rows, user?.id]);

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur">
        <Link to="/feed" className="font-display text-2xl tracking-tight">
          <span className="text-foreground">BATTLE</span><span className="text-red-500">ASIA</span>
        </Link>
        <div className="flex items-center gap-3">
          <button className="relative rounded-full p-2 text-foreground/80 hover:text-gold">
            <Bell size={20} />
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">8</span>
          </button>
          <Link to="/dashboard/messages" className="relative rounded-full p-2 text-foreground/80 hover:text-gold">
            <MessageSquare size={20} />
            <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">3</span>
          </Link>
        </div>
      </header>

      <div className="px-4 space-y-5">
        {/* Title + season */}
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-black uppercase tracking-tight">Leaderboard</h1>
            <p className="mt-1 text-sm text-foreground/60">Top warriors of BattleAsia <span className="text-gold">👑</span></p>
          </div>
          <div className="text-right">
            <button className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/60 px-3 py-1.5 text-xs font-medium">
              <Calendar size={14} className="text-foreground/60" /> Season 7 <ChevronDown size={14} className="text-foreground/60" />
            </button>
            <p className="mt-1 text-[11px] text-foreground/60">Season ends in: <span className="text-red-400 font-mono">12d 18h 45m</span></p>
          </div>
        </div>

        {/* Game tabs */}
        <div className="-mx-4 overflow-x-auto px-4">
          <div className="flex min-w-max gap-5 border-b border-border/40 pb-px">
            <TabBtn active={gameId === "all"} onClick={() => setGameId("all")}>OVERALL</TabBtn>
            {gamesQ.data?.map((g) => (
              <TabBtn key={g.id} active={gameId === g.id} onClick={() => setGameId(g.id)}>
                {g.game_name.toUpperCase()}
              </TabBtn>
            ))}
          </div>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2">
          <Chip>Total Ranking</Chip>
          <Chip>🌏 Asia</Chip>
          <Chip><Users size={12} className="inline mr-1" /> Squad</Chip>
        </div>

        {/* Podium */}
        {podium.length >= 1 && <Podium rows={podium} />}

        {/* Table */}
        <div className="rounded-2xl border border-border/50 bg-card/40">
          <div className="grid grid-cols-12 border-b border-border/40 px-4 py-2.5 text-[10px] font-hud uppercase tracking-widest text-foreground/50">
            <div className="col-span-1">Rank</div>
            <div className="col-span-5">Player</div>
            <div className="col-span-4">Rank Tier</div>
            <div className="col-span-2 text-right">Points</div>
          </div>
          {q.isLoading && (
            <div className="px-4 py-10 text-center text-sm text-foreground/50">Loading rankings…</div>
          )}
          {!q.isLoading && rest.length === 0 && podium.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-foreground/50">No ranked players yet — play a match to appear here.</div>
          )}
          <ul className="divide-y divide-border/30">
            {rest.map((r, i) => (
              <PlayerRow key={r.user_id} rank={i + 4} row={r} />
            ))}
          </ul>
        </div>

        {/* You */}
        {meRow && (
          <div className="rounded-2xl border-2 border-red-500/70 bg-red-500/10 p-3">
            <div className="grid grid-cols-12 items-center">
              <div className="col-span-1 text-lg font-display font-black text-red-400">{meRow.rank}</div>
              <div className="col-span-5 flex items-center gap-2.5">
                {meRow.row.avatar_url ? (
                  <img src={meRow.row.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-secondary" />
                )}
                <div className="leading-tight">
                  <div className="font-semibold text-red-400">You</div>
                  <div className="text-[11px] text-foreground/60">Lvl {meRow.row.level}</div>
                </div>
              </div>
              <div className={`col-span-4 text-sm font-medium ${meRow.row.tierColor}`}>● {meRow.row.tier}</div>
              <div className="col-span-2 text-right font-mono font-bold text-red-400">{meRow.row.points.toLocaleString()}</div>
            </div>
          </div>
        )}

        <p className="pt-1 text-center text-[11px] text-foreground/50">ⓘ Leaderboards refresh every 10 minutes.</p>
      </div>
    </div>
  );
}

function TabBtn({ active, onClick, children }: any) {
  return (
    <button
      onClick={onClick}
      className={`relative whitespace-nowrap pb-3 font-hud text-xs font-bold uppercase tracking-widest transition ${
        active ? "text-red-500" : "text-foreground/60 hover:text-foreground"
      }`}
    >
      {children}
      {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded bg-red-500" />}
    </button>
  );
}

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-card/40 px-3 py-1 text-xs text-foreground/80">
      {children} <ChevronDown size={12} className="text-foreground/50" />
    </span>
  );
}

function PlayerRow({ rank, row }: { rank: number; row: Row }) {
  return (
    <li className="grid grid-cols-12 items-center px-4 py-3">
      <div className="col-span-1 font-mono text-sm text-foreground/70">{rank}</div>
      <div className="col-span-5 flex items-center gap-2.5">
        {row.avatar_url ? (
          <img src={row.avatar_url} alt={row.username} className="h-10 w-10 rounded-full object-cover" />
        ) : (
          <div className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-xs font-bold text-foreground/60">
            {row.username.slice(0, 2).toUpperCase()}
          </div>
        )}
        <div className="leading-tight">
          <Link to="/u/$username" params={{ username: row.username }} className="font-semibold hover:text-gold">
            {row.username}
          </Link>
          <div className="text-[11px] text-foreground/60">Lvl {row.level}</div>
        </div>
      </div>
      <div className={`col-span-4 text-sm font-medium ${row.tierColor}`}>● {row.tier}</div>
      <div className="col-span-2 text-right font-mono font-bold text-foreground">{row.points.toLocaleString()}</div>
    </li>
  );
}

function Podium({ rows }: { rows: Row[] }) {
  const order = [rows[1], rows[0], rows[2]].filter(Boolean) as Row[];
  return (
    <div className="grid grid-cols-3 items-end gap-3">
      {order.map((r) => {
        const rank = rows.indexOf(r) + 1;
        const isFirst = rank === 1;
        const ring =
          rank === 1 ? "border-gold shadow-[0_0_30px_rgba(255,193,7,0.45)]" :
          rank === 2 ? "border-slate-300/70" : "border-amber-700/70";
        const badgeBg =
          rank === 1 ? "bg-gold text-black" :
          rank === 2 ? "bg-slate-300 text-black" : "bg-amber-700 text-white";
        return (
          <div key={r.user_id} className={`relative flex flex-col items-center rounded-2xl border ${isFirst ? "border-gold/70 bg-gradient-to-b from-gold/15 to-transparent pt-6" : "border-border/50 bg-card/40 pt-5"} pb-4 px-2`}>
            {isFirst && <Crown size={22} className="absolute -top-3 text-gold drop-shadow" />}
            <span className={`absolute -top-2 left-2 grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${badgeBg}`}>{rank}</span>
            <div className={`relative h-16 w-16 overflow-hidden rounded-full border-2 ${ring}`}>
              {r.avatar_url ? (
                <img src={r.avatar_url} alt={r.username} className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full w-full place-items-center bg-secondary text-sm font-bold">{r.username.slice(0, 2).toUpperCase()}</div>
              )}
            </div>
            <div className="mt-2 max-w-full truncate text-center text-xs font-semibold">{r.username}</div>
            <div className={`mt-0.5 text-[10px] font-medium ${r.tierColor}`}>● {r.tier}</div>
            <div className="mt-1.5 text-[10px] uppercase tracking-widest text-foreground/50">Points</div>
            <div className={`font-mono text-base font-black ${isFirst ? "text-gold" : "text-foreground"}`}>{r.points.toLocaleString()}</div>
          </div>
        );
      })}
    </div>
  );
}
