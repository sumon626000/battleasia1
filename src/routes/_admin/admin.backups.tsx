import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Database, Plus } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/backups")({
  component: AdminBackupsPage,
});

type Row = {
  id: number;
  backup_type: string;
  file_path: string | null;
  file_size_bytes: number | null;
  status: string;
  error_message: string | null;
  started_at: string;
  completed_at: string | null;
};

function fmtBytes(n: number | null) {
  if (!n) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let v = n;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toFixed(1)} ${units[i]}`;
}

function AdminBackupsPage() {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin-backups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("backup_logs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  async function logManualBackup() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    const { error } = await supabase.from("backup_logs").insert({
      backup_type: "manual",
      status: "logged",
      initiated_by_admin_id: session.user.id,
      completed_at: new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    toast.success("Backup logged. Database backups are managed by Lovable Cloud automatically.");
    qc.invalidateQueries({ queryKey: ["admin-backups"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Database className="h-6 w-6 text-gold" />
          <h1 className="font-display text-2xl uppercase tracking-wider text-gold">
            Database Backups
          </h1>
        </div>
        <button
          onClick={logManualBackup}
          className="flex items-center gap-2 rounded border border-gold/60 bg-gold/10 px-3 py-1.5 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20"
        >
          <Plus size={14} /> Log Manual Backup
        </button>
      </div>

      <div className="hud-panel p-4 text-xs text-foreground/70">
        Lovable Cloud performs automatic daily backups of the database. This page
        records manual backup events for audit purposes.
      </div>

      <div className="hud-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase text-foreground/60">
            <tr>
              <th className="px-3 py-2 text-left">Started</th>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Status</th>
              <th className="px-3 py-2 text-left">Size</th>
              <th className="px-3 py-2 text-left">Completed</th>
              <th className="px-3 py-2 text-left">Notes</th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((r) => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="px-3 py-2 text-xs">{new Date(r.started_at).toLocaleString()}</td>
                <td className="px-3 py-2"><span className="rounded bg-secondary/60 px-2 py-0.5 text-[10px] uppercase">{r.backup_type}</span></td>
                <td className="px-3 py-2">
                  <span className={`rounded px-2 py-0.5 text-[10px] uppercase ${
                    r.status === "success" || r.status === "logged"
                      ? "bg-emerald-500/15 text-emerald-400"
                      : r.status === "failed"
                      ? "bg-red-500/15 text-red-400"
                      : "bg-amber-500/15 text-amber-400"
                  }`}>{r.status}</span>
                </td>
                <td className="px-3 py-2 text-xs">{fmtBytes(r.file_size_bytes)}</td>
                <td className="px-3 py-2 text-xs text-foreground/60">{r.completed_at ? new Date(r.completed_at).toLocaleString() : "—"}</td>
                <td className="px-3 py-2 text-xs text-foreground/60">{r.error_message ?? "—"}</td>
              </tr>
            ))}
            {q.data?.length === 0 && (
              <tr><td colSpan={6} className="px-3 py-8 text-center text-foreground/50">No backup records yet</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
