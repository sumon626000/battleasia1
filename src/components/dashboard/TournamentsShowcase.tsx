import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Clock, Users, ChevronLeft, ChevronRight, Flame } from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";
import squadHero from "@/assets/pubg-squad-action.webp";
import sniperImg from "@/assets/pubg-sniper-rooftop.webp";
import airdropImg from "@/assets/pubg-airdrop.webp";

const HEROES = [squadHero, sniperImg, airdropImg];

type Match = {
  id: number | string;
  match_name: string;
  schedule_at: string | null;
  entry_fee_bac: number | null;
  rank_1_prize_bac?: number | null;
  status?: string | null;
  total_players?: number | null;
  banner_image_url?: string | null;
};

function fmtCountdown(ms: number) {
  if (ms <= 0) return "LIVE";
  const s = Math.floor(ms / 1000);
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function TournamentsShowcase() {
  const { data, isLoading } = useQuery({
    queryKey: ["showcase-tournaments"],
    queryFn: async () => {
      const res = await supabase
        .from("matches")
        .select("id, match_name, schedule_at, entry_fee_bac, prize_pool_bac, status, max_slots")
        .in("status", ["Upcoming", "Active"])
        .order("schedule_at", { ascending: true })
        .limit(6);
      return (res.data ?? []) as Match[];
    },
    staleTime: 60_000,
  });

  const matches = data ?? [];
  const [idx, setIdx] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const hoverRef = useRef(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (matches.length <= 1) return;
    const id = setInterval(() => {
      if (!hoverRef.current) setIdx((i) => (i + 1) % matches.length);
    }, 5000);
    return () => clearInterval(id);
  }, [matches.length]);

  const go = (n: number) => setIdx(((n % matches.length) + matches.length) % matches.length);

  const current = matches[idx];
  const hero = useMemo(() => HEROES[idx % HEROES.length], [idx]);

  if (isLoading) {
    return (
      <section className="hud-panel relative overflow-hidden">
        <div className="h-44 animate-pulse bg-foreground/5" />
      </section>
    );
  }
  if (!current) return null;

  const diff = current.schedule_at ? new Date(current.schedule_at).getTime() - now : null;
  const isLive = current.status === "Active" || (diff !== null && diff <= 0);

  return (
    <section
      className="hud-panel relative overflow-hidden"
      onMouseEnter={() => (hoverRef.current = true)}
      onMouseLeave={() => (hoverRef.current = false)}
    >
      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Flame size={14} className="text-gold" />
          <h2 className="font-hud text-xs font-bold uppercase tracking-widest text-foreground/80">
            Featured Tournaments
          </h2>
        </div>
        <Link
          to="/dashboard/matches"
          className="font-hud text-[10px] uppercase tracking-widest text-foreground/55 hover:text-gold"
        >
          View all →
        </Link>
      </div>

      <div className="relative h-44 sm:h-52">
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{ backgroundImage: `url(${hero})` }}
        />
        <div aria-hidden className="absolute inset-0 bg-gradient-to-r from-background via-background/80 to-background/30" />
        <div aria-hidden className="absolute inset-0 bg-grid-hud opacity-[0.07]" />

        <Link
          to="/dashboard/matches/$matchId"
          params={{ matchId: String(current.id) }}
          className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-5"
        >
          <div className="flex items-center gap-2">
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/60 bg-emerald-400/10 px-2.5 py-0.5 font-hud text-[10px] font-bold uppercase tracking-widest text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full border border-gold/50 bg-gold/10 px-2.5 py-0.5 font-hud text-[10px] font-bold uppercase tracking-widest text-gold">
                <Clock size={10} />
                {diff !== null ? fmtCountdown(diff) : "Soon"}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <h3 className="font-display text-xl font-bold leading-tight tracking-wide drop-shadow sm:text-2xl">
              {current.match_name}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              {Number(current.prize_pool_bac ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 rounded border border-gold/40 bg-gold/10 px-2 py-1 font-mono text-gold">
                  <Trophy size={11} /> {Number(current.prize_pool_bac).toLocaleString()} Pool
                </span>
              )}
              <span className="inline-flex items-center gap-1 rounded border border-border/60 bg-background/60 px-2 py-1 font-mono text-foreground/80">
                <CoinIcon size={11} /> {Number(current.entry_fee_bac ?? 0).toLocaleString()} Entry
              </span>
              {Number(current.max_slots ?? 0) > 0 && (
                <span className="inline-flex items-center gap-1 rounded border border-border/60 bg-background/60 px-2 py-1 font-mono text-foreground/70">
                  <Users size={11} /> {current.max_slots} slots
                </span>
              )}
            </div>
          </div>
        </Link>

        {matches.length > 1 && (
          <>
            <button
              aria-label="Previous"
              onClick={() => go(idx - 1)}
              className="absolute left-2 top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-border/60 bg-background/70 text-foreground/70 backdrop-blur transition hover:border-gold hover:text-gold"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              aria-label="Next"
              onClick={() => go(idx + 1)}
              className="absolute right-2 top-1/2 z-20 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full border border-border/60 bg-background/70 text-foreground/70 backdrop-blur transition hover:border-gold hover:text-gold"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-2 left-1/2 z-20 flex -translate-x-1/2 gap-1.5">
              {matches.map((_, i) => (
                <button
                  key={i}
                  aria-label={`Slide ${i + 1}`}
                  onClick={() => go(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === idx ? "w-6 bg-gold shadow-[0_0_8px_rgba(212,175,55,0.7)]" : "w-1.5 bg-foreground/30 hover:bg-foreground/50"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
