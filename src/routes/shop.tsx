import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CoinIcon } from "@/components/site/CoinIcon";
import { ShoppingBag, Lock } from "lucide-react";

export const Route = createFileRoute("/shop")({
  head: () => ({
    meta: [
      { title: "Coin Shop — Battle Asia" },
      { name: "description", content: "Browse BAC coin packages and premium bundles on Battle Asia." },
      { property: "og:title", content: "Coin Shop — Battle Asia" },
      { property: "og:description", content: "Top up BAC. Unlock premium." },
    ],
  }),
  component: PublicShop,
});

type Pkg = {
  id: string;
  name: string;
  description: string | null;
  coin_amount: number | null;
  bonus_coins: number | null;
  price: number | null;
  currency: string | null;
  is_featured: boolean | null;
  category_id: string | null;
};
type Cat = { id: string; name: string };

async function fetchShop() {
  const [pkgs, cats] = await Promise.all([
    supabase
      .from("shop_packages")
      .select("id,name,description,coin_amount,bonus_coins,price,currency,is_featured,category_id")
      .eq("is_active", true)
      .order("price", { ascending: true }),
    supabase.from("shop_categories").select("id,name").eq("is_active", true),
  ]);
  if (pkgs.error) throw pkgs.error;
  return {
    packages: (pkgs.data ?? []) as Pkg[],
    categories: new Map(((cats.data ?? []) as Cat[]).map((c) => [c.id, c.name])),
  };
}

function PublicShop() {
  const { data, isLoading } = useQuery({ queryKey: ["public-shop"], queryFn: fetchShop });

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-8 hud-panel rounded-md border border-gold/30 bg-card/40 p-6">
        <div className="flex items-center gap-3">
          <ShoppingBag className="h-6 w-6 text-gold" />
          <h1 className="font-display text-3xl uppercase tracking-[0.2em] text-gold">Coin Shop</h1>
        </div>
        <p className="mt-2 font-hud text-xs uppercase tracking-widest text-foreground/60">
          Browse BAC packages — sign in to purchase.
        </p>
      </div>

      {isLoading && <p className="text-center text-foreground/50">Loading…</p>}
      {!isLoading && (data?.packages ?? []).length === 0 && (
        <p className="text-center text-foreground/50">No packages available yet.</p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.packages ?? []).map((p) => (
          <div
            key={p.id}
            className={`hud-panel rounded-md border bg-card/40 p-5 transition hover:border-gold/60 ${
              p.is_featured ? "border-gold/60" : "border-border/60"
            }`}
          >
            {p.is_featured && (
              <span className="mb-2 inline-block rounded bg-gold/20 px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest text-gold">
                Featured
              </span>
            )}
            {p.category_id && data?.categories.get(p.category_id) && (
              <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/50">
                {data.categories.get(p.category_id)}
              </div>
            )}
            <h3 className="mt-1 font-display text-lg uppercase tracking-wide text-foreground">{p.name}</h3>
            {p.description && (
              <p className="mt-1 line-clamp-2 text-sm text-foreground/70">{p.description}</p>
            )}
            <div className="mt-4 flex items-center gap-2">
              <CoinIcon className="h-6 w-6" />
              <span className="font-mono text-xl tabular-nums text-gold">
                {Number(p.coin_amount ?? 0).toLocaleString()}
              </span>
              {p.bonus_coins ? (
                <span className="font-hud text-[11px] uppercase tracking-widest text-emerald-400">
                  +{p.bonus_coins} bonus
                </span>
              ) : null}
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-mono text-base">
                {p.currency ?? "USD"} {Number(p.price ?? 0).toLocaleString()}
              </span>
              <Link to="/auth" className="btn-outline-gold px-3 py-1.5 text-xs">
                <Lock className="mr-1 inline h-3 w-3" /> Sign in
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
