import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Sparkles, Loader2, Zap } from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";
import { toast } from "sonner";

type Segment = {
  id: string;
  label: string;
  reward_type: string;
  reward_amount: number;
  weight: number;
  color: string;
  icon: string | null;
  sort_order: number;
};

type SpinResult = {
  success: boolean;
  segment_id: string;
  label: string;
  reward_type: string;
  reward_amount: number;
  is_free: boolean;
  cost: number;
};

export function SpinWheelCard() {
  const { user } = useAuth();
  const uid = user?.id;
  const qc = useQueryClient();
  const wheelRef = useRef<HTMLDivElement>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [lastWin, setLastWin] = useState<SpinResult | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const data = useQuery({
    enabled: !!uid,
    queryKey: ["spin-wheel", uid, today],
    queryFn: async () => {
      const [segs, settings, todayHistory] = await Promise.all([
        supabase.from("spin_wheel_config").select("*").eq("is_active", true).order("sort_order"),
        supabase.from("spin_settings").select("*").eq("id", 1).maybeSingle(),
        supabase
          .from("spin_history")
          .select("id, is_free")
          .eq("user_id", uid!)
          .eq("spin_date", today),
      ]);
      return {
        segments: (segs.data ?? []) as Segment[],
        settings: settings.data,
        spinsToday: (todayHistory.data ?? []).length,
        freeUsed: (todayHistory.data ?? []).filter((h) => h.is_free).length,
      };
    },
  });

  const segments = data.data?.segments ?? [];
  const settings = data.data?.settings;
  const spinsToday = data.data?.spinsToday ?? 0;
  const freeUsed = data.data?.freeUsed ?? 0;
  const freeRemaining = Math.max(0, (settings?.free_spins_per_day ?? 1) - freeUsed);
  const spinsRemaining = Math.max(0, (settings?.max_spins_per_day ?? 5) - spinsToday);
  const isFree = freeRemaining > 0;
  const cost = isFree ? 0 : Number(settings?.extra_spin_cost_bac ?? 0);

  const segCount = segments.length || 1;
  const segAngle = 360 / segCount;

  const conicGradient = useMemo(() => {
    if (segments.length === 0) return "conic-gradient(#333 0deg, #444 360deg)";
    const stops = segments
      .map((s, i) => `${s.color} ${i * segAngle}deg ${(i + 1) * segAngle}deg`)
      .join(", ");
    return `conic-gradient(from -${segAngle / 2}deg, ${stops})`;
  }, [segments, segAngle]);

  const spin = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("perform_spin");
      if (error) throw error;
      return data as unknown as SpinResult;
    },
    onSuccess: (res) => {
      const idx = segments.findIndex((s) => s.id === res.segment_id);
      if (idx >= 0) {
        const targetDeg = idx * segAngle;
        const fullSpins = 6;
        const finalRotation = rotation + fullSpins * 360 + (360 - targetDeg);
        setSpinning(true);
        setRotation(finalRotation);
        setTimeout(() => {
          setSpinning(false);
          setLastWin(res);
          if (res.reward_amount > 0) {
            toast.success(`🎉 You won ${res.reward_amount} BAC!`, { duration: 4000 });
          } else {
            toast.info("No win this time. Try again!");
          }
          qc.invalidateQueries({ queryKey: ["spin-wheel"] });
          qc.invalidateQueries({ queryKey: ["profile"] });
          qc.invalidateQueries({ queryKey: ["daily-quests"] });
        }, 5200);
      }
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setSpinning(false);
    },
  });

  if (!settings?.is_enabled) return null;

  return (
    <section className="hud-panel relative overflow-hidden p-5">
      <div aria-hidden className="absolute inset-0 -z-10 bg-gradient-to-br from-purple-900/15 via-background to-amber-900/10" />
      <div aria-hidden className="absolute inset-0 -z-10 bg-grid-hud opacity-10" />

      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-gold animate-pulse" />
          <h3 className="font-hud text-sm font-bold uppercase tracking-widest text-gold">
            Lucky Spin
          </h3>
        </div>
        <span className="font-mono text-[11px] text-foreground/60">
          {spinsRemaining} spins left today
        </span>
      </div>

      <div className="grid items-center gap-5 sm:grid-cols-[auto_1fr]">
        {/* WHEEL */}
        <div className="relative mx-auto h-64 w-64 sm:h-72 sm:w-72">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-gold via-amber-500 to-purple-600 p-1 shadow-[0_0_40px_rgba(255,215,0,0.4)] animate-[pulse_3s_ease-in-out_infinite]">
            <div className="h-full w-full rounded-full bg-background p-1">
              <div className="relative h-full w-full overflow-hidden rounded-full">
                {/* Spinning wheel */}
                <div
                  ref={wheelRef}
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: conicGradient,
                    transform: `rotate(${rotation}deg)`,
                    transition: spinning
                      ? "transform 5s cubic-bezier(0.17, 0.67, 0.21, 0.99)"
                      : "none",
                  }}
                >
                  {segments.map((s, i) => {
                    const angle = i * segAngle + segAngle / 2;
                    return (
                      <div
                        key={s.id}
                        className="absolute left-1/2 top-1/2 origin-left"
                        style={{
                          transform: `rotate(${angle}deg) translateY(-50%)`,
                          width: "50%",
                        }}
                      >
                        <div className="flex items-center justify-end gap-1 pr-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
                          <span className="text-lg">{s.icon ?? "🎁"}</span>
                          <span className="font-hud text-[10px] font-bold uppercase">
                            {s.label}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Center hub */}
                <div className="absolute left-1/2 top-1/2 z-10 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-gold bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-gold/50">
                  <Zap className="h-7 w-7 text-background" fill="currentColor" />
                </div>
              </div>
            </div>
          </div>
          {/* Pointer */}
          <div className="absolute -top-2 left-1/2 z-20 -translate-x-1/2">
            <div className="h-0 w-0 border-l-[14px] border-r-[14px] border-t-[24px] border-l-transparent border-r-transparent border-t-red-500 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
          </div>
        </div>

        {/* CONTROLS */}
        <div className="space-y-3">
          <div className="rounded-md border border-border/40 bg-background/50 p-3">
            <div className="flex items-baseline justify-between">
              <span className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                Next Spin
              </span>
              {isFree ? (
                <span className="rounded bg-emerald-500/20 px-2 py-0.5 font-hud text-[10px] uppercase text-emerald-300">
                  Free
                </span>
              ) : (
                <span className="flex items-center gap-1 font-mono text-xs text-amber-300">
                  <CoinIcon size={12} /> {cost}
                </span>
              )}
            </div>
            <p className="mt-1 font-mono text-[10px] text-foreground/55">
              Free remaining: {freeRemaining} · Total left: {spinsRemaining}
            </p>
          </div>

          <button
            onClick={() => spin.mutate()}
            disabled={spinning || spin.isPending || spinsRemaining === 0}
            className="btn-gamey relative w-full overflow-hidden px-5 py-3 text-sm font-bold uppercase tracking-widest disabled:opacity-50"
          >
            {spinning || spin.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Spinning…
              </span>
            ) : spinsRemaining === 0 ? (
              "Limit Reached"
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Sparkles className="h-4 w-4" /> SPIN NOW
              </span>
            )}
          </button>

          {lastWin && !spinning && (
            <div className="animate-fade-in rounded-md border border-gold/40 bg-gold/10 p-3 text-center">
              <p className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                Last Win
              </p>
              <p className="mt-1 font-display text-lg font-bold text-gold">
                {lastWin.label}
              </p>
              {lastWin.reward_amount > 0 && (
                <p className="mt-0.5 font-mono text-xs text-emerald-300">
                  +{lastWin.reward_amount} BAC credited
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
