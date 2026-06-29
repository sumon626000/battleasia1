import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Trophy, Crown, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CoinIcon } from "@/components/site/CoinIcon";

type Row = {
  user_id: string;
  username: string | null;
  avatar_url: string | null;
  kills: number;
  wins: number;
  prize: number;
};

const DAY_MS = 86_400_000;

export function WeeklyLeaderboardMini({ currentUserId }: { currentUserId?: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const since = new Date(Date.now() - 7 * DAY_MS).toISOString();
      const { data: parts } = await supabase
        .from("match_participants")
        .select("user_id, kills, rank_position, prize_bac, created_at")
        .gte("created_at", since)
        .limit(500);

      const agg = new Map<string, { kills: number; wins: number; prize: number }>();
      for (const p of parts ?? []) {
        if (!p.user_id) continue;
        const cur = agg.get(p.user_id) ?? { kills: 0, wins: 0, prize: 0 };
        cur.kills += Number(p.kills ?? 0);
        cur.prize += Number(p.prize_bac ?? 0);
        if (Number(p.rank_position ?? 0) === 1) cur.wins += 1;
        agg.set(p.user_id, cur);
      }

      const top = [...agg.entries()]
        .map(([user_id, v]) => ({ user_id, ...v, score: v.prize * 2 + v.kills + v.wins * 50 }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);

      if (top.length === 0) {
        if (!cancel) {
          setRows([]);
          setLoading(false);
        }
        return;
      }

      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, in_game_username")
        .in("id", top.map((t) => t.user_id));

      const profMap = new Map(
        (profs ?? []).map((p) => [
          p.id,
          {
            username: (p as { in_game_username?: string | null }).in_game_username || p.username,
            avatar_url: p.avatar_url,
          },
        ]),
      );

      const finalRows: Row[] = top.map((t) => ({
        user_id: t.user_id,
        username: profMap.get(t.user_id)?.username ?? null,
        avatar_url: profMap.get(t.user_id)?.avatar_url ?? null,
        kills: t.kills,
        wins: t.wins,
        prize: t.prize,
      }));

      if (!cancel) {
        setRows(finalRows);
        setLoading(false);
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  const rankIcon = (i: number) => {
    if (i === 0) return <Crown size={12} className="text-yellow-400" />;
    if (i === 1) return <Medal size={12} className="text-slate-300" />;
    if (i === 2) return <Medal size={12} className="text-amber-600" />;
    return <span className="font-mono text-[10px] text-foreground/50">#{i + 1}</span>;
  };

  return (
    <section className="hud-panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Trophy size={14} className="text-gold" />
          <h2 className="font-hud text-xs font-bold uppercase tracking-widest text-foreground/80">
            Top Operators
          </h2>
        </div>
        <span className="font-hud text-[10px] uppercase tracking-widest text-foreground/50">
          This week
        </span>
      </div>

      {loading ? (
        <div className="p-6 text-center text-xs text-foreground/50">Loading leaderboard…</div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-center text-xs text-foreground/50">
          No activity yet this week.
        </div>
      ) : (
        <ul className="divide-y divide-border/30">
          {rows.map((r, i) => {
            const isMe = r.user_id === currentUserId;
            return (
              <li
                key={r.user_id}
                className={`group flex items-center gap-3 px-3 py-2.5 transition-colors ${
                  isMe ? "bg-gold/5" : "hover:bg-foreground/[0.03]"
                } ${i === 0 ? "border-l-2 border-l-gold" : ""}`}
              >
                <div className="flex w-5 justify-center">{rankIcon(i)}</div>
                {r.avatar_url ? (
                  <img
                    src={r.avatar_url}
                    alt=""
                    className="h-7 w-7 rounded border border-border/40 object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className="grid h-7 w-7 place-items-center rounded border border-border/40 bg-foreground/5 font-mono text-[10px] uppercase text-foreground/60">
                    {(r.username || "?").slice(0, 2)}
                  </div>
                )}
                <Link
                  to="/u/$username"
                  params={{ username: r.username || r.user_id }}
                  className="min-w-0 flex-1 truncate text-sm font-medium text-foreground hover:text-gold"
                >
                  {r.username || "Operator"}
                  {isMe && (
                    <span className="ml-1.5 font-hud text-[9px] uppercase tracking-widest text-gold">
                      You
                    </span>
                  )}
                </Link>
                <div className="flex items-center gap-2.5 text-[11px]">
                  <span className="font-mono text-foreground/70">{r.kills}k</span>
                  <span className="font-mono text-emerald-400/80">{r.wins}w</span>
                  <span className="inline-flex items-center gap-0.5 font-mono text-gold">
                    <CoinIcon size={10} />
                    {r.prize}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
