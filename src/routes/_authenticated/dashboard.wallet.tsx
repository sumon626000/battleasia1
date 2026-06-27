import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDownToLine, ArrowUpFromLine, History, Copy, Wallet as WalletIcon, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { CoinIcon } from "@/components/site/CoinIcon";

export const Route = createFileRoute("/_authenticated/dashboard/wallet")({
  head: () => ({ meta: [{ title: "Wallet — Battle Asia" }] }),
  component: WalletPage,
});

type Tab = "overview" | "deposit" | "withdraw" | "history";

function WalletPage() {
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const [tab, setTab] = useState<Tab>("overview");

  const balance = Number(profile?.bac_coin_balance ?? 0);

  const rates = useQuery({
    queryKey: ["coin-rates"],
    queryFn: async () => {
      const { data } = await supabase.from("coin_rates").select("*").eq("is_active", true);
      return data ?? [];
    },
  });

  const cfg = useQuery({
    queryKey: ["withdraw-config"],
    queryFn: async () => {
      const { data } = await supabase.from("withdraw_configs").select("*").order("id").limit(1).maybeSingle();
      return data;
    },
  });

  const withdrawablePct = Number(cfg.data?.withdraw_percentage ?? 100);
  const withdrawable = Math.floor((balance * withdrawablePct) / 100);

  return (
    <div className="space-y-5">
      {/* Header */}
      <section className="hud-panel relative overflow-hidden p-5 sm:p-6">
        <div className="absolute inset-0 -z-10 bg-grid-hud opacity-30" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="font-hud text-[10px] uppercase tracking-[0.3em] text-foreground/60">// WALLET_01</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-wide sm:text-3xl">
              BAC <span className="text-gold">WALLET</span>
            </h1>
          </div>
          <CoinIcon size={48} />
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <BalanceTile label="Available Balance" value={balance} accent />
          <BalanceTile label={`Withdrawable (${withdrawablePct}%)`} value={withdrawable} />
          <div className="hud-panel border-border/60 p-3">
            <div className="font-hud text-[10px] uppercase tracking-wider text-foreground/60">Conversion Rates</div>
            <div className="mt-2 space-y-1 font-mono text-xs">
              {(rates.data ?? []).map((r) => (
                <div key={r.id} className="flex justify-between">
                  <span className="text-foreground/70">1 {r.currency}</span>
                  <span className="text-gold">= {r.rate_per_coin} BAC</span>
                </div>
              ))}
              {!rates.data?.length && <div className="text-foreground/40">—</div>}
            </div>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="hud-panel grid grid-cols-4 gap-1 p-1">
        {([
          ["overview", "Overview", WalletIcon],
          ["deposit", "Deposit", ArrowDownToLine],
          ["withdraw", "Withdraw", ArrowUpFromLine],
          ["history", "History", History],
        ] as const).map(([key, label, Icon]) => (
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

      {tab === "overview" && <OverviewTab userId={user?.id} balance={balance} />}
      {tab === "deposit" && <DepositTab onDone={() => setTab("history")} />}
      {tab === "withdraw" && (
        <WithdrawTab balance={balance} withdrawable={withdrawable} cfg={cfg.data} onDone={() => setTab("history")} />
      )}
      {tab === "history" && <HistoryTab userId={user?.id} />}
    </div>
  );
}

function BalanceTile({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`hud-panel p-3 ${accent ? "border-gold/40" : "border-border/60"}`}>
      <div className="flex items-center justify-between">
        <span className="font-hud text-[10px] uppercase tracking-wider text-foreground/60">{label}</span>
        {accent && <CoinIcon size={14} />}
      </div>
      <div className={`mt-2 font-mono text-2xl font-bold tabular-nums ${accent ? "text-gold" : ""}`}>
        {value.toLocaleString()}
      </div>
      <div className="mt-0.5 font-hud text-[9px] tracking-widest text-foreground/40">BAC</div>
    </div>
  );
}

/* ------------- OVERVIEW ------------- */
function OverviewTab({ userId, balance }: { userId?: string; balance: number }) {
  const totals = useQuery({
    queryKey: ["wallet-totals", userId],
    enabled: !!userId,
    queryFn: async () => {
      const [dep, wd] = await Promise.all([
        supabase.from("deposits").select("bac_amount, status").eq("user_id", userId!),
        supabase.from("withdrawals").select("bac_amount, status").eq("user_id", userId!),
      ]);
      const deposited = (dep.data ?? []).filter((d) => d.status === "Approved").reduce((s, d) => s + Number(d.bac_amount), 0);
      const withdrawn = (wd.data ?? []).filter((d) => d.status === "Paid").reduce((s, d) => s + Number(d.bac_amount), 0);
      const pendingDep = (dep.data ?? []).filter((d) => d.status === "Pending").length;
      const pendingWd = (wd.data ?? []).filter((d) => d.status === "Pending").length;
      return { deposited, withdrawn, pendingDep, pendingWd };
    },
  });

  const t = totals.data;
  return (
    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Total Deposited" value={t?.deposited ?? 0} suffix="BAC" />
      <StatCard label="Total Withdrawn" value={t?.withdrawn ?? 0} suffix="BAC" />
      <StatCard label="Pending Deposits" value={t?.pendingDep ?? 0} />
      <StatCard label="Pending Withdrawals" value={t?.pendingWd ?? 0} />
      <div className="hud-panel p-4 sm:col-span-2 lg:col-span-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 text-gold" size={16} />
          <div className="text-xs text-foreground/70">
            Balance is updated in real-time. Deposits require admin approval. Withdrawals are processed within 24 hours.
            Current balance: <span className="font-mono font-bold text-gold">{balance.toLocaleString()} BAC</span>.
          </div>
        </div>
      </div>
    </section>
  );
}

function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <div className="hud-panel p-3">
      <div className="font-hud text-[10px] uppercase tracking-wider text-foreground/60">{label}</div>
      <div className="mt-2 font-mono text-xl font-bold tabular-nums">
        {value.toLocaleString()} {suffix && <span className="text-[10px] text-foreground/50">{suffix}</span>}
      </div>
    </div>
  );
}

/* ------------- DEPOSIT ------------- */
function DepositTab({ onDone }: { onDone: () => void }) {
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

  const [fiatAmount, setFiatAmount] = useState("");
  const [bacAmount, setBacAmount] = useState("");
  const [txId, setTxId] = useState("");
  const [sender, setSender] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!channelId || !wallet) return toast.error("Select a payment channel");
    setSubmitting(true);
    const { error } = await supabase.rpc("submit_deposit", {
      p_payment_channel_id: channelId,
      p_business_wallet_id: wallet.id,
      p_bac_amount: Number(bacAmount),
      p_currency: wallet.currency,
      p_fiat_amount: Number(fiatAmount),
      p_transaction_id: txId.trim(),
      p_sender: sender.trim(),
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Deposit submitted. Awaiting admin approval.");
    setFiatAmount(""); setBacAmount(""); setTxId(""); setSender("");
    qc.invalidateQueries({ queryKey: ["wallet-totals"] });
    qc.invalidateQueries({ queryKey: ["balance-history"] });
    onDone();
  }

  return (
    <section className="hud-panel p-5">
      <h2 className="font-hud text-sm font-bold uppercase tracking-widest text-gold">Buy BAC Coin</h2>
      <p className="mt-1 text-xs text-foreground/60">Send fiat to our business wallet, then submit the transaction ID below.</p>

      <div className="mt-4 grid gap-2">
        <label className="font-hud text-[10px] uppercase tracking-wider text-foreground/60">Payment Channel</label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(channels.data ?? []).map((c) => (
            <button
              key={c.id}
              onClick={() => setChannelId(c.id)}
              className={`hud-panel p-3 text-left transition ${
                channelId === c.id ? "border-gold bg-gold/10" : "border-border/60 hover:border-gold/60"
              }`}
            >
              <div className="font-hud text-xs font-bold uppercase">{c.name}</div>
              <div className="mt-0.5 text-[10px] text-foreground/60">{c.description}</div>
            </button>
          ))}
        </div>
      </div>

      {wallet && (
        <div className="mt-4 rounded-sm border border-gold/40 bg-gold/5 p-3">
          <div className="font-hud text-[10px] uppercase tracking-wider text-gold">Send To</div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <code className="break-all font-mono text-sm font-bold text-foreground">{wallet.wallet_address}</code>
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

      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label={`Amount (${wallet?.currency ?? "Fiat"})`}>
          <input type="number" min="1" required value={fiatAmount} onChange={(e) => setFiatAmount(e.target.value)} className={inputCls} />
        </Field>
        <Field label="BAC Coins to Receive">
          <input type="number" min="1" required value={bacAmount} onChange={(e) => setBacAmount(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Transaction ID">
          <input required value={txId} onChange={(e) => setTxId(e.target.value)} className={inputCls} placeholder="TrxID from bKash/Nagad/etc." />
        </Field>
        <Field label="Sender Number / Address">
          <input required value={sender} onChange={(e) => setSender(e.target.value)} className={inputCls} placeholder="Your wallet number" />
        </Field>
        <div className="sm:col-span-2">
          <button type="submit" disabled={submitting || !channelId} className="btn-gold w-full">
            {submitting ? "SUBMITTING..." : "SUBMIT DEPOSIT"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* ------------- WITHDRAW ------------- */
function WithdrawTab({
  balance, withdrawable, cfg, onDone,
}: { balance: number; withdrawable: number; cfg: any; onDone: () => void }) {
  const qc = useQueryClient();
  const channels = useQuery({
    queryKey: ["payment-channels"],
    queryFn: async () => {
      const { data } = await supabase.from("payment_channels").select("*").eq("is_active", true).order("sort_order");
      return data ?? [];
    },
  });
  const [channelId, setChannelId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [addr, setAddr] = useState("");
  const [currency, setCurrency] = useState("BDT");
  const [submitting, setSubmitting] = useState(false);

  const fee = useMemo(() => {
    const amt = Number(amount) || 0;
    if (!cfg) return 0;
    if (cfg.fee_type === "fixed") return Number(cfg.fee_value);
    if (cfg.fee_type === "percentage") return Math.round((amt * Number(cfg.fee_value || 0)) / 100);
    return 0;
  }, [amount, cfg]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!channelId) return toast.error("Select payment channel");
    setSubmitting(true);
    const { error } = await supabase.rpc("submit_withdrawal", {
      p_bac: Number(amount),
      p_payment_channel_id: channelId,
      p_wallet_address: addr.trim(),
      p_currency: currency,
    });
    setSubmitting(false);
    if (error) return toast.error(error.message);
    toast.success("Withdrawal request submitted");
    setAmount(""); setAddr("");
    qc.invalidateQueries({ queryKey: ["wallet-totals"] });
    qc.invalidateQueries({ queryKey: ["balance-history"] });
    onDone();
  }

  return (
    <section className="hud-panel p-5">
      <h2 className="font-hud text-sm font-bold uppercase tracking-widest text-gold">Withdraw BAC</h2>
      <div className="mt-1 grid gap-1 text-xs text-foreground/60">
        <div>Available: <span className="font-mono font-bold text-foreground">{balance.toLocaleString()} BAC</span></div>
        <div>Withdrawable: <span className="font-mono font-bold text-gold">{withdrawable.toLocaleString()} BAC</span></div>
        {cfg && (
          <div>
            Limits: <span className="font-mono">{cfg.min_bac}–{cfg.max_bac} BAC</span>{" "}
            · Fee: <span className="font-mono">{cfg.fee_value}{cfg.fee_type === "percentage" ? "%" : " BAC"}</span>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-2">
        <label className="font-hud text-[10px] uppercase tracking-wider text-foreground/60">Payout Channel</label>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {(channels.data ?? []).map((c) => (
            <button
              key={c.id}
              onClick={() => setChannelId(c.id)}
              className={`hud-panel p-3 text-left transition ${
                channelId === c.id ? "border-gold bg-gold/10" : "border-border/60 hover:border-gold/60"
              }`}
            >
              <div className="font-hud text-xs font-bold uppercase">{c.name}</div>
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Amount (BAC)">
          <input
            type="number"
            min={cfg?.min_bac ?? 1}
            max={Math.min(withdrawable, cfg?.max_bac ?? withdrawable)}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputCls}
          />
        </Field>
        <Field label="Currency">
          <select value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls}>
            <option value="BDT">BDT</option>
            <option value="INR">INR</option>
            <option value="USD">USD</option>
          </select>
        </Field>
        <Field label="Your Wallet Number / Address">
          <input required value={addr} onChange={(e) => setAddr(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Fee">
          <div className={`${inputCls} flex items-center font-mono text-gold`}>{fee.toLocaleString()} BAC</div>
        </Field>
        <div className="rounded-sm border border-border/60 bg-background/40 p-3 text-xs sm:col-span-2">
          <div className="flex justify-between"><span className="text-foreground/60">You receive (after fee):</span>
            <span className="font-mono font-bold text-gold">{Math.max(0, (Number(amount) || 0) - fee).toLocaleString()} BAC</span></div>
        </div>
        <div className="sm:col-span-2">
          <button type="submit" disabled={submitting || !channelId} className="btn-gold w-full">
            {submitting ? "PROCESSING..." : "REQUEST WITHDRAWAL"}
          </button>
        </div>
      </form>
    </section>
  );
}

/* ------------- HISTORY ------------- */
function HistoryTab({ userId }: { userId?: string }) {
  const logs = useQuery({
    queryKey: ["balance-history", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("balance_logs")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const deposits = useQuery({
    queryKey: ["deposits-history", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("deposits").select("*").eq("user_id", userId!)
        .order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  const withdrawals = useQuery({
    queryKey: ["withdrawals-history", userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data } = await supabase
        .from("withdrawals").select("*").eq("user_id", userId!)
        .order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
  });

  return (
    <section className="grid gap-4 lg:grid-cols-2">
      <div className="hud-panel p-4">
        <h3 className="font-hud text-sm font-bold uppercase tracking-widest text-gold">Deposits</h3>
        <div className="mt-3 space-y-2">
          {(deposits.data ?? []).map((d) => (
            <RequestRow key={d.id} amount={Number(d.bac_amount)} status={d.status} when={d.created_at} note={`${d.currency} · TX: ${d.transaction_id}`} />
          ))}
          {!deposits.data?.length && <Empty />}
        </div>
      </div>

      <div className="hud-panel p-4">
        <h3 className="font-hud text-sm font-bold uppercase tracking-widest text-gold">Withdrawals</h3>
        <div className="mt-3 space-y-2">
          {(withdrawals.data ?? []).map((d) => (
            <RequestRow key={d.id} amount={Number(d.bac_amount)} status={d.status} when={d.created_at} note={`${d.currency} · ${d.wallet_address}`} />
          ))}
          {!withdrawals.data?.length && <Empty />}
        </div>
      </div>

      <div className="hud-panel p-4 lg:col-span-2">
        <h3 className="font-hud text-sm font-bold uppercase tracking-widest text-gold">Balance Logs</h3>
        <div className="mt-3 max-h-[400px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="font-hud text-[10px] uppercase tracking-wider text-foreground/60">
              <tr className="border-b border-border/60 text-left">
                <th className="py-2">Date</th><th>Type</th><th>Change</th><th>Balance</th><th>Note</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {(logs.data ?? []).map((l) => (
                <tr key={l.id} className="border-b border-border/30">
                  <td className="py-2 text-foreground/60">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="uppercase">{l.type}</td>
                  <td className={Number(l.amount_bac) >= 0 ? "text-green-400" : "text-red-400"}>
                    {Number(l.amount_bac) >= 0 ? "+" : ""}{Number(l.amount_bac).toLocaleString()}
                  </td>
                  <td className="text-gold">{Number(l.balance_after).toLocaleString()}</td>
                  <td className="text-foreground/60">{l.note ?? "—"}</td>
                </tr>
              ))}
              {!logs.data?.length && <tr><td colSpan={5} className="py-6 text-center text-foreground/40">No transactions yet</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function RequestRow({ amount, status, when, note }: { amount: number; status: string; when: string; note: string }) {
  const Icon = status === "Approved" || status === "Paid" ? CheckCircle2 : status === "Rejected" ? XCircle : Clock;
  const color = status === "Approved" || status === "Paid" ? "text-green-400" : status === "Rejected" ? "text-red-400" : "text-gold";
  return (
    <div className="flex items-center justify-between rounded-sm border border-border/60 bg-background/40 p-2.5">
      <div className="min-w-0">
        <div className="font-mono text-sm font-bold">{amount.toLocaleString()} BAC</div>
        <div className="truncate text-[10px] text-foreground/60">{note}</div>
      </div>
      <div className="text-right">
        <div className={`flex items-center justify-end gap-1 font-hud text-[10px] font-bold uppercase ${color}`}>
          <Icon size={11} /> {status}
        </div>
        <div className="mt-0.5 text-[9px] text-foreground/40">{new Date(when).toLocaleDateString()}</div>
      </div>
    </div>
  );
}

function Empty() {
  return <div className="py-6 text-center font-hud text-xs tracking-widest text-foreground/40">NO RECORDS</div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1">
      <span className="font-hud text-[10px] uppercase tracking-wider text-foreground/60">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  "h-10 rounded-sm border border-border/70 bg-background/60 px-3 font-mono text-sm outline-none transition focus:border-gold";
