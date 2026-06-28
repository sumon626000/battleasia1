import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Flame, Gift, Check, Lock } from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";
import { toast } from "sonner";

const REWARDS = [10, 20, 30, 50, 75, 100, 200];

export function DailyLoginCard() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const [justClaimed, setJustClaimed] = useState<number | null>(null);

  const streak = useQuery({
    enabled: !!uid,
    queryKey: ["daily-streak", uid],
    queryFn: async () => {
      const { data } = await supabase
        .from("daily_login_streaks")
        .select("*")
        .eq("user_id", uid!)
        .maybeSingle();
      return data;
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const claimedToday = streak.data?.last_claim_date === today;
  const currentStreak = streak.data?.current_streak ?? 0;
  // Day in cycle the user is ABOUT to claim (or just claimed)
  const todayDayInCycle = claimedToday
    ? ((currentStreak - 1) % 7) + 1
    : (currentStreak % 7) + 1;

  const claim = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("claim_daily_login");
      if (error) throw error;
      return data as {
        success: boolean;
        already_claimed?: boolean;
        reward?: number;
        day_in_cycle?: number;
        current_streak?: number;
      };
    },
    onSuccess: (res) => {
      if (res.already_claimed) {
        toast.info("Already claimed today. Come back tomorrow! 🔥");
        return;
      }
      setJustClaimed(res.reward ?? 0);
      toast.success(`+${res.reward} BAC claimed! Day ${res.day_in_cycle} · Streak ${res.current_streak} 🔥`);
      qc.invalidateQueries({ queryKey: ["daily-streak", uid] });
      qc.invalidateQueries({ queryKey: ["profile", uid] });
      setTimeout(() => setJustClaimed(null), 3000);
    },
    onError: (e: Error) => toast.error(e.message || "Claim failed"),
  });

  return (
    <div className="hud-panel relative overflow-hidden p-4 sm:p-5">
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid-hud opacity-10" />
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-orange-400" />
            <h3 className="font-hud text-sm font-bold uppercase tracking-widest text-foreground/80">
              Daily Login
            </h3>
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="font-display text-3xl font-bold text-orange-400">
              {currentStreak}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-widest text-foreground/55">
              day streak
            </span>
          </div>
          <p className="mt-0.5 font-mono text-[10px] text-foreground/50">
            Longest: {streak.data?.longest_streak ?? 0} · Earned: {Number(streak.data?.total_bac_earned ?? 0).toLocaleString()} BAC
          </p>
        </div>
        <button
          onClick={() => claim.mutate()}
          disabled={claimedToday || claim.isPending || !uid}
          className={`relative shrink-0 rounded-sm border-2 px-4 py-2 font-hud text-xs font-bold uppercase tracking-widest transition ${
            claimedToday
              ? "border-emerald-600/50 bg-emerald-700/30 text-emerald-300 cursor-default"
              : "border-gold bg-gold text-background shadow-[0_0_18px_rgba(212,175,55,0.7)] hover:bg-gold/90 animate-pulse"
          }`}
        >
          {claimedToday ? (
            <span className="flex items-center gap-1.5"><Check size={14} /> Claimed</span>
          ) : claim.isPending ? (
            "Claiming…"
          ) : (
            <span className="flex items-center gap-1.5"><Gift size={14} /> Claim Today</span>
          )}
          {justClaimed != null && (
            <span className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 font-mono text-sm font-bold text-gold animate-bounce">
              +{justClaimed}
            </span>
          )}
        </button>
      </div>

      {/* 7-day reward calendar */}
      <div className="mt-4 grid grid-cols-7 gap-1.5">
        {REWARDS.map((amount, i) => {
          const day = i + 1;
          const isToday = day === todayDayInCycle;
          const isPast = day < todayDayInCycle || (claimedToday && day === todayDayInCycle);
          const isBig = day === 7;
          return (
            <div
              key={day}
              className={`relative flex flex-col items-center gap-0.5 rounded-sm border p-1.5 transition ${
                isPast
                  ? "border-emerald-600/50 bg-emerald-700/20"
                  : isToday
                    ? "border-gold bg-gold/15 shadow-[0_0_10px_rgba(212,175,55,0.5)] ring-1 ring-gold/40"
                    : isBig
                      ? "border-purple-500/40 bg-purple-600/10"
                      : "border-border/40 bg-background/30"
              }`}
            >
              <div className="font-hud text-[8px] uppercase tracking-wider text-foreground/55">
                D{day}
              </div>
              <div className="flex items-center gap-0.5">
                <CoinIcon size={10} />
                <span className={`font-mono text-[10px] font-bold tabular-nums ${
                  isPast ? "text-emerald-300" : isToday ? "text-gold" : isBig ? "text-purple-300" : "text-foreground/60"
                }`}>
                  {amount}
                </span>
              </div>
              {isPast && (
                <Check size={10} className="absolute -top-1 -right-1 rounded-full bg-emerald-600 p-0.5 text-white" />
              )}
              {isBig && !isPast && !isToday && (
                <Lock size={8} className="text-purple-300/60" />
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center font-mono text-[10px] text-foreground/50">
        🎁 Day 7 mega bonus — keep your streak alive!
      </p>
    </div>
  );
}
