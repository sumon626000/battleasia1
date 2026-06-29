import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Trophy } from "lucide-react";
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
};

function AdminResultsPage() {
  const qc = useQueryClient();
  const { matchId } = Route.useSearch();
  const [selectedId, setSelectedId] = useState<number | undefined>(matchId);
  const [kills, setKills] = useState<Record<string, string>>({});

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
    const seed: Record<string, string> = {};
    for (const p of detail.participants) seed[p.user_id] = p.kills ? String(p.kills) : "";
    setKills(seed);
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

  async function publish() {
    if (!detail) return;
    if (detail.match.result_applied) return toast.error("Results already published for this match.");
    const results = detail.participants
      .map((p) => {
        const k = parseInt(kills[p.user_id] ?? "", 10) || 0;
        return { user_id: p.user_id, status: k > 0 ? "Winner" : "Loser", kills: k, win_prize: 0, bonus: 0 };
      });
    if (results.every((r) => r.kills === 0)) {
      if (!confirm("All players have 0 kills. Publish anyway (no prizes will be credited)?")) return;
    } else if (!confirm(`Publish results for ${results.length} player(s)? Kill prizes will be credited to wallets and cannot be undone.`)) {
      return;
    }
    const { error, data } = await supabase.rpc("admin_publish_match_result", {
      p_match_id: detail.match.id,
      p_results: results as never,
    });
    if (error) return toast.error(error.message);
    toast.success(`Published — ${data} row(s) credited.`);
    qc.invalidateQueries({ queryKey: ["admin-result-detail", selectedId] });
    qc.invalidateQueries({ queryKey: ["admin-results-matches"] });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl uppercase tracking-[0.2em] text-foreground">Result Center</h1>
        <p className="font-hud text-xs uppercase tracking-widest text-foreground/60">Enter kills · auto pay per-kill prize</p>
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
                  Mode: {detail.match.player_mode} · Per Kill: {pool.perKill} coins
                </div>
              </div>
              {detail.match.result_applied && (
                <span className="rounded border border-gold/50 bg-gold/10 px-3 py-1 font-hud text-[10px] uppercase tracking-widest text-gold">Results published</span>
              )}
            </div>
          </section>

          <section className="hud-panel overflow-x-auto rounded-md border border-border/70 bg-card/40">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="border-b border-border/60 bg-secondary/40 text-left font-hud text-[10px] uppercase tracking-widest text-foreground/60">
                <tr>
                  <th className="px-3 py-2">User</th>
                  <th className="px-3 py-2 w-24">Killed</th>
                  <th className="px-3 py-2 w-32">Prize</th>
                </tr>
              </thead>
              <tbody>
                {detail.participants.length === 0 && (
                  <tr><td colSpan={3} className="px-3 py-6 text-center font-hud text-xs uppercase tracking-widest text-foreground/50">No participants joined.</td></tr>
                )}
                {detail.participants.map((p) => {
                  const prof = detail.profMap.get(p.user_id);
                  const k = parseInt(kills[p.user_id] ?? "", 10) || 0;
                  const prize = Math.round(k * pool.perKill * 100) / 100;
                  return (
                    <tr key={p.id} className={`border-b border-border/40 last:border-0 ${k > 0 ? "bg-emerald-500/5" : ""}`}>
                      <td className="px-3 py-2">
                        <div className="font-display text-foreground">{prof?.in_game_username || prof?.username || p.user_id.slice(0, 8)}</div>
                        <div className="font-mono text-[10px] text-foreground/55">PUBG: {prof?.pubg_id ?? "—"}</div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="number" min={0}
                          disabled={detail.match.result_applied}
                          value={kills[p.user_id] ?? ""}
                          onChange={(e) => setKills({ ...kills, [p.user_id]: e.target.value })}
                          className="w-20 rounded border border-border/60 bg-secondary/40 px-2 py-1 font-mono text-sm outline-none focus:border-gold"
                        />
                      </td>
                      <td className="px-3 py-2 tabular-nums font-display text-base text-gold">
                        <span className="inline-flex items-center gap-1">
                          {prize.toLocaleString()}
                          <CoinIcon size={12} />
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </section>

          {!detail.match.result_applied && detail.participants.length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={publish}
                className="flex items-center gap-2 rounded border border-gold/60 bg-gold/15 px-5 py-2 font-hud text-xs uppercase tracking-widest text-gold hover:bg-gold/25"
              >
                <Trophy size={14} /> Publish Results & Credit Prizes
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
