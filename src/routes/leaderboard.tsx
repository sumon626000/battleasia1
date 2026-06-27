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
  demo?: boolean;
};

const DEMO_LB: LBRow[] = [
  { user_id: "demo-1",  username: "SHADOW_47",   avatar_url: null, country_code: "BD", total_kills: 412, total_prize: 148200, matches_played: 96, demo: true },
  { user_id: "demo-2",  username: "GHOST_KING",  avatar_url: null, country_code: "IN", total_kills: 388, total_prize: 132750, matches_played: 91, demo: true },
  { user_id: "demo-3",  username: "NOVA_STRIKE", avatar_url: null, country_code: "PK", total_kills: 356, total_prize: 119400, matches_played: 88, demo: true },
  { user_id: "demo-4",  username: "RAVEN_X",     avatar_url: null, country_code: "NP", total_kills: 321, total_prize: 101200, matches_played: 82, demo: true },
  { user_id: "demo-5",  username: "TITAN_07",    avatar_url: null, country_code: "LK", total_kills: 297, total_prize: 87850,  matches_played: 77, demo: true },
  { user_id: "demo-6",  username: "VIPER_ACE",   avatar_url: null, country_code: "MY", total_kills: 268, total_prize: 72400,  matches_played: 71, demo: true },
  { user_id: "demo-7",  username: "BLAZE_OPS",   avatar_url: null, country_code: "ID", total_kills: 241, total_prize: 59650,  matches_played: 64, demo: true },
  { user_id: "demo-8",  username: "FALCON_22",   avatar_url: null, country_code: "TH", total_kills: 216, total_prize: 46900,  matches_played: 58, demo: true },
  { user_id: "demo-9",  username: "WRAITH_ZED",  avatar_url: null, country_code: "VN", total_kills: 188, total_prize: 34250,  matches_played: 51, demo: true },
  { user_id: "demo-10", username: "ECHO_PRIME",  avatar_url: null, country_code: "PH", total_kills: 162, total_prize: 21800,  matches_played: 44, demo: true },
];

function fillDemo(rows: LBRow[], metric: "kills" | "prize" | "matches"): LBRow[] {
  const have = new Set(rows.map((r) => r.username.toUpperCase()));
  const merged = [...rows, ...DEMO_LB.filter((d) => !have.has(d.username.toUpperCase()))];
  merged.sort((a, b) =>
    metric === "kills" ? b.total_kills - a.total_kills :
    metric === "prize" ? b.total_prize - a.total_prize :
    b.matches_played - a.matches_played
  );
  return merged;
}


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
      return fillDemo(rows, metric).slice(0, 100);

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
                      <img loading="lazy" decoding="async" src={r.avatar_url} alt={r.username} className="h-7 w-7 rounded-full object-cover" />
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

function Podium({ rows, metric }: { rows: LBRow[]; metric: "kills" | "prize" | "matches" }) {
  const valueOf = (r: LBRow) =>
    metric === "kills" ? r.total_kills : metric === "prize" ? r.total_prize.toLocaleString() : r.matches_played;
  const label = metric === "kills" ? "KILLS" : metric === "prize" ? "BAC EARNED" : "MATCHES";
  // Order: 2nd, 1st, 3rd (visual podium)
  const order = [rows[1], rows[0], rows[2]].filter(Boolean);
  const heights = ["h-28", "h-36", "h-24"];
  const ranks = [2, 1, 3];
  const colors = ["text-slate-300 border-slate-300/40", "text-gold border-gold/60", "text-amber-700 border-amber-700/40"];
  // remap heights/colors based on rank
  return (
    <div className="hud-panel p-4">
      <div className="mb-3 font-hud text-[10px] uppercase tracking-widest text-foreground/60">// TOP OPERATIVES — {label}</div>
      <div className="grid grid-cols-3 items-end gap-3">
        {order.map((r) => {
          const actualRank = rows.indexOf(r) + 1;
          const i = ranks.indexOf(actualRank);
          return (
            <div key={r.user_id} className="flex flex-col items-center">
              <div className="relative">
                {r.avatar_url ? (
                  <img loading="lazy" decoding="async" src={r.avatar_url} alt={r.username} className={`h-14 w-14 rounded-full border-2 object-cover ${colors[i].split(" ")[1]}`} />
                ) : (
                  <div className={`h-14 w-14 rounded-full border-2 bg-secondary ${colors[i].split(" ")[1]}`} />
                )}
                {actualRank === 1 && <Crown size={18} className="absolute -top-3 left-1/2 -translate-x-1/2 text-gold" />}
              </div>
              <div className="mt-1.5 max-w-full truncate font-display text-xs uppercase">{r.username}</div>
              <div className={`font-mono text-sm font-bold ${colors[i].split(" ")[0]}`}>{valueOf(r)}</div>
              <div className={`mt-2 flex w-full items-center justify-center rounded-t-sm border-x border-t bg-gradient-to-b from-gold/10 to-transparent ${heights[i]} ${colors[i].split(" ")[1]}`}>
                <span className={`font-display text-3xl font-black ${colors[i].split(" ")[0]}`}>#{actualRank}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
