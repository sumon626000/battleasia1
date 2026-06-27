import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Crown, Users, Map, Trophy, Clock, Sword, KeyRound, ExternalLink, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { CoinIcon } from "@/components/site/CoinIcon";
import { ConfirmModal } from "@/components/site/ConfirmModal";

export const Route = createFileRoute("/_authenticated/dashboard/matches/$matchId")({
  head: () => ({ meta: [{ title: "Match Details — Battle Asia" }] }),
  component: MatchDetailPage,
});

function MatchDetailPage() {
  const { matchId } = Route.useParams();
  const id = Number(matchId);
  const { user } = useAuth();
  const { profile } = useProfile(user?.id);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [joining, setJoining] = useState(false);

  const match = useQuery({
    queryKey: ["match", id],
    queryFn: async () => {
      const { data } = await supabase.from("matches").select("*, games(game_name)").eq("id", id).maybeSingle();
      return data;
    },
  });

  const myEntry = useQuery({
    queryKey: ["my-entry", id, user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("match_participants").select("*").eq("match_id", id).eq("user_id", user!.id).maybeSingle();
      return data;
    },
  });

  const participants = useQuery({
    queryKey: ["match-participants", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("match_participants")
        .select("id, status, kills, rank_position, prize_bac, joined_at, profiles:user_id (in_game_username, country_code, pubg_id)")
        .eq("match_id", id)
        .order("rank_position", { ascending: true, nullsFirst: false })
        .order("joined_at", { ascending: true });
      return data ?? [];
    },
  });

  const m = match.data;
  const filled = participants.data?.length ?? 0;
  const total = m?.total_players ?? 0;
  const isFull = total > 0 && filled >= total;
  const isJoined = !!myEntry.data;
  const isClosed = m && !["Upcoming", "Active"].includes(m.status);
  const balance = Number(profile?.bac_coin_balance ?? 0);
  const fee = Number(m?.entry_fee_bac ?? 0);
  const insufficient = m?.match_type === "Paid" && fee > balance;

  async function join() {
    const { error } = await supabase.rpc("join_match", { p_match_id: id });
    if (error) return toast.error(error.message);
    toast.success("Joined! Good luck soldier.");
    qc.invalidateQueries({ queryKey: ["my-entry", id] });
    qc.invalidateQueries({ queryKey: ["match-participants", id] });
    qc.invalidateQueries({ queryKey: ["my-match-ids"] });
    qc.invalidateQueries({ queryKey: ["profile"] });
  }

  if (match.isLoading) return <div className="hud-panel p-8 text-center text-foreground/40">Loading match...</div>;
  if (!m) return <div className="hud-panel p-8 text-center text-foreground/40">Match not found.</div>;

  const when = m.schedule_at ? new Date(m.schedule_at) : null;

  return (
    <div className="space-y-5">
      <button onClick={() => navigate({ to: "/dashboard/matches" })} className="flex items-center gap-1 font-hud text-[10px] uppercase tracking-widest text-foreground/60 hover:text-gold">
        <ArrowLeft size={12} /> Back to matches
      </button>

      <section className="hud-panel relative overflow-hidden p-5 sm:p-6">
        <div className="absolute inset-0 -z-10 bg-grid-hud opacity-30" />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-sm px-1.5 py-0.5 font-hud text-[9px] font-bold uppercase ${
            m.status === "Ongoing" ? "bg-red-500/20 text-red-400" :
            m.status === "Complete" ? "bg-foreground/15 text-foreground/70" : "bg-gold/15 text-gold"
          }`}>{m.status === "Ongoing" ? "LIVE" : m.status}</span>
          {m.premium_only && (
            <span className="flex items-center gap-1 rounded-sm bg-gold/20 px-1.5 py-0.5 font-hud text-[9px] font-bold text-gold">
              <Crown size={9} /> PREMIUM
            </span>
          )}
          <span className="rounded-sm border border-border/60 px-1.5 py-0.5 font-hud text-[9px] font-bold uppercase">{m.match_type}</span>
          <span className="rounded-sm border border-border/60 px-1.5 py-0.5 font-hud text-[9px] font-bold uppercase">{m.player_mode}</span>
          <span className="rounded-sm border border-border/60 px-1.5 py-0.5 font-hud text-[9px] font-bold uppercase">{m.game_mode}</span>
        </div>
        <h1 className="mt-3 font-display text-2xl font-bold uppercase tracking-wide sm:text-3xl">{m.match_name}</h1>
        {m.sponsor && <p className="mt-1 font-hud text-[10px] uppercase tracking-widest text-gold">// SPONSORED BY {m.sponsor}</p>}
      </section>

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-4">
          <div className="hud-panel p-4">
            <h2 className="font-hud text-sm font-bold uppercase tracking-widest text-gold">Match Info</h2>
            <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
              <InfoRow icon={Map} label="Map" value={m.map_name ?? "—"} />
              <InfoRow icon={Users} label="Slots" value={`${filled} / ${total || "∞"}`} />
              <InfoRow icon={Clock} label="Start" value={when ? when.toLocaleString() : "TBA"} />
              <InfoRow icon={Sword} label="Kill Rate" value={m.kill_rate_type} />
              <InfoRow icon={Trophy} label="Reward Type" value={m.reward_type} />
              <InfoRow icon={Trophy} label="Entry Fee" value={m.match_type === "Free" ? "FREE" : `${fee} BAC`} />
            </div>
            {m.description && <p className="mt-3 border-t border-border/40 pt-3 text-sm text-foreground/80">{m.description}</p>}
          </div>

          <div className="hud-panel p-4">
            <h2 className="font-hud text-sm font-bold uppercase tracking-widest text-gold">Prize Pool</h2>
            <div className="mt-3 grid gap-2">
              {m.reward_type === "RankBased" ? (
                <>
                  <PrizeRow rank="#1" amount={Number(m.rank_1_prize_bac)} />
                  {Number(m.rank_2_prize_bac) > 0 && <PrizeRow rank="#2" amount={Number(m.rank_2_prize_bac)} />}
                  {Number(m.rank_3_prize_bac) > 0 && <PrizeRow rank="#3" amount={Number(m.rank_3_prize_bac)} />}
                </>
              ) : (
                <PrizeRow rank="Per Kill" amount={Number(m.per_kill_amount_bac)} />
              )}
              {m.prize_description && <p className="text-xs text-foreground/60">{m.prize_description}</p>}
            </div>
          </div>

          {isJoined && (m.room_id || m.room_password) && (
            <div className="hud-panel border-gold/40 bg-gold/5 p-4">
              <h2 className="flex items-center gap-2 font-hud text-sm font-bold uppercase tracking-widest text-gold">
                <KeyRound size={14} /> Room Details
              </h2>
              <div className="mt-3 grid gap-2 font-mono text-sm">
                {m.room_id && <div><span className="text-foreground/60">Room ID: </span><span className="font-bold">{m.room_id}</span></div>}
                {m.room_password && <div><span className="text-foreground/60">Password: </span><span className="font-bold">{m.room_password}</span></div>}
                {m.match_url && (
                  <a href={m.match_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gold hover:underline">
                    Open match link <ExternalLink size={12} />
                  </a>
                )}
              </div>
              {m.private_description && <p className="mt-2 text-xs text-foreground/70">{m.private_description}</p>}
            </div>
          )}

          <div className="hud-panel p-4">
            <h2 className="font-hud text-sm font-bold uppercase tracking-widest text-gold">
              {m.status === "Complete" ? "Results" : "Participants"} ({filled})
            </h2>
            <div className="mt-3 max-h-[500px] overflow-y-auto">
              <table className="w-full text-xs">
                <thead className="font-hud text-[10px] uppercase tracking-wider text-foreground/60">
                  <tr className="border-b border-border/60 text-left">
                    <th className="py-2">#</th><th>Player</th><th className="text-center">Kills</th>
                    <th className="text-center">Rank</th><th className="text-right">Prize</th>
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {(participants.data ?? []).map((p: any, i: number) => (
                    <tr key={p.id} className="border-b border-border/30">
                      <td className="py-2 text-foreground/50">{i + 1}</td>
                      <td className="font-bold">{p.profiles?.in_game_username ?? "—"}</td>
                      <td className="text-center">{p.kills ?? "—"}</td>
                      <td className="text-center text-gold">{p.rank_position ? `#${p.rank_position}` : "—"}</td>
                      <td className="text-right text-gold">{p.prize_bac ? `${p.prize_bac}` : "—"}</td>
                    </tr>
                  ))}
                  {!participants.data?.length && (
                    <tr><td colSpan={5} className="py-6 text-center text-foreground/40">No participants yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <aside className="space-y-3">
          <div className="hud-panel sticky top-4 p-4">
            <div className="font-hud text-[10px] uppercase tracking-widest text-foreground/60">// ACTION</div>
            <div className="mt-2 flex items-baseline gap-2">
              <CoinIcon size={20} />
              <span className="font-mono text-2xl font-bold text-gold">{m.match_type === "Free" ? "FREE" : fee.toLocaleString()}</span>
              <span className="font-hud text-[10px] tracking-widest text-foreground/60">{m.match_type === "Paid" ? "BAC ENTRY" : ""}</span>
            </div>
            <div className="mt-1 text-xs text-foreground/60">
              Your balance: <span className="font-mono font-bold text-foreground">{balance.toLocaleString()} BAC</span>
            </div>

            <div className="mt-4">
              {isJoined ? (
                <div className="rounded-sm border border-green-500/40 bg-green-500/10 p-3 text-center">
                  <CheckCircle2 className="mx-auto text-green-400" size={20} />
                  <div className="mt-1 font-hud text-xs font-bold uppercase tracking-widest text-green-400">You're In</div>
                  <div className="mt-0.5 text-[10px] text-foreground/60">Status: {myEntry.data?.status}</div>
                </div>
              ) : isClosed ? (
                <button disabled className="btn-gold w-full opacity-50">MATCH CLOSED</button>
              ) : isFull ? (
                <button disabled className="btn-gold w-full opacity-50">MATCH FULL</button>
              ) : insufficient ? (
                <div className="space-y-2">
                  <button disabled className="btn-gold w-full opacity-50">INSUFFICIENT BAC</button>
                  <Link to="/dashboard/wallet" className="block text-center font-hud text-[10px] uppercase tracking-widest text-gold hover:underline">
                    → Top up wallet
                  </Link>
                </div>
              ) : (
                <button onClick={join} className="btn-gold w-full">
                  {m.match_type === "Free" ? "JOIN FREE" : `JOIN — ${fee} BAC`}
                </button>
              )}
            </div>

            {m.premium_only && !profile?.is_premium && (
              <div className="mt-3 rounded-sm border border-gold/40 bg-gold/10 p-2 text-[10px] text-gold">
                <Crown size={10} className="mr-1 inline" /> Premium membership required.
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 font-hud text-[10px] uppercase tracking-wider text-foreground/60">
        <Icon size={10} /> {label}
      </div>
      <div className="mt-0.5 font-mono text-sm font-bold">{value}</div>
    </div>
  );
}

function PrizeRow({ rank, amount }: { rank: string; amount: number }) {
  return (
    <div className="flex items-center justify-between rounded-sm border border-border/60 bg-background/40 p-2.5">
      <span className="font-hud text-xs font-bold uppercase tracking-widest text-gold">{rank}</span>
      <span className="flex items-center gap-1.5 font-mono text-sm font-bold">
        <CoinIcon size={14} /> {amount.toLocaleString()} BAC
      </span>
    </div>
  );
}
