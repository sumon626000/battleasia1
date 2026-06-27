import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, X } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/deposits")({
  component: AdminDepositsPage,
});

type Deposit = {
  id: number; user_id: string; bac_amount: number; fiat_amount: number; currency: string;
  transaction_id: string; sender_number_or_addr: string; status: string;
  created_at: string; reject_reason: string | null;
};
type ProfileLite = { id: string; in_game_username: string | null; username: string | null };

function AdminDepositsPage() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("Pending");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-deposits", statusFilter],
    queryFn: async () => {
      let q = supabase.from("deposits").select("*").order("created_at", { ascending: false }).limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter as never);
      const { data, error } = await q;
      if (error) throw error;
      const ids = (data ?? []).map((d) => d.user_id);
      let profs: ProfileLite[] = [];
      if (ids.length) {
        const { data: p } = await supabase.from("profiles").select("id, in_game_username, username").in("id", ids);
        profs = (p as ProfileLite[]) ?? [];
      }
      return { rows: (data as Deposit[]) ?? [], profMap: new Map(profs.map((p) => [p.id, p])) };
    },
  });

  async function review(id: number, approve: boolean) {
    const reason = prompt(approve ? "Optional note:" : "Reason for rejection:", "");
    if (!approve && !reason) return;
    const { error } = await supabase.rpc("admin_review_deposit", { p_id: id, p_approve: approve, p_reason: (reason || undefined) as never });
    if (error) return toast.error(error.message);
    toast.success(approve ? "Deposit approved & BAC credited" : "Deposit rejected");
    qc.invalidateQueries({ queryKey: ["admin-deposits"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-[0.2em] text-foreground">Deposit Review</h1>
        <p className="font-hud text-xs uppercase tracking-widest text-foreground/60">Approve or reject pending deposit submissions</p>
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
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-border/60 bg-secondary/40 text-left font-hud text-[10px] uppercase tracking-widest text-foreground/60">
            <tr><th className="px-3 py-2">User</th><th className="px-3 py-2">BAC</th><th className="px-3 py-2">Paid</th><th className="px-3 py-2">TX</th><th className="px-3 py-2">Sender</th><th className="px-3 py-2">Date</th><th className="px-3 py-2">Status</th><th className="px-3 py-2 text-right">Action</th></tr>
          </thead>
          <tbody>
            {isLoading && <tr><td colSpan={8} className="px-3 py-6 text-center text-foreground/50">Loading…</td></tr>}
            {!isLoading && (data?.rows.length ?? 0) === 0 && <tr><td colSpan={8} className="px-3 py-6 text-center text-foreground/50">No deposits</td></tr>}
            {data?.rows.map((d) => {
              const prof = data.profMap.get(d.user_id);
              return (
                <tr key={d.id} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2 font-display">{prof?.in_game_username || prof?.username || d.user_id.slice(0, 8)}</td>
                  <td className="px-3 py-2 tabular-nums text-gold">{Number(d.bac_amount).toLocaleString()}</td>
                  <td className="px-3 py-2 tabular-nums">{d.fiat_amount} {d.currency}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{d.transaction_id}</td>
                  <td className="px-3 py-2 font-mono text-[11px]">{d.sender_number_or_addr}</td>
                  <td className="px-3 py-2 font-mono text-[10px] text-foreground/60">{new Date(d.created_at).toLocaleString()}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded border px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest ${
                      d.status === "Approved" ? "border-emerald-500/50 text-emerald-300"
                      : d.status === "Rejected" ? "border-destructive/50 text-destructive"
                      : "border-amber-500/50 text-amber-300"
                    }`}>{d.status}</span>
                    {d.reject_reason && <div className="mt-1 font-mono text-[10px] text-destructive/80">{d.reject_reason}</div>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {d.status === "Pending" && (
                      <div className="flex justify-end gap-1">
                        <button onClick={() => review(d.id, true)} className="rounded border border-emerald-500/50 px-2 py-1 text-emerald-400 hover:bg-emerald-500/10"><Check size={12} /></button>
                        <button onClick={() => review(d.id, false)} className="rounded border border-destructive/50 px-2 py-1 text-destructive hover:bg-destructive/10"><X size={12} /></button>
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
