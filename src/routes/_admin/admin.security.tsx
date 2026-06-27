import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldAlert, CheckCircle2 } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_admin/admin/security")({
  component: AdminSecurityPage,
});

type Alert = {
  id: number;
  alert_type: string;
  description: string | null;
  user_id: string | null;
  admin_id: string | null;
  ip_address: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
};

function AdminSecurityPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"open" | "resolved" | "all">("open");

  const q = useQuery({
    queryKey: ["admin-security", filter],
    queryFn: async () => {
      let query = supabase
        .from("security_alerts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (filter === "open") query = query.eq("is_resolved", false);
      if (filter === "resolved") query = query.eq("is_resolved", true);
      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as Alert[];
    },
  });

  async function resolve(id: number) {
    const { error } = await supabase.rpc("admin_resolve_security_alert", { p_id: id });
    if (error) return toast.error(error.message);
    toast.success("Alert resolved");
    qc.invalidateQueries({ queryKey: ["admin-security"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-6 w-6 text-gold" />
          <h1 className="font-display text-2xl uppercase tracking-wider text-gold">Security Alerts</h1>
        </div>
        <div className="flex gap-2">
          {(["open", "resolved", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded border px-3 py-1.5 font-hud text-[11px] uppercase tracking-widest ${
                filter === f ? "border-gold/60 bg-gold/10 text-gold" : "border-border/60 text-foreground/70"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="hud-panel overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase text-foreground/60">
            <tr>
              <th className="px-3 py-2 text-left">When</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Description</th>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">IP</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((a) => (
              <tr key={a.id} className="border-t border-border/30">
                <td className="px-3 py-2 text-xs text-foreground/60">{new Date(a.created_at).toLocaleString()}</td>
                <td className="px-3 py-2"><span className="rounded bg-red-500/15 px-2 py-0.5 text-[10px] uppercase text-red-400">{a.alert_type}</span></td>
                <td className="px-3 py-2 text-xs">{a.description}</td>
                <td className="px-3 py-2 font-mono text-[10px] text-foreground/50">{a.user_id?.slice(0, 8) ?? "—"}</td>
                <td className="px-3 py-2 font-mono text-[10px] text-foreground/50">{a.ip_address ?? "—"}</td>
                <td className="px-3 py-2">
                  {a.is_resolved ? (
                    <span className="text-xs text-emerald-400">Resolved</span>
                  ) : (
                    <span className="text-xs text-amber-400">Open</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right">
                  {!a.is_resolved && (
                    <button onClick={() => resolve(a.id)} className="flex items-center gap-1 text-xs text-emerald-400 hover:underline">
                      <CheckCircle2 size={12} /> Resolve
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {q.data?.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-8 text-center text-foreground/50">No alerts</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
