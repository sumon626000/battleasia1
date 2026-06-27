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

async function fetchShop() {
  const [pkgs, cats] = await Promise.all([
    supabase
      .from("shop_packages")
      .select("id,title,bac_amount,price_value,price_currency,discount_percentage,image_url,category_id,sort_order")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("shop_categories").select("id,name"),
  ]);
  if (pkgs.error) throw pkgs.error;
  const catMap = new Map<number, string>();
  (cats.data ?? []).forEach((c) => catMap.set(c.id, c.name));
  return { packages: pkgs.data ?? [], categories: catMap };
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
        {(data?.packages ?? []).map((p) => {
          const discount = Number(p.discount_percentage ?? 0);
          return (
            <div
              key={p.id}
              className="hud-panel group relative flex flex-col overflow-hidden rounded-md border border-border/60 bg-card/40 p-5 transition hover:border-gold/60"
            >
              {p.category_id && data?.categories.get(p.category_id) && (
                <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/50">
                  {data.categories.get(p.category_id)}
                </div>
              )}
              <h3 className="mt-1 font-display text-lg uppercase tracking-wide text-foreground">
                {p.title}
              </h3>

              {p.image_url && (
                <div className="relative my-5 grid place-items-center">
                  <div aria-hidden className="absolute h-32 w-32 rounded-full bg-gold/20 blur-3xl" />
                  <img
                    loading="lazy"
                    decoding="async"
                    src={p.image_url}
                    alt={p.title}
                    className="relative h-36 w-36 object-contain drop-shadow-[0_0_25px_rgba(245,193,66,0.35)] transition-transform duration-500 group-hover:scale-110 sm:h-44 sm:w-44"
                  />
                </div>
              )}

              <div className="mt-auto flex items-center gap-2">
                <CoinIcon className="h-6 w-6" />
                <span className="font-mono text-xl tabular-nums text-gold">
                  {Number(p.bac_amount).toLocaleString()}
                </span>
                {discount > 0 && (
                  <span className="font-hud text-[11px] uppercase tracking-widest text-emerald-400">
                    -{discount}%
                  </span>
                )}
              </div>
              <div className="mt-3 flex items-center justify-between">
                <span className="font-mono text-base">
                  {p.price_currency} {Number(p.price_value).toLocaleString()}
                </span>
                <Link to="/auth" className="btn-outline-gold px-3 py-1.5 text-xs">
                  <Lock className="mr-1 inline h-3 w-3" /> Sign in
                </Link>
              </div>
            </div>

          );
        })}
      </div>
    </div>
  );
}
