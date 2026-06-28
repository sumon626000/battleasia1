import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, Save, Upload, FileSpreadsheet } from "lucide-react";
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
  status: string;
  result_applied: boolean;
};

type ProfileLite = { id: string; in_game_username: string | null; username: string | null; pubg_id: string | null };

type Match = {
  id: number;
  match_name: string;
  status: string;
  reward_type: string;
  per_kill_amount_bac: number;
  rank_1_prize_bac: number;
  rank_2_prize_bac: number;
  rank_3_prize_bac: number;
  result_applied: boolean;
  entry_fee_bac: number;
  total_players: number;
  platform_fee_pct: number;
  player_mode: string;
};

function AdminResultsPage() {
  const qc = useQueryClient();
  const { matchId } = Route.useSearch();
  const [selectedId, setSelectedId] = useState<number | undefined>(matchId);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [rows, setRows] = useState<Record<string, { status: string; kills: string }>>({});
  const [csvText, setCsvText] = useState("");

  useEffect(() => { if (matchId) setSelectedId(matchId); }, [matchId]);

  const { data: matches } = useQuery({
    queryKey: ["admin-results-matches"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("id, match_name, status, reward_type, per_kill_amount_bac, rank_1_prize_bac, rank_2_prize_bac, rank_3_prize_bac, result_applied, schedule_at")
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
        supabase.from("match_participants").select("id, user_id, rank_position, kills, prize_bac, status, result_applied").eq("match_id", selectedId!),
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
    const seed: Record<string, { status: string; kills: string }> = {};
    for (const p of detail.participants) {
      seed[p.user_id] = {
        status: p.rank_position === 1 ? "Winner" : (p.rank_position || p.kills) ? "Loser" : "",
        kills: p.kills ? String(p.kills) : "",
      };
    }
    setRows(seed);
  }, [detail]);

  // Pool breakdown
  const pool = useMemo(() => {
    if (!detail) return { totalIncome: 0, platformFee: 0, prizePool: 0, killPool: 0, perKill: 0, loserCount: 0 };
    const m = detail.match;
    const entry = Number(m.entry_fee_bac ?? 0);
    const total = Number(m.total_players ?? 0);
    const feePct = Number(m.platform_fee_pct ?? 0);
    const totalIncome = entry * total;
    const platformFee = totalIncome * (feePct / 100);
    const prizePool = totalIncome - platformFee;
    const teamSize = m.player_mode === "Solo" ? 1 : m.player_mode === "Duo" ? 2 : 4;
    const loserCount = Math.max(0, total - teamSize);
    const perKill = Number(m.per_kill_amount_bac ?? 0) || (loserCount > 0 ? Math.round((prizePool / loserCount) * 100) / 100 : 0);
    const killPool = prizePool;
    return { totalIncome, platformFee, prizePool, killPool, perKill, loserCount };
  }, [detail]);

  const computedPrize = useMemo(() => {
    if (!detail) return {} as Record<string, number>;
    const m = detail.match;
    const out: Record<string, number> = {};
    for (const p of detail.participants) {
      const r = rows[p.user_id];
      if (!r) continue;
      const kills = parseInt(r.kills, 10) || 0;
      let prize = 0;
      if (m.reward_type === "KillBased" || m.reward_type === "Mixed") prize += kills * pool.perKill;
      if (m.reward_type === "RankBased" || m.reward_type === "Mixed") {
        if (r.status === "Winner") prize += Number(m.rank_1_prize_bac || 0);
      }
      out[p.user_id] = Math.round(prize * 100) / 100;
    }
    return out;
  }, [detail, rows, pool.perKill]);

  async function publish() {
    if (!detail) return;
    if (detail.match.result_applied) return toast.error("Results already published for this match.");
    const results = detail.participants
      .map((p) => {
        const r = rows[p.user_id];
        if (!r) return null;
        const kills = parseInt(r.kills, 10) || 0;
        if (!r.status && !r.kills) return null;
        const rank = r.status === "Winner" ? 1 : r.status === "Loser" ? 2 : null;
        return { user_id: p.user_id, rank, kills };
      })
      .filter(Boolean);
    if (results.length === 0) return toast.error("Fill at least one row.");
    if (!confirm(`Publish results for ${results.length} player(s)? This will credit prizes and cannot be undone.`)) return;
    const { error, data } = await supabase.rpc("admin_publish_match_result", {
      p_match_id: detail.match.id,
      p_results: results as never,
      p_result_description: (description || undefined) as never,
      p_result_image_url: (imageUrl || undefined) as never,
    });
    if (error) return toast.error(error.message);
    toast.success(`Published — ${data} row(s) processed.`);
    qc.invalidateQueries({ queryKey: ["admin-result-detail", selectedId] });
    qc.invalidateQueries({ queryKey: ["admin-results-matches"] });
  }

  async function uploadImage(file: File) {
    const path = `match-${detail?.match.id ?? "x"}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
    if (data?.signedUrl) {
      setImageUrl(data.signedUrl);
      toast.success("Image uploaded");
    }
  }



  function importCsv(text: string) {
    if (!detail) return;
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return toast.error("Empty CSV");
    // Build lookup by pubg_id and in_game_username (case-insensitive)
    const byPubg = new Map<string, string>();
    const byName = new Map<string, string>();
    for (const p of detail.participants) {
      const pr = detail.profMap.get(p.user_id);
      if (pr?.pubg_id) byPubg.set(String(pr.pubg_id).trim().toLowerCase(), p.user_id);
      if (pr?.in_game_username) byName.set(pr.in_game_username.trim().toLowerCase(), p.user_id);
      if (pr?.username) byName.set(pr.username.trim().toLowerCase(), p.user_id);
    }
    const next = { ...rows };
    let matched = 0;
    let skipped = 0;
    const startIdx = /^(pubg|player|name|id|user)/i.test(lines[0]) ? 1 : 0;
    for (let i = startIdx; i < lines.length; i++) {
      const cols = lines[i].split(/[,\t;]/).map((c) => c.trim());
      if (cols.length < 2) { skipped++; continue; }
      const key = cols[0].toLowerCase();
      const uid = byPubg.get(key) || byName.get(key);
      if (!uid) { skipped++; continue; }
      const rankNum = parseInt(cols[1] || "", 10);
      const kills = cols[2] || "0";
      next[uid] = { status: rankNum === 1 ? "Winner" : Number.isFinite(rankNum) ? "Loser" : "", kills };
      matched++;
    }
    setRows(next);
    toast.success(`Imported ${matched} row(s)${skipped ? `, skipped ${skipped}` : ""}`);
  }

  async function importCsvFile(file: File) {
    const text = await file.text();
    importCsv(text);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-[0.2em] text-foreground">Result Center</h1>
        <p className="font-hud text-xs uppercase tracking-widest text-foreground/60">Publish rankings and distribute prize BAC</p>
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
          <section className="hud-panel rounded-md border border-border/70 bg-card/40 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="font-display text-lg text-foreground">{detail.match.match_name}</div>
                <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/55">
                  Reward: {detail.match.reward_type} · Mode: {detail.match.player_mode} · Per Kill: {pool.perKill} coins · Platform Fee: {detail.match.platform_fee_pct}%
                </div>
              </div>
              {detail.match.result_applied && (
                <span className="rounded border border-gold/50 bg-gold/10 px-3 py-1 font-hud text-[10px] uppercase tracking-widest text-gold">Results published</span>
              )}
            </div>
          </section>

          {/* Prize Breakdown */}
          <section className="hud-panel rounded-md border border-border/70 bg-card/40 p-4">
            <h2 className="mb-3 font-display text-sm uppercase tracking-widest text-gold">Prize Breakdown</h2>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label={`Platform Fee (${detail.match.platform_fee_pct}%)`} value={`-${pool.platformFee.toLocaleString()}`} tone="negative" />
              <Stat label="Prize Pool" value={pool.prizePool.toLocaleString()} />
              <Stat label="Kill Money Pool" value={pool.killPool.toLocaleString()} tone="positive" />
              <Stat label={`Per Kill (÷${pool.loserCount} W.kills)`} value={pool.perKill.toLocaleString()} tone="positive" sub={`${pool.prizePool.toLocaleString()} ÷ ${pool.loserCount}`} />
            </div>
          </section>

          <section className="hud-panel overflow-x-auto rounded-md border border-border/70 bg-card/40">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="border-b border-border/60 bg-secondary/40 text-left font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                <tr>
                  <th className="px-3 py-2">In-game ID</th>
                  <th className="px-3 py-2">User Name</th>
                  <th className="px-3 py-2 w-32">Player Status</th>
                  <th className="px-3 py-2 w-24">Killed</th>
                  <th className="px-3 py-2 w-32">Kill Win</th>
                  <th className="px-3 py-2 w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {detail.participants.length === 0 && (
                  <tr><td colSpan={6} className="px-3 py-6 text-center font-hud text-xs uppercase tracking-widest text-foreground/50">No participants joined.</td></tr>
                )}
                {detail.participants.map((p) => {
                  const prof = detail.profMap.get(p.user_id);
                  const r = rows[p.user_id] ?? { status: "", kills: "" };
                  const isLoser = r.status === "Loser";
                  return (
                    <tr key={p.id} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2 font-mono text-xs text-foreground/70">{prof?.pubg_id ?? "—"}</td>
                      <td className="px-3 py-2">
                        <div className="font-display text-foreground">{prof?.in_game_username || prof?.username || p.user_id.slice(0, 8)}</div>
                      </td>
                      <td className="px-3 py-2">
                        <select
                          disabled={detail.match.result_applied}
                          value={r.status}
                          onChange={(e) => setRows({ ...rows, [p.user_id]: { ...r, status: e.target.value, kills: e.target.value === "Winner" ? "" : r.kills } })}
                          className="w-28 rounded border border-border/60 bg-secondary/40 px-2 py-1 font-hud text-xs outline-none focus:border-gold"
                        >
                          <option value="">—</option>
                          <option value="Winner">Winner</option>
                          <option value="Loser">Loser</option>
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={0}
                          disabled={detail.match.result_applied || !isLoser}
                          value={isLoser ? r.kills : ""}
                          onChange={(e) => setRows({ ...rows, [p.user_id]: { ...r, kills: e.target.value } })}
                          className="w-20 rounded border border-border/60 bg-secondary/40 px-2 py-1 font-mono text-sm outline-none focus:border-gold disabled:opacity-40"
                        />
                      </td>
                      <td className="px-3 py-2 tabular-nums text-gold">
                        <span className="inline-flex items-center gap-1">
                          {(computedPrize[p.user_id] ?? p.prize_bac ?? 0).toLocaleString()}
                          <CoinIcon size={12} />
                        </span>
                      </td>
                      <td className="px-3 py-2 font-hud text-[10px] uppercase tracking-widest">{p.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {!detail.match.result_applied && (
            <section className="hud-panel rounded-md border border-border/70 bg-card/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <h2 className="font-display text-sm uppercase tracking-widest text-gold flex items-center gap-2"><FileSpreadsheet size={14}/> Bulk Import (CSV)</h2>
                <label className="flex cursor-pointer items-center gap-2 rounded border border-border/60 px-3 py-1.5 font-hud text-[10px] uppercase tracking-widest hover:border-gold hover:text-gold">
                  <Upload size={12} /> Upload .csv
                  <input type="file" accept=".csv,text/csv,text/plain" className="hidden" onChange={(e) => e.target.files && importCsvFile(e.target.files[0])} />
                </label>
              </div>
              <p className="font-hud text-[10px] uppercase tracking-widest text-foreground/55">
                Format per line: <span className="text-gold">pubg_id_or_username, rank, kills</span> — header row optional. Unmatched players are skipped.
              </p>
              <textarea
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={"pubg_id,rank,kills\n5123456789,1,12\n5123459999,2,7"}
                className="h-24 w-full rounded border border-border/60 bg-secondary/40 px-3 py-2 font-mono text-xs outline-none focus:border-gold"
              />
              <div className="flex justify-end">
                <button
                  onClick={() => { importCsv(csvText); }}
                  className="rounded border border-border/60 px-4 py-1.5 font-hud text-[10px] uppercase tracking-widest hover:border-gold hover:text-gold"
                >
                  Apply CSV to table
                </button>
              </div>
            </section>
          )}

          {!detail.match.result_applied && (
            <section className="hud-panel rounded-md border border-border/70 bg-card/40 p-4 space-y-3">
              <h2 className="font-display text-sm uppercase tracking-widest text-gold">Result Media (optional)</h2>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Summary, MVP highlight, notes…"
                className="h-20 w-full rounded border border-border/60 bg-secondary/40 px-3 py-2 font-mono text-sm outline-none focus:border-gold"
              />
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex cursor-pointer items-center gap-2 rounded border border-border/60 px-3 py-2 font-hud text-xs uppercase tracking-widest hover:border-gold hover:text-gold">
                  <Upload size={14} /> Upload screenshot
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files && uploadImage(e.target.files[0])} />
                </label>
                <input
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="Or paste image URL"
                  className="flex-1 min-w-[200px] rounded border border-border/60 bg-secondary/40 px-3 py-2 font-mono text-xs outline-none focus:border-gold"
                />
              </div>
              <div className="flex justify-end">
                <button
                  onClick={publish}
                  className="flex items-center gap-2 rounded border border-gold/60 bg-gold/15 px-5 py-2 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/25"
                >
                  <Trophy size={14} /> Publish Results & Credit Prizes
                  <Save size={14} />
                </button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone, sub }: { label: string; value: string; tone?: "positive" | "negative"; sub?: string }) {
  const color = tone === "negative" ? "text-destructive" : tone === "positive" ? "text-emerald-400" : "text-foreground";
  return (
    <div className="rounded border border-border/60 bg-secondary/30 p-3">
      <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/55">{label}</div>
      <div className={`mt-1 flex items-center gap-1 font-display text-lg ${color}`}>
        {value} <CoinIcon size={14} />
      </div>
      {sub && <div className="mt-0.5 font-mono text-[10px] text-foreground/50">{sub}</div>}
    </div>
  );
}
