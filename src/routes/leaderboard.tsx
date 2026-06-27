import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Crown } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/leaderboard")({
  component: LeaderboardPage,
  head: () => ({
    meta: [
      { title: "Leaderboard — Battle Asia" },
      { name: "description", content: "Top players ranked by total kills, prize earnings, and matches won on Battle Asia." },
    ],
  }),
});

type LBRow = {
  user_id: string;
  total_kills: number;
  total_prize: number;
  matches_played: number;
  username: string;
  avatar_url: string | null;
  country_code: string | null;
};

function LeaderboardPage() {
  const [metric, setMetric] = useState<"kills" | "prize" | "matches">("kills");

  const q = useQuery({
    queryKey: ["leaderboard", metric],
    queryFn: async () => {
      const { data: parts, error } = await supabase
        .from("match_participants")
        .select("user_id, kills, prize_bac")
        .eq("result_applied", true)
        .limit(5000);
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
      if (ids.length === 0) return [] as LBRow[];

      const { data: profs } = await supabase
        .from("profiles")
        .select("id, username, avatar_url, country_code")
        .in("id", ids);

      const rows: LBRow[] = (profs ?? []).map((p: any) => {
        const a = agg.get(p.id)!;
        return {
          user_id: p.id,
          username: p.username ?? "Player",
          avatar_url: p.avatar_url,
          country_code: p.country_code,
          total_kills: a.kills,
          total_prize: a.prize,
          matches_played: a.matches,
        };
      });

      rows.sort((a, b) =>
        metric === "kills" ? b.total_kills - a.total_kills :
        metric === "prize" ? b.total_prize - a.total_prize :
        b.matches_played - a.matches_played
      );
      return rows.slice(0, 100);
    },
  });

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <div className="flex items-center gap-3 hud-bracket pl-3">
        <Trophy className="h-7 w-7 text-gold" />
        <div>
          <h1 className="font-display text-3xl uppercase tracking-wider text-gold">Leaderboard</h1>
          <p className="text-xs text-foreground/60 font-hud uppercase tracking-widest">Top operatives on the field</p>
        </div>
      </div>

      <div className="flex gap-2">
        {(["kills", "prize", "matches"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMetric(m)}
            className={`rounded border px-3 py-1.5 font-hud text-[11px] uppercase tracking-widest ${
              metric === m ? "border-gold/60 bg-gold/10 text-gold" : "border-border/60 text-foreground/70 hover:border-gold/40"
            }`}
          >
            {m === "kills" ? "Total Kills" : m === "prize" ? "Earnings" : "Matches"}
          </button>
        ))}
      </div>

      {q.data && q.data.length > 0 && <Podium rows={q.data.slice(0, 3)} metric={metric} />}

      <div className="hud-panel overflow-hidden">

        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase text-foreground/60">
            <tr>
              <th className="px-3 py-2 text-left w-12">Rank</th>
              <th className="px-3 py-2 text-left">Operative</th>
              <th className="px-3 py-2 text-right">Kills</th>
              <th className="px-3 py-2 text-right">Earnings</th>
              <th className="px-3 py-2 text-right">Matches</th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((r, i) => (
              <tr key={r.user_id} className="border-t border-border/30 hover:bg-secondary/30">
                <td className="px-3 py-2">
                  {i === 0 ? <Crown size={16} className="text-gold" /> :
                   i === 1 ? <Medal size={16} className="text-slate-300" /> :
                   i === 2 ? <Medal size={16} className="text-amber-700" /> :
                   <span className="font-mono text-xs text-foreground/60">#{i + 1}</span>}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2">
                    {r.avatar_url ? (
                      <img src={r.avatar_url} alt={r.username} className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="h-7 w-7 rounded-full bg-secondary border border-border/60" />
                    )}
                    <span className="font-display uppercase tracking-wide">{r.username}</span>
                    {r.country_code && <span className="text-[10px] text-foreground/50">{r.country_code}</span>}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono text-gold">{r.total_kills}</td>
                <td className="px-3 py-2 text-right font-mono text-emerald-400">{r.total_prize.toLocaleString()}</td>
                <td className="px-3 py-2 text-right font-mono text-foreground/70">{r.matches_played}</td>
              </tr>
            ))}
            {q.data?.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-12 text-center text-foreground/50">No results yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
