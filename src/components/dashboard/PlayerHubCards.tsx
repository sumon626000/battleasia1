import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Shield, Flame, Award, Clock, Zap, Skull, Crown, Target } from "lucide-react";

// ============ RANK / TIER ============
const TIERS = [
  { name: "Bronze",     min: 0,    color: "text-amber-700",   bar: "bg-amber-700",   icon: Shield },
  { name: "Silver",     min: 50,   color: "text-slate-300",   bar: "bg-slate-300",   icon: Shield },
  { name: "Gold",       min: 200,  color: "text-yellow-400",  bar: "bg-yellow-400",  icon: Shield },
  { name: "Platinum",   min: 500,  color: "text-cyan-300",    bar: "bg-cyan-300",    icon: Award },
  { name: "Diamond",    min: 1000, color: "text-blue-400",    bar: "bg-blue-400",    icon: Award },
  { name: "Crown",      min: 2000, color: "text-purple-400",  bar: "bg-purple-400",  icon: Crown },
  { name: "Ace",        min: 4000, color: "text-pink-400",    bar: "bg-pink-400",    icon: Crown },
  { name: "Conqueror",  min: 8000, color: "text-red-500",     bar: "bg-red-500",     icon: Flame },
];

function getTier(rp: number) {
  let current = TIERS[0];
  let next = TIERS[1];
  for (let i = 0; i < TIERS.length; i++) {
    if (rp >= TIERS[i].min) {
      current = TIERS[i];
      next = TIERS[i + 1] ?? TIERS[i];
    }
  }
  const span = next.min - current.min || 1;
  const progress = next === current ? 100 : Math.min(100, Math.round(((rp - current.min) / span) * 100));
  return { current, next, progress, toNext: Math.max(0, next.min - rp) };
}

export function RankTierCard({ wins, kills, top3 }: { wins: number; kills: number; top3: number }) {
  // RP formula: wins×30 + top3×15 + kills×2
  const rp = wins * 30 + top3 * 15 + kills * 2;
  const { current, next, progress, toNext } = getTier(rp);
  const Icon = current.icon;
  const isMax = current === next;

  return (
    <div className="hud-panel relative overflow-hidden p-4 sm:p-5">
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid-hud opacity-10" />
      <div className="flex items-start justify-between">
        <div>
          <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/55">
            Combat Tier
          </div>
          <div className={`mt-1 flex items-center gap-2 font-display text-2xl font-bold ${current.color}`}>
            <Icon size={22} />
            {current.name}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-foreground/60">
            {rp.toLocaleString()} RP
            {!isMax && (
              <> · {toNext.toLocaleString()} to <span className={next.color}>{next.name}</span></>
            )}
            {isMax && <> · MAX TIER</>}
          </div>
        </div>
      </div>
      <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-background/60 ring-1 ring-border/40">
        <div
          className={`h-full ${current.bar} transition-all duration-700`}
          style={{ width: `${progress}%`, boxShadow: `0 0 12px currentColor` }}
        />
      </div>
      <div className="mt-2 flex justify-between font-mono text-[10px] text-foreground/50">
        <span>{current.min} RP</span>
        <span>{progress}%</span>
        <span>{next.min} RP</span>
      </div>
    </div>
  );
}

// ============ ACHIEVEMENTS ============
type Achievement = { id: string; label: string; icon: typeof Flame; got: boolean; hint: string };

export function AchievementsCard({
  played, wins, totalKills, top3, totalPrize,
}: {
  played: number; wins: number; totalKills: number; top3: number; totalPrize: number;
}) {
  const items: Achievement[] = [
    { id: "first-blood", label: "First Blood",   icon: Skull,  got: totalKills >= 1,    hint: "First kill" },
    { id: "first-win",   label: "First Win",     icon: Crown,  got: wins >= 1,          hint: "1 chicken dinner" },
    { id: "veteran",     label: "Veteran",       icon: Shield, got: played >= 10,       hint: "10 matches" },
    { id: "killer",      label: "10 Kills Club", icon: Target, got: totalKills >= 10,   hint: "10 total kills" },
    { id: "podium",      label: "Podium Pro",    icon: Award,  got: top3 >= 3,          hint: "3 top-3 finishes" },
    { id: "rich",        label: "Treasure",     icon: Flame,  got: totalPrize >= 1000, hint: "1,000 BAC won" },
  ];

  return (
    <div className="hud-panel p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-hud text-sm font-bold uppercase tracking-widest text-foreground/80">
          Achievements
        </h3>
        <span className="font-mono text-[10px] text-foreground/55">
          {items.filter(i => i.got).length}/{items.length}
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {items.map((a) => {
          const Icon = a.icon;
          return (
            <div
              key={a.id}
              title={a.hint}
              className={`group relative flex flex-col items-center gap-1 rounded-md border p-2 transition ${
                a.got
                  ? "border-gold/60 bg-gold/10 text-gold shadow-[0_0_12px_rgba(212,175,55,0.25)]"
                  : "border-border/40 bg-background/30 text-foreground/30 grayscale"
              }`}
            >
              <Icon size={20} />
              <span className="text-center font-hud text-[9px] font-bold uppercase tracking-wider leading-tight">
                {a.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============ NEXT TOURNAMENT COUNTDOWN ============
function useCountdown(target: string | null | undefined) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [target]);
  if (!target) return null;
  const diff = new Date(target).getTime() - now;
  if (diff <= 0) return { d: 0, h: 0, m: 0, s: 0, live: true };
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s, live: false };
}

export function NextTournamentCard({
  match,
}: {
  match: { id: number; match_name: string; schedule_at: string; entry_fee_bac: number } | null;
}) {
  const cd = useCountdown(match?.schedule_at);

  if (!match) {
    return (
      <div className="hud-panel relative overflow-hidden p-5">
        <div className="mb-2 flex items-center gap-2">
          <Clock size={16} className="text-foreground/60" />
          <h3 className="font-hud text-sm font-bold uppercase tracking-widest text-foreground/80">
            Next Tournament
          </h3>
        </div>
        <p className="font-mono text-xs text-foreground/60">No scheduled tournament. Stay tuned!</p>
      </div>
    );
  }

  return (
    <Link
      to="/dashboard/matches/$matchId"
      params={{ matchId: String(match.id) }}
      className="hud-panel group relative block overflow-hidden p-5 transition hover:border-gold/60"
    >
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid-hud opacity-10" />
      <div className="absolute right-3 top-3 flex items-center gap-1 rounded-sm border border-red-500/60 bg-red-600/20 px-2 py-0.5">
        <Zap size={10} className="text-red-400" />
        <span className="font-hud text-[9px] font-bold uppercase tracking-widest text-red-300">
          {cd?.live ? "LIVE NOW" : "Upcoming"}
        </span>
      </div>
      <div className="mb-2 flex items-center gap-2">
        <Clock size={16} className="text-gold" />
        <h3 className="font-hud text-sm font-bold uppercase tracking-widest text-gold">
          Next Tournament
        </h3>
      </div>
      <p className="truncate font-display text-lg font-bold text-foreground">{match.match_name}</p>
      <p className="mt-0.5 font-mono text-[11px] text-foreground/60">
        Entry: <span className="text-gold">{Number(match.entry_fee_bac).toLocaleString()} BAC</span>
      </p>
      {cd && !cd.live && (
        <div className="mt-4 grid grid-cols-4 gap-2">
          {[
            { l: "Days", v: cd.d },
            { l: "Hrs", v: cd.h },
            { l: "Min", v: cd.m },
            { l: "Sec", v: cd.s },
          ].map((u) => (
            <div key={u.l} className="rounded-sm border border-gold/30 bg-background/50 py-2 text-center">
              <div className="font-mono text-xl font-bold tabular-nums text-gold">
                {String(u.v).padStart(2, "0")}
              </div>
              <div className="font-hud text-[9px] uppercase tracking-widest text-foreground/50">{u.l}</div>
            </div>
          ))}
        </div>
      )}
      {cd?.live && (
        <div className="mt-4 animate-pulse rounded-sm border-2 border-red-500 bg-red-600/30 py-3 text-center font-hud text-sm font-bold uppercase tracking-widest text-red-300">
          🔴 Match is Live — Join Now
        </div>
      )}
    </Link>
  );
}
