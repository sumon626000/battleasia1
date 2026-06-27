import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { History, Search } from "lucide-react";
import { useState } from "react";

export const Route = createFileRoute("/_admin/admin/login-history")({
  component: AdminLoginHistoryPage,
});

type Row = {
  id: number;
  user_id: string;
  ip_address: string | null;
  country_code: string | null;
  country_name: string | null;
  browser: string | null;
  browser_version: string | null;
  os: string | null;
  device: string | null;
  platform: string | null;
  login_at: string;
};

type ProfileLite = { user_id: string; username: string | null; email: string | null };

function AdminLoginHistoryPage() {
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["admin-login-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_history")
        .select("*")
        .order("login_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      let profMap = new Map<string, ProfileLite>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, username, email")
          .in("user_id", ids);
        profMap = new Map((profs ?? []).map((p) => [p.user_id, p as ProfileLite]));
      }
      return rows.map((r) => ({ ...r, profile: profMap.get(r.user_id) }));
    },
  });

  const filtered = (q.data ?? []).filter((r) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      r.profile?.username?.toLowerCase().includes(s) ||
      r.profile?.email?.toLowerCase().includes(s) ||
      r.ip_address?.toLowerCase().includes(s) ||
      r.country_code?.toLowerCase().includes(s) ||
      r.browser?.toLowerCase().includes(s)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-gold" />
          <h1 className="font-display text-2xl uppercase tracking-wider text-gold">
            Login History
          </h1>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-foreground/50" size={14} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search user / ip / browser"
            className="rounded border border-border/60 bg-secondary/40 pl-8 pr-3 py-1.5 font-hud text-xs uppercase tracking-widest text-foreground placeholder:text-foreground/40"
          />
        </div>
      </div>

      <div className="hud-panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-secondary/40 text-xs uppercase text-foreground/60">
            <tr>
              <th className="px-3 py-2 text-left">When</th>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">IP</th>
              <th className="px-3 py-2 text-left">Country</th>
              <th className="px-3 py-2 text-left">Browser</th>
              <th className="px-3 py-2 text-left">OS</th>
              <th className="px-3 py-2 text-left">Device</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-border/30">
                <td className="px-3 py-2 text-xs text-foreground/70">{new Date(r.login_at).toLocaleString()}</td>
                <td className="px-3 py-2 text-xs">
                  <div className="font-semibold text-foreground">{r.profile?.username ?? "—"}</div>
                  <div className="text-[10px] text-foreground/50">{r.profile?.email ?? r.user_id.slice(0, 8)}</div>
                </td>
                <td className="px-3 py-2 font-mono text-[11px]">{r.ip_address ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.country_code ?? "—"} {r.country_name ? `(${r.country_name})` : ""}</td>
                <td className="px-3 py-2 text-xs">{r.browser ?? "—"} {r.browser_version ?? ""}</td>
                <td className="px-3 py-2 text-xs">{r.os ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.device ?? "—"}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-foreground/50">
                  {q.isLoading ? "Loading…" : "No login records"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
