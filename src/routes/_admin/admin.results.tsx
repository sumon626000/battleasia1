import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, Upload, X, Loader2, Image as ImageIcon } from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";

const search = z.object({ matchId: z.coerce.number().optional() });

export const Route = createFileRoute("/_admin/admin/results")({
  validateSearch: search,
  component: AdminResultsPage,
});

type Participant = {
  id: number;
  user_id: string;
  rank_position: number | null;
  kills: number;
  prize_bac: number;
  kill_prize_bac: number;
  status: string;
  result_applied: boolean;
};

type ProfileLite = { id: string; in_game_username: string | null; username: string | null; pubg_id: string | null };

type Match = {
  id: number;
  match_name: string;
  status: string;
  per_kill_amount_bac: number;
  result_applied: boolean;
  entry_fee_bac: number;
  total_players: number;
  platform_fee_pct: number;
  player_mode: string;
  room_id: string | null;
};

type RowState = {
  status: "Winner" | "Loser";
  kills: string;
  win_prize: string;
  bonus: string;
};

function AdminResultsPage() {
  const qc = useQueryClient();
  const { matchId } = Route.useSearch();
  const [selectedId, setSelectedId] = useState<number | undefined>(matchId);
  const [rows, setRows] = useState<Record<string, RowState>>({});
  const [search, setSearch] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (matchId) setSelectedId(matchId); }, [matchId]);

  const { data: matches } = useQuery({
    queryKey: ["admin-results-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id, match_name, status, per_kill_amount_bac, result_applied, schedule_at")
        .is("deleted_at", null)
        .order("schedule_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as (Match & { schedule_at: string })[];
    },
  });

  const { data: detail, isLoading } = useQuery({
    queryKey: ["admin-result-detail", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const [{ data: m, error: e1 }, { data: parts, error: e2 }] = await Promise.all([
        supabase.from("matches").select("*").eq("id", selectedId!).maybeSingle(),
        supabase.from("match_participants").select("id, user_id, rank_position, kills, prize_bac, kill_prize_bac, status, result_applied").eq("match_id", selectedId!),
      ]);
      if (e1) throw e1;
      if (e2) throw e2;
      const userIds = (parts ?? []).map((p) => p.user_id);
      let profiles: ProfileLite[] = [];
      if (userIds.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, in_game_username, username, pubg_id")
          .in("id", userIds);
        profiles = (profs as ProfileLite[]) ?? [];
      }
      const profMap = new Map(profiles.map((p) => [p.id, p]));
      return { match: m as Match, participants: (parts as Participant[]) ?? [], profMap };
    },
  });

  useEffect(() => {
    if (!detail) return;
    const seed: Record<string, RowState> = {};
    for (const p of detail.participants) {
      seed[p.user_id] = {
        status: p.status === "win" || p.rank_position === 1 ? "Winner" : "Loser",
        kills: p.kills ? String(p.kills) : "",
        win_prize: p.prize_bac ? String(p.prize_bac) : "",
        bonus: "",
      };
    }
    setRows(seed);
  }, [detail]);

  const pool = useMemo(() => {
    if (!detail) return { totalIncome: 0, platformFee: 0, prizePool: 0, perKill: 0, killCount: 0, teamSize: 1 };
    const m = detail.match;
    const entry = Number(m.entry_fee_bac ?? 0);
    const total = Number(m.total_players ?? 0);
    const feePct = Number(m.platform_fee_pct ?? 0);
    const totalIncome = entry * total;
    const platformFee = totalIncome * (feePct / 100);
    const prizePool = totalIncome - platformFee;
    const teamSize = m.player_mode === "Solo" ? 1 : m.player_mode === "Duo" ? 2 : 4;
    const killCount = Math.max(total - teamSize, 1);
    const perKill = Number(m.per_kill_amount_bac ?? 0) > 0
      ? Number(m.per_kill_amount_bac)
      : Math.round((prizePool / killCount) * 100) / 100;
    return { totalIncome, platformFee, prizePool, perKill, killCount, teamSize };
  }, [detail]);

  async function uploadImage(file: File) {
    if (!file.type.startsWith("image/")) return toast.error("Pick an image file");
    if (file.size > 8 * 1024 * 1024) return toast.error("Max 8MB");
    setUploading(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? "admin";
      const path = `${uid}/match-results/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: false, contentType: file.type });
      if (error) throw error;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      setImageUrl(data.publicUrl);
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function publish() {
    if (!detail) return;
    if (detail.match.result_applied) return toast.error("Results already published for this match.");
    const results = detail.participants.map((p) => {
      const r = rows[p.user_id] ?? { status: "Loser" as const, kills: "", win_prize: "", bonus: "" };
      return {
        user_id: p.user_id,
        status: r.status,
        kills: parseInt(r.kills, 10) || 0,
        win_prize: parseFloat(r.win_prize) || 0,
        bonus: parseFloat(r.bonus) || 0,
      };
    });
    if (!confirm(`Publish results for ${results.length} player(s)? Prizes will be credited and cannot be undone.`)) return;
    const { error, data } = await supabase.rpc("admin_publish_match_result", {
      p_match_id: detail.match.id,
      p_results: results as never,
      p_result_description: description || null,
      p_result_image_url: imageUrl,
    } as never);
    if (error) return toast.error(error.message);
    toast.success(`Published — ${data} row(s) credited.`);
    qc.invalidateQueries({ queryKey: ["admin-result-detail", selectedId] });
    qc.invalidateQueries({ queryKey: ["admin-results-matches"] });
  }

  const filtered = useMemo(() => {
    if (!detail) return [];
    const q = search.trim().toLowerCase();
    if (!q) return detail.participants;
    return detail.participants.filter((p) => {
      const prof = detail.profMap.get(p.user_id);
      return (prof?.in_game_username || "").toLowerCase().includes(q)
        || (prof?.username || "").toLowerCase().includes(q)
        || (prof?.pubg_id || "").toLowerCase().includes(q);
    });
  }, [detail, search]);

  const winnerCount = useMemo(() => Object.values(rows).filter((r) => r.status === "Winner").length, [rows]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-[0.2em] text-foreground">Result Center</h1>
        <p className="font-hud text-xs uppercase tracking-widest text-foreground/60">Upload media · enter stats · credit prizes</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(e.target.value ? Number(e.target.value) : undefined)}
          className="min-w-[260px] rounded border border-border/60 bg-card/40 px-3 py-2 font-hud text-xs uppercase tracking-widest"
        >
          <option value="">Select match…</option>
          {(matches ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              #{m.id} · {m.match_name} {m.result_applied ? "· PUBLISHED" : `· ${m.status}`}
            </option>
          ))}
        </select>
      </div>

      {!selectedId && (
        <div className="hud-panel rounded-md border border-border/70 bg-card/40 p-6 text-center font-hud text-xs uppercase tracking-widest text-foreground/60">
          Choose a match to enter results.
        </div>
      )}

      {selectedId && isLoading && (
        <div className="font-hud text-xs uppercase tracking-widest text-foreground/60">Loading match…</div>
      )}

      {detail && (
        <>
          {/* Result Media */}
          <section className="hud-panel rounded-md border border-border/70 bg-card/40 p-4 space-y-3">
            <div>
              <div className="font-display text-base text-foreground">Result Media</div>
              <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/55">
                Match: {detail.match.match_name} {detail.match.room_id ? `· Room #${detail.match.room_id}` : ""}
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) uploadImage(f);
                }}
                className="relative flex min-h-[200px] flex-col items-center justify-center gap-2 rounded border border-dashed border-border/60 bg-background/40 p-4 text-center"
              >
                {imageUrl ? (
                  <>
                    <img src={imageUrl} alt="Result" className="max-h-[200px] rounded object-contain" />
                    <button
                      type="button"
                      onClick={() => setImageUrl(null)}
                      className="absolute right-2 top-2 rounded bg-black/70 p-1 text-white hover:bg-red-600"
                    >
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    {uploading ? <Loader2 className="animate-spin text-foreground/50" /> : <ImageIcon className="text-foreground/40" size={32} />}
                    <div className="font-display text-sm text-foreground">Drop or Select file</div>
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="font-hud text-[11px] uppercase tracking-widest text-primary underline"
                    >
                      browse
                    </button>
                    <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/50">
                      JPG · PNG · GIF · WEBP (max 8MB)
                    </div>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) uploadImage(f);
                  }}
                />
              </div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Result Description"
                rows={8}
                className="rounded border border-border/60 bg-background/60 px-3 py-2 font-mono text-sm outline-none focus:border-gold"
              />
            </div>
          </section>

          {/* Match Entries */}
          <section className="hud-panel rounded-md border border-border/70 bg-card/40 p-4 space-y-3">
            <div>
              <div className="font-display text-base text-foreground">Match Entries</div>
              <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/55">
                {detail.match.player_mode} · Per Kill: {pool.perKill} coins · Platform Fee: {detail.match.platform_fee_pct}%
              </div>
            </div>

            {/* Prize Pool Breakdown */}
            <div className="rounded border border-border/60 bg-background/40 p-3">
              <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/60 mb-2">Prize Pool Breakdown</div>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                <Stat label="Total Income" value={pool.totalIncome} sub={`${detail.match.total_players} × ${detail.match.entry_fee_bac}`} />
                <Stat label={`Platform Fee (${detail.match.platform_fee_pct}%)`} value={-pool.platformFee} negative />
                <Stat label="Prize Pool" value={pool.prizePool} bold />
                <Stat label="Kill Money Pool" value={pool.prizePool} green />
                <Stat label={`Per Kill (÷${pool.killCount} W.kills)`} value={pool.perKill} green sub={`${pool.prizePool} ÷ ${pool.killCount}`} />
              </div>
            </div>

            <div className="rounded bg-secondary/30 px-3 py-2 font-hud text-xs uppercase tracking-widest text-foreground/70">
              Winners: <span className="text-gold font-bold">{winnerCount}</span>
            </div>

            <div className="flex justify-end">
              <label className="flex items-center gap-2 font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                Search:
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search…"
                  className="rounded border border-border/60 bg-background/60 px-2 py-1 font-mono text-xs"
                />
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead className="border-b border-border/60 bg-secondary/40 text-left font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                  <tr>
                    <th className="px-2 py-2 w-12">Sr</th>
                    <th className="px-2 py-2">Game ID</th>
                    <th className="px-2 py-2">User Name</th>
                    <th className="px-2 py-2 w-32">Player Status</th>
                    <th className="px-2 py-2 w-20">Killed</th>
                    <th className="px-2 py-2 w-24">Kill Win</th>
                    <th className="px-2 py-2 w-24">Win Prize</th>
                    <th className="px-2 py-2 w-24">Bonus</th>
                    <th className="px-2 py-2 w-28">Total Win</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr><td colSpan={9} className="px-3 py-6 text-center font-hud text-xs uppercase tracking-widest text-foreground/50">No participants.</td></tr>
                  )}
                  {filtered.map((p, idx) => {
                    const prof = detail.profMap.get(p.user_id);
                    const r = rows[p.user_id] ?? { status: "Loser" as const, kills: "", win_prize: "", bonus: "" };
                    const isWinner = r.status === "Winner";
                    const kills = parseInt(r.kills, 10) || 0;
                    const killWin = isWinner ? Math.round(kills * pool.perKill * 100) / 100 : 0;
                    const wp = parseFloat(r.win_prize) || 0;
                    const bn = parseFloat(r.bonus) || 0;
                    const total = killWin + wp + bn;
                    return (
                      <tr key={p.id} className={`border-b border-border/40 last:border-0 ${isWinner ? "bg-emerald-500/5" : ""}`}>
                        <td className="px-2 py-2 font-mono text-xs">{idx + 1}</td>
                        <td className="px-2 py-2 font-mono text-xs">{prof?.pubg_id ?? "—"}</td>
                        <td className="px-2 py-2 font-display">{prof?.in_game_username || prof?.username || p.user_id.slice(0, 8)}</td>
                        <td className="px-2 py-2">
                          <select
                            disabled={detail.match.result_applied}
                            value={r.status}
                            onChange={(e) => setRows({ ...rows, [p.user_id]: { ...r, status: e.target.value as "Winner" | "Loser" } })}
                            className="w-full rounded border border-border/60 bg-secondary/40 px-2 py-1 font-hud text-xs"
                          >
                            <option value="Winner">Winner</option>
                            <option value="Loser">Loser</option>
                          </select>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number" min={0}
                            disabled={!isWinner || detail.match.result_applied}
                            value={r.kills}
                            onChange={(e) => setRows({ ...rows, [p.user_id]: { ...r, kills: e.target.value } })}
                            className="w-full rounded border border-border/60 bg-secondary/40 px-2 py-1 font-mono text-sm outline-none focus:border-gold disabled:opacity-50"
                          />
                        </td>
                        <td className="px-2 py-2 tabular-nums font-display text-gold">
                          <span className="inline-flex items-center gap-1">{killWin.toLocaleString()}<CoinIcon size={11} /></span>
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number" min={0} step="0.01"
                            disabled={!isWinner || detail.match.result_applied}
                            value={r.win_prize}
                            onChange={(e) => setRows({ ...rows, [p.user_id]: { ...r, win_prize: e.target.value } })}
                            className="w-full rounded border border-border/60 bg-secondary/40 px-2 py-1 font-mono text-sm outline-none focus:border-gold disabled:opacity-50"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <input
                            type="number" min={0} step="0.01"
                            disabled={!isWinner || detail.match.result_applied}
                            value={r.bonus}
                            onChange={(e) => setRows({ ...rows, [p.user_id]: { ...r, bonus: e.target.value } })}
                            className="w-full rounded border border-border/60 bg-secondary/40 px-2 py-1 font-mono text-sm outline-none focus:border-gold disabled:opacity-50"
                          />
                        </td>
                        <td className="px-2 py-2 tabular-nums font-display text-base text-gold">
                          <span className="inline-flex items-center gap-1">{total.toLocaleString()}<CoinIcon size={12} /></span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!detail.match.result_applied && detail.participants.length > 0 && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={publish}
                  className="flex items-center gap-2 rounded border border-gold/60 bg-gold/15 px-5 py-2 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/25"
                >
                  <Trophy size={14} /> Publish Results & Credit Prizes
                </button>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, sub, negative, green, bold }: { label: string; value: number; sub?: string; negative?: boolean; green?: boolean; bold?: boolean }) {
  return (
    <div>
      <div className="font-hud text-[9px] uppercase tracking-widest text-foreground/55">{label}</div>
      <div className={`flex items-center gap-1 tabular-nums ${bold ? "font-display text-lg" : "font-mono text-sm"} ${green ? "text-emerald-400" : negative ? "text-red-400" : "text-foreground"}`}>
        {value.toFixed(2)}<CoinIcon size={11} />
      </div>
      {sub && <div className="font-mono text-[9px] text-foreground/45">{sub}</div>}
    </div>
  );
}
