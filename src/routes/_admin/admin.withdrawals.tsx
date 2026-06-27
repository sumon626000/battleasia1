import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/withdrawals")({
  component: AdminWithdrawalsPage,
});

type Withdrawal = {
  id: number; user_id: string; bac_amount: number; fee_bac: number; currency: string;
  wallet_address: string; status: string; created_at: string; cancel_reason: string | null;
  final_payout_amount: number | null; fiat_amount: number | null; balance_held: boolean;
};
type ProfileLite = { id: string; in_game_username: string | null; username: string | null };

function AdminWithdrawalsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("Pending");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-withdrawals", statusFilter],
    queryFn: async () => {
      let q = supabase.from("withdrawals").select("*").order("created_at", { ascending: false }).limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter as never);
      const { data, error } = await q;
      if (error) throw error;
      const ids = (data ?? []).map((d) => d.user_id);
      let profs: ProfileLite[] = [];
      if (ids.length) {
        const { data: p } = await supabase.from("profiles").select("id, in_game_username, username").in("id", ids);
        profs = (p as ProfileLite[]) ?? [];
      }
      // Active security alerts to flag unusual withdrawals
      const ids2 = (data ?? []).map((d) => d.id);
      let alertIds = new Set<number>();
      if (ids2.length) {
        const { data: alerts } = await supabase
          .from("security_alerts")
          .select("metadata")
          .eq("alert_type", "unusual_withdraw");
        for (const a of alerts ?? []) {
          const wid = ((a as { metadata?: { withdrawal_id?: number } }).metadata)?.withdrawal_id;
          if (wid) alertIds.add(wid);
        }
      }
      return { rows: (data as Withdrawal[]) ?? [], profMap: new Map(profs.map((p) => [p.id, p])), alertIds };
    },
  });

  async function review(id: number, approve: boolean) {
    const reason = prompt(approve ? "Fiat payout amount (optional, leave blank for default):" : "Reason for rejection:", "");
    if (!approve && !reason) return;
    const args: Record<string, unknown> = { p_id: id, p_approve: approve };
    if (approve) {
      const fiat = parseFloat(reason || "");
      if (Number.isFinite(fiat)) args.p_fiat_amount = fiat;
    } else {
      args.p_reason = reason;
    }
    const { error } = await supabase.rpc("admin_review_withdrawal", args as never);
    if (error) return toast.error(error.message);
    toast.success(approve ? "Withdrawal approved" : "Withdrawal rejected & BAC refunded");
    qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-[0.2em] text-foreground">Withdrawal Review</h1>
        <p className="font-hud text-xs uppercase tracking-widest text-foreground/60">Approve payouts or reject & refund held BAC</p>
      </div>

      <div className="flex gap-2">
        {["Pending", "Approved", "Rejected", "all"].map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded border px-3 py-1 font-hud text-[10px] uppercase tracking-widest ${
              statusFilter === s ? "border-gold/60 bg-gold/10 text-gold" : "border-border/60 text-foreground/60"
            }`}>{s}</button>
        ))}
      </div>

      <div className="hud-panel overflow-x-auto rounded-md border border-border/70 bg-card/40">
        <table className="w-full min-w-[860px] text-sm">
          <thead className="border-b border-border/60 bg-secondary/40 text-left font-hud text-[10px] uppercase tracking-widest text-foreground/60">
            <tr><th className="px-3 py-2">User</th><th className="px-3 py-2">BAC</th><th className="px-3 py-2">Fee</th><th className="px-3 py-2">Net</th><th className="px-3 py-2">Wallet</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Action</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="px-3 py-6 text-center text-foreground/50">Loading…</td></tr>}
            {!isLoading && (data?.rows.length ?? 0) === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-foreground/50">No withdrawals</td></tr>}
            {data?.rows.map((w) => {
              const prof = data.profMap.get(w.user_id);
              const flagged = data.alertIds.has(w.id);
              const net = Number(w.bac_amount) - Number(w.fee_bac ?? 0);
              return (
                <tr key={w.id} className={`border-b border-border/40 last:border-0 ${flagged ? "bg-destructive/5" : ""}`}>
                  <td className="px-3 py-2 font-display">
                    {flagged && <AlertTriangle className="mr-1 inline h-3 w-3 text-destructive" />}
                    {prof?.in_game_username || prof?.username || w.user_id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2 tabular-nums text-gold">{Number(w.bac_amount).toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">{Number(w.fee_bac ?? 0).toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">{net.toLocaleString()} {w.currency}</td>
                  <td className="px-3 py-2 font-mono text-[11px] break-all max-w-[200px]">{w.wallet_address}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-foreground/60">{new Date(w.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded border px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest ${
                      w.status === "Approved" ? "border-emerald-500/50 text-emerald-300"
                      : w.status === "Rejected" ? "border-destructive/50 text-destructive"
                      : "border-amber-500/50 text-amber-300"
                    }`}>{w.status}</span>
                    {w.cancel_reason && <div className="mt-1 font-mono text-[10px] text-destructive/80">{w.cancel_reason}</div>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {w.status === "Pending" && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => review(w.id, true)} className="rounded border border-emerald-500/50 px-2 py-1 text-emerald-400 hover:bg-emerald-500/10"><Check size={12} /></button>
                        <button onClick={() => review(w.id, false)} className="rounded border border-destructive/50 px-2 py-1 text-destructive hover:bg-destructive/10"><X size={12} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
