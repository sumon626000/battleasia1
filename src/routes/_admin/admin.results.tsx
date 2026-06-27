import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy, Save, Upload } from "lucide-react";

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
};

function AdminResultsPage() {
  const qc = useQueryClient();
  const { matchId } = Route.useSearch();
  const [selectedId, setSelectedId] = useState<number | undefined>(matchId);
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [rows, setRows] = useState<Record<string, { rank: string; kills: string }>>({});

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
    const seed: Record<string, { rank: string; kills: string }> = {};
    for (const p of detail.participants) {
      seed[p.user_id] = {
        rank: p.rank_position ? String(p.rank_position) : "",
        kills: p.kills ? String(p.kills) : "",
      };
    }
    setRows(seed);
  }, [detail]);

  const computedPrize = useMemo(() => {
    if (!detail) return {} as Record<string, number>;
    const m = detail.match;
    const out: Record<string, number> = {};
    for (const p of detail.participants) {
      const r = rows[p.user_id];
      if (!r) continue;
      const rank = parseInt(r.rank, 10);
      const kills = parseInt(r.kills, 10) || 0;
      let prize = 0;
      if (m.reward_type === "KillBased" || m.reward_type === "Mixed") prize += kills * Number(m.per_kill_amount_bac || 0);
      if (m.reward_type === "RankBased" || m.reward_type === "Mixed") {
        if (rank === 1) prize += Number(m.rank_1_prize_bac || 0);
        else if (rank === 2) prize += Number(m.rank_2_prize_bac || 0);
        else if (rank === 3) prize += Number(m.rank_3_prize_bac || 0);
      }
      out[p.user_id] = prize;
    }
    return out;
  }, [detail, rows]);

  async function publish() {
    if (!detail) return;
    if (detail.match.result_applied) return toast.error("Results already published for this match.");
    const results = detail.participants
      .map((p) => {
        const r = rows[p.user_id];
        if (!r) return null;
        const rank = parseInt(r.rank, 10);
        const kills = parseInt(r.kills, 10) || 0;
        if (!r.rank && !r.kills) return null;
        return { user_id: p.user_id, rank: Number.isFinite(rank) ? rank : null, kills };
      })
      .filter(Boolean);
    if (results.length === 0) return toast.error("Fill at least one row.");
    if (!confirm(`Publish results for ${results.length} player(s)? This will credit prizes and cannot be undone.`)) return;
    const { error, data } = await supabase.rpc("admin_publish_match_result", {
      p_match_id: detail.match.id,
      p_results: results as never,
      p_result_description: description || null,
      p_result_image_url: imageUrl || null,
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
                  Reward: {detail.match.reward_type} · Per kill: {detail.match.per_kill_amount_bac} · 1st/2nd/3rd: {detail.match.rank_1_prize_bac}/{detail.match.rank_2_prize_bac}/{detail.match.rank_3_prize_bac}
                </div>
              </div>
              {detail.match.result_applied && (
                <span className="rounded border border-gold/50 bg-gold/10 px-3 py-1 font-hud text-[10px] uppercase tracking-widest text-gold">Results published</span>
              )}
            </div>
          </section>

          <section className="hud-panel overflow-x-auto rounded-md border border-border/70 bg-card/40">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="border-b border-border/60 bg-secondary/40 text-left font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                <tr>
                  <th className="px-3 py-2">Player</th>
                  <th className="px-3 py-2 w-24">Rank</th>
                  <th className="px-3 py-2 w-24">Kills</th>
                  <th className="px-3 py-2 w-32">Prize (preview)</th>
                  <th className="px-3 py-2 w-28">Status</th>
                </tr>
              </thead>
              <tbody>
                {detail.participants.length === 0 && (
                  <tr><td colSpan={5} className="px-3 py-6 text-center font-hud text-xs uppercase tracking-widest text-foreground/50">No participants joined.</td></tr>
                )}
                {detail.participants.map((p) => {
                  const prof = detail.profMap.get(p.user_id);
                  const r = rows[p.user_id] ?? { rank: "", kills: "" };
                  return (
                    <tr key={p.id} className="border-b border-border/40 last:border-0">
                      <td className="px-3 py-2">
                        <div className="font-display text-foreground">{prof?.in_game_username || prof?.username || p.user_id.slice(0, 8)}</div>
                        <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/55">PUBG: {prof?.pubg_id ?? "—"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={1}
                          disabled={detail.match.result_applied}
                          value={r.rank}
                          onChange={(e) => setRows({ ...rows, [p.user_id]: { ...r, rank: e.target.value } })}
                          className="w-20 rounded border border-border/60 bg-secondary/40 px-2 py-1 font-mono text-sm outline-none focus:border-gold"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={0}
                          disabled={detail.match.result_applied}
                          value={r.kills}
                          onChange={(e) => setRows({ ...rows, [p.user_id]: { ...r, kills: e.target.value } })}
                          className="w-20 rounded border border-border/60 bg-secondary/40 px-2 py-1 font-mono text-sm outline-none focus:border-gold"
                        />
                      </td>
                      <td className="px-3 py-2 tabular-nums text-gold">{(computedPrize[p.user_id] ?? p.prize_bac ?? 0).toLocaleString()}</td>
                      <td className="px-3 py-2 font-hud text-[10px] uppercase tracking-widest">{p.status}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

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
