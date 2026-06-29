import React, { useEffect, useMemo, useState } from "react";
import { Lightbulb, ChevronLeft, ChevronRight, Sunrise, Target, Crosshair, Trophy, Coins as CoinsIcon } from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";

type Participant = {
  rank?: number | null;
  kills?: number | null;
  prize_bac?: number | null;
  created_at?: string | null;
  matches?: { status?: string | null } | null;
};

const TIPS: { icon: typeof Lightbulb; title: string; body: string }[] = [
  { icon: Target, title: "Aim Discipline", body: "Burst-fire mid-range. Full-auto only inside 15 m — recoil eats your accuracy past that." },
  { icon: Crosshair, title: "Pre-Aim Corners", body: "Hold your crosshair at head height before peeking. First shot wins gun-fights." },
  { icon: Trophy, title: "Edge Rotations", body: "Hug zone edges in late circles — fewer angles to defend, easier squad wipes." },
  { icon: CoinsIcon, title: "Bankroll Smart", body: "Never spend more than 20% of your balance on one entry. Survive variance, climb steady." },
  { icon: Sunrise, title: "Daily Streak", body: "Login + 1 match daily. Streak rewards stack and quests reset every 24h." },
  { icon: Lightbulb, title: "Drop Cold", body: "Avoid hot drops in tournaments. Late kills > early kills when prize ladder is rank-based." },
];

function isSameLocalDay(iso: string, now: Date) {
  const d = new Date(iso);
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

export function TipAndCheckInCard({ participants, balanceLogs }: {
  participants: Participant[];
  balanceLogs: { amount_bac: number; type: string; created_at: string }[];
}) {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const reduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    const t = setInterval(() => setIdx((i) => (i + 1) % TIPS.length), 7000);
    return () => clearInterval(t);
  }, []);

  const today = useMemo(() => {
    const now = new Date();
    const todays = participants.filter((p) => p.created_at && isSameLocalDay(p.created_at, now));
    const finished = todays.filter((p) => {
      const s = (p.matches?.status ?? "").toString().toLowerCase();
      return s === "completed" || s === "finished";
    });
    const kills = finished.reduce((s, p) => s + Number(p.kills ?? 0), 0);
    const prize = finished.reduce((s, p) => s + Number(p.prize_bac ?? 0), 0);
    const wins = finished.filter((p) => Number(p.rank ?? 0) === 1).length;
    const earnings = (balanceLogs ?? [])
      .filter((l) => isSameLocalDay(l.created_at, now) && Number(l.amount) > 0)
      .reduce((s, l) => s + Number(l.amount), 0);
    return {
      played: todays.length,
      finished: finished.length,
      kills,
      prize,
      wins,
      earnings: earnings || prize,
    };
  }, [participants, balanceLogs]);

  const tip = TIPS[idx];
  const TipIcon = tip.icon;

  return (
    <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* TIP OF THE DAY */}
      <div className="hud-panel group relative overflow-hidden p-4">
        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-gold/60" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-gold/15 text-gold">
              <Lightbulb size={15} />
            </div>
            <h2 className="font-hud text-xs font-bold uppercase tracking-widest text-foreground/80">
              Pro Tip
            </h2>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous tip"
              onClick={() => setIdx((i) => (i - 1 + TIPS.length) % TIPS.length)}
              className="grid h-6 w-6 place-items-center rounded border border-border/50 text-foreground/60 transition-colors hover:border-gold/60 hover:text-gold"
            >
              <ChevronLeft size={12} />
            </button>
            <button
              type="button"
              aria-label="Next tip"
              onClick={() => setIdx((i) => (i + 1) % TIPS.length)}
              className="grid h-6 w-6 place-items-center rounded border border-border/50 text-foreground/60 transition-colors hover:border-gold/60 hover:text-gold"
            >
              <ChevronRight size={12} />
            </button>
          </div>
        </div>

        <div key={idx} className="mt-3 flex items-start gap-3 animate-in fade-in slide-in-from-bottom-1 duration-500">
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-md bg-gold/10 text-gold ring-1 ring-gold/30">
            <TipIcon size={18} />
          </div>
          <div className="min-w-0">
            <div className="font-display text-sm font-bold text-foreground">{tip.title}</div>
            <p className="mt-0.5 text-[12px] leading-snug text-foreground/70">{tip.body}</p>
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1">
          {TIPS.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Tip ${i + 1}`}
              onClick={() => setIdx(i)}
              className={`h-1 rounded-full transition-all ${
                i === idx ? "w-6 bg-gold shadow-[0_0_8px_rgba(212,175,55,0.6)]" : "w-2 bg-border/60 hover:bg-foreground/40"
              }`}
            />
          ))}
        </div>
      </div>

      {/* TODAY'S CHECK-IN */}
      <div className="hud-panel relative overflow-hidden p-4">
        <span aria-hidden className="absolute inset-y-0 left-0 w-[3px] bg-emerald-400/60" />
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-emerald-400/15 text-emerald-300">
              <Sunrise size={15} />
            </div>
            <h2 className="font-hud text-xs font-bold uppercase tracking-widest text-foreground/80">
              Today
            </h2>
          </div>
          <div className="font-mono text-[10px] uppercase tracking-wider text-foreground/50">
            {new Date().toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Stat label="Matches" value={today.played} accent="text-foreground" />
          <Stat label="Wins" value={today.wins} accent={today.wins > 0 ? "text-yellow-300" : "text-foreground/70"} />
          <Stat label="Kills" value={today.kills} icon={<Crosshair size={11} className="text-rose-300" />} accent={today.kills > 0 ? "text-rose-300" : "text-foreground/70"} />
          <Stat label="Earnings" value={today.earnings} icon={<CoinIcon className="h-3 w-3" />} accent={today.earnings > 0 ? "text-gold" : "text-foreground/70"} />
        </div>

        {today.played === 0 && (
          <div className="mt-3 rounded border border-dashed border-border/50 px-3 py-2 text-center font-mono text-[10px] uppercase tracking-wider text-foreground/55">
            No matches today — drop in!
          </div>
        )}
      </div>
    </section>
  );
}

function Stat({ label, value, icon, accent }: { label: string; value: number; icon?: React.ReactNode; accent?: string }) {
  return (
    <div className="rounded-md border border-border/40 bg-background/40 px-3 py-2">
      <div className="font-mono text-[9px] uppercase tracking-widest text-foreground/50">{label}</div>
      <div className={`mt-0.5 flex items-baseline gap-1 font-display text-lg font-bold tabular-nums ${accent ?? "text-foreground"}`}>
        {icon}
        <span>{value.toLocaleString()}</span>
      </div>
    </div>
  );
}
