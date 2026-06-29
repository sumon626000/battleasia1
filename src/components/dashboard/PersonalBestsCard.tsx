import { useMemo } from "react";
import { Crosshair, Trophy, Coins, Flame, Star } from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";

type Participant = {
  id?: number | string;
  rank_position?: number | null;
  kills?: number | null;
  prize_bac?: number | null;
  created_at?: string | null;
  matches?: { id?: number; match_name?: string; status?: string } | null;
};

type Best = {
  key: string;
  label: string;
  value: string | number;
  matchName?: string;
  icon: typeof Crosshair;
  accent: string;
};

export function PersonalBestsCard({ participants }: { participants: Participant[] }) {
  const bests = useMemo<Best[]>(() => {
    const finished = participants.filter((p) => {
      const s = p.matches?.status;
      return s === "completed" || s === "result_published";
    });
    if (!finished.length) return [];

    const byKills = [...finished].sort(
      (a, b) => Number(b.kills ?? 0) - Number(a.kills ?? 0),
    )[0];
    const byPrize = [...finished].sort(
      (a, b) => Number(b.prize_bac ?? 0) - Number(a.prize_bac ?? 0),
    )[0];
    const byRank = [...finished]
      .filter((p) => Number(p.rank_position ?? 0) > 0)
      .sort((a, b) => Number(a.rank_position ?? 99) - Number(b.rank_position ?? 99))[0];

    const out: Best[] = [];
    if (byKills && Number(byKills.kills ?? 0) > 0) {
      out.push({
        key: "kills",
        label: "Most Kills",
        value: Number(byKills.kills),
        matchName: byKills.matches?.match_name,
        icon: Crosshair,
        accent: "text-rose-400",
      });
    }
    if (byPrize && Number(byPrize.prize_bac ?? 0) > 0) {
      out.push({
        key: "prize",
        label: "Biggest Prize",
        value: Number(byPrize.prize_bac).toLocaleString(),
        matchName: byPrize.matches?.match_name,
        icon: Coins,
        accent: "text-gold",
      });
    }
    if (byRank && Number(byRank.rank_position ?? 0) > 0) {
      out.push({
        key: "rank",
        label: "Best Finish",
        value: `#${Number(byRank.rank_position)}`,
        matchName: byRank.matches?.match_name,
        icon: Trophy,
        accent: Number(byRank.rank_position) === 1 ? "text-yellow-300" : "text-emerald-300",
      });
    }
    // Highest single day kills (sum kills by date)
    const byDay = new Map<string, number>();
    for (const p of finished) {
      const k = Number(p.kills ?? 0);
      if (!k) continue;
      const day = (p.created_at ?? "").slice(0, 10);
      if (!day) continue;
      byDay.set(day, (byDay.get(day) ?? 0) + k);
    }
    let peak = 0;
    let peakDay = "";
    for (const [d, v] of byDay) {
      if (v > peak) {
        peak = v;
        peakDay = d;
      }
    }
    if (peak > 0) {
      out.push({
        key: "day",
        label: "Best Day",
        value: `${peak} K`,
        matchName: peakDay
          ? new Date(peakDay).toLocaleDateString(undefined, { month: "short", day: "numeric" })
          : undefined,
        icon: Flame,
        accent: "text-orange-400",
      });
    }
    return out;
  }, [participants]);

  if (!bests.length) return null;

  return (
    <section className="hud-panel relative overflow-hidden p-4">
      <div className="mb-3 flex items-center gap-2">
        <Star size={14} className="text-gold" />
        <h2 className="font-hud text-xs font-bold uppercase tracking-widest text-foreground/80">
          Personal Bests
        </h2>
        <span aria-hidden className="h-px flex-1 bg-gradient-to-r from-gold/40 via-border/40 to-transparent" />
      </div>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {bests.map((b) => {
          const Icon = b.icon;
          return (
            <div
              key={b.key}
              className="group relative overflow-hidden rounded border border-border/50 bg-background/40 p-3 transition hover:-translate-y-0.5 hover:border-gold/50 hover:shadow-[0_8px_24px_-12px_rgba(212,175,55,0.45)]"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-widest text-foreground/55">
                  {b.label}
                </span>
                <Icon size={13} className={`shrink-0 ${b.accent} transition group-hover:scale-110`} />
              </div>
              <div className={`mt-1.5 font-display text-xl font-bold leading-tight tabular-nums ${b.accent}`}>
                {b.key === "prize" ? (
                  <span className="inline-flex items-baseline gap-1">
                    <CoinIcon size={14} />
                    {b.value}
                  </span>
                ) : (
                  b.value
                )}
              </div>
              {b.matchName && (
                <div className="mt-1 truncate font-mono text-[10px] text-foreground/55" title={b.matchName}>
                  {b.matchName}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
