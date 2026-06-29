import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { History, Search, RefreshCw, Download, Filter as FilterIcon, Globe2, Monitor, Smartphone } from "lucide-react";
import { useMemo, useState } from "react";

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

type ProfileLite = { id: string; username: string | null; display_name: string | null; avatar_url: string | null };

function flagEmoji(code?: string | null) {
  if (!code || code.length !== 2) return "🏳️";
  const A = 0x1f1e6;
  return String.fromCodePoint(...code.toUpperCase().split("").map((c) => A + c.charCodeAt(0) - 65));
}

function initials(name?: string | null) {
  if (!name) return "?";
  return name.trim().slice(0, 1).toUpperCase();
}

function AdminLoginHistoryPage() {
  const [search, setSearch] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");

  const q = useQuery({
    queryKey: ["admin-login-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("login_history")
        .select("*")
        .order("login_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      const rows = (data ?? []) as Row[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      let profMap = new Map<string, ProfileLite>();
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, username, display_name, avatar_url")
          .in("id", ids);
        profMap = new Map(((profs ?? []) as ProfileLite[]).map((p) => [p.id, p]));
      }
      return rows.map((r) => ({ ...r, profile: profMap.get(r.user_id) }));
    },
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    const startTs = start ? new Date(start).getTime() : null;
    const endTs = end ? new Date(end).getTime() + 86400000 : null;
    return (q.data ?? []).filter((r) => {
      const t = new Date(r.login_at).getTime();
      if (startTs && t < startTs) return false;
      if (endTs && t > endTs) return false;
      if (!s) return true;
      return (
        r.profile?.username?.toLowerCase().includes(s) ||
        r.profile?.display_name?.toLowerCase().includes(s) ||
        r.ip_address?.toLowerCase().includes(s) ||
        r.country_code?.toLowerCase().includes(s) ||
        r.country_name?.toLowerCase().includes(s) ||
        r.browser?.toLowerCase().includes(s) ||
        r.os?.toLowerCase().includes(s) ||
        r.platform?.toLowerCase().includes(s)
      );
    });
  }, [q.data, search, start, end]);

  const exportCsv = () => {
    const headers = ["User", "User ID", "IP", "Country", "Browser", "Version", "OS", "Platform", "Device", "Logged At"];
    const rows = filtered.map((r) => [
      r.profile?.username ?? r.profile?.display_name ?? "",
      r.user_id,
      r.ip_address ?? "",
      `${r.country_code ?? ""} ${r.country_name ?? ""}`.trim(),
      r.browser ?? "",
      r.browser_version ?? "",
      r.os ?? "",
      r.platform ?? "",
      r.device ?? "",
      new Date(r.login_at).toLocaleString(),
    ]);
    const csv = [headers, ...rows]
      .map((row) => row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `login-history-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <History className="h-6 w-6 text-gold" />
          <h1 className="font-display text-2xl uppercase tracking-wider text-gold">Login History</h1>
        </div>
        <p className="mt-1 text-xs text-foreground/60 max-w-2xl">
          View login history with IP addresses, locations, and device information. Filter by date range and search for
          specific users.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Logins" value={q.data?.length ?? 0} icon={History} />
        <StatCard
          label="Unique Users"
          value={new Set((q.data ?? []).map((r) => r.user_id)).size}
          icon={Globe2}
        />
        <StatCard
          label="Unique IPs"
          value={new Set((q.data ?? []).map((r) => r.ip_address).filter(Boolean)).size}
          icon={Monitor}
        />
        <StatCard
          label="Mobile Sessions"
          value={(q.data ?? []).filter((r) => (r.platform || "").toLowerCase().includes("android") || (r.os || "").toLowerCase().includes("android") || (r.os || "").toLowerCase().includes("ios")).length}
          icon={Smartphone}
        />
      </div>

      {/* Filters */}
      <div className="hud-panel p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-foreground/60">
          <FilterIcon size={14} /> Filters
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr_auto] items-end gap-3">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-foreground/50 mb-1">Login Date Start</label>
            <input
              type="date"
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded border border-border/60 bg-secondary/40 px-3 py-2 text-xs"
            />
          </div>
          <div className="hidden md:block text-foreground/40 pb-2">—</div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-foreground/50 mb-1">End</label>
            <input
              type="date"
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded border border-border/60 bg-secondary/40 px-3 py-2 text-xs"
            />
          </div>
          <button
            onClick={() => q.refetch()}
            className="inline-flex items-center justify-center gap-2 rounded border border-gold/50 bg-gold/10 px-4 py-2 text-xs font-hud uppercase tracking-widest text-gold hover:bg-gold/20"
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-border/30">
          <button
            onClick={exportCsv}
            className="inline-flex items-center gap-2 rounded border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs uppercase tracking-widest text-foreground/80 hover:bg-secondary/70"
          >
            <Download size={14} /> Export CSV
          </button>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-foreground/50" size={14} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search user, IP, country, browser…"
              className="w-72 max-w-full rounded border border-border/60 bg-secondary/40 pl-8 pr-3 py-1.5 font-hud text-xs uppercase tracking-widest text-foreground placeholder:text-foreground/40"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="hud-panel overflow-x-auto">
        <table className="w-full text-sm min-w-[1100px]">
          <thead className="bg-secondary/40 text-[10px] uppercase tracking-widest text-foreground/60">
            <tr>
              <th className="px-3 py-3 text-left">User</th>
              <th className="px-3 py-3 text-left">IP Address</th>
              <th className="px-3 py-3 text-left">Country</th>
              <th className="px-3 py-3 text-left">Browser</th>
              <th className="px-3 py-3 text-left">Version</th>
              <th className="px-3 py-3 text-left">OS</th>
              <th className="px-3 py-3 text-left">Platform</th>
              <th className="px-3 py-3 text-left">Logged At</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const name = r.profile?.username ?? r.profile?.display_name ?? "Unknown";
              return (
                <tr key={r.id} className="border-t border-border/30 hover:bg-secondary/20">
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      {r.profile?.avatar_url ? (
                        <img src={r.profile.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                      ) : (
                        <div className="h-7 w-7 rounded-full bg-gold/20 text-gold flex items-center justify-center text-xs font-bold">
                          {initials(name)}
                        </div>
                      )}
                      <div>
                        <div className="text-xs font-semibold text-foreground">{name}</div>
                        <div className="text-[10px] text-foreground/50 font-mono">{r.user_id.slice(0, 8)}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-[11px] text-foreground/80">{r.ip_address ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="text-base leading-none">{flagEmoji(r.country_code)}</span>
                      <span className="font-semibold">{r.country_code ?? "—"}</span>
                    </span>
                  </td>
                  <td className="px-3 py-2 text-xs">{r.browser ?? "—"}</td>
                  <td className="px-3 py-2 text-xs font-mono text-foreground/70">{r.browser_version ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{r.os ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{r.platform ?? r.device ?? "—"}</td>
                  <td className="px-3 py-2 text-xs text-foreground/70 whitespace-nowrap">
                    {new Date(r.login_at).toLocaleString()}
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-12 text-center text-foreground/50">
                  {q.isLoading ? "Loading…" : "No login records found"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="text-xs text-foreground/50 text-center">
        Showing {filtered.length} of {q.data?.length ?? 0} records
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: any }) {
  return (
    <div className="hud-panel p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-foreground/60">{label}</div>
          <div className="font-display text-2xl text-gold mt-1">{value.toLocaleString()}</div>
        </div>
        <Icon className="h-5 w-5 text-gold/60" />
      </div>
    </div>
  );
}
