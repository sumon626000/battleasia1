import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Crown, Check, Loader2, Shield, Zap, Star } from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";
import { format, isAfter } from "date-fns";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/dashboard/premium")({
  component: PremiumPage,
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="hud-panel p-6">
        <p className="text-destructive font-mono text-sm">Failed: {error.message}</p>
        <button className="mt-3 btn-outline-gold px-4 py-2 text-xs" onClick={() => { reset(); router.invalidate(); }}>RETRY</button>
      </div>
    );
  },
  notFoundComponent: () => <div className="hud-panel p-6 font-mono">Not found.</div>,
});

const TIER_META: Record<number, { name: string; icon: any; tag: string }> = {
  1: { name: "RECRUIT", icon: Shield, tag: "WEEKLY" },
  2: { name: "OPERATIVE", icon: Zap, tag: "MONTHLY" },
  3: { name: "ELITE", icon: Star, tag: "QUARTERLY" },
};

function PremiumPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const queryClient = useQueryClient();
  const [busy, setBusy] = useState<number | null>(null);

  const isActive = profile?.premium_expires_at && isAfter(new Date(profile.premium_expires_at), new Date());
  const balance = Number(profile?.bac_coin_balance ?? 0);

  const { data: plans, isLoading } = useQuery({
    queryKey: ["premium-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("premium_settings")
        .select("*")
        .eq("is_active", true)
        .order("duration_days", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: history } = useQuery({
    queryKey: ["premium-history", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("premium_histories")
        .select("id, type, price_bac, duration_days, started_at, expires_at, created_at")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  const purchase = async (planId: number, price: number) => {
    if (balance < price) {
      toast.error("Insufficient BAC. Top up your wallet first.");
      return;
    }
    if (!confirm(`Confirm purchase: ${price} BAC?`)) return;
    setBusy(planId);
    const { error } = await supabase.rpc("buy_premium", { p_plan_id: planId });
    setBusy(null);
    if (error) { toast.error(error.message); return; }
    toast.success(isActive ? "Premium extended!" : "Premium activated!");
    queryClient.invalidateQueries({ queryKey: ["premium-history"] });
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

  return (
    <div className="space-y-6">
      <header className="hud-panel p-5 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent">
        <div className="flex items-center gap-3">
          <Crown className="w-7 h-7 text-amber-400" />
          <div>
            <h1 className="font-display text-2xl tracking-wider">PREMIUM ACCESS</h1>
            <p className="font-mono text-xs text-muted-foreground uppercase">Unlock elite tournaments // priority ops</p>
          </div>
        </div>
      </header>

      {/* Current status */}
      <section className="hud-panel p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Current Status</p>
            {isActive ? (
              <p className="font-display text-xl text-amber-400 mt-1 flex items-center gap-2">
                <Crown className="w-5 h-5" /> ACTIVE
              </p>
            ) : (
              <p className="font-display text-xl text-muted-foreground mt-1">INACTIVE</p>
            )}
          </div>
          {isActive && profile?.premium_expires_at && (
            <div className="text-right">
              <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Expires</p>
              <p className="font-display text-base text-foreground mt-1">
                {format(new Date(profile.premium_expires_at), "dd MMM yyyy, HH:mm")}
              </p>
            </div>
          )}
          <div className="text-right">
            <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">Your Balance</p>
            <p className="font-display text-base text-primary mt-1 flex items-center gap-1 justify-end">
              <CoinIcon className="w-4 h-4" /> {balance.toFixed(0)} BAC
            </p>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section>
        <h2 className="font-display tracking-wider text-sm mb-3 text-muted-foreground">CHOOSE YOUR TIER</h2>
        {isLoading ? (
          <div className="hud-panel p-10 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {plans?.map((p: any) => {
              const meta = TIER_META[p.id] ?? { name: `PLAN ${p.id}`, icon: Crown, tag: `${p.duration_days}D` };
              const Icon = meta.icon;
              const benefits = (p.benefits_text || "").split("\n").filter(Boolean);
              const featured = p.id === 2;
              const canAfford = balance >= p.price_bac;
              return (
                <div
                  key={p.id}
                  className={`hud-panel p-5 flex flex-col relative ${featured ? "border-amber-400/50 shadow-[0_0_30px_-10px_rgba(251,191,36,0.4)]" : ""}`}
                >
                  {featured && (
                    <span className="absolute -top-2 right-4 bg-amber-400 text-black font-mono text-[10px] px-2 py-0.5 uppercase tracking-wider">
                      Best Value
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${featured ? "text-amber-400" : "text-primary"}`} />
                    <h3 className="font-display text-lg tracking-wider">{meta.name}</h3>
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground uppercase mt-1">{meta.tag} · {p.duration_days} days</p>

                  <div className="my-4">
                    <div className="font-display text-3xl text-primary flex items-center gap-2">
                      <CoinIcon className="w-6 h-6" /> {p.price_bac}
                    </div>
                    <p className="font-mono text-[10px] text-muted-foreground uppercase">BAC / period</p>
                  </div>

                  <ul className="space-y-2 flex-1">
                    {benefits.map((b: string, i: number) => (
                      <li key={i} className="flex items-start gap-2 font-mono text-xs">
                        <Check className="w-3.5 h-3.5 text-emerald-400 mt-0.5 shrink-0" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    onClick={() => purchase(p.id, p.price_bac)}
                    disabled={busy === p.id || !canAfford}
                    className={`mt-5 py-2.5 text-xs font-display tracking-wider ${featured ? "btn-gold" : "btn-outline-gold"} disabled:opacity-50`}
                  >
                    {busy === p.id ? "PROCESSING..." :
                     !canAfford ? "INSUFFICIENT BAC" :
                     isActive ? "EXTEND" : "ACTIVATE"}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* History */}
      <section className="hud-panel p-5">
        <h2 className="font-display tracking-wider text-sm mb-3">PURCHASE HISTORY</h2>
        {!history?.length ? (
          <p className="font-mono text-xs text-muted-foreground text-center py-6 uppercase">No purchases yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {history.map((h: any) => (
              <li key={h.id} className="py-2 flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-xs uppercase">
                    {h.type} · {h.duration_days} days
                  </p>
                  <p className="font-mono text-[10px] text-muted-foreground">
                    {format(new Date(h.started_at), "dd MMM yyyy")} → {format(new Date(h.expires_at), "dd MMM yyyy")}
                  </p>
                </div>
                <div className="font-display text-sm text-primary flex items-center gap-1">
                  <CoinIcon className="w-3.5 h-3.5" /> {h.price_bac}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
