import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, Crown, Users, Map, Trophy, Clock, Sword, KeyRound, ExternalLink, CheckCircle2, PlayCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { CoinIcon } from "@/components/site/CoinIcon";
import { randomBanner } from "@/lib/match-banners";
import { useEffect } from "react";
import { X } from "lucide-react";

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
        .select("id, status, kills, rank_position, prize_bac, joined_at, profiles:user_id (in_game_username, country_code, pubg_id, avatar_url, email)")
        .eq("match_id", id)
        .order("rank_position", { ascending: true, nullsFirst: false })
        .order("kills", { ascending: false, nullsFirst: false })
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
    setJoining(true);
    const { error } = await supabase.rpc("join_match", { p_match_id: id });
    setJoining(false);
    if (error) return toast.error(error.message);
    setConfirmOpen(false);
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
        <a
          href={m.live_stream_url || "https://youtube.com/@battleasia"}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-md border border-red-500/60 bg-red-600 px-5 py-2.5 font-hud text-xs font-bold uppercase tracking-widest text-white shadow-lg shadow-red-600/30 hover:bg-red-500 transition animate-pulse"
        >
          <PlayCircle size={18} /> Watch Live on YouTube
        </a>
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
              <PrizeRow rank="Per Kill" amount={Number(m.per_kill_amount_bac)} />
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
              {m.status === "Complete" ? "Match Results" : "Participants"} ({filled})
            </h2>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[640px] text-xs">
                <thead className="font-hud text-[10px] uppercase tracking-wider text-foreground/60">
                  <tr className="border-b border-border/60 text-left">
                    <th className="py-2 pr-2">Rank</th>
                    <th className="pr-2">Player</th>
                    <th className="pr-2 text-center">Entry Fee</th>
                    <th className="pr-2 text-center">Kills</th>
                    <th className="pr-2 text-center">Points</th>
                    <th className="pr-2 text-right">Prize</th>
                    {m.status === "Complete" && <th className="text-right">Status</th>}
                  </tr>
                </thead>
                <tbody className="font-mono">
                  {(participants.data ?? []).map((p: any, i: number) => {
                    const prof = p.profiles ?? {};
                    const kills = Number(p.kills ?? 0);
                    const perKill = Number(m.per_kill_amount_bac ?? 0);
                    const points = kills * (perKill || 1); // points = kills × per-kill rate
                    const prize = Number(p.prize_bac ?? 0);
                    const isWinner = prize > 0 || (p.rank_position && p.rank_position <= 3);
                    const initials = (prof.in_game_username ?? "?").slice(0, 1).toUpperCase();
                    return (
                      <tr key={p.id} className="border-b border-border/30 hover:bg-gold/5">
                        <td className="py-2.5 pr-2 font-bold text-foreground/80">{p.rank_position ?? (i + 1)}</td>
                        <td className="pr-2">
                          <div className="flex items-center gap-2">
                            {prof.avatar_url ? (
                              <img src={prof.avatar_url} alt="" className="h-7 w-7 rounded-full object-cover" />
                            ) : (
                              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gold/20 font-bold text-gold">{initials}</div>
                            )}
                            <div className="min-w-0">
                              <div className="truncate font-bold text-foreground">{prof.in_game_username ?? "—"}</div>
                              {prof.email && <div className="truncate text-[10px] text-foreground/50">{prof.email}</div>}
                            </div>
                          </div>
                        </td>
                        <td className="pr-2 text-center">
                          <span className="inline-flex items-center gap-1"><CoinIcon size={11} /> {fee}</span>
                        </td>
                        <td className="pr-2 text-center font-bold">{kills}</td>
                        <td className="pr-2 text-center text-sky-400">{points ? points.toFixed(points % 1 ? 1 : 0) : 0}</td>
                        <td className="pr-2 text-right text-gold">
                          {prize ? <span className="inline-flex items-center gap-1"><CoinIcon size={11} /> {prize}</span> : "—"}
                        </td>
                        {m.status === "Complete" && (
                          <td className="text-right">
                            <span className={`rounded-sm px-2 py-0.5 font-hud text-[9px] font-bold uppercase tracking-widest ${
                              isWinner ? "border border-emerald-500/60 bg-emerald-500/15 text-emerald-400" : "border border-red-500/40 bg-red-500/10 text-red-400"
                            }`}>{isWinner ? "WINNER" : "LOSE"}</span>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {!participants.data?.length && (
                    <tr><td colSpan={m.status === "Complete" ? 7 : 6} className="py-6 text-center text-foreground/40">No participants yet</td></tr>
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
                <button onClick={() => setConfirmOpen(true)} className="btn-gold w-full">
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

      <JoinMatchModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={join}
        loading={joining}
        match={m}
        when={when}
        filled={filled}
        total={total}
        balance={balance}
        fee={fee}
        gameName={(m as any).games?.game_name ?? null}
      />
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

function JoinMatchModal({
  open, onClose, onConfirm, loading, match, when, filled, total, balance, fee, gameName,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
  match: any;
  when: Date | null;
  filled: number;
  total: number;
  balance: number;
  fee: number;
  gameName: string | null;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape" && !loading) onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, loading, onClose]);

  if (!open) return null;
  const insufficient = match.match_type === "Paid" && fee > balance;
  const banner = match.banner_image_url || randomBanner(match.id);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4 animate-in fade-in-0">
      <div className="hud-panel relative w-full max-w-md overflow-hidden border-gold/40 bg-background animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          disabled={loading}
          className="absolute right-2 top-2 z-10 rounded-sm bg-black/50 p-1.5 text-white/80 hover:bg-black/70 hover:text-white"
          aria-label="Close"
        >
          <X size={14} />
        </button>

        <div className="px-5 pt-5 pb-2">
          <h3 className="font-display text-xl font-bold uppercase tracking-wide text-gold">Confirm Join Match</h3>
          <p className="mt-1 text-sm text-foreground/70">
            Join <span className="font-bold text-foreground">"{match.match_name}"</span>
            {match.match_type === "Paid" && (
              <> for <span className="inline-flex items-baseline gap-1 align-baseline"><CoinIcon size={12} /> <span className="font-bold text-gold">{fee}</span></span> ?</>
            )}
          </p>
        </div>

        <div className="relative mx-5 mt-3 overflow-hidden rounded-md border border-border/60">
          <img src={banner} alt={match.map_name ?? ""} className="h-44 w-full object-cover" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3">
            <div className="font-display text-base font-bold text-white">{match.map_name ?? "—"}</div>
          </div>
        </div>

        <div className="mx-5 mt-3 rounded-md border border-border/60 bg-secondary/40 p-3 text-sm">
          <DetailRow label="Game" value={gameName ?? "—"} />
          <DetailRow label="Schedule" value={when ? when.toLocaleString() : "TBA"} />
          <DetailRow label="Entry Fee" value={<span className="inline-flex items-center gap-1"><CoinIcon size={14} /> <span className="font-bold">{match.match_type === "Free" ? "FREE" : fee}</span></span>} />
          {Number(match.per_kill_amount_bac) > 0 && (
            <DetailRow label="Per Kill" value={<span className="inline-flex items-center gap-1"><CoinIcon size={14} /> <span className="font-bold">{Number(match.per_kill_amount_bac)}</span></span>} />
          )}
          <DetailRow label="Team Type" value={String(match.player_mode ?? "—").toLowerCase()} />
          <DetailRow label="Players" value={`${filled} / ${total || "∞"}`} />
          <DetailRow label="Map" value={match.map_name ?? "—"} />
          <DetailRow label="Type" value={String(match.match_type ?? "—").toLowerCase()} last />
        </div>

        <div className={`mx-5 mt-3 flex items-center justify-between rounded-md border p-3 text-sm ${
          insufficient ? "border-red-500/50 bg-red-500/10" : "border-emerald-500/40 bg-emerald-500/10"
        }`}>
          <span className="font-hud text-xs uppercase tracking-widest text-foreground/70">Your Balance</span>
          <span className="inline-flex items-center gap-1.5 font-mono font-bold">
            <CoinIcon size={16} /> {balance.toLocaleString()}
          </span>
        </div>

        {insufficient && (
          <p className="mx-5 mt-2 text-xs text-red-400">Insufficient BAC. Please top up your wallet.</p>
        )}

        <div className="m-5 mt-4 flex items-center justify-end gap-2 border-t border-border/40 pt-4">
          <button
            onClick={onClose}
            disabled={loading}
            className="rounded-sm border border-border/60 px-5 py-2 font-hud text-xs font-bold uppercase tracking-widest text-foreground/80 hover:border-foreground/40 hover:text-foreground disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading || insufficient}
            className="btn-gold px-6 py-2 text-xs disabled:opacity-50"
          >
            {loading ? "Joining…" : "Join"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, last = false }: { label: string; value: React.ReactNode; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between py-2 ${last ? "" : "border-b border-border/30"}`}>
      <span className="text-foreground/60">{label}</span>
      <span className="font-bold text-foreground">{value}</span>
    </div>
  );
}
