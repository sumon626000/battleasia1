import { useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, Tag, CheckCircle2, XCircle, Clock, ShoppingBag, Sparkles, Vault as VaultIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { CoinIcon } from "@/components/site/CoinIcon";

export const Route = createFileRoute("/_authenticated/dashboard/shop")({
  head: () => ({ meta: [{ title: "BAC Shop — Battle Asia" }] }),
  component: ShopPage,
});

type Category = { id: number; name: string; slug: string };
type Pkg = {
  id: number; title: string; bac_amount: number; price_currency: string;
  price_value: number; discount_percentage: number | null; category_id: number | null; image_url: string | null;
};

function ShopPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeCat, setActiveCat] = useState<number | "all">("all");
  const [buying, setBuying] = useState<Pkg | null>(null);

  const cats = useQuery({
    queryKey: ["shop-cats"],
    queryFn: async () => {
      const { data } = await supabase.from("shop_categories").select("*").is("deleted_at", null).order("sort_order");
      return (data ?? []) as Category[];
    },
  });

  const packs = useQuery({
    queryKey: ["shop-packages"],
    queryFn: async () => {
      const { data } = await supabase
        .from("shop_packages").select("*").eq("is_active", true).is("deleted_at", null).order("sort_order");
      return (data ?? []) as Pkg[];
    },
  });

  const filtered = useMemo(() => {
    if (!packs.data) return [];
    return activeCat === "all" ? packs.data : packs.data.filter((p) => p.category_id === activeCat);
  }, [packs.data, activeCat]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="hud-panel relative overflow-hidden p-5 sm:p-6">
        <div className="absolute inset-0 -z-10 bg-grid-hud opacity-30" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="font-hud text-[10px] uppercase tracking-[0.3em] text-foreground/60">// SHOP_01</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-wide sm:text-3xl">
              BAC <span className="text-gold">SHOP</span>
            </h1>
            <p className="mt-1 text-xs text-foreground/60">Top up BAC Coins instantly with curated combat packs.</p>
          </div>
          <ShoppingBag className="text-gold" size={36} />
        </div>

        <button
          type="button"
          onClick={() => navigate({ to: "/dashboard/vault" })}
          className="btn-gold mt-5 flex w-full items-center justify-center gap-2 px-5 py-3 text-sm sm:w-auto"
        >
          <VaultIcon size={16} />
          GET BAC COIN · DEPOSIT / WITHDRAW
        </button>
        <p className="mt-2 font-hud text-[10px] uppercase tracking-widest text-foreground/50">
          Secured by password re-verification
        </p>
      </section>

      {/* Category filter */}
      <div className="hud-panel flex gap-1 overflow-x-auto p-1">
        <CatBtn active={activeCat === "all"} onClick={() => setActiveCat("all")}>All</CatBtn>
        {(cats.data ?? []).map((c) => (
          <CatBtn key={c.id} active={activeCat === c.id} onClick={() => setActiveCat(c.id)}>{c.name}</CatBtn>
        ))}
      </div>

      {/* Grid */}
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((p) => <PackCard key={p.id} pkg={p} onBuy={() => setBuying(p)} />)}
        {packs.isLoading && <div className="col-span-full py-8 text-center text-foreground/40">Loading packs...</div>}
        {!packs.isLoading && !filtered.length && (
          <div className="col-span-full py-8 text-center font-hud text-xs tracking-widest text-foreground/40">
            NO PACKS IN THIS CATEGORY
          </div>
        )}
      </section>

      {/* History */}
      <PurchaseHistory userId={user?.id} />

      {/* Buy modal */}
      {buying && <BuyModal pkg={buying} onClose={() => setBuying(null)} />}
    </div>
  );
}

function CatBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`whitespace-nowrap rounded-sm px-3 py-1.5 font-hud text-[10px] font-bold uppercase tracking-wider transition sm:text-xs ${
        active ? "bg-gold text-background" : "text-foreground/70 hover:text-gold"
      }`}
    >
      {children}
    </button>
  );
}

function PackCard({ pkg, onBuy }: { pkg: Pkg; onBuy: () => void }) {
  const hasDiscount = (pkg.discount_percentage ?? 0) > 0;
  const original = hasDiscount
    ? Math.round(Number(pkg.price_value) / (1 - (pkg.discount_percentage ?? 0) / 100))
    : null;

  return (
    <div className="hud-panel relative flex flex-col overflow-hidden p-4 transition hover:border-gold/60">
      {hasDiscount && (
        <div className="absolute right-2 top-2 flex items-center gap-1 rounded-sm bg-gold px-1.5 py-0.5 font-hud text-[9px] font-bold text-background">
          <Tag size={9} /> -{pkg.discount_percentage}%
        </div>
      )}
      <div className="flex items-center justify-center py-3">
        <div className="relative">
          <CoinIcon size={64} />
          <Sparkles className="absolute -right-2 -top-1 text-gold/60" size={14} />
        </div>
      </div>
      <h3 className="font-display text-base font-bold uppercase tracking-wide">{pkg.title}</h3>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="font-mono text-xl font-bold text-gold">{pkg.bac_amount.toLocaleString()}</span>
        <span className="font-hud text-[10px] tracking-widest text-foreground/60">BAC</span>
      </div>
      <div className="mt-3 flex items-baseline gap-2 border-t border-border/40 pt-2">
        <span className="font-mono text-sm font-bold">{pkg.price_currency} {Number(pkg.price_value).toLocaleString()}</span>
        {original && <span className="font-mono text-[10px] text-foreground/40 line-through">{original.toLocaleString()}</span>}
      </div>
      <button onClick={onBuy} className="btn-gold mt-3 w-full text-xs">BUY NOW</button>
    </div>
  );
}

/* ---------- Buy Modal ---------- */
function BuyModal({ pkg, onClose }: { pkg: Pkg; onClose: () => void }) {
  const qc = useQueryClient();
  const channels = useQuery({
    queryKey: ["payment-channels"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_channels").select("*").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });

  const [channelId, setChannelId] = useState<number | null>(null);
  const wallets = useQuery({
    queryKey: ["business-wallets", channelId],
    enabled: !!channelId,
    queryFn: async () => {
      const { data } = await supabase.from("business_wallets").select("*").eq("payment_channel_id", channelId!).eq("is_active", true);
      return data ?? [];
    },
  });
  const wallet = wallets.data?.[0];

  const [txId, setTxId] = useState("");
  const [sender, setSender] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!channelId || !wallet) return toast.error("Select a payment channel");
    setSubmitting(true);
    const { error } = await supabase.rpc("submit_shop_purchase", {
      p_package_id: pkg.id,
      p_payment_channel_id: channelId,
      p_business_wallet_id: wallet.id,
      p_transaction_id: txId.trim(),
      p_sender: sender.trim(),
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Purchase submitted. Awaiting admin approval.");
    qc.invalidateQueries({ queryKey: ["shop-purchases"] });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-3 backdrop-blur sm:items-center" onClick={onClose}>
      <div
        className="hud-panel max-h-[92vh] w-full max-w-lg overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">// PURCHASE</p>
            <h2 className="font-display text-xl font-bold uppercase">{pkg.title}</h2>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="font-mono text-lg font-bold text-gold">{pkg.bac_amount.toLocaleString()}</span>
              <span className="font-hud text-[10px] tracking-widest text-foreground/60">BAC</span>
              <span className="ml-2 font-mono text-sm">for {pkg.price_currency} {Number(pkg.price_value).toLocaleString()}</span>
            </div>
          </div>
          <button onClick={onClose} className="font-hud text-xs text-foreground/60 hover:text-gold">✕</button>
        </div>

        <div className="mt-4 grid gap-2">
          <label className="font-hud text-[10px] uppercase tracking-wider text-foreground/60">Payment Channel</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {(channels.data ?? []).map((c) => (
              <button
                key={c.id}
                onClick={() => setChannelId(c.id)}
                className={`hud-panel p-2 text-left transition ${
                  channelId === c.id ? "border-gold bg-gold/10" : "border-border/60 hover:border-gold/60"
                }`}
              >
                <div className="font-hud text-[11px] font-bold uppercase">{c.name}</div>
              </button>
            ))}
          </div>
        </div>

        {wallet && (
          <div className="mt-3 rounded-sm border border-gold/40 bg-gold/5 p-3">
            <div className="font-hud text-[10px] uppercase tracking-wider text-gold">Send To</div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <code className="break-all font-mono text-sm font-bold">{wallet.wallet_address}</code>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(wallet.wallet_address); toast.success("Copied"); }}
                className="rounded-sm border border-border/70 p-1.5 hover:border-gold"
                aria-label="Copy"
              >
                <Copy size={12} />
              </button>
            </div>
            {wallet.instruction && <div className="mt-2 text-[11px] text-foreground/70">{wallet.instruction}</div>}
          </div>
        )}

        <form onSubmit={submit} className="mt-4 grid gap-3">
          <label className="grid gap-1">
            <span className="font-hud text-[10px] uppercase tracking-wider text-foreground/60">Transaction ID</span>
            <input required value={txId} onChange={(e) => setTxId(e.target.value)} className={inputCls} placeholder="TrxID" />
          </label>
          <label className="grid gap-1">
            <span className="font-hud text-[10px] uppercase tracking-wider text-foreground/60">Sender Number / Address</span>
            <input required value={sender} onChange={(e) => setSender(e.target.value)} className={inputCls} placeholder="Your wallet number" />
          </label>
          <button type="submit" disabled={submitting || !channelId} className="btn-gold w-full">
            {submitting ? "SUBMITTING..." : "CONFIRM PURCHASE"}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ---------- History ---------- */
function PurchaseHistory({ userId }: { userId?: string }) {
  const q = useQuery({
    queryKey: ["shop-purchases", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("shop_purchases")
        .select("*, shop_packages(title)")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  return (
    <section className="hud-panel p-4">
      <h3 className="font-hud text-sm font-bold uppercase tracking-widest text-gold">Recent Purchases</h3>
      <div className="mt-3 space-y-2">
        {(q.data ?? []).map((p: any) => {
          const Icon = p.status === "Approved" ? CheckCircle2 : p.status === "Rejected" ? XCircle : Clock;
          const color = p.status === "Approved" ? "text-green-400" : p.status === "Rejected" ? "text-red-400" : "text-gold";
          return (
            <div key={p.id} className="flex items-center justify-between rounded-sm border border-border/60 bg-background/40 p-2.5">
              <div className="min-w-0">
                <div className="font-hud text-xs font-bold uppercase">{p.shop_packages?.title ?? "Pack"}</div>
                <div className="font-mono text-[11px] text-foreground/60">
                  {Number(p.bac_amount).toLocaleString()} BAC · {p.price_currency} {Number(p.price_value).toLocaleString()}
                </div>
                <div className="truncate text-[10px] text-foreground/40">TX: {p.transaction_id}</div>
              </div>
              <div className="text-right">
                <div className={`flex items-center justify-end gap-1 font-hud text-[10px] font-bold uppercase ${color}`}>
                  <Icon size={11} /> {p.status}
                </div>
                <div className="mt-0.5 text-[9px] text-foreground/40">{new Date(p.created_at).toLocaleDateString()}</div>
              </div>
            </div>
          );
        })}
        {!q.data?.length && (
          <div className="py-6 text-center font-hud text-xs tracking-widest text-foreground/40">NO PURCHASES YET</div>
        )}
      </div>
    </section>
  );
}

const inputCls =
  "h-10 rounded-sm border border-border/70 bg-background/60 px-3 font-mono text-sm outline-none transition focus:border-gold";
