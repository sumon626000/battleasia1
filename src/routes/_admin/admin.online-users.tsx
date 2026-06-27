import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Activity, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_admin/admin/online-users")({
  component: AdminOnlineUsersPage,
});

type Row = {
  id: number;
  user_id: string;
  ip_address: string | null;
  country_code: string | null;
  browser: string | null;
  os: string | null;
  device: string | null;
  last_seen_at: string;
  expires_at: string;
};

type ProfileLite = { id: string; username: string | null; display_name: string | null };

function AdminOnlineUsersPage() {
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["admin-online-users"],
    queryFn: async () => {
      const cutoff = new Date(Date.now() - 5 * 60_000).toISOString();
      const { data, error } = await supabase
        .from("online_sessions")
        .select("*")
        .gte("last_seen_at", cutoff)
        .order("last_seen_at", { ascending: false });
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      let profMap = new Map<string, ProfileLite>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, display_name")
          .in("id", ids);
        profMap = new Map(((profs ?? []) as ProfileLite[]).map((p) => [p.id, p]));
      }
      return rows.map((r) => ({ ...r, profile: profMap.get(r.user_id) }));
    },
    refetchInterval: 30_000,
  });

  async function logoutUser(userId: string) {
    if (!confirm("Force logout this user?")) return;
    const { error } = await supabase.rpc("admin_force_logout_user", { _user_id: userId });
    if (error) return toast.error(error.message);
    toast.success("User forced offline");
    qc.invalidateQueries({ queryKey: ["admin-online-users"] });
  }

  async function logoutAll() {
    if (!confirm("Force logout ALL users? This will sign everyone out.")) return;
    const { error } = await supabase.rpc("admin_force_logout_all");
    if (error) return toast.error(error.message);
    toast.success("All sessions cleared");
    qc.invalidateQueries({ queryKey: ["admin-online-users"] });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Activity className="h-6 w-6 text-emerald-400" />
          <h1 className="font-display text-2xl uppercase tracking-wider text-gold">
            Online Users
            <span className="ml-3 rounded bg-emerald-500/10 px-2 py-0.5 font-hud text-xs text-emerald-400">
              {q.data?.length ?? 0} live
            </span>
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => qc.invalidateQueries({ queryKey: ["admin-online-users"] })}
            className="flex items-center gap-1 rounded border border-border/60 px-3 py-1.5 font-hud text-[11px] uppercase tracking-widest text-foreground/70 hover:border-gold hover:text-gold"
          >
            <RefreshCw size={12} /> Refresh
          </button>
          <button
            onClick={logoutAll}
            className="flex items-center gap-1 rounded border border-red-500/50 bg-red-500/10 px-3 py-1.5 font-hud text-[11px] uppercase tracking-widest text-red-400 hover:bg-red-500/20"
          >
            <LogOut size={12} /> Logout All
          </button>
        </div>
      </div>

      <div className="hud-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase text-foreground/60">
            <tr>
              <th className="px-3 py-2 text-left"></th>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">IP</th>
              <th className="px-3 py-2 text-left">Country</th>
              <th className="px-3 py-2 text-left">Browser</th>
              <th className="px-3 py-2 text-left">OS</th>
              <th className="px-3 py-2 text-left">Device</th>
              <th className="px-3 py-2 text-left">Last Seen</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {q.data?.map((r) => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="px-3 py-2"><span className="inline-block h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.7)]" /></td>
                <td className="px-3 py-2 text-xs">
                  <div className="font-semibold">{r.profile?.username ?? r.profile?.display_name ?? "—"}</div>
                  <div className="text-[10px] text-foreground/50">{r.user_id.slice(0, 8)}</div>
                </td>
                <td className="px-3 py-2 font-mono text-[11px]">{r.ip_address ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.country_code ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.browser ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.os ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.device ?? "—"}</td>
                <td className="px-3 py-2 text-xs text-foreground/60">{new Date(r.last_seen_at).toLocaleTimeString()}</td>
                <td className="px-3 py-2 text-right">
                  <button
                    onClick={() => logoutUser(r.user_id)}
                    className="flex items-center gap-1 text-xs text-red-400 hover:underline"
                  >
                    <LogOut size={12} /> Kick
                  </button>
                </td>
              </tr>
            ))}
            {q.data?.length === 0 && (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-foreground/50">No active sessions</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
