import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Bell, MessageSquare, Trophy, Medal, Award } from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";
import { format } from "date-fns";

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
  level: number;
  kills: number;
  prize: number;
  matches: number;
  score: number;
  avg: number;
  badge: { label: string; cls: string };
  last_played: string | null;
};

type TF = "all" | "week" | "month";

function badgeFor(score: number) {
  if (score >= 100000) return { label: "Champion", cls: "bg-rose-500 text-white" };
  if (score >= 10000) return { label: "Pro", cls: "bg-amber-400 text-black" };
  if (score >= 1000) return { label: "Advanced", cls: "bg-zinc-700 text-white" };
  return { label: "Rookie", cls: "bg-zinc-500 text-white" };
}

function podiumColor(rank: number) {
  if (rank === 1) return { card: "from-amber-500 to-amber-600", ring: "ring-amber-300", medal: "text-amber-300" };
  if (rank === 2) return { card: "from-fuchsia-500 to-purple-700", ring: "ring-purple-300", medal: "text-slate-200" };
  return { card: "from-cyan-500 to-sky-700", ring: "ring-sky-300", medal: "text-amber-600" };
}

function FeedLeaderboardPage() {
  const { user } = useAuth() as any;
  const [tf, setTf] = useState<TF>("all");

  const q = useQuery({
    queryKey: ["feed-leaderboard", tf],
    queryFn: async () => {
      let since: string | null = null;
      if (tf === "week") since = new Date(Date.now() - 7 * 86400000).toISOString();
      if (tf === "month") since = new Date(Date.now() - 30 * 86400000).toISOString();

      let pq = supabase
        .from("match_participants")
        .select("user_id, kills, prize_bac, joined_at")
        .eq("result_applied", true)
        .limit(10000);
      if (since) pq = pq.gte("joined_at", since);
      const { data: parts, error } = await pq;
      if (error) throw error;

      const agg = new Map<string, { kills: number; prize: number; matches: number; last: string | null }>();
      (parts ?? []).forEach((p: any) => {
        const cur = agg.get(p.user_id) ?? { kills: 0, prize: 0, matches: 0, last: null };
        cur.kills += p.kills ?? 0;
        cur.prize += Number(p.prize_bac ?? 0);
        cur.matches += 1;
        if (!cur.last || (p.joined_at && p.joined_at > cur.last)) cur.last = p.joined_at;
        agg.set(p.user_id, cur);
      });

      const ids = Array.from(agg.keys());
      if (ids.length === 0) return [] as Row[];

      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .in("id", ids);

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
          avg: a.matches > 0 ? score / a.matches : 0,
          badge: badgeFor(score),
          last_played: a.last,
        };
      });
      rows.sort((x, y) => y.score - x.score);
      return rows.slice(0, 100);
    },
  });

  const rows = q.data ?? [];
  const podium = rows.slice(0, 3);

  const meRank = useMemo(() => {
    if (!user?.id) return null;
    const idx = rows.findIndex((r) => r.user_id === user.id);
    return idx < 0 ? null : idx + 1;
  }, [rows, user?.id]);

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between bg-background/95 px-4 py-3 backdrop-blur border-b border-border/40">
        <Link to="/feed" className="font-display text-2xl tracking-tight">
          <span className="text-foreground">BATTLE</span><span className="text-red-500">ASIA</span>
        </Link>
        <div className="flex items-center gap-3">
          <button className="relative rounded-full p-2 text-foreground/80 hover:text-gold">
            <Bell size={20} />
          </button>
          <Link to="/dashboard/messages" className="relative rounded-full p-2 text-foreground/80 hover:text-gold">
            <MessageSquare size={20} />
          </Link>
        </div>
      </header>

      <div className="px-4 pt-5 space-y-5 max-w-5xl mx-auto">
        {/* Title + timeframe */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-primary" />
            <h1 className="font-display text-2xl tracking-wider">LEADER BOARD</h1>
          </div>
          <div className="hud-panel p-1 flex gap-1">
            {(["all", "week", "month"] as TF[]).map((t) => (
              <button
                key={t}
                onClick={() => setTf(t)}
                className={`px-3 py-1.5 text-[11px] font-mono uppercase tracking-wider transition rounded ${
                  tf === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "all" ? "All Time" : t === "week" ? "This Week" : "This Month"}
              </button>
            ))}
          </div>
        </div>

        {/* Podium */}
        {q.isLoading ? (
          <div className="hud-panel p-10 text-center font-mono text-sm text-muted-foreground">Loading rankings…</div>
        ) : podium.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {podium.map((r, i) => {
              const rank = i + 1;
              const c = podiumColor(rank);
              return (
                <div
                  key={r.user_id}
                  className={`relative rounded-xl bg-gradient-to-br ${c.card} p-4 shadow-lg text-white`}
                >
                  <Medal className={`absolute top-2 right-2 w-5 h-5 ${c.medal}`} />
                  <div className="flex items-center gap-3">
                    <div className={`h-14 w-14 rounded-full overflow-hidden ring-2 ${c.ring} bg-black/30 shrink-0`}>
                      {r.avatar_url ? (
                        <img src={r.avatar_url} alt={r.username} className="h-full w-full object-cover" />
                      ) : (
                        <div className="h-full w-full grid place-items-center font-bold">
                          {r.username.slice(0, 1).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-display text-base truncate">{r.username}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.badge.cls}`}>{r.badge.label}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs mt-0.5">
                        <CoinIcon className="w-3 h-3" />
                        <span className="font-mono font-bold">{r.score.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        <span className="opacity-80">Points</span>
                      </div>
                      <div className="text-[11px] opacity-90 mt-1">{r.matches} Games</div>
                      <div className="text-[10px] opacity-80 font-mono">Average: {r.avg.toFixed(1)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="hud-panel p-10 text-center font-mono text-sm text-muted-foreground">
            No ranked players yet — play a match to appear here.
          </div>
        )}

        {/* Table */}
        {rows.length > 0 && (
          <div className="hud-panel overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40 bg-card/40 text-left">
                    <Th>Rank</Th>
                    <Th>Player</Th>
                    <Th align="right">Total Score</Th>
                    <Th align="right">Games</Th>
                    <Th align="right">Average</Th>
                    <Th>Badge</Th>
                    <Th>Last Played</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {rows.map((r, i) => {
                    const rank = i + 1;
                    const isMe = user?.id === r.user_id;
                    return (
                      <tr key={r.user_id} className={isMe ? "bg-primary/10" : "hover:bg-card/40"}>
                        <td className="px-3 py-3">
                          {rank <= 3 ? (
                            <Award
                              className={
                                rank === 1 ? "w-5 h-5 text-amber-400" :
                                rank === 2 ? "w-5 h-5 text-slate-300" :
                                "w-5 h-5 text-amber-700"
                              }
                            />
                          ) : (
                            <span className="font-mono text-muted-foreground">#{rank}</span>
                          )}
                        </td>
                        <td className="px-3 py-3">
                          <Link to="/u/$username" params={{ username: r.username }} className="flex items-center gap-2.5 group">
                            <div className="h-9 w-9 rounded-full overflow-hidden bg-secondary shrink-0">
                              {r.avatar_url ? (
                                <img src={r.avatar_url} alt={r.username} className="h-full w-full object-cover" />
                              ) : (
                                <div className="h-full w-full grid place-items-center text-xs font-bold">
                                  {r.username.slice(0, 1).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="leading-tight">
                              <div className="font-semibold group-hover:text-primary">{r.username}</div>
                              <div className="text-[11px] text-muted-foreground">Level {r.level}</div>
                            </div>
                          </Link>
                        </td>
                        <td className="px-3 py-3 text-right">
                          <span className="inline-flex items-center gap-1 font-mono">
                            <CoinIcon className="w-3.5 h-3.5" />
                            {r.score.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right font-mono">{r.matches}</td>
                        <td className="px-3 py-3 text-right">
                          <span className="inline-flex items-center gap-1 font-mono text-muted-foreground">
                            <CoinIcon className="w-3.5 h-3.5" />
                            {r.avg.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${r.badge.cls}`}>{r.badge.label}</span>
                        </td>
                        <td className="px-3 py-3 font-mono text-[11px] text-muted-foreground">
                          {r.last_played ? format(new Date(r.last_played), "yyyy-MM-dd HH:mm") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {meRank && (
          <p className="text-center text-xs text-muted-foreground font-mono">
            Your rank: <span className="text-primary font-bold">#{meRank}</span>
          </p>
        )}

        <p className="pt-1 text-center text-[11px] text-muted-foreground">ⓘ Leaderboards refresh every 10 minutes.</p>
      </div>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th className={`px-3 py-2.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground ${align === "right" ? "text-right" : "text-left"}`}>
      {children}
    </th>
  );
}
