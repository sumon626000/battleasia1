import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { Crown, Users, Map, Trophy, Clock, Filter, Sword, ArrowLeft, Gamepad2, Lock, PlayCircle, Loader2 } from "lucide-react";
import { CoinIcon } from "@/components/site/CoinIcon";

export const Route = createFileRoute("/_authenticated/dashboard/matches")({
  validateSearch: (s: Record<string, unknown>) => ({ game: s.game ? Number(s.game) : undefined }),
  head: () => ({ meta: [{ title: "Matches — Battle Asia" }] }),
  component: MatchesPage,
});

type Status = "all" | "Upcoming" | "Ongoing" | "Complete";
type ModeFilter = "all" | "Solo" | "Duo" | "Squad";
type TypeFilter = "all" | "Free" | "Paid";

function MatchesPage() {
  const { user } = useAuth();
  const { game: selectedGameId } = Route.useSearch();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>("all");
  const [mode, setMode] = useState<ModeFilter>("all");
  const [type, setType] = useState<TypeFilter>("all");

  const games = useQuery({
    queryKey: ["play-games"],
    queryFn: async () => {
      const { data } = await supabase
        .from("games")
        .select("id, game_name, image_url, status, coming_soon, live_stream_url")
        .is("deleted_at", null)
        .order("sort_order", { ascending: true, nullsFirst: false })
        .order("id");
      return data ?? [];
    },
  });

  const selectedGame = games.data?.find((g: any) => g.id === selectedGameId);

  const matches = useQuery({
    queryKey: ["matches", selectedGameId, status, mode, type],
    enabled: !!selectedGameId,
    queryFn: async () => {
      let q = supabase
        .from("matches").select("*").is("deleted_at", null)
        .eq("game_id", selectedGameId!)
        .order("schedule_at", { ascending: true });
      if (status !== "all") q = q.eq("status", status);
      else q = q.in("status", ["Upcoming", "Active", "Ongoing"]);
      if (mode !== "all") q = q.eq("player_mode", mode);
      if (type !== "all") q = q.eq("match_type", type);
      const { data } = await q;
      return data ?? [];
    },
  });

  const joined = useQuery({
    queryKey: ["my-match-ids", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data } = await supabase.from("match_participants").select("match_id").eq("user_id", user!.id);
      return new Set((data ?? []).map((r: any) => r.match_id as number));
    },
  });

  const counts = useQuery({
    queryKey: ["match-counts", (matches.data ?? []).map((m: any) => m.id).join(",")],
    enabled: !!matches.data?.length,
    queryFn: async () => {
      const ids = (matches.data ?? []).map((m: any) => m.id);
      const { data } = await supabase.from("match_participants").select("match_id").in("match_id", ids);
      const map: Record<number, number> = {};
      (data ?? []).forEach((r: any) => { map[r.match_id] = (map[r.match_id] ?? 0) + 1; });
      return map;
    },
  });

  // Step 1: Game picker
  if (!selectedGameId) {
    return (
      <div className="space-y-5">
        <section className="hud-panel relative overflow-hidden p-5 sm:p-6">
          <div className="absolute inset-0 -z-10 bg-grid-hud opacity-30" />
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
            <div className="min-w-0">
              <p className="font-hud text-[10px] uppercase tracking-[0.3em] text-foreground/60">// SELECT GAME</p>
              <h1 className="mt-1 font-display text-2xl font-bold tracking-wide sm:text-3xl">
                CHOOSE YOUR <span className="text-gold">BATTLEGROUND</span>
              </h1>
              <p className="mt-1 text-xs text-foreground/60">Pick a game to view tournaments.</p>
            </div>
            <Gamepad2 className="text-gold" size={36} />
          </div>
        </section>

        <section className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {(games.data ?? []).map((g: any) => {
            const disabled = g.coming_soon || g.status !== "active";
            const inner = (
              <>
                <div className="relative aspect-[4/3] overflow-hidden bg-background/60">
                  {g.image_url ? (
                    <img src={g.image_url} alt={g.game_name} className={`h-full w-full object-cover transition group-hover:scale-105 ${disabled ? "grayscale" : ""}`} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-foreground/30"><Gamepad2 size={48} /></div>
                  )}
                  {g.live_stream_url && !disabled && (
                    <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-sm bg-red-600 px-1.5 py-0.5 font-hud text-[9px] font-bold uppercase tracking-widest text-white shadow-lg shadow-red-600/40 animate-pulse">
                      <PlayCircle size={10} /> LIVE
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <div className="font-display text-sm font-bold uppercase tracking-wide truncate">{g.game_name}</div>
                  <div className="mt-1 flex items-center justify-between gap-2 font-hud text-[10px] uppercase tracking-widest text-gold">
                    <span>{disabled ? (<span className="text-foreground/50 inline-flex items-center gap-1"><Lock size={10}/> COMING SOON</span>) : "ENTER →"}</span>
                    {g.live_stream_url && !disabled && (
                      <a
                        href={g.live_stream_url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 rounded-sm border border-red-500/60 bg-red-600/20 px-1.5 py-0.5 text-red-400 hover:bg-red-600/40"
                      >
                        <PlayCircle size={10} /> WATCH
                      </a>
                    )}
                  </div>
                </div>
              </>
            );
            return disabled ? (
              <div key={g.id} className="hud-panel group block overflow-hidden opacity-60 cursor-not-allowed">{inner}</div>
            ) : (
              <div
                key={g.id}
                role="button"
                tabIndex={0}
                onClick={() => navigate({ to: "/dashboard/matches", search: { game: g.id } })}
                onKeyDown={(e) => { if (e.key === "Enter") navigate({ to: "/dashboard/matches", search: { game: g.id } }); }}
                className="hud-panel group block overflow-hidden text-left transition hover:border-gold/60 cursor-pointer"
              >
                {inner}
              </div>
            );
          })}
          {games.isLoading && <div className="col-span-full py-8 text-center text-foreground/40">Loading games...</div>}
          {!games.isLoading && !games.data?.length && (
            <div className="col-span-full py-8 text-center font-hud text-xs tracking-widest text-foreground/40">NO GAMES AVAILABLE</div>
          )}
        </section>
      </div>
    );
  }

  // Step 2: Matches for selected game
  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate({ to: "/dashboard/matches", search: {} })}
        className="flex items-center gap-1 font-hud text-[10px] uppercase tracking-widest text-foreground/60 hover:text-gold"
      >
        <ArrowLeft size={12} /> Change Game
      </button>

      <section className="hud-panel relative overflow-hidden p-5 sm:p-6">
        <div className="absolute inset-0 -z-10 bg-grid-hud opacity-30" />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
          <div className="min-w-0">
            <p className="font-hud text-[10px] uppercase tracking-[0.3em] text-foreground/60">// {selectedGame?.game_name ?? "ARENA"}</p>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-wide sm:text-3xl">
              <span className="text-gold">{selectedGame?.game_name ?? "GAME"}</span> TOURNAMENTS
            </h1>
          </div>
          {selectedGame?.image_url ? (
            <img src={selectedGame.image_url} alt={selectedGame.game_name} className="h-12 w-12 rounded object-cover" />
          ) : (
            <Sword className="text-gold" size={36} />
          )}
        </div>
      </section>

      {selectedGame?.live_stream_url && (
        <a
          href={selectedGame.live_stream_url}
          target="_blank"
          rel="noreferrer"
          className="hud-panel flex items-center justify-between gap-3 border-red-500/60 bg-red-600/10 p-3 transition hover:bg-red-600/20"
        >
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-sm bg-red-600 px-2 py-0.5 font-hud text-[10px] font-bold uppercase tracking-widest text-white animate-pulse">
              <PlayCircle size={11} /> LIVE
            </span>
            <span className="font-hud text-xs uppercase tracking-widest text-red-400">
              {selectedGame.game_name} live stream now
            </span>
          </div>
          <span className="font-hud text-[10px] uppercase tracking-widest text-red-400">WATCH →</span>
        </a>
      )}

      <div className="hud-panel grid gap-2 p-3 sm:grid-cols-3">
        <FilterGroup label="STATUS" value={status} onChange={(v) => setStatus(v as Status)}
          options={[["all","All"],["Upcoming","Upcoming"],["Ongoing","Live"],["Complete","Complete"]]} />
        <FilterGroup label="MODE" value={mode} onChange={(v) => setMode(v as ModeFilter)}
          options={[["all","All"],["Solo","Solo"],["Duo","Duo"],["Squad","Squad"]]} />
        <FilterGroup label="TYPE" value={type} onChange={(v) => setType(v as TypeFilter)}
          options={[["all","All"],["Free","Free"],["Paid","Paid"]]} />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(matches.data ?? []).map((m: any) => (
          <MatchCard key={m.id} m={m} joined={joined.data?.has(m.id) ?? false} filled={counts.data?.[m.id] ?? 0} />
        ))}
        {matches.isLoading && <div className="col-span-full py-8 text-center text-foreground/40">Loading matches...</div>}
        {!matches.isLoading && !matches.data?.length && (
          <div className="col-span-full py-8 text-center font-hud text-xs tracking-widest text-foreground/40">
            NO MATCHES FOUND
          </div>
        )}
      </section>
    </div>
  );
}

function FilterGroup({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: [string, string][] }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-1 font-hud text-[10px] uppercase tracking-wider text-foreground/60">
        <Filter size={10} /> {label}
      </div>
      <div className="flex flex-wrap gap-1">
        {options.map(([v, l]) => (
          <button
            key={v}
            onClick={() => onChange(v)}
            className={`rounded-sm px-2 py-1 font-hud text-[10px] font-bold uppercase tracking-wider transition ${
              value === v ? "bg-gold text-background" : "border border-border/60 text-foreground/70 hover:border-gold/60"
            }`}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}

function MatchCard({ m, joined, filled }: { m: any; joined: boolean; filled: number }) {
  const total = m.total_players ?? 0;
  const pct = total ? Math.min(100, Math.round((filled / total) * 100)) : 0;
  const when = m.schedule_at ? new Date(m.schedule_at) : null;
  const isLive = m.status === "Ongoing";
  const isFull = total > 0 && filled >= total;

  return (
    <Link
      to="/dashboard/matches/$matchId"
      params={{ matchId: String(m.id) }}
      className="hud-panel block overflow-hidden p-4 transition hover:border-gold/60"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <span className={`rounded-sm px-1.5 py-0.5 font-hud text-[9px] font-bold uppercase tracking-wider ${
          isLive ? "bg-red-500/20 text-red-400" : "bg-gold/15 text-gold"
        }`}>{isLive ? "LIVE" : m.status}</span>
        {m.premium_only && (
          <span className="flex items-center gap-1 rounded-sm bg-gold/20 px-1.5 py-0.5 font-hud text-[9px] font-bold text-gold">
            <Crown size={9} /> PREMIUM
          </span>
        )}
        <span className="rounded-sm border border-border/60 px-1.5 py-0.5 font-hud text-[9px] font-bold uppercase">
          {m.match_type}
        </span>
      </div>
      <h3 className="mt-2 truncate font-display text-base font-bold uppercase tracking-wide">{m.match_name}</h3>

      <div className="mt-2 grid grid-cols-2 gap-1.5 text-[11px]">
        <Meta icon={Map} label={m.map_name ?? "—"} />
        <Meta icon={Users} label={`${m.player_mode} · ${m.game_mode}`} />
        {when && <Meta icon={Clock} label={when.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} />}
        <Meta icon={Trophy} label={m.reward_type === "KillBased" ? `${m.per_kill_amount_bac}/kill` : `1st: ${m.rank_1_prize_bac}`} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-border/40 pt-2">
        <div className="flex items-center gap-1.5">
          <CoinIcon size={14} />
          <span className="font-mono text-sm font-bold text-gold">
            {m.match_type === "Free" ? "FREE" : `${m.entry_fee_bac} BAC`}
          </span>
        </div>
        <div className="font-mono text-[10px] text-foreground/60">{filled}/{total || "∞"}</div>
      </div>

      {total > 0 && (
        <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-background/60">
          <div className={`h-full ${pct >= 90 ? "bg-red-500" : "bg-gold"}`} style={{ width: `${pct}%` }} />
        </div>
      )}

      <div className="mt-3">
        {joined ? (
          <span className="block rounded-sm border border-green-500/40 bg-green-500/10 py-2 text-center font-hud text-[10px] font-bold uppercase tracking-widest text-green-400">
            ✓ JOINED
          </span>
        ) : isFull ? (
          <span className="block rounded-sm border border-red-500/40 bg-red-500/10 py-2 text-center font-hud text-[10px] font-bold uppercase tracking-widest text-red-400">
            FULL
          </span>
        ) : (
          <span className="block rounded-sm border border-gold/40 bg-gold/10 py-2 text-center font-hud text-[10px] font-bold uppercase tracking-widest text-gold">
            VIEW & JOIN
          </span>
        )}
      </div>
    </Link>
  );
}

function Meta({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-1 text-foreground/70">
      <Icon size={11} className="text-gold/70" /> <span className="truncate">{label}</span>
    </div>
  );
}
