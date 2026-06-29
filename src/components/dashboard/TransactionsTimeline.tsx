import { useEffect, useMemo, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Filter, History } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CoinIcon } from "@/components/site/CoinIcon";

type TxRow = {
  id?: string | number;
  amount_bac: number;
  type: string | null;
  created_at: string;
  note?: string | null;
};

type FilterKey = "all" | "in" | "out";

const INCOME_TYPES = new Set([
  "deposit",
  "prize",
  "referral",
  "quest_reward",
  "login_reward",
  "spin_reward",
  "admin_credit",
  "refund",
]);

function isIncome(t: TxRow) {
  const type = (t.type ?? "").toLowerCase();
  if (INCOME_TYPES.has(type)) return true;
  return Number(t.amount_bac) > 0;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function prettyType(t: string | null) {
  if (!t) return "Transaction";
  return t
    .split(/[_\s-]+/)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ");
}

export function TransactionsTimeline({ userId }: { userId?: string }) {
  const [rows, setRows] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  useEffect(() => {
    if (!userId) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("balance_logs")
        .select("id, amount_bac, type, created_at, note")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(25);
      if (!cancel) {
        setRows((data ?? []) as TxRow[]);
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel(`balance_logs_${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "balance_logs", filter: `user_id=eq.${userId}` },
        (payload) => setRows((prev) => [payload.new as TxRow, ...prev].slice(0, 25)),
      )
      .subscribe();

    return () => {
      cancel = true;
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const filtered = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => (filter === "in" ? isIncome(r) : !isIncome(r)));
  }, [rows, filter]);

  const totals = useMemo(() => {
    let inc = 0;
    let out = 0;
    for (const r of rows) {
      const amt = Math.abs(Number(r.amount_bac ?? 0));
      if (isIncome(r)) inc += amt;
      else out += amt;
    }
    return { inc, out };
  }, [rows]);

  return (
    <section className="hud-panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-border/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <History size={14} className="text-gold" />
          <h2 className="font-hud text-xs font-bold uppercase tracking-widest text-foreground/80">
            Transactions
          </h2>
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span className="inline-flex items-center gap-1 text-emerald-400/90">
            <ArrowDownLeft size={11} />
            <CoinIcon size={10} />
            <span className="font-mono">{totals.inc}</span>
          </span>
          <span className="inline-flex items-center gap-1 text-rose-400/90">
            <ArrowUpRight size={11} />
            <CoinIcon size={10} />
            <span className="font-mono">{totals.out}</span>
          </span>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 border-b border-border/30 px-3 py-2">
        <Filter size={11} className="text-foreground/45" />
        {(["all", "in", "out"] as FilterKey[]).map((k) => {
          const active = filter === k;
          const label = k === "all" ? "All" : k === "in" ? "Incoming" : "Outgoing";
          return (
            <button
              key={k}
              type="button"
              onClick={() => setFilter(k)}
              className={`rounded border px-2.5 py-1 font-hud text-[10px] uppercase tracking-widest transition-all duration-150 ${
                active
                  ? "border-gold/60 bg-gold/10 text-gold shadow-[0_0_8px_rgba(212,175,55,0.25)]"
                  : "border-border/40 text-foreground/60 hover:border-foreground/40 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="p-6 text-center text-xs text-foreground/50">Loading transactions…</div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center text-xs text-foreground/50">No transactions to show.</div>
      ) : (
        <ul className="max-h-[420px] divide-y divide-border/25 overflow-y-auto">
          {filtered.map((r, i) => {
            const inc = isIncome(r);
            const amt = Math.abs(Number(r.amount_bac ?? 0));
            return (
              <li
                key={String(r.id ?? `${r.created_at}-${i}`)}
                className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-foreground/[0.03]"
              >
                <div
                  className={`grid h-8 w-8 place-items-center rounded border ${
                    inc
                      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-300"
                      : "border-rose-400/30 bg-rose-400/10 text-rose-300"
                  }`}
                >
                  {inc ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-foreground/90">
                    {r.note || prettyType(r.type)}
                  </div>
                  <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/45">
                    {prettyType(r.type)} · {fmtTime(r.created_at)}
                  </div>
                </div>
                <div
                  className={`inline-flex items-center gap-1 font-mono text-sm font-bold ${
                    inc ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {inc ? "+" : "−"}
                  <CoinIcon size={11} />
                  {amt}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
