import React, { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowDownToLine, ArrowUpFromLine, ArrowRight, Clock, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CoinIcon } from "@/components/site/CoinIcon";

type Txn = {
  kind: "deposit" | "withdraw";
  id: number;
  amount: number;
  status: string;
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = Math.max(0, Date.now() - new Date(iso).getTime());
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const ok = s === "approved" || s === "completed" || s === "success" || s === "paid";
  const bad = s === "rejected" || s === "failed" || s === "cancelled" || s === "canceled";
  const Icon = ok ? CheckCircle2 : bad ? XCircle : Clock;
  const tone = ok
    ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300"
    : bad
      ? "border-destructive/40 bg-destructive/10 text-destructive"
      : "border-gold/40 bg-gold/10 text-gold";
  return (
    <span className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${tone}`}>
      <Icon size={9} /> {status}
    </span>
  );
}

export function QuickBalanceCard({ balance }: { balance: number }) {
  const { user } = useAuth();
  const [txns, setTxns] = useState<Txn[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      const [{ data: dep }, { data: wd }] = await Promise.all([
        supabase
          .from("deposits")
          .select("id,bac_amount,status,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3),
        supabase
          .from("withdrawals")
          .select("id,bac_amount,status,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(3),
      ]);
      const merged: Txn[] = [
        ...((dep ?? []).map((d) => ({
          kind: "deposit" as const,
          id: Number(d.id),
          amount: Number(d.bac_amount ?? 0),
          status: String(d.status ?? "pending"),
          created_at: String(d.created_at),
        }))),
        ...((wd ?? []).map((w) => ({
          kind: "withdraw" as const,
          id: Number(w.id),
          amount: Number(w.bac_amount ?? 0),
          status: String(w.status ?? "pending"),
          created_at: String(w.created_at),
        }))),
      ]
        .sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))
        .slice(0, 3);
      setTxns(merged);
    };
    load();
    const ch = supabase
      .channel(`qb-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "deposits", filter: `user_id=eq.${user.id}` }, load)
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawals", filter: `user_id=eq.${user.id}` }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  return (
    <div className="hud-panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
        <h2 className="font-hud text-xs font-bold uppercase tracking-widest text-foreground/80">
          Wallet
        </h2>
        <Link
          to="/dashboard/wallet"
          className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider text-gold/80 hover:text-gold"
        >
          Open <ArrowRight size={11} />
        </Link>
      </div>

      <div className="px-4 py-3">
        <div className="font-mono text-[10px] uppercase tracking-widest text-foreground/50">
          Available balance
        </div>
        <div className="mt-1 flex items-baseline gap-2">
          <CoinIcon className="h-5 w-5" />
          <span className="font-display text-2xl font-bold tabular-nums text-gold">
            {balance.toLocaleString()}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            to="/dashboard/wallet" search={{ tab: "deposit" }}
            className="hud-panel group flex items-center justify-center gap-2 border-emerald-400/30 bg-emerald-400/5 px-3 py-2.5 font-hud text-xs font-semibold uppercase tracking-wider text-emerald-300 transition-all hover:-translate-y-0.5 hover:border-emerald-400/60 hover:bg-emerald-400/10 hover:shadow-[0_8px_24px_-12px_rgba(52,211,153,0.55)]"
          >
            <ArrowDownToLine size={14} className="transition-transform group-hover:-translate-y-0.5" />
            Deposit
          </Link>
          <Link
            to="/dashboard/wallet" search={{ tab: "withdraw" }}
            className="hud-panel group flex items-center justify-center gap-2 border-gold/30 bg-gold/5 px-3 py-2.5 font-hud text-xs font-semibold uppercase tracking-wider text-gold transition-all hover:-translate-y-0.5 hover:border-gold/60 hover:bg-gold/10 hover:shadow-[0_8px_24px_-12px_rgba(212,175,55,0.55)]"
          >
            <ArrowUpFromLine size={14} className="transition-transform group-hover:translate-y-0.5" />
            Withdraw
          </Link>
        </div>
      </div>

      <div className="border-t border-border/30">
        <div className="flex items-center justify-between px-4 pt-2.5 pb-1">
          <div className="font-mono text-[10px] uppercase tracking-widest text-foreground/50">
            Recent transactions
          </div>
          <Link
            to="/dashboard/wallet"
            className="font-mono text-[10px] uppercase tracking-wider text-foreground/55 hover:text-gold"
          >
            History
          </Link>
        </div>
        <ul className="divide-y divide-border/30">
          {txns.length === 0 && (
            <li className="px-4 py-4 text-center text-[11px] text-foreground/50">
              No recent transactions.
            </li>
          )}
          {txns.map((t) => {
            const isDep = t.kind === "deposit";
            const Icon = isDep ? ArrowDownToLine : ArrowUpFromLine;
            return (
              <li
                key={`${t.kind}-${t.id}`}
                className="flex items-center justify-between gap-3 px-4 py-2.5"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={`grid h-7 w-7 place-items-center rounded-md ${
                      isDep
                        ? "bg-emerald-400/15 text-emerald-300"
                        : "bg-gold/15 text-gold"
                    }`}
                  >
                    <Icon size={12} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-hud text-[11px] font-semibold uppercase tracking-wider text-foreground/85">
                      {isDep ? "Deposit" : "Withdraw"}
                    </div>
                    <div className="font-mono text-[9px] uppercase tracking-wider text-foreground/50">
                      {timeAgo(t.created_at)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div
                    className={`inline-flex items-center gap-1 font-display text-[13px] font-bold tabular-nums ${
                      isDep ? "text-emerald-300" : "text-gold"
                    }`}
                  >
                    <CoinIcon className="h-3 w-3" />
                    {isDep ? "+" : "−"}
                    {t.amount.toLocaleString()}
                  </div>
                  <StatusPill status={t.status} />
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
