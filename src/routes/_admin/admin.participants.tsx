import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users2, Download } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/participants")({
  component: AdminParticipantsPage,
});

type Row = {
  id: number;
  match_id: number;
  user_id: string;
  entry_fee_bac: number;
  rank_position: number | null;
  kills: number;
  prize_bac: number;
  status: string;
  created_at: string;
  matches?: { match_name: string | null } | null;
  profiles?: { username: string | null; pubg_id: string | null } | null;
};

function AdminParticipantsPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["admin-participants", from, to, status],
    queryFn: async () => {
      let req = supabase
        .from("match_participants")
        .select("*, matches:matches!match_participants_match_id_fkey(match_name), profiles:profiles!match_participants_user_id_fkey(username, pubg_id)")
        .order("created_at", { ascending: false })
        .limit(500);
      if (status !== "all") req = req.eq("status", status as "joined" | "win" | "loss" | "pending" | "refunded" | "cancelled");
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
        r.matches?.match_name?.toLowerCase().includes(s),
    );
  }, [q.data, search]);

  function exportCsv() {
    if (!rows.length) return;
    const header = ["id", "date", "match", "user", "pubg_id", "entry_fee", "rank", "kills", "prize", "status"];
    const lines = [header.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          new Date(r.created_at).toISOString(),
          (r.matches?.match_name ?? "").replace(/,/g, " "),
          r.profiles?.username ?? "",
          r.profiles?.pubg_id ?? "",
          r.entry_fee_bac,
          r.rank_position ?? "",
          r.kills,
          r.prize_bac,
          r.status,
        ].join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `participants_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users2 className="h-6 w-6 text-gold" />
          <h1 className="font-display text-2xl uppercase tracking-widest text-gold">Participants History</h1>
        </div>
        <button onClick={exportCsv} className="btn-tactical inline-flex items-center gap-2 px-3 py-1.5 text-xs uppercase">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
      </div>

      <div className="hud-panel grid gap-3 p-3 md:grid-cols-4">
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded border border-border/60 bg-background/60 px-2 py-1.5 font-hud text-xs">
          {["all", "joined", "win", "loss", "pending", "refunded", "cancelled"].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded border border-border/60 bg-background/60 px-2 py-1.5 font-hud text-xs" />
        <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded border border-border/60 bg-background/60 px-2 py-1.5 font-hud text-xs" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search match / user / pubg"
          className="rounded border border-border/60 bg-background/60 px-2 py-1.5 font-hud text-xs"
        />
      </div>

      <div className="hud-panel overflow-x-auto">
        <table className="w-full min-w-[1000px] text-sm">
          <thead className="bg-card/60 font-hud text-[11px] uppercase tracking-widest text-foreground/70">
            <tr>
              <th className="p-2 text-left">Date</th>
              <th className="p-2 text-left">Match</th>
              <th className="p-2 text-left">User</th>
              <th className="p-2 text-right">Entry Fee</th>
              <th className="p-2 text-right">Rank</th>
              <th className="p-2 text-right">Kills</th>
              <th className="p-2 text-right">Prize</th>
              <th className="p-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {q.isLoading && (
              <tr><td colSpan={8} className="p-6 text-center text-foreground/60">Loading...</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border/40">
                <td className="p-2 text-xs">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2 font-display">{r.matches?.match_name ?? `#${r.match_id}`}</td>
                <td className="p-2">
                  <div className="font-display">{r.profiles?.username ?? "—"}</div>
                  <div className="font-hud text-[10px] text-foreground/60">PUBG: {r.profiles?.pubg_id ?? "—"}</div>
                </td>
                <td className="p-2 text-right font-mono">{r.entry_fee_bac}</td>
                <td className="p-2 text-right font-mono">{r.rank_position ?? "—"}</td>
                <td className="p-2 text-right font-mono">{r.kills}</td>
                <td className="p-2 text-right font-mono text-emerald-400">{r.prize_bac}</td>
                <td className="p-2 text-center font-hud text-[10px] uppercase">{r.status}</td>
              </tr>
            ))}
            {!q.isLoading && rows.length === 0 && (
              <tr><td colSpan={8} className="p-6 text-center text-foreground/60">No records.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
