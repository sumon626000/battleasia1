import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Vault as VaultIcon,
  Lock,
  ShoppingBag,
  ArrowDownToLine,
  ArrowUpFromLine,
  History,
  ShieldCheck,
  LogOut,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { CoinIcon } from "@/components/site/CoinIcon";
import { DepositTab, WithdrawTab, HistoryTab } from "./dashboard.wallet";

export const Route = createFileRoute("/_authenticated/dashboard/vault")({
  head: () => ({ meta: [{ title: "BAC Vault — Battle Asia" }] }),
  component: VaultPage,
});

const UNLOCK_KEY = "ba_vault_unlocked_at";
const UNLOCK_TTL_MS = 15 * 60 * 1000; // 15 minutes

function isUnlocked(): boolean {
  if (typeof window === "undefined") return false;
  const at = Number(window.sessionStorage.getItem(UNLOCK_KEY) || 0);
  return at > 0 && Date.now() - at < UNLOCK_TTL_MS;
}

type Tab = "shop" | "deposit" | "withdraw" | "history";

function VaultPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const [unlocked, setUnlocked] = useState<boolean>(() => isUnlocked());
  const [tab, setTab] = useState<Tab>("shop");

  // re-check unlock state on mount/visibility
  useEffect(() => {
    const tick = () => setUnlocked(isUnlocked());
    window.addEventListener("focus", tick);
    return () => window.removeEventListener("focus", tick);
  }, []);

  const balance = Number(profile?.bac_coin_balance ?? 0);

  const cfg = useQuery({
    queryKey: ["withdraw-config"],
    queryFn: async () => {
      const { data } = await supabase
        .from("withdraw_configs")
        .select("*")
        .order("id")
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: unlocked,
  });

  const withdrawablePct = Number(cfg.data?.withdraw_percentage ?? 100);
  const withdrawable = Math.floor((balance * withdrawablePct) / 100);

  if (!unlocked) {
    return <ReAuthGate email={user?.email ?? ""} onSuccess={() => setUnlocked(true)} />;
  }

  return (
    <div className="space-y-5">
      <section className="hud-panel relative overflow-hidden p-5 sm:p-6">
        <div className="absolute inset-0 -z-10 bg-grid-hud opacity-30" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="font-hud text-[10px] uppercase tracking-[0.3em] text-foreground/60">
              // VAULT_01 · SECURE ZONE
            </p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-wide sm:text-3xl">
              BAC <span className="text-gold">VAULT</span>
            </h1>
            <p className="mt-1 text-xs text-foreground/60">
              Coin Shop, Deposit, Withdraw &amp; Balance History — all in one secure zone.
            </p>
          </div>
          <VaultIcon size={44} className="text-gold" />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <Tile label="Available Balance" value={balance} accent />
          <Tile label={`Withdrawable (${withdrawablePct}%)`} value={withdrawable} />
          <button
            type="button"
            onClick={() => {
              window.sessionStorage.removeItem(UNLOCK_KEY);
              setUnlocked(false);
              toast.success("Vault locked");
            }}
            className="hud-panel flex items-center justify-center gap-2 p-3 font-hud text-[11px] font-bold uppercase tracking-widest text-foreground/70 transition hover:border-destructive/60 hover:text-destructive"
          >
            <LogOut size={14} /> Lock Vault
          </button>
        </div>
      </section>

      <div className="hud-panel grid grid-cols-4 gap-1 p-1">
        {(
          [
            ["shop", "Coin Shop", ShoppingBag],
            ["deposit", "Deposit", ArrowDownToLine],
            ["withdraw", "Withdraw", ArrowUpFromLine],
            ["history", "History", History],
          ] as const
        ).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center justify-center gap-1.5 rounded-sm px-2 py-2 font-hud text-[10px] font-bold uppercase tracking-wider transition sm:text-xs ${
              tab === key ? "bg-gold text-background" : "text-foreground/70 hover:text-gold"
            }`}
          >
            <Icon size={12} />
            <span className="hidden xs:inline sm:inline">{label}</span>
          </button>
        ))}
      </div>

      {tab === "shop" && <ShopRedirect />}
      {tab === "deposit" && <DepositTab onDone={() => setTab("history")} />}
      {tab === "withdraw" && (
        <WithdrawTab
          balance={balance}
          withdrawable={withdrawable}
          cfg={cfg.data}
          onDone={() => setTab("history")}
        />
      )}
      {tab === "history" && <HistoryTab userId={user?.id} />}
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`hud-panel p-3 ${accent ? "border-gold/40" : "border-border/60"}`}>
      <div className="flex items-center justify-between">
        <span className="font-hud text-[10px] uppercase tracking-wider text-foreground/60">
          {label}
        </span>
        {accent && <CoinIcon size={14} />}
      </div>
      <div className={`mt-2 font-mono text-2xl font-bold tabular-nums ${accent ? "text-gold" : ""}`}>
        {value.toLocaleString()}
      </div>
      <div className="mt-0.5 font-hud text-[9px] tracking-widest text-foreground/40">BAC</div>
    </div>
  );
}

function ShopRedirect() {
  const navigate = useNavigate();
  return (
    <section className="hud-panel p-6 text-center">
      <ShoppingBag size={32} className="mx-auto text-gold" />
      <h3 className="mt-3 font-display text-lg uppercase tracking-wide">Coin Packs</h3>
      <p className="mt-1 text-xs text-foreground/60">
        Browse curated BAC coin packs and bundles.
      </p>
      <button
        type="button"
        onClick={() => navigate({ to: "/dashboard/shop" })}
        className="btn-gold mx-auto mt-4 px-6 text-xs"
      >
        OPEN COIN SHOP
      </button>
    </section>
  );
}

/* ---------------- Re-Auth Gate ---------------- */
function ReAuthGate({ email, onSuccess }: { email: string; onSuccess: () => void }) {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return toast.error("Session error. Please sign in again.");
    if (!password) return toast.error("Enter your password");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error("Incorrect password");
      return;
    }
    window.sessionStorage.setItem(UNLOCK_KEY, String(Date.now()));
    toast.success("Vault unlocked");
    onSuccess();
  }

  return (
    <div className="mx-auto max-w-md space-y-5">
      <section className="hud-panel relative overflow-hidden p-6 text-center">
        <div className="absolute inset-0 -z-10 bg-grid-hud opacity-30" />
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-gold/40 bg-gold/10">
          <Lock size={26} className="text-gold" />
        </div>
        <h1 className="mt-4 font-display text-2xl uppercase tracking-wide">
          SECURE <span className="text-gold">VAULT</span>
        </h1>
        <p className="mt-1 text-xs text-foreground/60">
          For your safety, please re-enter your password to access deposits, withdrawals &amp;
          balance history.
        </p>
      </section>

      <form onSubmit={submit} className="hud-panel space-y-3 p-5">
        <div>
          <label className="font-hud text-[10px] uppercase tracking-wider text-foreground/60">
            Account Email
          </label>
          <input
            type="email"
            value={email}
            disabled
            className="mt-1 h-10 w-full rounded-sm border border-border/70 bg-background/40 px-3 font-mono text-sm text-foreground/60"
          />
        </div>
        <div>
          <label className="font-hud text-[10px] uppercase tracking-wider text-foreground/60">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            autoComplete="current-password"
            className="mt-1 h-10 w-full rounded-sm border border-border/70 bg-background/60 px-3 font-mono text-sm outline-none transition focus:border-gold"
            placeholder="••••••••"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-gold w-full">
          {loading ? "VERIFYING..." : "UNLOCK VAULT"}
        </button>
        <div className="flex items-center justify-center gap-1.5 pt-1 font-hud text-[10px] uppercase tracking-widest text-foreground/50">
          <ShieldCheck size={11} className="text-gold/70" />
          Session unlocks for 15 minutes
        </div>
      </form>
    </div>
  );
}
