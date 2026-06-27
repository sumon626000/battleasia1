import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Wallet, Download } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/balances")({
  component: AdminBalancesPage,
});

type Row = {
  id: number;
  user_id: string;
  type: string;
  amount_bac: number;
  balance_before: number;
  balance_after: number;
  handled_by: string;
  note: string | null;
  reference_type: string | null;
  reference_id: number | null;
  created_at: string;
  profiles?: { username: string | null; pubg_id: string | null } | null;
};

const TYPES = [
  "all",
  "deposit",
  "withdraw",
  "withdraw_refund",
  "match_entry_fee",
  "match_prize",
  "match_refund",
  "shop_purchase",
  "premium_purchase",
  "admin_adjust",
  "referral_bonus",
];

function AdminBalancesPage() {
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [handler, setHandler] = useState<string>("all");
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["admin-balances", typeFilter, handler, from, to],
    queryFn: async () => {
      let req = supabase
        .from("balance_logs")
        .select("*, profiles:profiles!balance_logs_user_id_fkey(username, pubg_id)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (typeFilter !== "all") req = req.eq("type", typeFilter as "deposit");
      if (handler !== "all") req = req.eq("handled_by", handler);
      if (from) req = req.gte("created_at", from);
      if (to) req = req.lte("created_at", `${to}T23:59:59`);
      const { data, error } = await req;
      if (error) throw error;
      return (data ?? []) as unknown as Row[];
    },
  });

  const rows = useMemo(() => {
    if (!q.data) return [];
    if (!search) return q.data;
    const s = search.toLowerCase();
    return q.data.filter(
      (r) =>
        r.profiles?.username?.toLowerCase().includes(s) ||
        r.profiles?.pubg_id?.toLowerCase().includes(s) ||
        r.note?.toLowerCase().includes(s),
    );
  }, [q.data, search]);

  function exportCsv() {
    if (!rows.length) return;
    const header = ["id", "date", "user", "pubg_id", "type", "amount", "before", "after", "handled_by", "note", "reference"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          new Date(r.created_at).toISOString(),
          r.profiles?.username ?? "",
          r.profiles?.pubg_id ?? "",
          r.type,
          r.amount_bac,
          r.balance_before,
          r.balance_after,
          r.handled_by,
          (r.note ?? "").replace(/[\n,]/g, " "),
          `${r.reference_type ?? ""}:${r.reference_id ?? ""}`,
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `balance_history_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Wallet className="h-6 w-6 text-gold" />
          <h1 className="font-display text-2xl uppercase tracking-widest text-gold">Balance History</h1>
        </div>
        <button onClick={exportCsv} className="btn-tactical inline-flex items-center gap-2 px-3 py-1.5 text-xs uppercase">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="hud-panel grid gap-3 p-3 md:grid-cols-5">
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded border border-border/60 bg-background/60 px-2 py-1.5 font-hud text-xs"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <select
          value={handler}
          onChange={(e) => setHandler(e.target.value)}
          className="rounded border border-border/60 bg-background/60 px-2 py-1.5 font-hud text-xs"
        >
          <option value="all">all handlers</option>
          <option value="system">system</option>
          <option value="admin">admin</option>
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border border-border/60 bg-background/60 px-2 py-1.5 font-hud text-xs" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border border-border/60 bg-background/60 px-2 py-1.5 font-hud text-xs" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search user/pubg/note"
          className="rounded border border-border/60 bg-background/60 px-2 py-1.5 font-hud text-xs"
        />
      </div>

      <div className="hud-panel overflow-x-auto">
        <table className="w-full min-w-[1100px] text-sm">
          <thead className="bg-card/60 font-hud text-[11px] uppercase tracking-widest text-foreground/70">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">User</th>
              <th className="p-2 text-left">Type</th>
              <th className="p-2 text-right">Amount</th>
              <th className="p-2 text-right">Before</th>
              <th className="p-2 text-right">After</th>
              <th className="p-2 text-left">By</th>
              <th className="p-2 text-left">Note</th>
              <th className="p-2 text-left">Ref</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-foreground/60">
                  Loading...
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="p-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2">
                  <div className="font-display">{r.profiles?.username ?? "—"}</div>
                  <div className="font-hud text-[10px] text-foreground/60">PUBG: {r.profiles?.pubg_id ?? "—"}</div>
                </td>
                <td className="p-2 font-hud text-[11px] uppercase">{r.type}</td>
                <td className={`p-2 text-right font-mono ${r.amount_bac >= 0 ? "text-emerald-400" : "text-destructive"}`}>
                  {r.amount_bac >= 0 ? "+" : ""}
                  {r.amount_bac}
                </td>
                <td className="p-2 text-right font-mono text-foreground/70">{r.balance_before}</td>
                <td className="p-2 text-right font-mono">{r.balance_after}</td>
                <td className="p-2 font-hud text-[10px] uppercase">{r.handled_by}</td>
                <td className="p-2 text-xs">{r.note}</td>
                <td className="p-2 font-hud text-[10px] text-foreground/60">
                  {r.reference_type ? `${r.reference_type}#${r.reference_id ?? ""}` : "—"}
                </td>
              </tr>
            ))}
            {!q.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="p-6 text-center text-foreground/60">
                  No records.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
