import { useMemo } from "react";
import { Target, TrendingUp } from "lucide-react";
import { CoinIcon } from "@/components/ui/CoinIcon";

type Participant = {
  kills?: number | null;
  rank_position?: number | null;
  prize_bac?: number | null;
  created_at?: string | null;
};

const DAY_MS = 86_400_000;
const WEEKLY_KILL_GOAL = 50;

export function WeeklyPerformanceCard({
  participants,
}: {
  participants: Participant[];
}) {
  const { days, totalKills, totalWins, totalPrize, progress } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const start = today.getTime() - 6 * DAY_MS;

    const buckets = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start + i * DAY_MS);
      return {
        label: d.toLocaleDateString(undefined, { weekday: "short" })[0],
        date: d,
        kills: 0,
        wins: 0,
      };
    });

    let kills = 0;
    let wins = 0;
    let prize = 0;

    for (const p of participants) {
      if (!p.created_at) continue;
      const ts = new Date(p.created_at).getTime();
      if (ts < start) continue;
      const idx = Math.min(6, Math.floor((ts - start) / DAY_MS));
      if (idx < 0) continue;
      const k = Number(p.kills ?? 0);
      buckets[idx].kills += k;
      kills += k;
      if (Number(p.rank_position ?? 0) === 1) {
        buckets[idx].wins += 1;
        wins += 1;
      }
      prize += Number(p.prize_bac ?? 0);
    }

    return {
      days: buckets,
      totalKills: kills,
      totalWins: wins,
      totalPrize: prize,
      progress: Math.min(100, Math.round((kills / WEEKLY_KILL_GOAL) * 100)),
    };
  }, [participants]);

  const maxKill = Math.max(1, ...days.map((d) => d.kills));
  const radius = 34;
  const circ = 2 * Math.PI * radius;
  const dash = (progress / 100) * circ;

  return (
    <section className="hud-panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={14} className="text-gold" />
          <h2 className="font-hud text-xs font-bold uppercase tracking-widest text-foreground/80">
            Weekly Performance
          </h2>
        </div>
        <span className="font-hud text-[10px] uppercase tracking-widest text-foreground/50">
          Last 7 days
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-[1fr_auto]">
        {/* Sparkline bars */}
        <div>
          <div className="flex h-24 items-end gap-1.5">
            {days.map((d, i) => {
              const h = (d.kills / maxKill) * 100;
              const isToday = i === 6;
              return (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex h-full w-full items-end">
                    <div
                      className={`w-full rounded-t transition-all duration-500 ${
                        d.kills > 0
                          ? isToday
                            ? "bg-gradient-to-t from-gold/30 to-gold shadow-[0_0_10px_rgba(212,175,55,0.4)]"
                            : "bg-gradient-to-t from-gold/10 to-gold/60"
                          : "bg-border/30"
                      }`}
                      style={{ height: `${Math.max(4, h)}%` }}
                      title={`${d.kills} kills · ${d.wins} wins`}
                    />
                  </div>
                  <span className="font-hud text-[9px] uppercase tracking-widest text-foreground/50">
                    {d.label}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex items-center gap-4 border-t border-border/30 pt-3 text-[11px]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-sm bg-gold" />
              <span className="font-hud uppercase tracking-widest text-foreground/60">
                Kills
              </span>
              <span className="font-mono font-bold text-foreground">{totalKills}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="font-hud uppercase tracking-widest text-foreground/60">
                Wins
              </span>
              <span className="font-mono font-bold text-foreground">{totalWins}</span>
            </span>
            <span className="ml-auto inline-flex items-center gap-1 text-gold">
              <CoinIcon size={11} />
              <span className="font-mono font-bold">{totalPrize}</span>
            </span>
          </div>
        </div>

        {/* Goal ring */}
        <div className="flex flex-col items-center justify-center gap-2 border-t border-border/30 pt-4 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          <div className="relative h-[88px] w-[88px]">
            <svg viewBox="0 0 80 80" className="h-full w-full -rotate-90">
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke="hsl(var(--border) / 0.4)"
                strokeWidth="6"
              />
              <circle
                cx="40"
                cy="40"
                r={radius}
                fill="none"
                stroke="hsl(var(--gold))"
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ}`}
                className="transition-all duration-700 ease-out"
                style={{ filter: "drop-shadow(0 0 6px hsl(var(--gold) / 0.5))" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Target size={12} className="text-gold" />
              <span className="font-mono text-base font-bold leading-none text-foreground">
                {progress}%
              </span>
            </div>
          </div>
          <div className="text-center">
            <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/55">
              Weekly Goal
            </div>
            <div className="font-mono text-xs text-foreground/80">
              {totalKills}/{WEEKLY_KILL_GOAL} kills
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
