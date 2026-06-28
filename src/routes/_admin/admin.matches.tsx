import { useMemo, useState } from "react";
import { ImageUploader } from "@/components/admin/ImageUploader";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Ban, Trophy, Search, Check } from "lucide-react";
import { MATCH_BANNERS } from "@/lib/match-banners";

export const Route = createFileRoute("/_admin/admin/matches")({
  component: AdminMatchesPage,
});

type Match = {
  id: number;
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
const GAME_MODE = ["Classic", "Arcade", "EvoGround", "Arena", "TDM"] as const;
const PLAYER_MODE = ["Solo", "Duo", "Squad"] as const;
const MAP_OPTIONS = ["Erangel", "Miramar", "Sanhok", "Vikendi", "Livik", "Karakin", "Paramo", "Haven", "Rondo", "Nusa"] as const;
const REWARD_TYPE = ["KillBased", "RankBased", "Mixed"] as const;
const KILL_TYPE = ["PerKill", "Total"] as const;

function emptyDraft(): Partial<Match> {
  return {
    match_name: "",
    map_name: "Erangel",
    status: "Upcoming",
    match_type: "Free",
    game_mode: "Classic",
    player_mode: "Squad",
    reward_type: "RankBased",
    kill_rate_type: "PerKill",
    total_players: 100,
    entry_fee_bac: 0,
    per_kill_amount_bac: 0,
    rank_1_prize_bac: 500,
    rank_2_prize_bac: 250,
    rank_3_prize_bac: 100,
    schedule_at: new Date(Date.now() + 24 * 3600 * 1000).toISOString().slice(0, 16),
    premium_only: false,
  };
}

function AdminMatchesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [editing, setEditing] = useState<Partial<Match> | null>(null);

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
    const missing: string[] = [];
    if (!editing.match_name?.trim()) missing.push("Match Name");
    if (!editing.map_name?.trim()) missing.push("Map");
    if (!editing.schedule_at) missing.push("Schedule");
    if (!editing.total_players || editing.total_players <= 0) missing.push("Total Players");
    if (missing.length) return toast.error(`Required field missing: ${missing.join(", ")}`);
    const payload: Record<string, unknown> = { ...editing };
    if (payload.schedule_at && typeof payload.schedule_at === "string") {
      payload.schedule_at = new Date(payload.schedule_at).toISOString();
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

  async function cancelMatch(id: number) {
    const reason = prompt("Reason for cancellation (will be shown in refund logs):", "Match cancelled by admin");
    if (reason == null) return;
    const { data: refunded, error } = await supabase.rpc("admin_cancel_match", { p_match_id: id, p_reason: reason });
    if (error) return toast.error(error.message);
    toast.success(`Cancelled. ${refunded ?? 0} entries refunded.`);
    qc.invalidateQueries({ queryKey: ["admin-matches"] });
  }

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

      <div className="hud-panel overflow-x-auto rounded-md border border-border/70 bg-card/40">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="border-b border-border/60 bg-secondary/40 text-left font-hud text-[10px] uppercase tracking-widest text-foreground/60">
            <tr>
              <th className="px-3 py-2">Match</th>
              <th className="px-3 py-2">Schedule</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2">Entry</th>
              <th className="px-3 py-2">Slots</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={7} className="px-3 py-6 text-center font-hud text-xs uppercase tracking-widest text-foreground/50">Loading…</td></tr>
            )}
            {!isLoading && matches.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center font-hud text-xs uppercase tracking-widest text-foreground/50">No matches</td></tr>
            )}
            {matches.map((m) => (
              <tr key={m.id} className="border-b border-border/40 last:border-0">
                <td className="px-3 py-2">
                  <div className="font-display text-foreground">{m.match_name}</div>
                  <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/55">{m.map_name} · {m.game_mode} · {m.player_mode}</div>
                </td>
                <td className="px-3 py-2 font-mono text-[11px] text-foreground/80">{new Date(m.schedule_at).toLocaleString()}</td>
                <td className="px-3 py-2">
                  <span className={`rounded border px-2 py-0.5 font-hud text-[10px] uppercase tracking-widest ${
                    m.status === "Upcoming" ? "border-cyan-500/50 text-cyan-300" :
                    m.status === "Active" ? "border-emerald-500/50 text-emerald-300" :
                    m.status === "Completed" ? "border-gold/50 text-gold" :
                    "border-destructive/50 text-destructive"
                  }`}>{m.status}</span>
                </td>
                <td className="px-3 py-2 font-hud text-[10px] uppercase tracking-widest text-foreground/70">{m.match_type}{m.premium_only ? " · PRO" : ""}</td>
                <td className="px-3 py-2 tabular-nums">{Number(m.entry_fee_bac).toLocaleString()}</td>
                <td className="px-3 py-2 tabular-nums">{m.total_players}</td>
                <td className="px-3 py-2">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && <EditorModal draft={editing} setDraft={setEditing} onSave={save} onClose={() => setEditing(null)} />}
    </div>
  );
}

function EditorModal({
  draft, setDraft, onSave, onClose,
}: {
  draft: Partial<Match>;
  setDraft: (d: Partial<Match> | null) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  const upd = (patch: Partial<Match>) => setDraft({ ...draft, ...patch });
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4 backdrop-blur">
      <div className="hud-panel w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-md border border-gold/40 bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg uppercase tracking-widest text-gold">
            {draft.id ? `Edit Match #${draft.id}` : "New Match"}
          </h2>
          <button onClick={onClose} className="font-hud text-xs uppercase tracking-widest text-foreground/60 hover:text-gold">Close</button>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Field label="Match Name" required><input className={inp} value={draft.match_name ?? ""} onChange={(e) => upd({ match_name: e.target.value })} /></Field>
          <Select label="Map" value={draft.map_name} options={MAP_OPTIONS} onChange={(v) => upd({ map_name: v })} />
          <Field label="Schedule (local)" required><input type="datetime-local" className={inp} value={draft.schedule_at ?? ""} onChange={(e) => upd({ schedule_at: e.target.value })} /></Field>
          <Field label="Total Players" required><input type="number" className={inp} value={draft.total_players ?? 0} onChange={(e) => upd({ total_players: Number(e.target.value) })} /></Field>

          <Select label="Status" value={draft.status} options={STATUS} onChange={(v) => upd({ status: v })} />
          <Select label="Match Type" value={draft.match_type} options={MATCH_TYPE} onChange={(v) => upd({ match_type: v })} />
          <Select label="Game Mode" value={draft.game_mode} options={GAME_MODE} onChange={(v) => upd({ game_mode: v })} />
          <Select label="Player Mode" value={draft.player_mode} options={PLAYER_MODE} onChange={(v) => upd({ player_mode: v })} />
          <Select label="Reward Type" value={draft.reward_type} options={REWARD_TYPE} onChange={(v) => upd({ reward_type: v })} />
          <Select label="Kill Rate" value={draft.kill_rate_type} options={KILL_TYPE} onChange={(v) => upd({ kill_rate_type: v })} />

          <Field label="Entry Fee BAC"><input type="number" className={inp} value={draft.entry_fee_bac ?? 0} onChange={(e) => upd({ entry_fee_bac: Number(e.target.value) })} /></Field>
          <Field label="Per Kill BAC"><input type="number" className={inp} value={draft.per_kill_amount_bac ?? 0} onChange={(e) => upd({ per_kill_amount_bac: Number(e.target.value) })} /></Field>
          <Field label="Rank 1 Prize"><input type="number" className={inp} value={draft.rank_1_prize_bac ?? 0} onChange={(e) => upd({ rank_1_prize_bac: Number(e.target.value) })} /></Field>
          <Field label="Rank 2 Prize"><input type="number" className={inp} value={draft.rank_2_prize_bac ?? 0} onChange={(e) => upd({ rank_2_prize_bac: Number(e.target.value) })} /></Field>
          <Field label="Rank 3 Prize"><input type="number" className={inp} value={draft.rank_3_prize_bac ?? 0} onChange={(e) => upd({ rank_3_prize_bac: Number(e.target.value) })} /></Field>
          <Field label="Platform Fee %"><input type="number" className={inp} value={draft.platform_fee_pct ?? 0} onChange={(e) => upd({ platform_fee_pct: Number(e.target.value) })} /></Field>

          <Field label="Room ID"><input className={inp} value={draft.room_id ?? ""} onChange={(e) => upd({ room_id: e.target.value })} placeholder="Visible only to joined players" /></Field>
          <Field label="Room Password"><input className={inp} value={draft.room_password ?? ""} onChange={(e) => upd({ room_password: e.target.value })} /></Field>

          <Field label="Sponsor"><input className={inp} value={draft.sponsor ?? ""} onChange={(e) => upd({ sponsor: e.target.value })} /></Field>
          <Field label="Match URL"><input className={inp} value={draft.match_url ?? ""} onChange={(e) => upd({ match_url: e.target.value })} /></Field>
          <Field label="Live Stream URL (YouTube)"><input className={inp} value={draft.live_stream_url ?? ""} onChange={(e) => upd({ live_stream_url: e.target.value })} placeholder="https://youtube.com/watch?v=…" /></Field>
          <Field label="Banner Image"><ImageUploader value={draft.banner_image_url} onChange={(u) => upd({ banner_image_url: u })} folder="match-banners" aspect="16/9" /></Field>
          <Field label="Map Image"><ImageUploader value={draft.map_image_url} onChange={(u) => upd({ map_image_url: u })} folder="match-maps" aspect="16/9" /></Field>

          <label className="flex items-center gap-2 font-hud text-xs uppercase tracking-widest text-foreground/80">
            <input type="checkbox" checked={!!draft.premium_only} onChange={(e) => upd({ premium_only: e.target.checked })} />
            Premium Only
          </label>
        </div>

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

        <div className="mt-3 grid grid-cols-1 gap-3">
          <Field label="Public Description"><textarea className={`${inp} h-20`} value={draft.description ?? ""} onChange={(e) => upd({ description: e.target.value })} /></Field>
          <Field label="Prize Description"><textarea className={`${inp} h-20`} value={draft.prize_description ?? ""} onChange={(e) => upd({ prize_description: e.target.value })} /></Field>
          <Field label="Private Brief (joined players)"><textarea className={`${inp} h-20`} value={draft.private_description ?? ""} onChange={(e) => upd({ private_description: e.target.value })} /></Field>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button onClick={onClose} className="rounded border border-border/60 px-4 py-2 font-hud text-xs uppercase tracking-widest hover:border-foreground">Cancel</button>
          <button onClick={onSave} className="rounded border border-gold/60 bg-gold/10 px-4 py-2 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/20">
            {draft.id ? "Save Changes" : "Create Match"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inp = "w-full rounded border border-border/60 bg-secondary/40 px-3 py-2 font-mono text-sm outline-none focus:border-gold";

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">
        {label}{required ? <span className="ml-1 text-destructive">*</span> : <span className="ml-1 text-foreground/30">(optional)</span>}
      </span>
      {children}
    </label>
  );
}

function Select<T extends string>({ label, value, options, onChange, required, placeholder }: { label: string; value: T | undefined; options: readonly T[]; onChange: (v: T) => void; required?: boolean; placeholder?: string }) {
  return (
    <Field label={label} required={required}>
      <select className={inp} value={value ?? ""} onChange={(e) => onChange(e.target.value as T)}>
        <option value="" disabled>{placeholder ?? `Select ${label}`}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </Field>
  );
}
