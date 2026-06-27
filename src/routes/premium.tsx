import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CoinIcon } from "@/components/site/CoinIcon";
import { Crown, Check, Lock } from "lucide-react";

export const Route = createFileRoute("/premium")({
  head: () => ({
    meta: [
      { title: "Premium Membership — Battle Asia" },
      { name: "description", content: "Unlock exclusive matches, lower fees, and elite perks with Battle Asia Premium." },
      { property: "og:title", content: "Battle Asia Premium" },
      { property: "og:description", content: "Elite perks for serious competitors." },
    ],
  }),
  component: PublicPremium,
});

async function fetchPlans() {
  const { data, error } = await supabase
    .from("premium_settings")
    .select("id,duration_days,price_bac,benefits_text,is_active")
    .eq("is_active", true)
    .order("duration_days", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function PublicPremium() {
  const { data, isLoading } = useQuery({ queryKey: ["public-premium"], queryFn: fetchPlans });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <div className="hud-panel rounded-md border border-gold/40 bg-gradient-to-br from-gold/10 to-transparent p-6">
        <div className="flex items-center gap-3">
          <Crown className="h-7 w-7 text-gold" />
          <h1 className="font-display text-3xl uppercase tracking-[0.2em] text-gold">Premium</h1>
        </div>
        <p className="mt-2 max-w-2xl font-hud text-xs uppercase tracking-widest text-foreground/70">
          Unlock exclusive matches, lower fees, priority support, and elite badges.
        </p>
      </div>

      {isLoading && <p className="mt-8 text-center text-foreground/50">Loading…</p>}
      {!isLoading && (data ?? []).length === 0 && (
        <p className="mt-8 text-center text-foreground/50">No plans available yet.</p>
      )}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((p, i) => {
          const featured = i === 1;
          const benefits = (p.benefits_text ?? "")
            .split(/\n|,/)
            .map((s) => s.trim())
            .filter(Boolean);
          return (
            <div
              key={p.id}
              className={`hud-panel rounded-md border bg-card/40 p-6 transition ${
                featured ? "border-gold/70 ring-1 ring-gold/30" : "border-border/60"
              }`}
            >
              {featured && (
                <span className="mb-2 inline-block rounded bg-gold/20 px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest text-gold">
                  Most Popular
                </span>
              )}
              <div className="font-hud text-[11px] uppercase tracking-widest text-foreground/60">
                {p.duration_days} Days
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <CoinIcon className="h-7 w-7" />
                <span className="font-display text-3xl font-bold tabular-nums text-gold">
                  {Number(p.price_bac).toLocaleString()}
                </span>
                <span className="font-hud text-[10px] uppercase tracking-widest text-foreground/50">BAC</span>
              </div>
              {benefits.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {benefits.map((b, k) => (
                    <li key={k} className="flex gap-2 text-sm text-foreground/80">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
              <Link
                to="/auth"
                className={`mt-5 block w-full py-2 text-center text-sm ${
                  featured ? "btn-gold" : "btn-outline-gold"
                }`}
              >
                <Lock className="mr-1 inline h-3 w-3" /> Sign in to subscribe
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
