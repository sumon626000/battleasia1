import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { UserX, Check, X } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/account-deletions")({
  component: AdminAccountDeletions,
});

type Row = {
  id: string;
  user_id: string;
  reason: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
  resolved_at: string | null;
};
type ProfileLite = { id: string; in_game_username: string | null; username: string | null };

function AdminAccountDeletions() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["admin-delete-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("account_delete_requests")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      const ids = (data ?? []).map((r) => r.user_id);
      let profs: ProfileLite[] = [];
      if (ids.length) {
        const { data: p } = await supabase
          .from("profiles")
          .select("id, in_game_username, username")
          .in("id", ids);
        profs = (p as ProfileLite[]) ?? [];
      }
      return {
        rows: (data as Row[]) ?? [],
        profMap: new Map(profs.map((p) => [p.id, p])),
      };
    },
  });

  async function review(id: string, approve: boolean) {
    const note = prompt(
      approve ? "Optional note (visible to user):" : "Reason for rejection:",
      "",
    );
    if (!approve && !note) return;
    const { error } = await supabase.rpc("admin_review_delete_request", {
      p_id: id,
      p_approve: approve,
      p_note: (note || undefined) as never,
    });
    if (error) return toast.error(error.message);
    toast.success(approve ? "Request approved & account deactivated" : "Request rejected");
    qc.invalidateQueries({ queryKey: ["admin-delete-requests"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-[0.2em] flex items-center gap-2">
          <UserX className="h-5 w-5 text-destructive" /> Account Deletion Requests
        </h1>
        <p className="font-hud text-xs uppercase tracking-widest text-foreground/60">
          Review and resolve account closure requests
        </p>
      </div>

      <div className="hud-panel overflow-x-auto rounded-md border border-border/70 bg-card/40">
        <table className="w-full min-w-[800px] text-sm">
          <thead className="border-b border-border/60 bg-secondary/40 text-left font-hud text-[10px] uppercase tracking-widest text-foreground/60">
            <tr>
              <th className="px-3 py-2">User</th>
              <th className="px-3 py-2">Reason</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Submitted</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-foreground/50">Loading…</td></tr>
            )}
            {!isLoading && (data?.rows.length ?? 0) === 0 && (
              <tr><td colSpan={5} className="px-3 py-6 text-center text-foreground/50">No deletion requests</td></tr>
            )}
            {data?.rows.map((r) => {
              const p = data.profMap.get(r.user_id);
              return (
                <tr key={r.id} className="border-b border-border/40 last:border-0">
                  <td className="px-3 py-2 font-display">
                    {p?.in_game_username ?? p?.username ?? r.user_id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2 text-foreground/80 max-w-md">
                    {r.reason || <span className="text-foreground/40">—</span>}
                    {r.admin_note && (
                      <div className="mt-1 font-mono text-[10px] text-foreground/50">
                        Note: {r.admin_note}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest ${
                        r.status === "pending"
                          ? "bg-amber-500/15 text-amber-400"
                          : r.status === "approved"
                          ? "bg-destructive/15 text-destructive"
                          : "bg-secondary text-foreground/60"
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-[10px] text-foreground/60">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {r.status === "pending" ? (
                      <div className="inline-flex gap-1">
                        <button
                          onClick={() => review(r.id, true)}
                          className="inline-flex items-center gap-1 rounded border border-destructive/60 bg-destructive/10 px-2 py-1 font-hud text-[10px] uppercase tracking-widest text-destructive hover:bg-destructive/20"
                        >
                          <Check className="h-3 w-3" /> Approve
                        </button>
                        <button
                          onClick={() => review(r.id, false)}
                          className="inline-flex items-center gap-1 rounded border border-border/70 px-2 py-1 font-hud text-[10px] uppercase tracking-widest text-foreground/70 hover:border-gold hover:text-gold"
                        >
                          <X className="h-3 w-3" /> Reject
                        </button>
                      </div>
                    ) : (
                      <span className="font-mono text-[10px] text-foreground/40">
                        {r.resolved_at ? new Date(r.resolved_at).toLocaleDateString() : ""}
                      </span>
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
