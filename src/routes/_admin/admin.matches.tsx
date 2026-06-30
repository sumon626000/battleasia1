import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const DRAFT_KEY = "ba_admin_match_draft_v2";
const VALID_KILL_TYPES = ["Automatic", "Manual"] as const;
function loadDraft(): Partial<Match> | null {
  try {
    // clear old incompatible draft
    localStorage.removeItem("ba_admin_match_draft_v1");
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw) as Partial<Match>;
    if (d.kill_rate_type && !VALID_KILL_TYPES.includes(d.kill_rate_type as typeof VALID_KILL_TYPES[number])) {
      d.kill_rate_type = "Automatic";
    }
    return d;
  } catch {
    return null;
  }
}
function saveDraft(d: Partial<Match> | null) {
  try {
    if (d) localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    else localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* noop */
  }
}
import { ImageUploader } from "@/components/admin/ImageUploader";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Ban, Trophy, Search, Check, Columns3, Rows3, Download } from "lucide-react";
import { exportRowsAsCSV } from "@/lib/csv";
import { MATCH_BANNERS } from "@/lib/match-banners";

export const Route = createFileRoute("/_admin/admin/matches")({
  component: AdminMatchesPage,
});

type Match = {
  id: number;
  game_id: number | null;
  match_name: string;
  map_name: string;
  status: string;
  match_type: string;
  game_mode: string;
  player_mode: string;
  reward_type: string;
  kill_rate_type: string;
  total_players: number;
  entry_fee_bac: number;
  per_kill_amount_bac: number;
  rank_1_prize_bac: number;
  rank_2_prize_bac: number;
  rank_3_prize_bac: number;
  schedule_at: string;
  premium_only: boolean;
  description: string | null;
  prize_description: string | null;
  private_description: string | null;
  room_id: string | null;
  room_password: string | null;
  banner_image_url: string | null;
  map_image_url: string | null;
  sponsor: string | null;
  match_url: string | null;
  live_stream_url: string | null;
  platform_fee_pct: number;
  result_applied: boolean;
  deleted_at: string | null;
};

const STATUS = ["Upcoming", "Active", "Ongoing", "Complete", "Cancelled"] as const;
const MATCH_TYPE = ["Free", "Paid", "Sponsored"] as const;
const GAME_MODE = ["Classic", "TDM"] as const;
const PLAYER_MODE = ["Solo", "Duo", "Squad"] as const;
const CLASSIC_MAPS = ["Erangel", "Miramar", "Vikendi", "Rondo", "Sanhok", "Livik", "Nusa", "Karakin"] as const;
const TDM_MAPS = ["Warehouse", "Hangar", "Ruins", "Town", "Library", "Arena"] as const;
const MAP_IMAGES: Record<string, string> = {
  Erangel: "/maps/erangel.jpg",
  Miramar: "/maps/miramar.jpg",
  Sanhok: "/maps/sanhok.jpg",
  Vikendi: "/maps/vikendi.jpg",
  Livik: "/maps/livik.jpg",
  Karakin: "/maps/karakin.jpg",
  Paramo: "/maps/paramo.jpg",
  Haven: "/maps/haven.jpg",
  Rondo: "/maps/rondo.jpg",
  Nusa: "/maps/nusa.jpg",
  Warehouse: "/maps/warehouse.jpg",
  Hangar: "/maps/hangar.jpg",
  Ruins: "/maps/ruins.jpg",
  Town: "/maps/town.jpg",
  Library: "/maps/library.jpg",
  Arena: "/maps/arena.jpg",
};

const REWARD_TYPE = ["KillBased", "RankBased", "Mixed"] as const;
const KILL_TYPE = ["Automatic", "Manual"] as const;

function PortalMenu({ label, btnCls, open, onToggle, onClose, width, children }: {
  label: React.ReactNode; btnCls: string; open: boolean; onToggle: () => void; onClose: () => void; width: number; children: React.ReactNode;
}) {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const r = btnRef.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: Math.min(r.left, window.innerWidth - width - 8) });
  }, [open, width]);
  useEffect(() => {
    if (!open) return;
    const f = () => onClose();
    window.addEventListener("scroll", f, true);
    window.addEventListener("resize", f);
    return () => { window.removeEventListener("scroll", f, true); window.removeEventListener("resize", f); };
  }, [open, onClose]);
  return (
    <>
      <button ref={btnRef} className={btnCls} onClick={onToggle}>{label}</button>
      {open && pos && typeof document !== "undefined" && createPortal(
        <>
          <div className="fixed inset-0 z-[9998]" onClick={onClose} />
          <div style={{ top: pos.top, left: pos.left, width }}
            className="fixed z-[9999] max-h-[70vh] overflow-y-auto rounded-md border border-border bg-popover p-2 shadow-xl">
            {children}
          </div>
        </>,
        document.body,
      )}
    </>
  );
}

function emptyDraft(): Partial<Match> {
  return {
    match_name: "",
    map_name: "Erangel",
    status: "Upcoming",
    match_type: "Free",
    game_mode: "Classic",
    player_mode: "Squad",
    reward_type: "KillBased",
    kill_rate_type: "Automatic",
    total_players: 100,
    entry_fee_bac: 0,
    per_kill_amount_bac: 0,
    rank_1_prize_bac: 0,
    rank_2_prize_bac: 0,
    rank_3_prize_bac: 0,
    platform_fee_pct: 5,
    schedule_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16),
    premium_only: false,
  };
}

type FieldKey =
  | "game_id" | "match_name" | "map_name" | "schedule_at" | "match_type"
  | "game_mode" | "player_mode" | "total_players" | "room_id" | "room_password"
  | "match_url" | "kill_rate_type" | "entry_fee_bac" | "status";

function AdminMatchesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [openMenu, setOpenMenu] = useState<null | "cols" | "density">(null);
  const [density, setDensity] = useState<"compact" | "standard" | "comfortable">("standard");
  type MCol = "match" | "schedule" | "status" | "type" | "entry" | "slots" | "actions";
  const ALL_M_COLS: { key: MCol; label: string }[] = [
    { key: "match", label: "Match" },
    { key: "schedule", label: "Schedule" },
    { key: "status", label: "Status" },
    { key: "type", label: "Type" },
    { key: "entry", label: "Entry" },
    { key: "slots", label: "Slots" },
    { key: "actions", label: "Actions" },
  ];
  const [visibleCols, setVisibleCols] = useState<Record<MCol, boolean>>({
    match: true, schedule: true, status: true, type: true, entry: true, slots: true, actions: true,
  });
  const showCol = (k: MCol) => visibleCols[k];
  const rowPad = density === "compact" ? "py-1" : density === "comfortable" ? "py-3" : "py-2";
  const [editing, setEditingState] = useState<Partial<Match> | null>(null);
  const [errors, setErrors] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const setEditing = (d: Partial<Match> | null) => {
    setEditingState(d);
    saveDraft(d);
    if (!d) setErrors({});
  };

  // Restore unsaved draft on mount (so reload doesn't wipe form data)
  useEffect(() => {
    const d = loadDraft();
    if (d) setEditingState(d);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-matches", statusFilter],
    queryFn: async () => {
      let query = supabase.from("matches").select("*").is("deleted_at", null).order("schedule_at", { ascending: false }).limit(200);
      if (statusFilter !== "all") query = query.eq("status", statusFilter as never);
      const { data, error } = await query;
      if (error) throw error;
      return data as Match[];
    },
  });

  const matches = useMemo(() => {
    if (!data) return [];
    const s = q.trim().toLowerCase();
    if (!s) return data;
    return data.filter((m) => m.match_name.toLowerCase().includes(s) || m.map_name.toLowerCase().includes(s));
  }, [data, q]);

  async function save() {
    if (!editing) return;
    const e: Partial<Record<FieldKey, boolean>> = {};
    if (!editing.game_id) e.game_id = true;
    if (!editing.match_name?.trim()) e.match_name = true;
    if (!editing.map_name?.trim()) e.map_name = true;
    if (!editing.schedule_at) e.schedule_at = true;
    if (!editing.match_type) e.match_type = true;
    if (!editing.game_mode) e.game_mode = true;
    if (!editing.player_mode) e.player_mode = true;
    if (!editing.total_players || editing.total_players <= 0) e.total_players = true;
    if (!editing.room_id?.trim()) e.room_id = true;
    if (!editing.room_password?.trim()) e.room_password = true;
    if (!editing.match_url?.trim()) e.match_url = true;
    if (!editing.kill_rate_type) e.kill_rate_type = true;
    if (editing.entry_fee_bac === undefined || editing.entry_fee_bac === null || Number.isNaN(Number(editing.entry_fee_bac))) e.entry_fee_bac = true;
    if (!editing.status) e.status = true;
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error("Please fill the highlighted required fields");
      return;
    }
    const payload: Record<string, unknown> = { ...editing };
    if (payload.schedule_at && typeof payload.schedule_at === "string") {
      payload.schedule_at = new Date(payload.schedule_at).toISOString();
    }
    if (typeof payload.match_url === "string" && payload.match_url.trim() && !/^https?:\/\//i.test(payload.match_url as string)) {
      payload.match_url = `https://${(payload.match_url as string).trim()}`;
    }
    delete (payload as { id?: number }).id;
    delete (payload as { result_applied?: boolean }).result_applied;
    delete (payload as { deleted_at?: string | null }).deleted_at;
    const { error } = await supabase.rpc("admin_save_match", {
      p_match_id: (editing.id ?? null) as never,
      p_payload: payload as never,
    });
    if (error) return toast.error(error.message);
    toast.success(editing.id ? "Match updated" : "Match created");
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["admin-matches"] });
  }


  async function softDelete(id: number) {
    if (!confirm("Soft-delete this match?")) return;
    const { error } = await supabase.rpc("admin_delete_match", { p_match_id: id });
    if (error) return toast.error(error.message);
    toast.success("Match deleted");
    qc.invalidateQueries({ queryKey: ["admin-matches"] });
  }

  async function deleteSelected() {
    if (selectedIds.size === 0) return toast.error("No matches selected");
    if (!confirm(`Delete ${selectedIds.size} selected match${selectedIds.size === 1 ? "" : "es"}?`)) return;
    let ok = 0;
    for (const id of selectedIds) {
      const { error } = await supabase.rpc("admin_delete_match", { p_match_id: id });
      if (!error) ok++;
    }
    toast.success(`${ok} deleted`);
    setSelectedIds(new Set());
    qc.invalidateQueries({ queryKey: ["admin-matches"] });
  }

  async function deleteAllMatches() {
    if (!confirm("⚠ Soft-delete ALL matches? This cannot be undone from the UI.")) return;
    if (!confirm("Are you really sure? Type OK in the next prompt to confirm.")) return;
    const c = prompt("Type DELETE ALL to confirm:");
    if (c !== "DELETE ALL") return toast.error("Cancelled");
    const { data: n, error } = await supabase.rpc("admin_delete_all_matches");
    if (error) return toast.error(error.message);
    toast.success(`${n ?? 0} matches deleted`);
    setSelectedIds(new Set());
    qc.invalidateQueries({ queryKey: ["admin-matches"] });
  }

  async function cancelMatch(id: number) {
    const reason = prompt("Reason for cancellation (will be shown in refund logs):", "Match cancelled by admin");
    if (reason == null) return;
    const { data: refunded, error } = await supabase.rpc("admin_cancel_match", { p_match_id: id, p_reason: reason });
    if (error) return toast.error(error.message);
    toast.success(`Cancelled. ${refunded ?? 0} entries refunded.`);
    qc.invalidateQueries({ queryKey: ["admin-matches"] });
  }

  function exportCSV() {
    if (!matches.length) return toast.error("Nothing to export");
    const rows = matches.map((m) => ({
      id: m.id,
      match_name: m.match_name,
      map_name: m.map_name,
      game_mode: m.game_mode,
      player_mode: m.player_mode,
      schedule_at: new Date(m.schedule_at).toISOString(),
      status: m.status,
      match_type: m.match_type,
      premium_only: m.premium_only,
      entry_fee_bac: m.entry_fee_bac,
      total_players: m.total_players,
      rank_1_prize_bac: m.rank_1_prize_bac,
      rank_2_prize_bac: m.rank_2_prize_bac,
      rank_3_prize_bac: m.rank_3_prize_bac,
      per_kill_amount_bac: m.per_kill_amount_bac,
    }));
    exportRowsAsCSV(`matches-${Date.now()}`, rows);
  }

  const tBtn = "inline-flex items-center gap-1.5 rounded border border-border/70 px-2.5 py-1.5 font-hud text-[10px] uppercase tracking-widest text-foreground/70 hover:border-gold hover:text-gold";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl uppercase tracking-[0.2em] text-foreground">Match Operations</h1>
          <p className="font-hud text-xs uppercase tracking-widest text-foreground/60">Create, edit, cancel and publish tournaments</p>
        </div>
        <button
          onClick={() => setEditing(emptyDraft())}
          className="flex items-center gap-2 rounded border border-gold/60 bg-gold/10 px-4 py-2 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20"
        >
          <Plus size={14} /> New Match
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded border border-border/60 bg-card/40 px-3 py-1.5">
          <Search size={14} className="text-foreground/50" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name or map…"
            className="w-56 bg-transparent font-hud text-xs uppercase tracking-widest outline-none placeholder:text-foreground/40"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-border/60 bg-card/40 px-3 py-1.5 font-hud text-xs uppercase tracking-widest"
        >
          <option value="all">All status</option>
          {STATUS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* Toolbar */}
      <div className="hud-panel relative flex flex-wrap items-center gap-2 rounded-md border border-border/70 bg-card/40 px-3 py-2">
        <PortalMenu
          label={<><Columns3 className="h-3.5 w-3.5" /> Columns</>}
          btnCls={tBtn}
          open={openMenu === "cols"}
          onToggle={() => setOpenMenu(openMenu === "cols" ? null : "cols")}
          onClose={() => setOpenMenu(null)}
          width={200}
        >
          {ALL_M_COLS.map((c) => (
            <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded px-2 py-1 text-sm hover:bg-secondary/40">
              <input type="checkbox" checked={visibleCols[c.key]} onChange={(e) =>
                setVisibleCols((v) => ({ ...v, [c.key]: e.target.checked }))} />
              <span>{c.label}</span>
            </label>
          ))}
        </PortalMenu>
        <PortalMenu
          label={<><Rows3 className="h-3.5 w-3.5" /> Density</>}
          btnCls={tBtn}
          open={openMenu === "density"}
          onToggle={() => setOpenMenu(openMenu === "density" ? null : "density")}
          onClose={() => setOpenMenu(null)}
          width={160}
        >
          {(["compact", "standard", "comfortable"] as const).map((d) => (
            <button key={d} onClick={() => { setDensity(d); setOpenMenu(null); }}
              className={`block w-full rounded px-2 py-1 text-left text-sm capitalize hover:bg-secondary/40 ${density === d ? "text-gold" : ""}`}>
              {d}
            </button>
          ))}
        </PortalMenu>

        <button className={tBtn} onClick={exportCSV}>
          <Download className="h-3.5 w-3.5" /> Export
        </button>
        {selectedIds.size > 0 && (
          <button
            className="inline-flex items-center gap-1.5 rounded border border-destructive/70 bg-destructive/10 px-2.5 py-1.5 font-hud text-[10px] uppercase tracking-widest text-destructive hover:bg-destructive/20"
            onClick={deleteSelected}
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete Selected ({selectedIds.size})
          </button>
        )}
        <button
          className="inline-flex items-center gap-1.5 rounded border border-destructive/70 bg-destructive/10 px-2.5 py-1.5 font-hud text-[10px] uppercase tracking-widest text-destructive hover:bg-destructive/20"
          onClick={deleteAllMatches}
        >
          <Trash2 className="h-3.5 w-3.5" /> Delete All
        </button>
        <span className="ml-auto font-hud text-[10px] uppercase tracking-widest text-foreground/50">
          {matches.length} match{matches.length === 1 ? "" : "es"}
        </span>
      </div>

      <div className="hud-panel overflow-x-auto rounded-md border border-border/70 bg-card/40">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border/60 bg-secondary/40 text-left font-hud text-[10px] uppercase tracking-widest text-foreground/60">
            <tr>
              <th className="px-3 py-2 w-8">
                <input
                  type="checkbox"
                  checked={matches.length > 0 && matches.every((m) => selectedIds.has(m.id))}
                  onChange={(e) => {
                    if (e.target.checked) setSelectedIds(new Set(matches.map((m) => m.id)));
                    else setSelectedIds(new Set());
                  }}
                />
              </th>
              {showCol("match") && <th className="px-3 py-2">Match</th>}
              {showCol("schedule") && <th className="px-3 py-2">Schedule</th>}
              {showCol("status") && <th className="px-3 py-2">Status</th>}
              {showCol("type") && <th className="px-3 py-2">Type</th>}
              {showCol("entry") && <th className="px-3 py-2">Entry</th>}
              {showCol("slots") && <th className="px-3 py-2">Slots</th>}
              {showCol("actions") && <th className="px-3 py-2 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={8} className="px-3 py-6 text-center font-hud text-xs uppercase tracking-widest text-foreground/50">Loading…</td></tr>
            )}
            {!isLoading && matches.length === 0 && (
              <tr><td colSpan={8} className="px-3 py-6 text-center font-hud text-xs uppercase tracking-widest text-foreground/50">No matches</td></tr>
            )}
            {matches.map((m) => (
              <tr key={m.id} className="border-b border-border/40 last:border-0">
                <td className={`px-3 ${rowPad}`}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(m.id)}
                    onChange={(e) => {
                      const next = new Set(selectedIds);
                      if (e.target.checked) next.add(m.id);
                      else next.delete(m.id);
                      setSelectedIds(next);
                    }}
                  />
                </td>
                {showCol("match") && (
                <td className={`px-3 ${rowPad}`}>
                  <div className="font-display text-foreground">{m.match_name}</div>
                  <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/55">{m.map_name} · {m.game_mode} · {m.player_mode}</div>
                </td>
                )}
                {showCol("schedule") && <td className={`px-3 ${rowPad} font-mono text-[11px] text-foreground/80`}>{new Date(m.schedule_at).toLocaleString()}</td>}
                {showCol("status") && (
                <td className={`px-3 ${rowPad}`}>
                  <span className={`rounded border px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest ${
                    m.status === "Upcoming" ? "border-cyan-500/50 text-cyan-300" :
                    m.status === "Active" ? "border-emerald-500/50 text-emerald-300" :
                    m.status === "Completed" ? "border-gold/50 text-gold" :
                    "border-destructive/50 text-destructive"
                  }`}>{m.status}</span>
                </td>
                )}
                {showCol("type") && <td className={`px-3 ${rowPad} font-hud text-[10px] uppercase tracking-widest text-foreground/70`}>{m.match_type}{m.premium_only ? " · PRO" : ""}</td>}
                {showCol("entry") && <td className={`px-3 ${rowPad} tabular-nums`}>{Number(m.entry_fee_bac).toLocaleString()}</td>}
                {showCol("slots") && <td className={`px-3 ${rowPad} tabular-nums`}>{m.total_players}</td>}
                {showCol("actions") && (
                <td className={`px-3 ${rowPad}`}>
                  <div className="flex items-center justify-end gap-1">
                    <Link
                      to="/admin/results"
                      search={{ matchId: m.id } as never}
                      className="rounded border border-gold/40 px-2 py-1 font-hud text-[10px] uppercase tracking-widest text-gold hover:bg-gold/10"
                      title="Publish results"
                    >
                      <Trophy size={12} />
                    </Link>
                    <button
                      onClick={() => setEditing({ ...m, schedule_at: new Date(m.schedule_at).toISOString().slice(0, 16) })}
                      className="rounded border border-border/60 px-2 py-1 hover:border-gold hover:text-gold"
                      title="Edit"
                    >
                      <Pencil size={12} />
                    </button>
                    {m.status !== "Cancelled" && m.status !== "Completed" && (
                      <button
                        onClick={() => cancelMatch(m.id)}
                        className="rounded border border-border/60 px-2 py-1 hover:border-destructive hover:text-destructive"
                        title="Cancel + refund"
                      >
                        <Ban size={12} />
                      </button>
                    )}
                    <button
                      onClick={() => softDelete(m.id)}
                      className="rounded border border-border/60 px-2 py-1 hover:border-destructive hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <EditorModal draft={editing} setDraft={setEditing} onSave={save} onClose={() => setEditing(null)} errors={errors} />}
    </div>
  );
}

function EditorModal({
  draft, setDraft, onSave, onClose, errors,
}: {
  draft: Partial<Match>;
  setDraft: (d: Partial<Match> | null) => void;
  onSave: () => void;
  onClose: () => void;
  errors: Partial<Record<FieldKey, boolean>>;
}) {
  const upd = (patch: Partial<Match>) => setDraft({ ...draft, ...patch });

  const { data: games } = useQuery({
    queryKey: ["admin-matches-games"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("games")
        .select("id, game_name, image_url")
        .is("deleted_at", null)
        .eq("status", "active")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const isTDM = draft.game_mode === "TDM";

  const TDM_FORMATS = [
    "1v1", "2v2", "3v3", "4v4", "5v5", "6v6",
    "2v4", "3v6", "4v6", "Custom",
  ] as const;
  type TdmFmt = typeof TDM_FORMATS[number];
  const [tdmFormat, setTdmFormat] = useState<TdmFmt>("4v4");
  const [tdmMaxKills, setTdmMaxKills] = useState<number>(40);

  const winnerTeamSize = draft.player_mode === "Solo" ? 1 : draft.player_mode === "Duo" ? 2 : 4;
  const totalPlayers = Number(draft.total_players ?? 0);
  const loserCount = Math.max(0, totalPlayers - winnerTeamSize);
  const autoTotalKills = loserCount;

  const entryFee = Number(draft.entry_fee_bac ?? 0);
  const feePct = Number(draft.platform_fee_pct ?? 0);
  const totalIncome = entryFee * totalPlayers;
  const platformFee = totalIncome * (feePct / 100);
  const prizePool = totalIncome - platformFee;

  const autoPerKill = isTDM
    ? (tdmMaxKills > 0 ? Math.round((prizePool / tdmMaxKills) * 100) / 100 : 0)
    : (loserCount > 0 ? Math.round((prizePool / loserCount) * 100) / 100 : 0);
  const isAutoKill = draft.kill_rate_type === "Automatic";

  // Auto-fill total_players from TDM format
  useEffect(() => {
    if (!isTDM || tdmFormat === "Custom") return;
    const [a, b] = tdmFormat.split("v").map((n) => Number(n));
    const sum = (a || 0) + (b || 0);
    if (sum > 0 && sum !== draft.total_players) {
      setDraft({ ...draft, total_players: sum });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tdmFormat, isTDM]);

  useEffect(() => {
    if (isAutoKill && draft.per_kill_amount_bac !== autoPerKill) {
      setDraft({ ...draft, per_kill_amount_bac: autoPerKill });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAutoKill, autoPerKill]);

  const previewSrc = draft.map_image_url || draft.banner_image_url || null;


  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur">
      <div className="hud-panel w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-md border border-gold/40 bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg uppercase tracking-widest text-gold">
            {draft.id ? `Edit Match #${draft.id}` : "Create Match"}
          </h2>
          <button onClick={onClose} className="hud-btn hud-btn-ghost">Close</button>
        </div>

        {/* Top two-column section: left = identity + preview, right = combat settings */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* LEFT COLUMN */}
          <div className="space-y-3">
            <Field label="Game" required error={errors.game_id}>
              <select
                className={inp}
                value={draft.game_id ?? ""}
                onChange={(e) => upd({ game_id: e.target.value ? Number(e.target.value) : null })}
              >
                <option value="" disabled>Select Game</option>
                {games?.map((g) => (
                  <option key={g.id} value={g.id}>{g.game_name}</option>
                ))}
              </select>
            </Field>

            <Select label="Map" required error={errors.map_name} value={draft.map_name} options={draft.game_mode === "TDM" ? TDM_MAPS : CLASSIC_MAPS} onChange={(v) => upd({ map_name: v, map_image_url: MAP_IMAGES[v] ?? draft.map_image_url ?? null, banner_image_url: draft.banner_image_url ?? MAP_IMAGES[v] ?? null })} />

            {/* Map preview */}
            <div className="overflow-hidden rounded border border-border/60 bg-secondary/30">
              <div className="relative aspect-video w-full">
                {previewSrc ? (
                  <img src={previewSrc} alt={draft.map_name ?? "Map"} className="h-full w-full object-cover" />
                ) : (
                  <div className="grid h-full w-full place-items-center font-hud text-xs uppercase tracking-widest text-foreground/50">
                    Select a map to preview
                  </div>
                )}
                {draft.map_name && (
                  <span className="absolute left-2 top-2 rounded bg-black/60 px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest text-gold">
                    {draft.map_name}
                  </span>
                )}
              </div>
            </div>

            <Field label="Match/Event Name" required error={errors.match_name}>
              <input className={inp} value={draft.match_name ?? ""} onChange={(e) => upd({ match_name: e.target.value })} />
            </Field>

            <Field label="Match Schedule" required error={errors.schedule_at}>
              <input type="datetime-local" className={inp} value={draft.schedule_at ?? ""} onChange={(e) => upd({ schedule_at: e.target.value })} />
            </Field>

            <Select label="Match Type" required error={errors.match_type} value={draft.match_type} options={MATCH_TYPE} onChange={(v) => upd({ match_type: v })} />

            <Field label="Platform Fee (%)">
              <input type="number" min={0} className={inp} value={draft.platform_fee_pct ?? ""} onChange={(e) => upd({ platform_fee_pct: e.target.value === "" ? undefined : Number(e.target.value) })} />
              <span className="mt-1 block font-hud text-[10px] tracking-wider text-foreground/55">Percentage of total income kept by platform — drives Auto Per Kill</span>
            </Field>
          </div>

          {/* RIGHT COLUMN */}
          <div className="space-y-3">
            <Select label="Game Mode" required error={errors.game_mode} value={draft.game_mode} options={GAME_MODE} onChange={(v) => {
              const maps = v === "TDM" ? TDM_MAPS : CLASSIC_MAPS;
              const nextMap = (maps as readonly string[]).includes(draft.map_name ?? "") ? draft.map_name : maps[0];
              upd({ game_mode: v, map_name: nextMap, map_image_url: MAP_IMAGES[nextMap as string] ?? null, banner_image_url: MAP_IMAGES[nextMap as string] ?? null });
            }} />

            {isTDM && (
              <>
                <Field label="TDM Format" required>
                  <select
                    className={inp}
                    value={tdmFormat}
                    onChange={(e) => setTdmFormat(e.target.value as TdmFmt)}
                  >
                    {TDM_FORMATS.map((f) => (
                      <option key={f} value={f}>{f === "Custom" ? "Custom (manual total players)" : f}</option>
                    ))}
                  </select>
                  <span className="mt-1 block font-hud text-[10px] tracking-wider text-foreground/55">
                    Auto-fills Total Players (e.g. 2v4 → 6 players)
                  </span>
                </Field>

                <Field label="Max Kills Cap (TDM)">
                  <input
                    type="number"
                    min={1}
                    className={inp}
                    value={tdmMaxKills}
                    onChange={(e) => setTdmMaxKills(Math.max(1, Number(e.target.value) || 0))}
                  />
                  <span className="mt-1 block font-hud text-[10px] tracking-wider text-foreground/55">
                    Per-Kill payout = Prize Pool ÷ Max Kills
                  </span>
                </Field>
              </>
            )}



            <Field label={`Total Kills (${draft.game_mode ?? "Classic"})`}>
              <input
                type="number"
                className={inp}
                value={autoTotalKills}
                readOnly
              />
              <span className="mt-1 block font-hud text-[10px] tracking-wider text-foreground/55">
                Auto: loserCount = totalPlayer({totalPlayers}) − winnerTeamSize({winnerTeamSize}) = {autoTotalKills}
              </span>
            </Field>

            <Field label="Total Player" required error={errors.total_players}>
              <input type="number" min={0} className={inp} value={draft.total_players ?? ""} onChange={(e) => upd({ total_players: e.target.value === "" ? undefined : Number(e.target.value) })} />
            </Field>

            <Select label="Player Mode" required error={errors.player_mode} value={draft.player_mode} options={PLAYER_MODE} onChange={(v) => upd({ player_mode: v })} />

            <Field label="Room ID" required error={errors.room_id}>
              <input className={inp} value={draft.room_id ?? ""} onChange={(e) => upd({ room_id: e.target.value })} />
            </Field>

            <Field label="Password" required error={errors.room_password}>
              <input className={inp} value={draft.room_password ?? ""} onChange={(e) => upd({ room_password: e.target.value })} />
            </Field>

            <Field label="Match URL" required error={errors.match_url}>
              <input
                className={inp}
                placeholder="example.com/room"
                value={draft.match_url ?? ""}
                onChange={(e) => upd({ match_url: e.target.value })}
              />
              <span className="mt-1 block font-hud text-[10px] tracking-wider text-foreground/55">https:// will be added automatically if omitted</span>
            </Field>

            <Select label="Set Kill Rate" required error={errors.kill_rate_type} value={draft.kill_rate_type} options={KILL_TYPE} onChange={(v) => upd({ kill_rate_type: v })} />

            <Field label={isTDM ? "Deposit / Entry per Player" : "Entry Fee"} required error={errors.entry_fee_bac}>
              <input type="number" min={0} className={inp} value={draft.entry_fee_bac ?? ""} onChange={(e) => upd({ entry_fee_bac: e.target.value === "" ? undefined : Number(e.target.value) })} />
              {isTDM && (
                <span className="mt-1 block font-hud text-[10px] tracking-wider text-foreground/55">
                  Pool = {entryFee} × {totalPlayers} = {totalIncome} BAC · Fee ({feePct}%) = {Math.round(platformFee * 100) / 100} · Kill Pool = {Math.round(prizePool * 100) / 100}
                </span>
              )}
            </Field>

            <Field label={isAutoKill ? "Per Kill (Auto)" : "Per Kill"}>
              <input
                type="number"
                min={0}
                className={inp}
                value={isAutoKill ? autoPerKill : (draft.per_kill_amount_bac ?? "")}
                readOnly={isAutoKill}
                onChange={(e) => upd({ per_kill_amount_bac: e.target.value === "" ? undefined : Number(e.target.value) })}
              />
              <span className="mt-1 block font-hud text-[10px] tracking-wider text-foreground/55">
                {isAutoKill
                  ? isTDM
                    ? `Auto (TDM): Kill Pool ÷ Max Kills = ${Math.round(prizePool * 100) / 100} ÷ ${tdmMaxKills} = ${autoPerKill}`
                    : `Auto: entry × players × (1 − fee%) ÷ loserCount = ${totalIncome} ÷ ${loserCount} = ${autoPerKill}`
                  : "Manual — enter custom per-kill BAC reward"}
              </span>
            </Field>




            <label className="flex items-start gap-3 rounded border border-border/60 bg-secondary/30 px-3 py-2">
              <input
                type="checkbox"
                className="mt-1"
                checked={!!draft.premium_only}
                onChange={(e) => upd({ premium_only: e.target.checked })}
              />
              <span>
                <span className="block font-hud text-xs uppercase tracking-widest text-foreground/90">Premium Only</span>
                <span className="block font-hud text-[10px] tracking-wider text-foreground/55">Only premium members can join this match</span>
              </span>
            </label>
          </div>
        </div>

        {/* Rank prizes removed — kill-based rewards only */}

        {/* Banner + Prize Description side by side */}
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Field label="Upload Banner (Recommended 1000x500)">
              <ImageUploader value={draft.banner_image_url} onChange={(u) => upd({ banner_image_url: u })} folder="match-banners" aspect="16/9" />
            </Field>
          </div>
          <Field label="Prize Description">
            <textarea className={`${inp} h-32`} value={draft.prize_description ?? ""} onChange={(e) => upd({ prize_description: e.target.value })} />
          </Field>
        </div>

        {/* Banner library quick pick */}
        <div className="mt-4">
          <div className="mb-2 font-hud text-[10px] uppercase tracking-widest text-foreground/70">Banner Library — Click to Select</div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
            {MATCH_BANNERS.map((b) => {
              const active = draft.banner_image_url === b.url;
              return (
                <button
                  type="button"
                  key={b.url}
                  onClick={() => upd({ banner_image_url: b.url })}
                  title={b.label}
                  className={`group relative aspect-video overflow-hidden rounded border transition ${active ? "border-gold ring-2 ring-gold/60" : "border-border/60 hover:border-gold/60"}`}
                >
                  <img loading="lazy" decoding="async" src={b.url} alt={b.label} className="h-full w-full object-cover transition group-hover:scale-105" />
                  <span className="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-0.5 text-[9px] font-hud uppercase tracking-wider text-white truncate">{b.label}</span>
                  {active && (
                    <span className="absolute right-1 top-1 grid h-5 w-5 place-items-center rounded-full bg-gold text-black">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sponsor + descriptions */}
        <div className="mt-4 space-y-3">
          <Field label="Match Sponsor">
            <input className={inp} value={draft.sponsor ?? ""} onChange={(e) => upd({ sponsor: e.target.value })} />
          </Field>
          <Field label="Match Description">
            <textarea className={`${inp} h-24`} value={draft.description ?? ""} onChange={(e) => upd({ description: e.target.value })} />
          </Field>
          <Field label="Match Private Description (Visible to joined players)">
            <textarea className={`${inp} h-24`} value={draft.private_description ?? ""} onChange={(e) => upd({ private_description: e.target.value })} />
          </Field>
          <Field label="Live Stream URL (YouTube)">
            <input className={inp} placeholder="https://youtube.com/watch?v=…" value={draft.live_stream_url ?? ""} onChange={(e) => upd({ live_stream_url: e.target.value })} />
          </Field>
          <Select label="Match Status" required value={draft.status} options={STATUS} onChange={(v) => upd({ status: v })} />
          
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="hud-btn hud-btn-ghost">Cancel</button>
          <button onClick={onSave} className="hud-btn hud-btn-primary">
            {draft.id ? "Save Changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full rounded border border-border/60 bg-secondary/40 px-3 py-2 font-mono text-sm outline-none focus:border-gold";

function Field({ label, required, error, children }: { label: string; required?: boolean; error?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className={`font-hud text-[10px] uppercase tracking-widest ${error ? "text-destructive" : "text-foreground/60"}`}>
        {label}{required ? <span className="ml-1 text-destructive">*</span> : <span className="ml-1 text-foreground/30">(optional)</span>}
        {error && <span className="ml-2 normal-case tracking-normal text-destructive">— required</span>}
      </span>
      <div className={error ? "rounded ring-2 ring-destructive" : ""}>
        {children}
      </div>
    </label>
  );
}

function Select<T extends string>({ label, value, options, onChange, required, error, placeholder }: { label: string; value: T | undefined; options: readonly T[]; onChange: (v: T) => void; required?: boolean; error?: boolean; placeholder?: string }) {
  return (
    <Field label={label} required={required} error={error}>
      <select className={inp} value={value ?? ""} onChange={(e) => onChange(e.target.value as T)}>
        <option value="" disabled>{placeholder ?? `Select ${label}`}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}

